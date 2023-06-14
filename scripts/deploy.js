const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

function saveFrontendFiles(platform) {
  const contractsDir = path.join(__dirname, "/../frontend/src/contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-addresses.json",
    JSON.stringify({ Platform: platform.address }, null, 2)
  );

  // `artifacts` is a helper property provided by Hardhat to read artifacts
  const PlatformArtifact = artifacts.readArtifactSync("Platform");
  fs.writeFileSync(
    contractsDir + "/Platform.json",
    JSON.stringify(PlatformArtifact, null, 2)
  );

  console.log(`Artifacts written to ${contractsDir} directory`);
}

async function main() {
  const Platform = await hre.ethers.getContractFactory('Platform');

  const { VRF_COORDINATOR, SUBSCRIPTION_ID, KEY_HASH } = process.env;

  const platform = await Platform.deploy(VRF_COORDINATOR, SUBSCRIPTION_ID, KEY_HASH);

  await platform.deployed();

  saveFrontendFiles(platform);

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
