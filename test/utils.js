const { expect } = require("chai");

const deployPlatform = async () => {
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

const initializeArtistRegistration = async (platform, coordinator, firstAccount, artistName) => {
  const registrationResponse = platform.connect(firstAccount).registerArtist(artistName);
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

const initializeSongRegistration = async (platform, coordinator, firstAccount, uri) => {
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

const fully_register_artist = async (platform, coordinator, account, artistName, vrfAdmin) => {
  // Unknown = 0; Artist = 1; Song = 2
  const RESOURCE_TYPE_ARTIST = 1;

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

const fully_register_song = async (
  platform,
  coordinator,
  account,
  uri,
  vrfAdmin,
  songId = null
) => {
  // Unknown = 0; Artist = 1; Song = 2
  const RESOURCE_TYPE_SONG = 2;

  // Chainlink VRF request id
  const requestId = await initializeSongRegistration(
    platform,
    coordinator,
    account,
    uri
  );

  const randomId = songId || 321;

  const impersonatedCoordinator = await ethers.getImpersonatedSigner(coordinator.address);

  await expect(
    platform.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, [randomId])
  ).to.emit(platform, 'ResourceRegistered').withArgs(
    account.address,
    RESOURCE_TYPE_SONG,
    randomId,
    uri
  );

  const returnedSongId = await platform.getArtistSongId(account.address, 0);
  expect((await platform.getArtistSongsCount(account.address)).toString()).to.eq('1');
  expect(await platform.isArtistSong(account.address, returnedSongId)).to.eq(true);
  expect(returnedSongId.toString()).not.to.eq('0');
  expect(await platform.getSongUri(returnedSongId)).to.eq(uri);
}

module.exports = {
  deployPlatform,
  initializeArtistRegistration,
  initializeSongRegistration,
  fully_register_artist,
  fully_register_song
};
