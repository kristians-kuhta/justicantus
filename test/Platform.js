const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Platform", function () {
  async function deployInstance() {
    const [owner, firstAccount, secondAccount] = await ethers.getSigners();

    const { KEY_HASH } = process.env;
    const vrfAdmin = firstAccount;

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
    const Platform = await ethers.getContractFactory("Platform");
    const platform = await Platform.deploy(coordinator.address, subscriptionId, KEY_HASH);

    const oneEther = ethers.utils.parseEther('1');

    // Give coordinator some ETH
    await network.provider.send(
      "hardhat_setBalance",
      [
        coordinator.address,
        oneEther.toHexString().replace("0x0", "0x")
      ]
    );

    await (
      await coordinator.connect(vrfAdmin).addConsumer(subscriptionId, platform.address, { gasLimit: 300000})
    ).wait();

    return {
      platform,
      coordinator,
      owner,
      firstAccount,
      secondAccount,
      vrfAdmin
    };
  }

  async function initializeArtistRegistration(
    platform,
    coordinator,
    firstAccount,
    artistName
  ) {
    const registrationResponse = platform.connect(firstAccount).registerArtist('First Artist');
    await expect(registrationResponse).to.emit(coordinator, 'RandomWordsRequested');

    const registrationTx = await (await registrationResponse).wait();
    const event = registrationTx.events[0];
    const eventSignature = 'RandomWordsRequested(bytes32,uint256,uint256,uint64,uint16,uint32,uint32,address)';
    const eventAbi = coordinator.interface.events[eventSignature];
    const decodedData = ethers.utils.defaultAbiCoder.decode(
      eventAbi.inputs.filter(i => !i.indexed),
      event.data,
      event.topics.slice(1)
    );

    const { requestId } = decodedData;

    // Registration is a two step process.
    // The oracle must return the random ID and complete the registration.
    expect(
      await platform.getArtistName(firstAccount.address)
    ).not.to.equal('First Artist');

    // Expecting that the ID hasn't been assigned
    expect(
      (await platform.getArtistId(firstAccount.address)).toString()
    ).to.equal('0');

    return requestId;
  }

  async function initializeSongRegistration(
    platform,
    coordinator,
    firstAccount,
    uri
  ) {
    const SONG_URI = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
    const registrationResponse = platform.connect(firstAccount).registerSong(SONG_URI);
    await expect(registrationResponse).to.emit(coordinator, 'RandomWordsRequested');

    const registrationTx = await (await registrationResponse).wait();
    const event = registrationTx.events[0];
    const eventSignature = 'RandomWordsRequested(bytes32,uint256,uint256,uint64,uint16,uint32,uint32,address)';
    const eventAbi = coordinator.interface.events[eventSignature];
    const decodedData = ethers.utils.defaultAbiCoder.decode(
      eventAbi.inputs.filter(i => !i.indexed),
      event.data,
      event.topics.slice(1)
    );

    const { requestId } = decodedData;

    // Registration is a two step process.
    // The oracle must return the random ID and complete the registration.
    expect(
      (await platform.getArtistSongsCount(firstAccount.address)).toString()
    ).to.equal('0');

    return requestId;
  }

  async function fully_register_artist(
    platform,
    coordinator,
    account,
    artistName,
    vrfAdmin
  ) {
    // Unknown = 0; Artist = 1; Song = 2
    const RESOURCE_TYPE_ARTIST = 1;

    // Chainlink VRF request id
    const requestId = await initializeArtistRegistration(
      platform,
      coordinator,
      account,
      artistName
    );

    const randomId = 123;

    const impersonatedCoordinator = await ethers.getImpersonatedSigner(coordinator.address);

    await expect(
      platform.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, [randomId])
    ).to.emit(platform, 'ResourceRegistered').withArgs(
      account.address,
      RESOURCE_TYPE_ARTIST,
      randomId,
      artistName
    );

    const artistId = await platform.getArtistId(account.address);
    expect(artistId.toString()).not.to.be.eq('0');
    expect(await platform.getArtistName(account.address)).to.eq(artistName);
  }

  async function fully_register_song(
    platform,
    coordinator,
    account,
    uri,
    vrfAdmin
  ) {
    // Unknown = 0; Artist = 1; Song = 2
    const RESOURCE_TYPE_SONG = 2;

    // Chainlink VRF request id
    const requestId = await initializeSongRegistration(
      platform,
      coordinator,
      account,
      uri
    );

    const randomId = 321;

    const impersonatedCoordinator = await ethers.getImpersonatedSigner(coordinator.address);

    await expect(
      platform.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, [randomId])
    ).to.emit(platform, 'ResourceRegistered').withArgs(
      account.address,
      RESOURCE_TYPE_SONG,
      randomId,
      uri
    );

    const songId = await platform.getArtistSongId(account.address, 0);
    expect((await platform.getArtistSongsCount(account.address)).toString()).to.eq('1');
    expect(songId.toString()).not.to.eq('0');
    expect(await platform.getSongUri(songId)).to.eq(uri);
  }

  describe("Deployment", function () {
    it("sets the owner", async function () {
      const { platform, owner } = await loadFixture(deployInstance)

      expect(await platform.owner()).to.equal(owner.address);
    });
  });

  describe('Artist registration', function () {
    it('reverts when registering an artist without name', async function () {
      const { platform } = await loadFixture(deployInstance)

      await expect(
        platform.registerArtist('')
      ).to.be.revertedWithCustomError(platform, 'ArtistNameRequired');
    });

    it('initializes artist registration', async function () {
      const { platform, coordinator, firstAccount } = await loadFixture(deployInstance)

      // Chainlink VRF request id
      await initializeArtistRegistration(
        platform,
        coordinator,
        firstAccount,
        'First Artist',
      );
    });

    it('reverts when trying to register artist twice from the same account', async function () {
      const {
        platform,
        coordinator,
        firstAccount,
        vrfAdmin
      } = await loadFixture(deployInstance)

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist',
        vrfAdmin
      );
      await expect(
        platform.connect(firstAccount).registerArtist('Other Artist?')
      ).to.be.revertedWithCustomError(platform, 'ArtistAlreadyRegistered');
    });

    it('completes artist registration', async function () {
      const {
        platform,
        coordinator,
        firstAccount,
        vrfAdmin
      } = await loadFixture(deployInstance)

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist',
        vrfAdmin
      );
    });
  });

  describe('Song registration', function () {
    it('initializes song registration', async function () {
      const {
        platform,
        coordinator,
        firstAccount,
        vrfAdmin
      } = await loadFixture(deployInstance)

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist',
        vrfAdmin
      );

      const ipfsID = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';

      await initializeSongRegistration(
        platform,
        coordinator,
        firstAccount,
        ipfsID
      );
    });

    it('completes song registration', async function () {
      const {
        platform,
        coordinator,
        firstAccount,
        vrfAdmin
      } = await loadFixture(deployInstance)

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist',
        vrfAdmin
      );

      const ipfsID = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';

      await fully_register_song(
        platform,
        coordinator,
        firstAccount,
        ipfsID
      );
    });

    it('reverts when registering a song without providing uri', async function () {
      const {
        platform,
        coordinator,
        firstAccount,
        vrfAdmin
      } = await loadFixture(deployInstance)

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist',
        vrfAdmin
      );

      await expect(
        platform.connect(firstAccount).registerSong('')
      ).to.be.revertedWithCustomError(platform, 'SongUriRequired');
    });

    it('reverts when registering song from an account that is not registered as an artist', async function () {
      const { platform } = await loadFixture(deployInstance)

      await expect(
        platform.registerSong('something')
      ).to.be.revertedWithCustomError(platform, 'NotARegisteredArtist');
    });
  });

  describe('Subscription plans', function () {
    it('reverts when setting plan by non-owner', async function () {
      const { platform, firstAccount } = await loadFixture(deployInstance)

      const price = ethers.utils.parseEther('0.005');
      const timestampIncrease = 15*24*60*60; // 15 days

      await expect(
        platform.connect(firstAccount).setSubscriptionPlan(price, timestampIncrease)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('reverts when trying to set plan and zero price provided', async function () {
      const { platform } = await loadFixture(deployInstance)

      const price = ethers.utils.parseEther('0.005');
      const timestampIncrease = 15*24*60*60; // 15 days

      await expect(
        platform.setSubscriptionPlan(0, timestampIncrease)
      ).to.be.reverted;
    });

    it('reverts when trying to set plan and zero timestamp increase provided', async function () {
      const { platform } = await loadFixture(deployInstance)

      const price = ethers.utils.parseEther('0.005');

      await expect(
        platform.setSubscriptionPlan(price, 0)
      ).to.be.reverted;
    });

    it('sets the subscription plan price and timestamp increase', async function () {
      const { platform } = await loadFixture(deployInstance)

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
      //TODO: get rid of unused firstAccount everywhere
      const { platform, firstAccount } = await loadFixture(deployInstance)

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
        const { platform, firstAccount } = await loadFixture(deployInstance)

        const price = ethers.utils.parseEther('0.005');

        await expect(
          platform.connect(firstAccount).createSubscription({ value: price })
        ).to.be.revertedWithCustomError(platform, 'ValueMustMatchOneOfThePlans');
      }
    );

    it('reverts when trying to create a subscription without sending value', async function () {
      const { platform, firstAccount } = await loadFixture(deployInstance)

      await expect(
        platform.connect(firstAccount).createSubscription()
      ).to.be.revertedWithCustomError(platform, 'ValueMustMatchOneOfThePlans');
    });

    it('creates a subscription', async function () {
      const { platform, firstAccount } = await loadFixture(deployInstance)

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

      const { platform, firstAccount } = await loadFixture(deployInstance)

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
      //TODO: get rid of unused firstAccount everywhere
      const { platform, firstAccount } = await loadFixture(deployInstance)

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
      const { platform, firstAccount } = await loadFixture(deployInstance)

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
      const { platform, firstAccount } = await loadFixture(deployInstance)

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
      const { platform, firstAccount } = await loadFixture(deployInstance)

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

  describe('Managing reporters', function() {
    it('does not allow adding reporters by non-owner', async function() {
      const { platform, firstAccount, secondAccount } = await loadFixture(deployInstance)

      await expect(
        platform.connect(firstAccount).addReporter(secondAccount.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('does not allow adding reporter if already added', async function() {
      const { platform, firstAccount, secondAccount } = await loadFixture(deployInstance)

      await (await platform.addReporter(secondAccount.address)).wait();

      await expect(
        platform.addReporter(secondAccount.address)
      ).to.be.revertedWithCustomError(platform, 'AccountIsReporter');
    });

    it('adds a reporter when called by owner', async function() {
      const { platform, firstAccount } = await loadFixture(deployInstance)

      await expect(
        platform.addReporter(firstAccount.address)
      ).to.emit(platform, 'ReporterAdded').withArgs(firstAccount.address);
    });

    it('does not allow removing reporters by non-owner', async function() {
      const { platform, firstAccount, secondAccount } = await loadFixture(deployInstance)

      await (await platform.addReporter(secondAccount.address)).wait();

      await expect(
        platform.connect(firstAccount).removeReporter(secondAccount.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('does not allow removing reporters that are already removed', async function() {
      const { platform, firstAccount, secondAccount } = await loadFixture(deployInstance)

      await (await platform.addReporter(secondAccount.address)).wait();
      await (await platform.removeReporter(secondAccount.address)).wait();

      await expect(
        platform.removeReporter(secondAccount.address)
      ).to.be.revertedWithCustomError(platform, 'AccountNotReporter');
    });

    it('removes a reporter when called by owner', async function() {
      const { platform, firstAccount } = await loadFixture(deployInstance)

      await (await platform.addReporter(firstAccount.address)).wait();

      await expect(
        platform.removeReporter(firstAccount.address)
      ).to.emit(platform, 'ReporterRemoved').withArgs(firstAccount.address);
    });
  });

  describe('Updating played minutes', function() {
    it('does not allow updating played minutes by non-reporter', async function() {
    });

    it('does not allow updating played minutes when no artist addresses are provided', async function() {
    });

    it('does not allow updating played minutes when one of the addresses is not an artist', async function() {
    });

    it('does not allow to update artist played minutes to less than they where before', async function() {
    });
  });
});
