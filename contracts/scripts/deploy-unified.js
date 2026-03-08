const hre = require("hardhat");
const { writeFileSync, readFileSync, existsSync } = require("fs");
const path = require("path");

// USDC addresses per network
const USDC_ADDRESSES = {
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  arbSepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  avalancheFuji: "0x5425890298aed601595a70AB815c96711a31Bc65",
};

const WORLD_ID_ROUTER = "0x42FF98C4E85212a5D31358ACbFe76a621b50fC02";
const WORLD_ID_VERIFIER = "0x0000000000000000000000000000000000000000";

// Fixed timestamp for CREATE2 determinism (do NOT use Date.now())
const FIXED_LAST_TIME_FEE = 1709900000;

// Tokens with configurable per-token supply caps (18 decimals)
const TOKENS = [
  { symbol: "sNVDA", name: "sNVDA - NVIDIA Corp.",   price: 13129000000, supplyCap: hre.ethers.utils.parseEther("5000") },
  { symbol: "sTSLA", name: "sTSLA - Tesla Inc.",     price: 27134000000, supplyCap: hre.ethers.utils.parseEther("3000") },
  { symbol: "sAMZN", name: "sAMZN - Amazon.com Inc.",price: 20574000000, supplyCap: hre.ethers.utils.parseEther("4000") },
  { symbol: "sMETA", name: "sMETA - Meta Platforms", price: 59625000000, supplyCap: hre.ethers.utils.parseEther("2000") },
  { symbol: "sAAPL", name: "sAAPL - Apple Inc.",     price: 22748000000, supplyCap: hre.ethers.utils.parseEther("4000") },
  { symbol: "sGOOG", name: "sGOOG - Alphabet Inc.",  price: 17000000000, supplyCap: hre.ethers.utils.parseEther("5000") },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getNonce = async (deployer) => deployer.getTransactionCount("pending");

// =====================================================================
//  Helpers
// =====================================================================

async function deployViaCreate2(deployer, create2Deployer, Factory, salt, constructorArgs, afterCallData) {
  // Build full deployment bytecode (creation code + encoded constructor args)
  const deployTx = Factory.getDeployTransaction(...constructorArgs);
  const bytecode = deployTx.data;

  const predictedAddress = await create2Deployer.computeAddress(bytecode, salt);

  // Check if already deployed
  const code = await deployer.provider.getCode(predictedAddress);
  if (code !== "0x") {
    console.log(`  Already deployed at ${predictedAddress}`);
    return { address: predictedAddress, alreadyDeployed: true };
  }

  let tx;
  if (afterCallData) {
    tx = await create2Deployer.deployAndCall(bytecode, salt, afterCallData, {
      gasLimit: 5_000_000,
      nonce: await getNonce(deployer),
    });
  } else {
    tx = await create2Deployer.deploy(bytecode, salt, {
      gasLimit: 5_000_000,
      nonce: await getNonce(deployer),
    });
  }
  await tx.wait();
  await sleep(3000);

  // Verify deployment
  const deployedCode = await deployer.provider.getCode(predictedAddress);
  if (deployedCode === "0x") {
    throw new Error(`CREATE2 deployment failed at ${predictedAddress}`);
  }

  console.log(`  Deployed at ${predictedAddress}`);
  return { address: predictedAddress, alreadyDeployed: false };
}

// =====================================================================
//  Main
// =====================================================================

async function main() {
  const networkName = hre.network.name;
  const usdcAddress = USDC_ADDRESSES[networkName];
  if (!usdcAddress) throw new Error(`No USDC address configured for ${networkName}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  UNIFIED DEPLOYMENT on ${networkName}`);
  console.log(`${"=".repeat(60)}`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // Load/init addresses file
  const addressesPath = path.resolve(__dirname, "../deployed-unified.json");
  let allAddresses = {};
  if (existsSync(addressesPath)) {
    allAddresses = JSON.parse(readFileSync(addressesPath, "utf8"));
  }

  // ============================================================
  // Phase 1: Deploy Create2Deployer via Arachnid deterministic proxy
  //           (same address on all EVM chains)
  // ============================================================
  console.log("--- Phase 1: Create2Deployer (via Arachnid proxy) ---");
  const ARACHNID_PROXY = "0x4e59b44847b379578588920cA78FbF26c0B4956C";
  const Create2Factory = await hre.ethers.getContractFactory("Create2Deployer");
  const c2Bytecode = Create2Factory.bytecode;
  const c2Salt = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("SynthStocks_Create2Deployer_v1"));

  // Predict the deterministic address
  const c2InitCodeHash = hre.ethers.utils.keccak256(c2Bytecode);
  const create2Address = hre.ethers.utils.getAddress(
    "0x" + hre.ethers.utils.keccak256(
      hre.ethers.utils.concat([
        "0xff",
        ARACHNID_PROXY,
        c2Salt,
        c2InitCodeHash,
      ])
    ).slice(26)
  );

  const existingCode = await deployer.provider.getCode(create2Address);
  if (existingCode !== "0x") {
    console.log(`  Already deployed at ${create2Address}`);
  } else {
    // Arachnid proxy expects: salt (32 bytes) + bytecode
    const arachnidPayload = hre.ethers.utils.concat([c2Salt, c2Bytecode]);
    const tx = await deployer.sendTransaction({
      to: ARACHNID_PROXY,
      data: arachnidPayload,
      gasLimit: 3_000_000,
      nonce: await getNonce(deployer),
    });
    await tx.wait();
    console.log(`  Deployed at ${create2Address}`);
    // Verify
    const code = await deployer.provider.getCode(create2Address);
    if (code === "0x") throw new Error("Create2Deployer deployment via Arachnid failed");
  }
  await sleep(3000);

  const create2Deployer = Create2Factory.attach(create2Address);

  // ============================================================
  // Phase 2: Deploy Token Implementation via CREATE2
  // ============================================================
  console.log("\n--- Phase 2: Token Implementation (CREATE2) ---");
  const TokenImpl = await hre.ethers.getContractFactory("BackedAutoFeeTokenImplementation");
  const implSalt = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("SynthStocksImpl_v1"));

  const { address: implAddress } = await deployViaCreate2(
    deployer, create2Deployer, TokenImpl, implSalt, []
  );

  // ============================================================
  // Phase 3: Deploy ProxyAdmin via CREATE2 + transferOwnership
  // ============================================================
  console.log("\n--- Phase 3: ProxyAdmin (CREATE2) ---");
  const ProxyAdmin = await hre.ethers.getContractFactory("ProxyAdmin");
  const adminSalt = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("SynthStocksProxyAdmin_v1"));

  // After deploy, transfer ownership from Create2Deployer to our EOA
  const transferOwnershipCall = ProxyAdmin.interface.encodeFunctionData("transferOwnership", [deployer.address]);

  const { address: proxyAdminAddress } = await deployViaCreate2(
    deployer, create2Deployer, ProxyAdmin, adminSalt, [],
    transferOwnershipCall
  );

  // ============================================================
  // Phase 4: Deploy Token Proxies via CREATE2 (deterministic per symbol)
  // ============================================================
  console.log("\n--- Phase 4: Token Proxies (CREATE2) ---");
  const BackedTokenProxy = await hre.ethers.getContractFactory("BackedTokenProxy");

  const tokenAddresses = {};
  for (const tokenConfig of TOKENS) {
    console.log(`\n  ${tokenConfig.symbol}:`);
    const tokenSalt = hre.ethers.utils.keccak256(
      hre.ethers.utils.toUtf8Bytes(`SynthStock_${tokenConfig.symbol}`)
    );

    // Build init data with FIXED timestamp for determinism
    const initData = TokenImpl.interface.encodeFunctionData(
      "initialize(string,string,uint256,uint256,uint256)",
      [tokenConfig.name, tokenConfig.symbol, 86400, FIXED_LAST_TIME_FEE, 0]
    );

    // After proxy deploy, transfer token ownership from Create2Deployer to our EOA
    const tokenTransferCall = TokenImpl.interface.encodeFunctionData("transferOwnership", [deployer.address]);

    const { address: tokenAddress } = await deployViaCreate2(
      deployer, create2Deployer, BackedTokenProxy, tokenSalt,
      [implAddress, proxyAdminAddress, initData],
      tokenTransferCall
    );

    tokenAddresses[tokenConfig.symbol] = tokenAddress;
  }

  // ============================================================
  // Phase 5: Deploy Price Receivers (normal deploy, one per token)
  // ============================================================
  console.log("\n--- Phase 5: Price Receivers ---");
  const PriceReceiver = await hre.ethers.getContractFactory("SynthStocksPriceReceiver");
  const priceReceiverAddresses = {};

  for (const tokenConfig of TOKENS) {
    console.log(`  ${tokenConfig.symbol}:`);
    const pr = await PriceReceiver.deploy(deployer.address, { nonce: await getNonce(deployer) });
    await pr.deployed();
    await sleep(3000);

    const tx = await pr.updatePrice(tokenConfig.price, { gasLimit: 100000, nonce: await getNonce(deployer) });
    await tx.wait();
    await sleep(2000);

    priceReceiverAddresses[tokenConfig.symbol] = pr.address;
    console.log(`    ${pr.address} price=$${(tokenConfig.price / 1e8).toFixed(2)}`);
  }

  // ============================================================
  // Phase 6: Deploy MultiTokenExchange (single per network)
  // ============================================================
  console.log("\n--- Phase 6: MultiTokenExchange ---");

  const appId = "app_SynthStocks";
  const action = "trade_synthstocks";
  const externalNullifierHash = hre.ethers.BigNumber.from(
    hre.ethers.utils.solidityKeccak256(
      ["bytes"],
      [hre.ethers.utils.solidityPack(
        ["bytes32", "bytes32"],
        [
          hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(appId)),
          hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(action)),
        ]
      )]
    )
  ).shr(8);

  const Exchange = await hre.ethers.getContractFactory("MultiTokenExchange");
  const exchange = await Exchange.deploy(
    usdcAddress,
    WORLD_ID_ROUTER,
    externalNullifierHash,
    WORLD_ID_VERIFIER,
    3600,       // maxPriceStaleness: 1 hour
    500,        // maxHoldingBps: 5%
    { nonce: await getNonce(deployer) }
  );
  await exchange.deployed();
  console.log(`  Exchange: ${exchange.address}`);
  await sleep(3000);

  // ============================================================
  // Phase 7: Deploy Sanctions Lists (one per token, same exchange)
  // ============================================================
  console.log("\n--- Phase 7: Sanctions Lists ---");
  const SanctionsList = await hre.ethers.getContractFactory("ExchangeOnlySanctionsList");
  const sanctionsAddresses = {};

  for (const tokenConfig of TOKENS) {
    console.log(`  ${tokenConfig.symbol}:`);
    const sl = await SanctionsList.deploy(
      exchange.address,
      tokenAddresses[tokenConfig.symbol],
      { nonce: await getNonce(deployer) }
    );
    await sl.deployed();
    sanctionsAddresses[tokenConfig.symbol] = sl.address;
    console.log(`    ${sl.address}`);
    await sleep(3000);
  }

  // ============================================================
  // Phase 8: Configure token roles (minter/burner = exchange)
  // ============================================================
  console.log("\n--- Phase 8: Token Roles ---");

  for (const tokenConfig of TOKENS) {
    console.log(`  ${tokenConfig.symbol}:`);
    const token = TokenImpl.attach(tokenAddresses[tokenConfig.symbol]);

    let tx;
    tx = await token.setSanctionsList(sanctionsAddresses[tokenConfig.symbol], { gasLimit: 200000, nonce: await getNonce(deployer) });
    await tx.wait(); await sleep(2000);

    tx = await token.setPauser(deployer.address, { nonce: await getNonce(deployer) });
    await tx.wait(); await sleep(2000);

    tx = await token.setMinter(exchange.address, { nonce: await getNonce(deployer) });
    await tx.wait(); await sleep(2000);

    tx = await token.setBurner(exchange.address, { nonce: await getNonce(deployer) });
    await tx.wait(); await sleep(2000);

    console.log(`    Roles set (minter/burner=exchange, sanctions=${sanctionsAddresses[tokenConfig.symbol].slice(0, 10)}...)`);
  }

  // ============================================================
  // Phase 9: Register all tokens in the exchange
  // ============================================================
  console.log("\n--- Phase 9: Register Tokens in Exchange ---");

  for (const tokenConfig of TOKENS) {
    console.log(`  ${tokenConfig.symbol}:`);
    const tx = await exchange.addToken(
      tokenAddresses[tokenConfig.symbol],
      priceReceiverAddresses[tokenConfig.symbol],
      sanctionsAddresses[tokenConfig.symbol],
      tokenConfig.supplyCap,
      { nonce: await getNonce(deployer) }
    );
    await tx.wait();
    await sleep(2000);
    console.log(`    Registered (supplyCap=${hre.ethers.utils.formatEther(tokenConfig.supplyCap)} tokens)`);
  }

  // ============================================================
  // Phase 10: Final exchange config
  // ============================================================
  console.log("\n--- Phase 10: Exchange Config ---");

  let tx;
  tx = await exchange.setVerifiedUser(deployer.address, true, { nonce: await getNonce(deployer) });
  await tx.wait(); await sleep(2000);
  console.log("  Deployer verified as user");

  // ============================================================
  // Save all addresses
  // ============================================================
  const networkData = {
    deployer: deployer.address,
    usdc: usdcAddress,
    create2Deployer: create2Address,
    implementation: implAddress,
    proxyAdmin: proxyAdminAddress,
    exchange: exchange.address,
    tokens: {},
    deployedAt: new Date().toISOString(),
  };

  for (const tokenConfig of TOKENS) {
    networkData.tokens[tokenConfig.symbol] = {
      token: tokenAddresses[tokenConfig.symbol],
      priceFeed: priceReceiverAddresses[tokenConfig.symbol],
      sanctionsList: sanctionsAddresses[tokenConfig.symbol],
      price: `$${(tokenConfig.price / 1e8).toFixed(2)}`,
      supplyCap: hre.ethers.utils.formatEther(tokenConfig.supplyCap),
    };
  }

  allAddresses[networkName] = networkData;
  writeFileSync(addressesPath, JSON.stringify(allAddresses, null, 2));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  DEPLOYMENT COMPLETE on ${networkName}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Exchange: ${exchange.address}`);
  console.log(`Tokens (same address on all chains via CREATE2):`);
  for (const tokenConfig of TOKENS) {
    console.log(`  ${tokenConfig.symbol}: ${tokenAddresses[tokenConfig.symbol]} (cap: ${hre.ethers.utils.formatEther(tokenConfig.supplyCap)})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
