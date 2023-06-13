const hre = require('hardhat');

async function main() {
  const Platform = await hre.ethers.getContractFactory('Platform');

  const { VRF_COORDINATOR, SUBSCRIPTION_ID, KEY_HASH } = process.env;

  const platform = await Platform.deploy(VRF_COORDINATOR, SUBSCRIPTION_ID, KEY_HASH);

  await platform.deployed();

  console.log(
    `Platform with coordinator "${VRF_COORDINATOR}", subscription ID "${SUBSCRIPTION_ID}", and key hash of "${KEY_HASH}" deployed to ${platform.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
