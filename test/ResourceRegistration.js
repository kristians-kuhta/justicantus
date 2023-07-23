const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

const {
  deployPlatform,
  initializeArtistRegistration,
  initializeSongRegistration,
  fully_register_artist,
  fully_register_song
} = require('./utils');

describe("ResourceRegistration", function () {
  describe('Artist registration', function () {
    it('reverts when registering an artist without name', async function () {
      const { platform } = await loadFixture(deployPlatform);

      await expect(
        platform.registerArtist('')
      ).to.be.revertedWithCustomError(platform, 'ArtistNameRequired');
    });

    it('initializes artist registration', async function () {
      const { platform, coordinator, firstAccount } = await loadFixture(deployPlatform);

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
      } = await loadFixture(deployPlatform);

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
      } = await loadFixture(deployPlatform);

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
      } = await loadFixture(deployPlatform);

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
      } = await loadFixture(deployPlatform);

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
      } = await loadFixture(deployPlatform);

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
      const { platform } = await loadFixture(deployPlatform);

      await expect(
        platform.registerSong('something')
      ).to.be.revertedWithCustomError(platform, 'NotARegisteredArtist');
    });
  });
});
