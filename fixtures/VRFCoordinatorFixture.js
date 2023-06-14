async function VRFCoordinatorFixture() {
  const BASE_FEE = '100000000000000000';
  const GAS_PRICE_LINK = '1000000000';
  const SUBSCRIPTION_BALANCE = '10000000000000000000'; // 10 LINK

  // random gas lane
  const KEY_HASH = "0xbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00d1";

  const Coordinator = await ethers.getContractFactory("VRFCoordinatorV2Mock");
  const coordinator = await Coordinator.deploy(BASE_FEE, GAS_PRICE_LINK);

  // Create the subscription
  const createSubResponse = await coordinator.createSubscription();
  const subTx = await createSubResponse.wait();
  const { subId } = subTx.events[0].args;

  // Fund the subscription
  await (await coordinator.fundSubscription(subId, SUBSCRIPTION_BALANCE)).wait();

  return { coordinator, subId, KEY_HASH };
}

module.exports = { VRFCoordinatorFixture };
