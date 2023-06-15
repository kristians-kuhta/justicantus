const { task } = require('hardhat');

task(
  'fulfillLastVRFRequest',
  `Impersonate VRF coordinator and fulfill a request`
).
  addPositionalParam('requestId').
  addPositionalParam('platformAddress').
  setAction(async ({ requestId, platformAddress }, { ethers }) => {
    const coordinatorAddress = process.env.VRF_COORDINATOR;

    if (!coordinatorAddress) {
      throw Error('VRF_COORDINATOR not present in .env file');
    }

    const Coordinator = await ethers.getContractFactory("VRFCoordinatorV2");
    const coordinator = await Coordinator.at(coordinatorAddress);

    await (await coordinator.fulfillRandomWords(requestId, platformAddress).wait());

    console.log(
      `Request ID of "${requestId}" on platform "${platformAddress}" fulfilled!`
    );
  });
}
