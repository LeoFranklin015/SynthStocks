/**
 * Test buy on a single chain/token using Hardhat.
 *
 * Usage:
 *   npx hardhat run scripts/test-buy-multichain.js --network baseSepolia
 *   TOKEN=sNVDA npx hardhat run scripts/test-buy-multichain.js --network arbSepolia
 *   TOKEN=sTSLA npx hardhat run scripts/test-buy-multichain.js --network avalancheFuji
 */
const hre = require("hardhat");
const { readFileSync } = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name;
  const tokenSymbol = process.env.TOKEN || "sAAPL";

  const allAddresses = JSON.parse(
    readFileSync(path.resolve(__dirname, "../deployed-multichain.json"), "utf8")
  );
  const chainData = allAddresses[networkName];
  if (!chainData) throw new Error(`No addresses for network: ${networkName}`);

  const tokenData = chainData.tokens[tokenSymbol];
  if (!tokenData) throw new Error(`No token ${tokenSymbol} on ${networkName}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Network: ${networkName}, Token: ${tokenSymbol}, Deployer: ${deployer.address}`);

  const TokenImpl = await hre.ethers.getContractFactory("BackedAutoFeeTokenImplementation");
  const token = TokenImpl.attach(tokenData.token);
  const Exchange = await hre.ethers.getContractFactory("SynthStocksExchange");
  const exchange = Exchange.attach(tokenData.exchange);

  // Set holding limit to 100% for bootstrap
  let tx = await exchange.setMaxHoldingBps(10000);
  await tx.wait();

  // Approve + buy 1 USDC worth
  const usdc = await hre.ethers.getContractAt("IERC20", chainData.usdc);
  const usdcBal = await usdc.balanceOf(deployer.address);
  console.log(`${networkName} USDC balance: ${hre.ethers.utils.formatUnits(usdcBal, 6)}`);

  const buyAmount = 1000000; // 1 USDC
  if (usdcBal.gte(buyAmount)) {
    tx = await usdc.approve(tokenData.exchange, buyAmount);
    await tx.wait();
    tx = await exchange.buy(buyAmount, { gasLimit: 500000 });
    await tx.wait();
    console.log(`Bought with 1 USDC, tx: ${tx.hash}`);
  } else {
    console.log("Not enough USDC, skipping buy");
  }

  // Restore holding limit
  tx = await exchange.setMaxHoldingBps(500);
  await tx.wait();

  const tokenBal = await token.balanceOf(deployer.address);
  const totalSupply = await token.totalSupply();
  const crossChain = await exchange.crossChainSupply();
  console.log(`${networkName} ${tokenSymbol} results:`);
  console.log(`  Token balance: ${hre.ethers.utils.formatEther(tokenBal)}`);
  console.log(`  Total supply:  ${hre.ethers.utils.formatEther(totalSupply)}`);
  console.log(`  CrossChain:    ${hre.ethers.utils.formatEther(crossChain)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
