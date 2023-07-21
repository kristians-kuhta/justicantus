import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import {
  Button,
  ProgressBar
} from 'react-bootstrap';
import * as ethers from 'ethers';

const ArtistDashboard = () => {
  const { platform, setMessage } = useOutletContext();
  const { artistAddress } = useParams();

  const [playedMinutes, setPlayedMinutes] = useState(0);
  const [claimedMinutes, setClaimedMinutes] = useState(0);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [progress, setProgress] = useState(0);

  const handleClaimRewards = async () => {
    setMessage({ text: '', type: null });
    setProgress(50);

    try {
      await (await platform.claimRewards()).wait();
      setProgress(100);
      setMessage({
        text: 'Rewards claimed!',
        type: 'success'
      });

      setMinuteStats();
    } catch (e) {
      console.error(e);
      setMessage({
        text: 'Could not claim rewards!',
        type: 'danger'
      });
    }
    setProgress(0);
  };

  const setMinuteStats = useCallback(() => {
    platform.artistPlayedMinutes(artistAddress).then(setPlayedMinutes);
    platform.artistClaimedMinutes(artistAddress).then(setClaimedMinutes);
    platform.rewardForPlayedMinute().then((reward) => {
      const claimedAmountWei = claimedMinutes * reward;
      const claimedAmountEth = ethers.utils.formatEther(claimedAmountWei);
      setClaimedAmount(`${claimedAmountEth} ETH`);
    });
  }, [platform, artistAddress, claimedMinutes]);

  useEffect(() => {
    setMinuteStats();
  }, [setMinuteStats]);

  const unclaimedMinutes = () => {
    return playedMinutes - claimedMinutes;
  };

  return <div className='mt-5 d-flex flex-column align-items-center'>
    <p>Total played minutes: {playedMinutes.toString()}</p>
    <p>Total claimed minutes: {claimedMinutes.toString()}</p>
    <p>Total claimed amount: {claimedAmount.toString()}</p>
    <div>
      <p>Unclaimed minutes: {unclaimedMinutes()}</p>
      { unclaimedMinutes > 0 && <Button onClick={handleClaimRewards}>Claim rewards</Button> }
    </div>
    { progress > 0 && progress < 100 && <ProgressBar className="mt-3" animated now={progress} /> }
  </div>;
};

export default ArtistDashboard;
