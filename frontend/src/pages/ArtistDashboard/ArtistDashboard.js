import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import Button from 'react-bootstrap/Button';

const ArtistDashboard = () => {
  const { platform } = useOutletContext();
  const { artistAddress } = useParams();

  const [playedMinutes, setPlayedMinutes] = useState(0);
  const [claimedMinutes, setClaimedMinutes] = useState(0);

  const handleClaimMinutes = () => {
    console.log('To claim unclaimed minutes');
  };

  useEffect(() => {
    platform.artistPlayedMinutes(artistAddress).then(setPlayedMinutes);
    platform.artistClaimedMinutes(artistAddress).then(setClaimedMinutes);
  }, [platform, artistAddress]);

  const unclaimedMinutes = () => {
    return playedMinutes - claimedMinutes;
  };

  return <div className='mt-5 d-flex flex-column align-items-center'>
    <p>Total played minutes: {playedMinutes.toString()}</p>
    <p>Total claimed minutes: {claimedMinutes.toString()}</p>
    <div>
      <p>Unclaimed minutes: {unclaimedMinutes()}</p>
      <Button onClick={handleClaimMinutes}>Claim minutes</Button>
    </div>
  </div>;
};

export default ArtistDashboard;
