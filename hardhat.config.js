require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");

require('dotenv').config();

task(
  "vrf_fulfill",
  "Fulfills VRF random number request"
).
  addPositionalParam('requestId').
  addPositionalParam('value').
  setAction(async ({ requestId, value }, hre, runSuper) => {
    const contractAddresses = require('./build/contract-addresses.json');

    // TODO: possibly reuse most of this tasks logic in tests
    const { VRF_COORDINATOR } = process.env;

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

    // TODO: in dev. environment -> take this coordinator address from the deploy artifacts
    const impersonatedCoordinator = await ethers.getImpersonatedSigner(VRF_COORDINATOR);

    await platform.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, [value], { gasLimit: 300000 });
    console.log(`Fulfilled a request (ID=${requestId}) with value ${value}`);
  }
);

task(
  'add_subscription_plan',
  'Add a subscription plan'
).addPositionalParam('price').addPositionalParam('duration').setAction(
  async ({ price, duration }, hre, runSuper) => {
    const contractAddresses = require('./build/contract-addresses.json');

    const Platform = await ethers.getContractFactory("Platform");
    const platform = await Platform.attach(contractAddresses.Platform);

    await (await platform.setSubscriptionPlan(price, duration, { gasLimit: 300000 })).wait();
    console.log(`Added a subscription plan: ${hre.ethers.utils.formatEther(price)} ETH for timestamp increase of ${duration}`);
  }
);

task(
  'add_reporter',
  'Add a reporter account'
).addPositionalParam('reporter').setAction(
  async ({ reporter }, _hre, _runSuper) => {
    const contractAddresses = require('./build/contract-addresses.json');

    const Platform = await ethers.getContractFactory("Platform");
    const platform = await Platform.attach(contractAddresses.Platform);

    await (await platform.addReporter(reporter, { gasLimit: 300000 })).wait();
    console.log(`Added a reporter: ${reporter}`);
  }
);

const { RPC_PROVIDER_URL, SEPOLIA_PRIVATE_KEY }  = process.env;

module.exports = {
  solidity: "0.8.19",
  settings: {
    optimizer: {
      enabled: true,
      runs: 400,
    }
  },
  networks: {
    sepolia: {
      url: RPC_PROVIDER_URL || '',
      accounts: [SEPOLIA_PRIVATE_KEY || '']
    }
  }
};
