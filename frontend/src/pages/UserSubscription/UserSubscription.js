import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

import Button from 'react-bootstrap/Button';
import ProgressBar from 'react-bootstrap/ProgressBar';

import { ethers, BigNumber } from 'ethers';

const UserSubscription = () => {
  const navigate = useNavigate();
  const {
    platform,
    account,
    subscriber,
    setMessage,
    setSubscriber
  } = useOutletContext();

  // [
  //   {
  //     price: 0,
  //     days: 0,
  //     expiresOn: null
  //   },
  //   ...
  // ]
  const [plans, setPlans] = useState([]);
  const [progress, setProgress] = useState(0);
  const [currentSubscriptionEndsOn, setCurrentSubscriptionEnds] = useState(null);

  const {
    REACT_APP_PLAN_ONE_PRICE,
    REACT_APP_PLAN_TWO_PRICE,
    REACT_APP_PLAN_THREE_PRICE,
  } = process.env;

  const calculateExpiresOn = useCallback(async (addedPeriod) => {
    let baseDate;

    if (subscriber) {
      const expirationTimestamp = await platform.subscriptions(subscriber);
      baseDate = new Date(expirationTimestamp.mul(1000).toNumber());
    } else {
      baseDate = new Date();
    }

    const newTimestamp = BigNumber.from(baseDate.getTime()).add(addedPeriod.mul(1000)).toNumber();
    return new Date(newTimestamp);
  }, [subscriber, platform]);

  const subscriptionIntervalData = useCallback(async (price) => {
    const timestamp = await platform.subscriptionPlanIntervals(price)
    const days = ((timestamp / 24) / 60) / 60;

    return {
      days,
      expiresOn: await calculateExpiresOn(timestamp)
    };
  }, [platform, calculateExpiresOn]);

  const selectPlan = async (price) => {
    try {
      setProgress(33);

      let subscriptionTx;

      if (subscriber) {
        subscriptionTx = await platform.fundSubscription({value: price});
      } else {
        subscriptionTx = await platform.createSubscription({value: price});
      }

      setProgress(66);

      await subscriptionTx.wait();

      setProgress(100);

      setMessage({
        text: subscriber ? 'Subscription extended!' : 'You have subscribed!',
        type: 'success'
      });

      // Wait a second
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/artists');
    } catch (e) {
      console.error(e);
      setProgress(0);
      setMessage({
        text: 'Could not subscribe! Try again!',
        type: 'danger'
      });
      setSubscriber(account);
    }
  };

  useEffect(() => {
    // TODO: consider using either subgraph or Infura API to fetch these plans
    (async () => {

      const plansData = await Promise.all([
        REACT_APP_PLAN_ONE_PRICE,
        REACT_APP_PLAN_TWO_PRICE,
        REACT_APP_PLAN_THREE_PRICE
      ].map(async (price) => {
        const { days, expiresOn } = await subscriptionIntervalData(price);
        return { price, days, expiresOn };
      }));

      setPlans(plansData);

      if (subscriber) {
        const expirationTimestamp = await platform.subscriptions(subscriber);
        setCurrentSubscriptionEnds(
          new Date(expirationTimestamp.mul(1000).toNumber()).toLocaleDateString()
        );
      }
    })();
  }, [
    platform,
    setPlans,
    subscriber,
    subscriptionIntervalData,
    REACT_APP_PLAN_ONE_PRICE,
    REACT_APP_PLAN_TWO_PRICE,
    REACT_APP_PLAN_THREE_PRICE
  ]);

  return <>
    { currentSubscriptionEndsOn && <p>Current subscription ends on {currentSubscriptionEndsOn}</p> }
    <h1>Subscription plans</h1>
    <ul>
      { plans.map((plan) => (
          <li key={`plan-${plan.price}`}>
            { ethers.utils.formatUnits(plan.price, 'ether') } ETH:
              Subscribe for { plan.days } days
            (expires on { plan.expiresOn.toLocaleDateString(undefined, {}) })
            <Button
              onClick={() => selectPlan(plan.price)}
              disabled={ progress > 0 }
            >Purchase</Button>
          </li>
        ))
      }
    </ul>
    { progress > 0 && progress < 100 && <ProgressBar className="mt-3" animated now={progress} /> }
  </>;
};

export default UserSubscription;

