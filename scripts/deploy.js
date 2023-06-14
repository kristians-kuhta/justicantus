const hre = require('hardhat');
const fs = require('fs');
const path = require('path');
const { PlatformAndCoordinatorFixture } = require('../fixtures/PlatformAndCoordinatorFixture');

function saveFrontendFiles(platform, coordinatorAddress) {
  const contractsDir = path.join(__dirname, "/../frontend/src/contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-addresses.json",
    JSON.stringify({ Platform: platform.address, Coordinator: coordinatorAddress }, null, 2)
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
  let platform;
  let coordinatorAddress;
  let subscriptionId;
  let keyHash;

  if (hre.network.name === 'localhost') {
    const fixtureValues = await PlatformAndCoordinatorFixture();
    const { coordinator, subId, KEY_HASH } = fixtureValues;
    coordinatorAddress = coordinator.address;
    subscriptionId = subId;
    keyHash = KEY_HASH;
    platform = fixtureValues.platform;
  } else {
    const Platform = await hre.ethers.getContractFactory('Platform');

    const { VRF_COORDINATOR, SUBSCRIPTION_ID, KEY_HASH } = process.env;
    coordinatorAddress = VRF_COORDINATOR;
    subscriptionId = SUBSCRIPTION_ID;
    keyHash = KEY_HASH;

    platform = await Platform.deploy(VRF_COORDINATOR, SUBSCRIPTION_ID, KEY_HASH);

    await platform.deployed();
  }

  saveFrontendFiles(platform, coordinatorAddress);

  console.log(
    `Platform with coordinator "${coordinatorAddress}", subscription ID "${subscriptionId}", and key hash of "${keyHash}" deployed to ${platform.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
