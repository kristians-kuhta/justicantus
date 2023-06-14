async function PlatformFixture(coordinator, subId, keyHash) {
  const Platform = await ethers.getContractFactory("Platform");
  const platform = await Platform.deploy( coordinator.address, subId, keyHash);

  await (await coordinator.addConsumer(subId, platform.address)).wait();

  return { platform };
}

module.exports = { PlatformFixture };
