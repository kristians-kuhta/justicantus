const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { BigNumber } = ethers;
const {
  deployPlatform,
  fully_register_artist,
  fully_register_song,
} = require('./utils');

describe("Platform", function () {
  async function setUpArtistForClaimingRewards(
    platform,
    coordinator,
    firstAccount,
    secondAccount,
    vrfAdmin
  ) {
      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist',
        vrfAdmin
      );

      const ipfsID = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
      const songId = 123;
      const playedMinutes = 1000;

      await fully_register_song(
        platform,
        coordinator,
        firstAccount,
        ipfsID,
        songId
      );

      await expect(
        platform.setRewardForPlayedMinute(2)
      ).to.emit(platform, 'RewardForPlayedMinutesChanged').withArgs(2);

      await (await platform.addReporter(secondAccount.address)).wait();
      await expect (
        platform.connect(secondAccount).updatePlayedMinutes([{
          artist: firstAccount.address,
          playedMinutes
        }])
      ).to.emit(platform, 'PlayedMinutesUpdated');
  }

  describe("Deployment", function () {
    it("sets the owner", async function () {
      const { platform, owner } = await loadFixture(deployPlatform);

      expect(await platform.owner()).to.equal(owner.address);
    });
  });

  describe('Updating played minutes', function() {
    it('does not allow updating played minutes by non-reporter', async function() {
      const { platform, firstAccount } = await loadFixture(deployPlatform);

      const artistUpdate = {
        artist: firstAccount.address,
        playedMinutes: 123
      };

      await expect(
        platform.updatePlayedMinutes([artistUpdate])
      ).to.be.revertedWithCustomError(platform, 'AccountNotReporter');
    });

    it('does not allow updating played minutes when no updates are provided', async function() {
      const { platform } = await loadFixture(deployPlatform);

      await expect(
        platform.updatePlayedMinutes([])
      ).to.be.revertedWithCustomError(platform, 'AccountNotReporter');
    });

    it('does not allow updating played minutes when one of the addresses is not an artist', async function() {
      const {
        platform,
        coordinator,
        vrfAdmin,
        firstAccount,
        secondAccount
      } = await loadFixture(deployPlatform);

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'Doesnotmatter',
        vrfAdmin
      );

      await (await platform.addReporter(secondAccount.address)).wait();

      const artistUpdates = [
        {
          artist: firstAccount.address,
          playedMinutes: 123
        },
        {
          artist: ethers.constants.AddressZero,
          playedMinutes: 212
        }
      ];

      await expect(
        platform.connect(secondAccount).updatePlayedMinutes(artistUpdates)
      ).to.be.revertedWithCustomError(platform, 'UpdateInvalid').withArgs(
        ethers.constants.AddressZero,
        212
      );
    });

    it('does not allow to update artist played minutes to less than they where before', async function() {
      const {
        platform,
        coordinator,
        vrfAdmin,
        firstAccount,
        secondAccount
      } = await loadFixture(deployPlatform);

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'Doesnotmatter',
        vrfAdmin
      );

      await (await platform.addReporter(secondAccount.address)).wait();

      const artistUpdates1 = [
        {
          artist: firstAccount.address,
          playedMinutes: 123
        },
      ];

      const artistUpdates2 = [
        {
          artist: firstAccount.address,
          playedMinutes: 122
        },
      ];

      await (await platform.connect(secondAccount).updatePlayedMinutes(artistUpdates1)).wait();

      await expect(
        platform.connect(secondAccount).updatePlayedMinutes(artistUpdates2)
      ).to.be.revertedWithCustomError(platform, 'UpdateInvalid').withArgs(
        firstAccount.address,
        122
      );
    });

    it('stores the initial played minutes', async function() {
      const {
        platform,
        coordinator,
        vrfAdmin,
        firstAccount,
        secondAccount
      } = await loadFixture(deployPlatform);

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'Doesnotmatter',
        vrfAdmin
      );

      await (await platform.addReporter(secondAccount.address)).wait();

      expect(await platform.artistPlayedMinutes(firstAccount.address)).to.eq(BigNumber.from(0));

      const artistUpdates = [
        {
          artist: firstAccount.address,
          playedMinutes: 123
        }
      ];

      await expect(
        platform.connect(secondAccount).updatePlayedMinutes(artistUpdates)
      ).to.emit(platform, 'PlayedMinutesUpdated');

      expect(await platform.artistPlayedMinutes(firstAccount.address)).to.eq(BigNumber.from(123));
    });

    it('stores the second update of played minutes', async function() {
      const {
        platform,
        coordinator,
        vrfAdmin,
        firstAccount,
        secondAccount
      } = await loadFixture(deployPlatform);

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'Doesnotmatter',
        vrfAdmin
      );

      await (await platform.addReporter(secondAccount.address)).wait();

      expect(await platform.artistPlayedMinutes(firstAccount.address)).to.eq(BigNumber.from(0));

      const artistUpdates1 = [
        {
          artist: firstAccount.address,
          playedMinutes: 123
        }
      ];

      await expect(
        platform.connect(secondAccount).updatePlayedMinutes(artistUpdates1)
      ).to.emit(platform, 'PlayedMinutesUpdated');

      expect(await platform.artistPlayedMinutes(firstAccount.address)).to.eq(BigNumber.from(123));

      const artistUpdates2 = [
        {
          artist: firstAccount.address,
          playedMinutes: 124
        }
      ];

      await expect(
        platform.connect(secondAccount).updatePlayedMinutes(artistUpdates2)
      ).to.emit(platform, 'PlayedMinutesUpdated');

      expect(await platform.artistPlayedMinutes(firstAccount.address)).to.eq(BigNumber.from(124));
    });
  });

  describe('Claiming of rewards', function() {
    it('returns unclaimed ether amount', async function () {
      const {
        platform,
        coordinator,
        firstAccount,
        secondAccount,
        vrfAdmin
      } = await loadFixture(deployPlatform);

      await setUpArtistForClaimingRewards(
        platform,
        coordinator,
        firstAccount,
        secondAccount,
        vrfAdmin
      );

      expect(await platform.artistUnclaimedAmount(firstAccount.address)).to.eq(2000);
    });

    it('does not allow claiming for non-artists', async function () {
      const {
        platform,
        coordinator,
        firstAccount,
        secondAccount,
        vrfAdmin
      } = await loadFixture(deployPlatform);

      await setUpArtistForClaimingRewards(
        platform,
        coordinator,
        firstAccount,
        secondAccount,
        vrfAdmin
      );

      expect(await platform.artistUnclaimedAmount(firstAccount.address)).to.eq(2000);

      await expect(
        platform.connect(secondAccount).claimRewards()
      ).to.be.revertedWithCustomError(platform, 'NotARegisteredArtist');
    });

    it('does not allow claiming when no claimable minutes', async function () {
      const {
        platform,
        coordinator,
        firstAccount,
        secondAccount,
        vrfAdmin
      } = await loadFixture(deployPlatform);

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist',
        vrfAdmin
      );

      expect(await platform.artistUnclaimedAmount(firstAccount.address)).to.eq(0);

      await expect(
        platform.connect(firstAccount).claimRewards()
      ).to.be.revertedWithCustomError(platform, 'NoClaimableRewards');
    });

    it('claims unclaimed minutes and receives ether', async function () {
      const {
        platform,
        coordinator,
        firstAccount,
        secondAccount,
        vrfAdmin
      } = await loadFixture(deployPlatform);

      await setUpArtistForClaimingRewards(
        platform,
        coordinator,
        firstAccount,
        secondAccount,
        vrfAdmin
      );

      const subscriptionPrice = ethers.utils.parseEther('0.01');
      const subscriptionIncrease = 15*24*60*60; // 15 days

      await expect(
        platform.setSubscriptionPlan(subscriptionPrice, subscriptionIncrease)
      ).to.emit(platform, 'SubscriptionPlanAdded').withArgs(subscriptionPrice, subscriptionIncrease);

      const blockTimestamp = await time.latest();
      const newBlockTimestamp = blockTimestamp + 1;
      await time.setNextBlockTimestamp(newBlockTimestamp);

      await expect(
        platform.connect(secondAccount).createSubscription({ value: subscriptionPrice })
      ).to.emit(platform, 'SubscriptionCreated').withArgs(
        secondAccount.address,
        newBlockTimestamp + subscriptionIncrease,
        subscriptionIncrease
      );

      expect(await platform.artistUnclaimedAmount(firstAccount.address)).to.eq(2000);

      const artistBalanceBefore = await platform.provider.getBalance(firstAccount.address);
      const platformBalanceBefore = await platform.provider.getBalance(platform.address);

      const claimTx = platform.connect(firstAccount).claimRewards();
      const claimReceipt = await (await claimTx).wait();

      await expect(claimTx).to.emit(platform, 'RewardsClaimed').withArgs(
        firstAccount.address,
        2000
      );

      const artistBalanceAfter = await platform.provider.getBalance(firstAccount.address);
      const platformBalanceAfter = await platform.provider.getBalance(platform.address);

      const gasFee = claimReceipt.gasUsed.mul(claimReceipt.effectiveGasPrice);

      expect(artistBalanceAfter.sub(artistBalanceBefore.sub(gasFee))).to.eq(2000);

      expect(platformBalanceBefore.sub(platformBalanceAfter)).to.eq(2000);
    });
  });
});
