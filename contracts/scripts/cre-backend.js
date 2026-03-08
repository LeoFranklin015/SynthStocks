/**
 * CRE Backend Server (Multichain / Multi-Token)
 *
 * Long-running process that:
 *   1. Calls price-feed CRE workflow every 30 seconds for each token
 *   2. Watches for UserVerified events on primary chain → triggers verify-sync
 *   3. Watches for Buy/Sell events on all chains → triggers supply-sync
 *
 * Usage:
 *   node scripts/cre-backend.js              # runs all 6 tokens
 *   node scripts/cre-backend.js sAAPL sNVDA  # runs only specified tokens
 */
const { ethers } = require("ethers");
const { readFileSync } = require("fs");
const { execSync } = require("child_process");
const path = require("path");

// ─── Config ──────────────────────────────────────────────────────────────────
const CRE_DIR = path.resolve(__dirname, "../../cre");
const DEPLOYED = JSON.parse(
  readFileSync(path.resolve(__dirname, "../deployed-multichain.json"), "utf8")
);

const CHAINS = [
  {
    key: "baseSepolia",
    name: "Base Sepolia",
    rpc: "https://sepolia.base.org",
  },
  {
    key: "arbSepolia",
    name: "Arb Sepolia",
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
  },
  {
    key: "avalancheFuji",
    name: "Avalanche Fuji",
    rpc: "https://api.avax-test.network/ext/bc/C/rpc",
  },
];

const PRIMARY_CHAIN = CHAINS[0]; // Base Sepolia is primary for verify-sync

const ALL_TOKENS = ["sAAPL", "sNVDA", "sTSLA", "sAMZN", "sMETA", "sGOOG"];

const SYMBOL_TO_CONFIG = {
  sAAPL: "aapl",
  sNVDA: "nvda",
  sTSLA: "tsla",
  sAMZN: "amzn",
  sMETA: "meta",
  sGOOG: "goog",
};

const EXCHANGE_ABI = [
  "event UserVerified(address indexed user, uint256 nullifierHash)",
  "event Buy(address indexed buyer, uint256 usdcAmount, uint256 tokenAmount)",
  "event Sell(address indexed seller, uint256 usdcAmount, uint256 tokenAmount)",
];

const PRICE_FEED_INTERVAL_MS = 30_000;

// Select tokens from CLI args or default to all
const selectedTokens = process.argv.length > 2
  ? process.argv.slice(2).filter((t) => ALL_TOKENS.includes(t))
  : ALL_TOKENS;

// ─── CRE runner ──────────────────────────────────────────────────────────────
const creRunning = {};

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

  console.log(`  [${label}] $ ${cmd}`);

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
    console.log(`  [${label}] Done.\n`);
  } catch (e) {
    console.error(`  [${label}] FAILED: ${e.message}`);
    if (e.stdout) {
      const lines = e.stdout.split("\n").filter((l) => l.trim());
      lines.slice(-5).forEach((l) => console.error(`  [${label}]   ${l}`));
    }
    console.log();
  }
}

// ─── 1. Price Feed (every 30s, one per token) ───────────────────────────────
function startPriceFeed() {
  async function tick() {
    const ts = new Date().toISOString();
    for (const token of selectedTokens) {
      const runKey = `priceFeed:${token}`;
      if (creRunning[runKey]) {
        console.log(`[price-feed:${token}] Previous run still active, skipping.`);
        continue;
      }
      console.log(`[${ts}] Running price-feed for ${token}...`);
      creRunning[runKey] = true;
      try {
        const configFile = `config.${SYMBOL_TO_CONFIG[token]}.json`;
        runCre("price-feed", ["--trigger-index 0"], `price-feed:${token}`, configFile);
      } finally {
        creRunning[runKey] = false;
      }
    }
  }

  tick();
  setInterval(tick, PRICE_FEED_INTERVAL_MS);
  console.log(
    `[price-feed] Scheduled every ${PRICE_FEED_INTERVAL_MS / 1000}s for ${selectedTokens.length} tokens\n`
  );
}

