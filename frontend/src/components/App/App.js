import './App.css';
import React, { useState, useEffect } from 'react';

import Navigation from '../Navigation/Navigation.js';
import { Outlet } from 'react-router-dom';
import contractAddresses from "../../contracts/contract-addresses.json";
import PlatformArtifact from "../../contracts/Platform.json";
import { ethers } from "ethers";

function App() {
  const [account, setAccount] = useState(null);
  const [platform, setPlatform] = useState(null);

  const connectWallet = async () => {
    // `ethereum` property is injected by Metamask to the global object
    // This helps to interact with wallet accounts, balances, connections, etc
    const [account] = await window.ethereum.request({
      method: "eth_requestAccounts", // get the currently connected address
    });
    setAccount(account);

    // provider provides a read-only abstraction of the blockchain
    // it provides read-only access to contract, block, and network data
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // the signer is required, so that the transactions are done on behalf of
    // the selected address. `ethers.Contract` returns a `Contract` object
    // that is used to call the available functions in the smart contract
    const contract = new ethers.Contract(
      contractAddresses.Platform, // contract address
      PlatformArtifact.abi, // contract abi (meta-data)
      provider.getSigner(0) // Signer object signs and sends transactions
    );
    setPlatform(contract);
  };

  // we want to connect the wallet after page loads
  useEffect(() => {
    connectWallet()
  }, [])

  return (
    <>
      <Navigation account={account} />
      <Outlet context={{ account, platform }} />
    </>
  );
}

export default App;
