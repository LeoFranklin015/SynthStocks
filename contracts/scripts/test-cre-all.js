/**
 * Test All CRE Workflows via Buy Transactions
 *
 * Buys a token on all 3 chains, then runs CRE workflows:
 *   1. price-feed  (cron)
 *   2. supply-sync (cron)
 *
 * Usage:
 *   node scripts/test-cre-all.js [symbol]
 *
 * Examples:
 *   node scripts/test-cre-all.js          # defaults to sAAPL
 *   node scripts/test-cre-all.js sNVDA
 *   node scripts/test-cre-all.js sTSLA
 */
const { ethers } = require("ethers");
const { readFileSync } = require("fs");
const { execSync } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const CRE_DIR = path.resolve(__dirname, "../../cre");
const DEPLOYED = JSON.parse(
  readFileSync(path.resolve(__dirname, "../deployed-multichain.json"), "utf8")
);

const CHAINS = [
  {
    key: "baseSepolia",
    name: "Base Sepolia",
    rpc: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    creChain: "ethereum-testnet-sepolia-base-1",
  },
  {
    key: "arbSepolia",
    name: "Arb Sepolia",
    rpc: process.env.ARB_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    creChain: "ethereum-testnet-sepolia-arbitrum-1",
  },
  {
    key: "avalancheFuji",
    name: "Avalanche Fuji",
    rpc: process.env.AVAX_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
    creChain: "avalanche-testnet-fuji",
  },
];

const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const EXCHANGE_ABI = [
  "function buy(uint256 usdcAmount) external",
  "function setMaxHoldingBps(uint256 bps) external",
  "function verifiedUsers(address) view returns (bool)",
  "function crossChainSupply() view returns (uint256)",
  "function globalSupplyCap() view returns (uint256)",
  "event Buy(address indexed buyer, uint256 usdcAmount, uint256 tokenAmount)",
];

const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function symbol() view returns (string)",
];

// Symbol name mapping: config file suffix -> Finnhub symbol
const SYMBOL_TO_CONFIG = {
  sAAPL: "aapl",
  sNVDA: "nvda",
  sTSLA: "tsla",
  sAMZN: "amzn",
  sMETA: "meta",
  sGOOG: "goog",
};

function getWallet(rpc) {
  if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY not set in .env");
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
}

// ─── Buy on a single chain ──────────────────────────────────────────────────
async function buyOnChain(chain, tokenSymbol, usdcAmount) {
  const chainData = DEPLOYED[chain.key];
  if (!chainData) throw new Error(`No deployed data for ${chain.key}`);

  const tokenData = chainData.tokens[tokenSymbol];
  if (!tokenData) throw new Error(`No token ${tokenSymbol} on ${chain.key}`);

  const wallet = getWallet(chain.rpc);
  const address = await wallet.getAddress();

  const usdc = new ethers.Contract(chainData.usdc, USDC_ABI, wallet);
  const exchange = new ethers.Contract(tokenData.exchange, EXCHANGE_ABI, wallet);
  const token = new ethers.Contract(tokenData.token, TOKEN_ABI, wallet);

  console.log(`\n── ${chain.name} (${tokenSymbol}) ──`);
  console.log(`  Exchange: ${tokenData.exchange}`);
  console.log(`  Token:    ${tokenData.token}`);
  console.log(`  USDC:     ${chainData.usdc}`);

  // Check USDC balance
  const usdcBal = await usdc.balanceOf(address);
  const usdcFormatted = ethers.utils.formatUnits(usdcBal, 6);
  console.log(`  USDC balance: ${usdcFormatted}`);

  if (usdcBal.lt(usdcAmount)) {
    console.log(`  ⚠ Not enough USDC (need ${ethers.utils.formatUnits(usdcAmount, 6)}), skipping buy`);
    return null;
  }

  // Check if user is verified
  const isVerified = await exchange.verifiedUsers(address);
  console.log(`  Verified: ${isVerified}`);

  // Temporarily set holding limit high for test
  try {
    const tx0 = await exchange.setMaxHoldingBps(10000, { gasLimit: 200000 });
    await tx0.wait();
    console.log(`  Set maxHoldingBps to 10000 (100%)`);
  } catch (e) {
    console.log(`  Could not set maxHoldingBps: ${e.reason || e.message}`);
  }

  // Approve + Buy
  const approveTx = await usdc.approve(tokenData.exchange, usdcAmount, { gasLimit: 100000 });
  await approveTx.wait();
  console.log(`  Approved USDC`);

  const buyTx = await exchange.buy(usdcAmount, { gasLimit: 500000 });
  const receipt = await buyTx.wait();
  console.log(`  Buy tx: ${buyTx.hash}`);

  // Restore holding limit
  try {
    const tx1 = await exchange.setMaxHoldingBps(500, { gasLimit: 200000 });
    await tx1.wait();
    console.log(`  Restored maxHoldingBps to 500 (5%)`);
  } catch (e) {
    // ignore
  }

  // Show results
  const tokenBal = await token.balanceOf(address);
  const totalSupply = await token.totalSupply();
  console.log(`  Token balance: ${ethers.utils.formatEther(tokenBal)}`);
  console.log(`  Total supply:  ${ethers.utils.formatEther(totalSupply)}`);

  return { chain, txHash: buyTx.hash, receipt };
}

