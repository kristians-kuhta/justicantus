const { VRFCoordinatorFixture } = require("../fixtures/VRFCoordinatorFixture");
const { PlatformFixture } = require("../fixtures/PlatformFixture");

async function PlatformAndCoordinatorFixture() {
  const [owner, firstAccount] = await ethers.getSigners();

  const { coordinator, subId, KEY_HASH } = await VRFCoordinatorFixture();
  const { platform } = await PlatformFixture(coordinator, subId, KEY_HASH);

  // TODO: make sure all of these are actually being used
  return { platform, coordinator, subId, KEY_HASH, owner, firstAccount };
}

module.exports = { PlatformAndCoordinatorFixture };
