const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deployPlatform } = require('./utils');
const { BigNumber } = ethers;

describe('Played minutes reward', function() {
  it('returns the default value for rewards for played minute', async function () {
    const { platform } = await loadFixture(deployPlatform);

    const defaultReward = BigNumber.from('231481481481');
    expect(await platform.rewardForPlayedMinute()).to.eq(defaultReward);
  });

  it('sets and returns the reward for played minute', async function () {
    const { platform } = await loadFixture(deployPlatform);

    const defaultReward = BigNumber.from('231481481481');
    const reward = defaultReward.mul(2);

    await expect(
      platform.setRewardForPlayedMinute(reward)
    ).to.emit(platform, 'RewardForPlayedMinutesChanged').withArgs(
      reward
    );

    expect(await platform.rewardForPlayedMinute()).to.eq(reward);
  });

  it('does not set the reward for played minute to zero', async function () {
    const { platform } = await loadFixture(deployPlatform);

    await expect(
      platform.setRewardForPlayedMinute(0)
    ).to.be.reverted;
  });
});