// ─── CRE runner ──────────────────────────────────────────────────────────────
function runCre(workflowName, args, label, configFile) {
  const configArg = configFile ? `--config-file ${configFile}` : "";
  const cmd = [
    "cre workflow simulate",
    workflowName,
    "--target staging-settings",
    "--non-interactive",
    configArg,
    ...args,
    "--broadcast",
  ]
    .filter(Boolean)
    .join(" ");

  console.log(`\n  [${label}] $ ${cmd}`);

  try {
    const output = execSync(cmd, {
      cwd: CRE_DIR,
      encoding: "utf8",
      timeout: 180_000,
    });

    const logLines = output.split("\n").filter((l) => l.includes("[USER LOG]"));
    logLines.forEach((l) => console.log(`  [${label}] ${l.trim()}`));

    const resultMatch = output.match(/Workflow Simulation Result:\n"(.+)"/);
    if (resultMatch) {
      console.log(`  [${label}] Result: ${resultMatch[1]}`);
    }
    console.log(`  [${label}] Done.`);
    return true;
  } catch (e) {
    console.error(`  [${label}] FAILED: ${e.message}`);
    if (e.stdout) {
      const lines = e.stdout.split("\n").filter((l) => l.trim());
      lines.slice(-5).forEach((l) => console.error(`  [${label}]   ${l}`));
    }
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const tokenSymbol = process.argv[2] || "sAAPL";
  const configSuffix = SYMBOL_TO_CONFIG[tokenSymbol];

  if (!configSuffix) {
    console.error(`Unknown token: ${tokenSymbol}`);
    console.error(`Available: ${Object.keys(SYMBOL_TO_CONFIG).join(", ")}`);
    process.exit(1);
  }

  const BUY_AMOUNT = ethers.utils.parseUnits("1", 6); // 1 USDC

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║         xStocks CRE Test — Buy + Workflows      ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`Token: ${tokenSymbol} | Config suffix: ${configSuffix}`);
  console.log(`Buy amount: ${ethers.utils.formatUnits(BUY_AMOUNT, 6)} USDC per chain`);
  console.log(`Chains: ${CHAINS.map((c) => c.name).join(", ")}`);

  // ─── Step 1: Buy on all chains ──────────────────────────────────────────
  console.log("\n\n═══ STEP 1: Buy on all chains ═══");
  const buyResults = [];

  for (const chain of CHAINS) {
    try {
      const result = await buyOnChain(chain, tokenSymbol, BUY_AMOUNT);
      if (result) buyResults.push(result);
    } catch (e) {
      console.error(`  ERROR on ${chain.name}: ${e.reason || e.message}`);
    }
    // Small delay between chains to avoid nonce issues
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log(`\n\nBuys completed: ${buyResults.length}/${CHAINS.length}`);
  for (const r of buyResults) {
    console.log(`  ${r.chain.name}: ${r.txHash}`);
  }

  // ─── Step 2: Run price-feed CRE ────────────────────────────────────────
  console.log("\n\n═══ STEP 2: Run price-feed CRE ═══");
  const priceFeedConfig = `config.${configSuffix}.json`;
  runCre("price-feed", ["--trigger-index 0"], `price-feed:${tokenSymbol}`, priceFeedConfig);

  // ─── Step 3: Run supply-sync CRE ───────────────────────────────────────
  console.log("\n\n═══ STEP 3: Run supply-sync CRE ═══");
  const supplySyncConfig = `config.${configSuffix}.json`;
  runCre("supply-sync", ["--trigger-index 0"], `supply-sync:${tokenSymbol}`, supplySyncConfig);

  // ─── Step 4: Show final state ──────────────────────────────────────────
  console.log("\n\n═══ FINAL STATE ═══");
  for (const chain of CHAINS) {
    const chainData = DEPLOYED[chain.key];
    const tokenData = chainData.tokens[tokenSymbol];
    if (!tokenData) continue;

    const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
    const token = new ethers.Contract(tokenData.token, TOKEN_ABI, provider);
    const exchange = new ethers.Contract(
      tokenData.exchange,
      [...EXCHANGE_ABI, "function crossChainSupply() view returns (uint256)"],
      provider
    );

    try {
      const totalSupply = await token.totalSupply();
      const crossChain = await exchange.crossChainSupply();
      console.log(`  ${chain.name}:`);
      console.log(`    totalSupply:     ${ethers.utils.formatEther(totalSupply)}`);
      console.log(`    crossChainSupply: ${ethers.utils.formatEther(crossChain)}`);
    } catch (e) {
      console.log(`  ${chain.name}: error reading state: ${e.message}`);
    }
  }

  console.log("\n\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
