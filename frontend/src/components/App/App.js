import './App.css';
import React, { useState } from 'react';

import Navigation from '../Navigation/Navigation.js';
import { Outlet } from 'react-router-dom';
import contractAddresses from "../../contracts/contract-addresses.json";
import PlatformArtifact from "../../contracts/Platform.json";
import { ethers } from "ethers";

import Alert from 'react-bootstrap/Alert';
import { useLoaderData } from 'react-router-dom';

export const appLoader = async () => {
    const [account] = await window.ethereum.request({
      method: "eth_requestAccounts", // get the currently connected address
    });
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    const platform = new ethers.Contract(
      contractAddresses.Platform, // contract address
      PlatformArtifact.abi, // contract abi (meta-data)
      provider.getSigner(0) // Signer object signs and sends transactions
    );
    return { account, platform };
}

function App() {
  const [ message, setMessage ] = useState({ text: '', type: null });
  const { account, platform } = useLoaderData();

  return (
    <>
      <Navigation account={account} />
      { message.text.length > 0 &&
        <Alert variant={message.type}>{message.text}</Alert>
      }
      <Outlet context={{ account, platform, setMessage }} />
    </>
  );
}

export default App;