// ─── 2. Verify Sync (event-driven on primary chain) ─────────────────────────
function startVerifyWatcher() {
  const provider = new ethers.providers.JsonRpcProvider(PRIMARY_CHAIN.rpc);
  const chainData = DEPLOYED[PRIMARY_CHAIN.key];

  for (const token of selectedTokens) {
    const tokenData = chainData.tokens[token];
    if (!tokenData) continue;

    const exchange = new ethers.Contract(
      tokenData.exchange,
      EXCHANGE_ABI,
      provider
    );

    console.log(
      `[verify-sync:${token}] Watching UserVerified on ${PRIMARY_CHAIN.name} (${tokenData.exchange})`
    );

    exchange.on("UserVerified", async (user, nullifierHash, event) => {
      const txHash = event.transactionHash;
      const ts = new Date().toISOString();
      console.log(`[${ts}] UserVerified for ${token}!`);
      console.log(`  User: ${user}, Tx: ${txHash}`);

      const runKey = `verifySync:${token}`;
      if (creRunning[runKey]) {
        console.log(`  [verify-sync:${token}] Previous run still active, skipping.`);
        return;
      }
      creRunning[runKey] = true;
      try {
        const configFile = `config.${SYMBOL_TO_CONFIG[token]}.json`;
        runCre(
          "verify-sync",
          [
            "--trigger-index 0",
            `--evm-tx-hash ${txHash}`,
            "--evm-event-index 0",
          ],
          `verify-sync:${token}`,
          configFile
        );
      } finally {
        creRunning[runKey] = false;
      }
    });
  }

  provider.on("error", (err) => {
    console.error("[verify-sync] Provider error:", err.message);
  });

  console.log();
}

// ─── 3. Supply Sync (event-driven on Buy/Sell, all chains) ──────────────────
function startSupplySyncWatcher() {
  for (const chain of CHAINS) {
    const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
    const chainData = DEPLOYED[chain.key];

    for (const token of selectedTokens) {
      const tokenData = chainData.tokens[token];
      if (!tokenData) continue;

      const exchange = new ethers.Contract(
        tokenData.exchange,
        EXCHANGE_ABI,
        provider
      );

      console.log(
        `[supply-sync:${token}] Watching Buy/Sell on ${chain.name} (${tokenData.exchange})`
      );

      const handleEvent = async (eventType, buyer, usdcAmount, tokenAmount, event) => {
        const ts = new Date().toISOString();
        console.log(`[${ts}] ${eventType} for ${token} on ${chain.name}!`);
        console.log(`  ${buyer}, USDC: ${ethers.utils.formatUnits(usdcAmount, 6)}`);
        console.log(`  Tx: ${event.transactionHash}`);

        const runKey = `supplySync:${token}`;
        if (creRunning[runKey]) {
          console.log(`  [supply-sync:${token}] Previous run still active, skipping.`);
          return;
        }
        creRunning[runKey] = true;
        try {
          const configFile = `config.${SYMBOL_TO_CONFIG[token]}.json`;
          runCre("supply-sync", ["--trigger-index 0"], `supply-sync:${token}`, configFile);
        } finally {
          creRunning[runKey] = false;
        }
      };

      exchange.on("Buy", (buyer, usdcAmount, tokenAmount, event) =>
        handleEvent("Buy", buyer, usdcAmount, tokenAmount, event)
      );
      exchange.on("Sell", (seller, usdcAmount, tokenAmount, event) =>
        handleEvent("Sell", seller, usdcAmount, tokenAmount, event)
      );
    }

    provider.on("error", (err) => {
      console.error(`[supply-sync] ${chain.name} provider error:`, err.message);
    });
  }

  console.log();
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║       xStocks CRE Backend Server (Multichain)   ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log(`Tokens: ${selectedTokens.join(", ")}`);
  console.log(`Chains: ${CHAINS.map((c) => c.name).join(", ")}`);
  console.log(`Primary chain: ${PRIMARY_CHAIN.name}`);
  console.log(`CRE dir: ${CRE_DIR}\n`);

  startVerifyWatcher();
  startSupplySyncWatcher();
  startPriceFeed();

  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\nShutting down...");
    process.exit(0);
  });
}

main();
