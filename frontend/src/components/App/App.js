import React, { useState, useEffect } from 'react';

import Navigation from '../Navigation/Navigation.js';
import NetworkSwitchModal from '../NetworkSwitchModal/NetworkSwitchModal.js';
import { Outlet } from 'react-router-dom';
import contractAddresses from "../../contracts/contract-addresses.json";
import PlatformArtifact from "../../contracts/Platform.json";
import { ethers } from "ethers";

import Alert from 'react-bootstrap/Alert';
import { useLoaderData } from 'react-router-dom';

// TODO: think about if this message should be moved to a view function
const SUBSCRIBER_SIGNATURE_MESSAGE = 'I want to subscribe';

const CHAINS = {
  // Hardhat node
  development: {
    hex: '0x7A69',
    decimal: 31337,
    name: 'Local hardhat network'
  },
  // Polygon Mumbai testnet
  production: {
    hex: '0x12a',
    decimal: 80001,
    name: 'Polygon Mumbai testnet'
  }
};

export const appLoader = async () => {
  const [account] = await window.ethereum.request({
    method: "eth_requestAccounts", // get the currently connected address
  });
  const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

  const network = await provider.getNetwork();
  const expectedChain = getExpectedChain();
  const networkSwitchNeccessary = network.chainId !== expectedChain.decimal;

  if (networkSwitchNeccessary) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: expectedChain.hex }],
      });
    } catch (e) {
      console.error(e);
    }
  }

  window.ethereum.on("accountsChanged", () => window.location.reload());

  provider.on("network", (newNetwork, oldNetwork) => {
    if (oldNetwork) {
      window.location.reload();
    }
  });

  if (!networkSwitchNeccessary) {

    const platform = new ethers.Contract(
      contractAddresses.Platform, // contract address
      PlatformArtifact.abi, // contract abi (meta-data)
      provider.getSigner(0) // Signer object signs and sends transactions
    );

    const artistId = await platform.artistIds(account);
    const artistName = await platform.getArtistName(account);
    const artistData = { id: artistId, name: artistName };
    const activeSubscriber = await platform.isActiveSubscriber(account);

    return {
      account,
      platform,
      provider,
      artistData,
      subscriberData: activeSubscriber ? account : null,
      networkSwitchNeccessary
    };
  }

  return { account, networkSwitchNeccessary };
}

async function ensureSubsciberSignatureIsSigned(provider, platform) {
  let signature = localStorage.getItem('subscriberSignature');

  if (!signature) {
    const signer = await provider.getSigner();
    const isSubscriber = (await platform.subscriptions(await signer.getAddress())).toString() !== '0';
    // NOTE: if signer is not subscriber, something went wrong with selected account in the wallet
    if (!isSubscriber) return;

    signature = await signer.signMessage(SUBSCRIBER_SIGNATURE_MESSAGE);
    localStorage.setItem('subscriberSignature', signature);
  }

  return signature;
}

function getExpectedChain() {
  return CHAINS[process.env.NODE_ENV];
}

function App() {
  const [ message, setMessage ] = useState({ text: '', type: null });
  const [ loggedInArtist, setLoggedInArtist ] = useState({ id: 0, name: '' });
  const [ subscriber, setSubscriber ] = useState(null);
  const [ subscriberSignature, setSubscriberSignature ] = useState(null);

  const {
    account,
    platform,
    provider,
    artistData,
    subscriberData,
    networkSwitchNeccessary
  } = useLoaderData();

  useEffect(() => {
    setLoggedInArtist(artistData);
    setSubscriber(subscriberData);
  }, [setLoggedInArtist, setSubscriber, artistData, subscriberData]);

  useEffect(() => {
    if (subscriber) {
      ensureSubsciberSignatureIsSigned(provider, platform).then((generatedSignature) => {
        setSubscriberSignature(generatedSignature);
      });
    }
  }, [subscriber, setSubscriberSignature, provider, platform]);

  if (networkSwitchNeccessary) {
    return <NetworkSwitchModal chainName={getExpectedChain().name}/>;
  }

  const outletContext = {
    account,
    platform,
    setMessage,
    loggedInArtist,
    setLoggedInArtist,
    subscriber,
    setSubscriber,
    subscriberSignature
  };

  return (
    <>
      <Navigation account={account} loggedInArtist={loggedInArtist} subscriber={subscriber} />
      { message.text.length > 0 &&
        <Alert variant={message.type}>{message.text}</Alert>
      }
      <Outlet context={outletContext} />
    </>
  );
}

export default App;
