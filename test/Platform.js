const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Platform", function () {
  async function deployInstance() {
    const [owner, firstAccount] = await ethers.getSigners();

    const Platform = await ethers.getContractFactory("Platform");
    const platform = await Platform.deploy();

    return { platform, owner, firstAccount };
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

    it("assigns an ID that is different from the previous artist's ID");

    it('registers an artist', async function () {
      const { platform, firstAccount } = await loadFixture(deployInstance);

      await expect(
        platform.connect(firstAccount).registerArtist('First Artist')
      ).to.emit(platform, 'ArtistRegistered').withArgs(
        firstAccount.address,
        anyUint, // The artist's unique ID
        'First Artist'
      );

      expect(
        await platform.getArtistName(firstAccount.address)
      ).to.equal('First Artist');

      // Expecting that the ID has been assigned
      expect(
        await platform.getArtistId(firstAccount.address).toString()
      ).not.to.equal('0');
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
