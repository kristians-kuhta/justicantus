require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
// TODO: when deploying -> store the addresses both in hardhat project and frontend
const contractAddresses = require('./frontend/src/contracts/contract-addresses.json');

task(
  "vrf_fulfill",
  "Fulfills VRF random number request"
).
  addPositionalParam('requestId').
  addPositionalParam('value').
  setAction(async ({ requestId, value }, hre, runSuper) => {
    // TODO: possibly reuse most of this tasks logic in tests
    const { VRF_COORDINATOR, SUBSCRIPTION_ID, KEY_HASH } = process.env;

    const Platform = await ethers.getContractFactory("Platform");
    const platform = await Platform.attach(contractAddresses.Platform);

    const someEther = ethers.utils.parseEther('0.3');

    // Give coordinator some ETH
    await network.provider.send(
      "hardhat_setBalance",
      [
        VRF_COORDINATOR,
        someEther.toHexString().replace("0x0", "0x")
      ]
    );

    const impersonatedCoordinator = await ethers.getImpersonatedSigner(VRF_COORDINATOR);

    await platform.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, [value], { gasLimit: 300000 });
  }
);

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: process.env.INFURA_SEPOLIA_URL
      }
    }
  }
};
