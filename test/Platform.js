const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Platform", function () {
  async function deployInstance() {
    const [owner, firstAccount] = await ethers.getSigners();

    // TODO: create and fund oracle subscription here
    const BASE_FEE = '100000000000000000';
    const GAS_PRICE_LINK = '1000000000';

    const Coordinator = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const coordinator = await Coordinator.deploy(BASE_FEE, GAS_PRICE_LINK);

    // Create the subscription
    const createSubResponse = await coordinator.createSubscription();
    const subTx = await createSubResponse.wait();
    const { subId } = subTx.events[0].args;

    // Fund the subscription
    await (await coordinator.fundSubscription(subId, 10)).wait();

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
      console.log({registrationTx});
      const requestId = registrationTx.logs[0].topics[1];

      // Registration is a two step process.
      // The oracle must return the random ID and complete the registration.
      expect(
        await platform.getArtistName(firstAccount.address)
      ).not.to.equal('First Artist');

      // Expecting that the ID has been assigned
      expect(
        (await platform.getArtistId(firstAccount.address)).toString()
      ).to.equal('0');
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

    it.only('initializes artist registration', async function () {
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

      // Chainlink VRF request id
      const requestId = await initializeArtistRegistration(
        platform,
        coordinator,
        firstAccount,
        'First Artist',
      );
    });
  });

  describe('Song registration', function () {
    it('registers a song', async function () {
      const { platform, firstAccount } = await loadFixture(deployInstance);

      await expect(
        platform.connect(firstAccount).registerArtist('First Artist')
      ).to.emit(platform, 'ArtistRegistered').withArgs(
        firstAccount.address,
        anyUint, // The artist's unique ID
        'First Artist'
      );

      const ipfsID = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
      const registerSongResponse = platform.connect(firstAccount).registerSong(ipfsID);

      await expect(registerSongResponse).to.emit(platform, 'SongRegistered').withArgs(
        firstAccount.address,
        anyUint, // The song's unique ID
        ipfsID
      );

      const registerTx = await (await registerSongResponse).wait();
      const songId = registerTx.logs[0].topics[2];

      expect(
        await platform.getSongUri(songId)
      ).to.equal(ipfsID);

      expect(
        (await platform.getArtistSongId(firstAccount.address, 0)).toString()
      ).to.equal('321');

      expect(
        (await platform.getArtistSongsCount(firstAccount.address)).toString()
      ).to.equal('1');
    });

    it('reverts when registering a song without providing uri', async function () {
      const { platform, firstAccount } = await loadFixture(deployInstance);

      await expect(
        platform.connect(firstAccount).registerArtist('First Artist')
      ).to.emit(platform, 'ArtistRegistered').withArgs(
        firstAccount.address,
        anyUint, // The artist's unique ID
        'First Artist'
      );

      await expect(
        platform.connect(firstAccount).registerSong('')
      ).to.be.revertedWithCustomError(platform, 'SongUriRequired');
    });

    it('reverts when registering song from an account that is not registered as an artist', async function () {
      const { platform, firstAccount } = await loadFixture(deployInstance);

      await expect(
        platform.connect(firstAccount).registerArtist('First Artist')
      ).to.emit(platform, 'ArtistRegistered').withArgs(
        firstAccount.address,
        anyUint, // The artist's unique ID
        'First Artist'
      );

      await expect(
        platform.registerSong('something')
      ).to.be.revertedWithCustomError(platform, 'NotARegisteredArtist');
    });
  });
});
