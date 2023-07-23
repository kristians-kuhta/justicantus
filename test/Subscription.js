const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { deployPlatform } = require('./utils');

describe('Subscription plans', function () {
  it('reverts when setting plan by non-owner', async function () {
    const { platform, firstAccount } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');
    const timestampIncrease = 15*24*60*60; // 15 days

    await expect(
      platform.connect(firstAccount).setSubscriptionPlan(price, timestampIncrease)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('reverts when trying to set plan and zero price provided', async function () {
    const { platform } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');
    const timestampIncrease = 15*24*60*60; // 15 days

    await expect(
      platform.setSubscriptionPlan(0, timestampIncrease)
    ).to.be.reverted;
  });

  it('reverts when trying to set plan and zero timestamp increase provided', async function () {
    const { platform } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');

    await expect(
      platform.setSubscriptionPlan(price, 0)
    ).to.be.reverted;
  });

  it('sets the subscription plan price and timestamp increase', async function () {
    const { platform } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');
    const timestampIncrease = 15*24*60*60; // 15 days

    await expect(
      platform.setSubscriptionPlan(price, timestampIncrease)
    ).to.emit(platform, 'SubscriptionPlanAdded').withArgs(price, timestampIncrease);

    expect(
      await platform.subscriptionPlanIntervals(price)
    ).to.eq(timestampIncrease);
  });
});

describe('Subscription creation', function () {
  it('reverts when subscription already created', async function () {
    const { platform, firstAccount } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');
    const timestampIncrease = 15*24*60*60; // 15 days

    await ( await platform.setSubscriptionPlan(price, timestampIncrease)).wait();
    await (await platform.connect(firstAccount).createSubscription({ value: price })).wait();

    await expect(
      platform.connect(firstAccount).createSubscription({ value: price })
    ).to.be.revertedWithCustomError(platform, 'SubscriptionAlreadyCreated');
  });

  it(
    'reverts when trying to create a subscription and sending value that does not match a plan',
    async function () {
      const { platform, firstAccount } = await loadFixture(deployPlatform);

      const price = ethers.utils.parseEther('0.005');

      await expect(
        platform.connect(firstAccount).createSubscription({ value: price })
      ).to.be.revertedWithCustomError(platform, 'ValueMustMatchOneOfThePlans');
    }
  );

  it('reverts when trying to create a subscription without sending value', async function () {
    const { platform, firstAccount } = await loadFixture(deployPlatform);

    await expect(
      platform.connect(firstAccount).createSubscription()
    ).to.be.revertedWithCustomError(platform, 'ValueMustMatchOneOfThePlans');
  });

  it('creates a subscription', async function () {
    const { platform, firstAccount } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');
    const timestampIncrease = 15*24*60*60; // 15 days

    await ( await platform.setSubscriptionPlan(price, timestampIncrease)).wait();

    const blockTimestamp = await time.latest();
    const newBlockTimestamp = blockTimestamp + 1;
    await time.setNextBlockTimestamp(newBlockTimestamp);

    await expect(
      platform.connect(firstAccount).createSubscription({ value: price })
    ).to.emit(platform, 'SubscriptionCreated').withArgs(
      firstAccount.address,
      newBlockTimestamp + timestampIncrease,
      timestampIncrease
    );

    expect(
      await platform.isActiveSubscriber(firstAccount.address)
    ).to.eq(true);
  });

  it('returns false when checking if expired subscriber is active', async function () {

    const { platform, firstAccount } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');
    const timestampIncrease = 15*24*60*60; // 15 days

    await ( await platform.setSubscriptionPlan(price, timestampIncrease)).wait();

    const blockTimestamp = await time.latest();
    const newBlockTimestamp = blockTimestamp + 1;
    await time.setNextBlockTimestamp(newBlockTimestamp);

    await expect(
      platform.connect(firstAccount).createSubscription({ value: price })
    ).to.emit(platform, 'SubscriptionCreated').withArgs(
      firstAccount.address,
      newBlockTimestamp + timestampIncrease,
      timestampIncrease
    );

    const timestampNow = await time.latest();
    const lastValidTimestamp = timestampNow + timestampIncrease;
    await time.increaseTo(lastValidTimestamp);

    expect(
      await platform.isActiveSubscriber(firstAccount.address)
    ).to.eq(true);

    const expiredTimestamp = lastValidTimestamp + 1;
    await time.increaseTo(expiredTimestamp);

    expect(
      await platform.isActiveSubscriber(firstAccount.address)
    ).to.eq(false);
  });
});

describe('Subscription funding', function () {
  it('reverts when trying to fund before creating subscription', async function () {
    const { platform, firstAccount } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');
    const timestampIncrease = 15*24*60*60; // 15 days

    await ( await platform.setSubscriptionPlan(price, timestampIncrease)).wait();

    await expect(
      platform.connect(firstAccount).fundSubscription({ value: price })
    ).to.be.revertedWithCustomError(platform, 'SubscriptionNotCreated');
  });

  it(
    'reverts when trying to fund a subscription and sending value that does not match a plan',
    async function () {
    const { platform, firstAccount } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');
    const timestampIncrease = 15*24*60*60; // 15 days

    await ( await platform.setSubscriptionPlan(price, timestampIncrease)).wait();

    const blockTimestamp = await time.latest();
    const newBlockTimestamp = blockTimestamp + 1;
    await time.setNextBlockTimestamp(newBlockTimestamp);

    await expect(
      platform.connect(firstAccount).createSubscription({ value: price })
    ).to.emit(platform, 'SubscriptionCreated').withArgs(
      firstAccount.address,
      newBlockTimestamp + timestampIncrease,
      timestampIncrease
    );

    const arbitraryValue = ethers.utils.parseEther('1.23');

    await expect(
      platform.connect(firstAccount).fundSubscription({ value: arbitraryValue  })
    ).to.be.revertedWithCustomError(platform, 'ValueMustMatchOneOfThePlans');
    }
  );

  it('reverts when trying to fund a subscription without sending value', async function () {
    const { platform, firstAccount } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');
    const timestampIncrease = 15*24*60*60; // 15 days

    await ( await platform.setSubscriptionPlan(price, timestampIncrease)).wait();

    const blockTimestamp = await time.latest();
    const newBlockTimestamp = blockTimestamp + 1;
    await time.setNextBlockTimestamp(newBlockTimestamp);

    await expect(
      platform.connect(firstAccount).createSubscription({ value: price })
    ).to.emit(platform, 'SubscriptionCreated').withArgs(
      firstAccount.address,
      newBlockTimestamp + timestampIncrease,
      timestampIncrease
    );

    await expect(
      platform.connect(firstAccount).fundSubscription()
    ).to.be.revertedWithCustomError(platform, 'ValueMustMatchOneOfThePlans');
  });

  it('funds a subscription', async function () {
    const { platform, firstAccount } = await loadFixture(deployPlatform);

    const price = ethers.utils.parseEther('0.005');
    const timestampIncrease = 15*24*60*60; // 15 days

    await ( await platform.setSubscriptionPlan(price, timestampIncrease)).wait();

    const blockTimestamp = await time.latest();
    const newBlockTimestamp = blockTimestamp + 1;
    await time.setNextBlockTimestamp(newBlockTimestamp);

    await expect(
      platform.connect(firstAccount).createSubscription({ value: price })
    ).to.emit(platform, 'SubscriptionCreated').withArgs(
      firstAccount.address,
      newBlockTimestamp + timestampIncrease,
      timestampIncrease
    );

    await expect(
      platform.connect(firstAccount).fundSubscription({ value: price })
    ).to.emit(platform, 'SubscriptionFunded').withArgs(
      firstAccount.address,
      // First we created with 15 days, then we fund with another 15 days
      newBlockTimestamp + 2 * timestampIncrease,
      timestampIncrease
    );
  });
});
