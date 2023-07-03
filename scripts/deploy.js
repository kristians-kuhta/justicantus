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

  const {
    VRF_COORDINATOR,
    SUBSCRIPTION_ID,
    KEY_HASH,
    VRF_ADMIN,
    NODE_ENV
  } = process.env;

  const vrfAdmin = await ethers.getImpersonatedSigner(VRF_ADMIN);

  let coordinator;
  let subscriptionId;

  if (hre.network.name === 'localhost') {
    const BASE_FEE = '100000000000000000';
    const GAS_PRICE_LINK = '1000000000';
    const SUBSCRIPTION_BALANCE = '10000000000000000000'; // 10 LINK

    const Coordinator = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    coordinator = await Coordinator.deploy(BASE_FEE, GAS_PRICE_LINK);
    await coordinator.deployed();

    // Create the subscription
    const createSubResponse = await coordinator.connect(vrfAdmin).createSubscription();
    const subTx = await createSubResponse.wait();
    subscriptionId = subTx.events[0].args.subId;

    // Fund the subscription
    await (await coordinator.connect(vrfAdmin).fundSubscription(subscriptionId, SUBSCRIPTION_BALANCE)).wait();
  } else {
    const Coordinator = await ethers.getContractFactory("VRFCoordinatorV2");
    coordinator = await Coordinator.attach(VRF_COORDINATOR);
    subscriptionId = SUBSCRIPTION_ID;
  }

  console.log('[Deploy] Deploying platform...');
  platform = await Platform.deploy(coordinator.address, subscriptionId, KEY_HASH);
  console.log('[Deploy] Deploy tx send...');

  await platform.deployed();

  console.log('[Deploy] Platform deployed...');
  console.log('[Deploy] Adding a consumer...');

  await (
    await coordinator.connect(vrfAdmin).addConsumer(subscriptionId, platform.address, { gasLimit: 300000})
  ).wait();

  console.log('[Deploy] Consumer added...');
  console.log('[Deploy] Saving deploy artifacts...');

  saveFrontendFiles(platform);

  console.log(
    `[Deploy] DONE!\nPlatform with coordinator "${coordinator.address}", subscription ID "${subscriptionId}", and key hash of "${KEY_HASH}" deployed to ${platform.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
