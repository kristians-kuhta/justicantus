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
});
