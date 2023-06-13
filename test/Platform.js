const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Platform", function () {
  async function deployInstance() {
    const [owner, firstAccount] = await ethers.getSigners();

    const BASE_FEE = '100000000000000000';
    const GAS_PRICE_LINK = '1000000000';
    const SUBSCRIPTION_BALANCE = '10000000000000000000'; // 10 LINK

    const Coordinator = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const coordinator = await Coordinator.deploy(BASE_FEE, GAS_PRICE_LINK);

    // Create the subscription
    const createSubResponse = await coordinator.createSubscription();
    const subTx = await createSubResponse.wait();
    const { subId } = subTx.events[0].args;

    // Fund the subscription
    await (await coordinator.fundSubscription(subId, SUBSCRIPTION_BALANCE)).wait();

    const Platform = await ethers.getContractFactory("Platform");
    const platform = await Platform.deploy(
      coordinator.address,
      subId,
      // random gas lane
      "0xbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00d1"
    );

    await (await coordinator.addConsumer(subId, platform.address)).wait();

    return { platform, coordinator, owner, firstAccount };
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

  async function fully_register_artist(platform, coordinator, account, artistName) {
    // Unknown = 0; Artist = 1; Song = 2
    const RESOURCE_TYPE_ARTIST = 1;

    // Chainlink VRF request id
    const requestId = await initializeArtistRegistration(
      platform,
      coordinator,
      account,
      artistName
    );

    await expect(
      coordinator.fulfillRandomWords(requestId, platform.address)
    ).to.emit(platform, 'ResourceRegistered').withArgs(
      account.address,
      RESOURCE_TYPE_ARTIST,
      anyUint,
      artistName
    );

    const artistId = await platform.getArtistId(account.address);
    expect(artistId.toString()).not.to.be.eq('0');
    expect(await platform.getArtistName(account.address)).to.eq(artistName);
  }

  async function fully_register_song(platform, coordinator, account, uri) {
    // Unknown = 0; Artist = 1; Song = 2
    const RESOURCE_TYPE_SONG = 2;

    // Chainlink VRF request id
    const requestId = await initializeSongRegistration(
      platform,
      coordinator,
      account,
      uri
    );

    await expect(
      coordinator.fulfillRandomWords(requestId, platform.address)
    ).to.emit(platform, 'ResourceRegistered').withArgs(
      account.address,
      RESOURCE_TYPE_SONG,
      anyUint,
      uri
    );

    const songId = await platform.getArtistSongId(account.address, 0);
    expect((await platform.getArtistSongsCount(account.address)).toString()).to.eq('1');
    expect(songId.toString()).not.to.eq('0');
    expect(await platform.getSongUri(songId)).to.eq(uri);
  }

  describe("Deployment", function () {
    it("sets the owner", async function () {
      const { platform, owner } = await loadFixture(deployInstance);

      expect(await platform.owner()).to.equal(owner.address);
    });
  });

  describe('Artist registration', function () {
    it('reverts when registering an artist without name', async function () {
      const { platform, firstAccount } = await loadFixture(deployInstance);

      await expect(
        platform.registerArtist('')
      ).to.be.revertedWithCustomError(platform, 'ArtistNameRequired');
    });

    it('initializes artist registration', async function () {
      const { platform, coordinator, firstAccount } = await loadFixture(deployInstance);

      // Chainlink VRF request id
      await initializeArtistRegistration(
        platform,
        coordinator,
        firstAccount,
        'First Artist',
      );
    });

    it('completes artist registration', async function () {
      const { platform, coordinator, firstAccount } = await loadFixture(deployInstance);

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist'
      );
    });
  });

  describe('Song registration', function () {
    it('initializes song registration', async function () {
      const { platform, coordinator, firstAccount } = await loadFixture(deployInstance);

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist'
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
      const { platform, coordinator, firstAccount } = await loadFixture(deployInstance);

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist'
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
      const { platform, coordinator, firstAccount } = await loadFixture(deployInstance);

      await fully_register_artist(
        platform,
        coordinator,
        firstAccount,
        'First Artist'
      );

      await expect(
        platform.connect(firstAccount).registerSong('')
      ).to.be.revertedWithCustomError(platform, 'SongUriRequired');
    });

    it('reverts when registering song from an account that is not registered as an artist', async function () {
      const { platform, firstAccount } = await loadFixture(deployInstance);

      await expect(
        platform.registerSong('something')
      ).to.be.revertedWithCustomError(platform, 'NotARegisteredArtist');
    });
  });
});
