const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deployPlatform } = require('./utils');

describe('Managing reporters', function() {
  it('does not allow adding reporters by non-owner', async function() {
    const { platform, firstAccount, secondAccount } = await loadFixture(deployPlatform);

    await expect(
      platform.connect(firstAccount).addReporter(secondAccount.address)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('does not allow adding reporter if already added', async function() {
    const { platform, firstAccount, secondAccount } = await loadFixture(deployPlatform);

    await (await platform.addReporter(secondAccount.address)).wait();

    await expect(
      platform.addReporter(secondAccount.address)
    ).to.be.revertedWithCustomError(platform, 'AccountIsReporter');
  });

  it('adds a reporter when called by owner', async function() {
    const { platform, firstAccount } = await loadFixture(deployPlatform);

    await expect(
      platform.addReporter(firstAccount.address)
    ).to.emit(platform, 'ReporterAdded').withArgs(firstAccount.address);
  });

  it('does not allow removing reporters by non-owner', async function() {
    const { platform, firstAccount, secondAccount } = await loadFixture(deployPlatform);

    await (await platform.addReporter(secondAccount.address)).wait();

    await expect(
      platform.connect(firstAccount).removeReporter(secondAccount.address)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('does not allow removing reporters that are already removed', async function() {
    const { platform, firstAccount, secondAccount } = await loadFixture(deployPlatform);

    await (await platform.addReporter(secondAccount.address)).wait();
    await (await platform.removeReporter(secondAccount.address)).wait();

    await expect(
      platform.removeReporter(secondAccount.address)
    ).to.be.revertedWithCustomError(platform, 'AccountNotReporter');
  });

  it('removes a reporter when called by owner', async function() {
    const { platform, firstAccount } = await loadFixture(deployPlatform);

    await (await platform.addReporter(firstAccount.address)).wait();

    await expect(
      platform.removeReporter(firstAccount.address)
    ).to.emit(platform, 'ReporterRemoved').withArgs(firstAccount.address);
  });
});
