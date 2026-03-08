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
const GLOBAL_SUPPLY_CAP = hre.ethers.utils.parseEther("1000"); // 1000 tokens max across all chains

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tokens to deploy with their current prices (8 decimals)
const TOKENS = [
  { symbol: "sNVDA", name: "sNVDA - NVIDIA Corp.", price: 13129000000 },      // $131.29
  { symbol: "sTSLA", name: "sTSLA - Tesla Inc.", price: 27134000000 },        // $271.34
  { symbol: "sAMZN", name: "sAMZN - Amazon.com Inc.", price: 20574000000 },   // $205.74
  { symbol: "sMETA", name: "sMETA - Meta Platforms", price: 59625000000 },    // $596.25
  { symbol: "sAAPL", name: "sAAPL - Apple Inc.", price: 22748000000 },        // $227.48
  { symbol: "sGOOG", name: "sGOOG - Alphabet Inc.", price: 17000000000 },     // $170.00
];

async function deployToken(deployer, networkName, usdcAddress, tokenConfig) {
  const { symbol, name, price } = tokenConfig;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Deploying ${symbol} on ${networkName}`);
  console.log(`${"=".repeat(60)}`);

  // Helper: get fresh nonce for each tx
  const getNonce = async () => deployer.getTransactionCount("pending");

  // 1. Token Implementation
  console.log("\n--- Token Implementation ---");
  const TokenImpl = await hre.ethers.getContractFactory("BackedAutoFeeTokenImplementation");
  const tokenImpl = await TokenImpl.deploy({ nonce: await getNonce() });
  await tokenImpl.deployed();
  console.log("Deployed:", tokenImpl.address);
  await sleep(3000);

  // 2. ProxyAdmin
  console.log("\n--- ProxyAdmin ---");
  const ProxyAdmin = await hre.ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = await ProxyAdmin.deploy({ nonce: await getNonce() });
  await proxyAdmin.deployed();
  console.log("Deployed:", proxyAdmin.address);
  await sleep(3000);

  // 3. Token Proxy
  console.log("\n--- Token Proxy ---");
  const initData = TokenImpl.interface.encodeFunctionData(
    "initialize(string,string,uint256,uint256,uint256)",
    [name, symbol, 86400, Math.floor(Date.now() / 1000), 0]
  );
  const Proxy = await hre.ethers.getContractFactory("BackedTokenProxy");
  const proxy = await Proxy.deploy(tokenImpl.address, proxyAdmin.address, initData, { gasLimit: 2_000_000, nonce: await getNonce() });
  await proxy.deployed();
  const tokenAddress = proxy.address;
  console.log("Token:", tokenAddress);
  await sleep(3000);

  const token = TokenImpl.attach(tokenAddress);

  // 4. Price Receiver
  console.log("\n--- PriceReceiver ---");
  const PriceReceiver = await hre.ethers.getContractFactory("SynthStocksPriceReceiver");
  const priceReceiver = await PriceReceiver.deploy(deployer.address, { nonce: await getNonce() });
  await priceReceiver.deployed();
  await sleep(3000);
  let tx = await priceReceiver.updatePrice(price, { gasLimit: 100000, nonce: await getNonce() });
  await tx.wait();
  console.log("Deployed:", priceReceiver.address, `price=$${(price / 1e8).toFixed(2)}`);
  await sleep(3000);

  // 5. Exchange
  console.log("\n--- SynthStocksExchange ---");
  const appId = "app_SynthStocks_test";
  const action = `buy_${symbol.toLowerCase()}`;
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

  const Exchange = await hre.ethers.getContractFactory("SynthStocksExchange");
  const exchange = await Exchange.deploy(
    tokenAddress,
    usdcAddress,
    WORLD_ID_ROUTER,
    externalNullifierHash,
    WORLD_ID_VERIFIER,
    priceReceiver.address,
    3600,
    500,     // maxHoldingBps: 5%
    { nonce: await getNonce() }
  );
  await exchange.deployed();
  console.log("Deployed:", exchange.address);
  await sleep(3000);

  // 6. ExchangeOnlySanctionsList
  console.log("\n--- ExchangeOnlySanctionsList ---");
  const SanctionsList = await hre.ethers.getContractFactory("ExchangeOnlySanctionsList");
  const sanctionsList = await SanctionsList.deploy(exchange.address, tokenAddress, { nonce: await getNonce() });
  await sanctionsList.deployed();
  console.log("Deployed:", sanctionsList.address);

  // 7. Set token roles
  console.log("\n--- Setting token roles ---");
  await sleep(3000);
  tx = await token.setSanctionsList(sanctionsList.address, { gasLimit: 200000, nonce: await getNonce() }); await tx.wait();
  await sleep(3000);
  tx = await token.setPauser(deployer.address, { nonce: await getNonce() }); await tx.wait();
  await sleep(3000);
  tx = await token.setMinter(exchange.address, { nonce: await getNonce() }); await tx.wait();
  await sleep(3000);
  tx = await token.setBurner(exchange.address, { nonce: await getNonce() }); await tx.wait();
  console.log("Token roles set");

  // 8. Configure exchange
  console.log("\n--- Configuring exchange ---");
  await sleep(3000);
  tx = await exchange.setTransferLock(sanctionsList.address, { nonce: await getNonce() }); await tx.wait();
  await sleep(3000);
  tx = await exchange.setVerifiedUser(deployer.address, true, { nonce: await getNonce() }); await tx.wait();
  await sleep(3000);
  tx = await exchange.setGlobalSupplyCap(GLOBAL_SUPPLY_CAP, { nonce: await getNonce() }); await tx.wait();
  console.log("Exchange configured (transferLock, verified user, globalSupplyCap=1000)");

  console.log(`\n--- ${symbol} deployment complete! ---`);

  return {
    token: tokenAddress,
    implementation: tokenImpl.address,
    proxyAdmin: proxyAdmin.address,
    priceReceiver: priceReceiver.address,
    exchange: exchange.address,
    sanctionsList: sanctionsList.address,
    price: `$${(price / 1e8).toFixed(2)}`,
  };
}

async function main() {
  const networkName = hre.network.name;
  const usdcAddress = USDC_ADDRESSES[networkName];
  if (!usdcAddress) {
    throw new Error(`No USDC address configured for ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Deploying ALL tokens on ${networkName}`);
  console.log(`${"=".repeat(60)}`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "ETH");
  console.log(`Tokens to deploy: ${TOKENS.map(t => t.symbol).join(", ")}`);

  // Load existing addresses file
  const addressesPath = path.resolve(__dirname, "../deployed-multichain.json");
  let allAddresses = {};
  if (existsSync(addressesPath)) {
    allAddresses = JSON.parse(readFileSync(addressesPath, "utf8"));
  }

  // Initialize network entry
  if (!allAddresses[networkName]) {
    allAddresses[networkName] = {};
  }
  allAddresses[networkName].deployer = deployer.address;
  allAddresses[networkName].usdc = usdcAddress;
  allAddresses[networkName].deployedAt = new Date().toISOString();

  // Deploy each token sequentially (skip already deployed)
  const results = {};
  for (const tokenConfig of TOKENS) {
    const existingTokens = allAddresses[networkName].tokens || {};
    if (existingTokens[tokenConfig.symbol]) {
      console.log(`\n--- Skipping ${tokenConfig.symbol} (already deployed) ---`);
      results[tokenConfig.symbol] = existingTokens[tokenConfig.symbol];
      continue;
    }
    const addresses = await deployToken(deployer, networkName, usdcAddress, tokenConfig);
    results[tokenConfig.symbol] = addresses;

    // Save after each token in case of failure
    allAddresses[networkName].tokens = {
      ...(allAddresses[networkName].tokens || {}),
      [tokenConfig.symbol]: addresses,
    };
    writeFileSync(addressesPath, JSON.stringify(allAddresses, null, 2));
    console.log(`Saved ${tokenConfig.symbol} addresses to deployed-multichain.json`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ALL DEPLOYMENTS COMPLETE on ${networkName}`);
  console.log(`${"=".repeat(60)}`);
  console.log(JSON.stringify(results, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
