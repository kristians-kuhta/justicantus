# Technical overview of Justicantus

It is to be determined on which blockchain the platform runs.
The platform users visit the webpage and sign in with their wallet.

User is offered to subscribe to a plan.

When user has subscribed to the plan that is registered in a smart contract and his
balance is tracked.

User can then search for songs from various artists that are registered on the platform.

The player tracks how many seconds of songs have been played.
Every 10 seconds played, an update is sent to the back-end server with information about
artist (his ID), song (its ID) and the listener (his address).

The back-end server is an Express.JS server and upon receiving the above mentioned update,
it stores that into a database.

There is a background job that runs periodically and sends a batch update to the smart contract.

Artist earnings are calculated by multiplying played minutes with the reward for a played minute.

```
earnings = played_minutes * 6.5 * 24 * 60 * 30 = played_minutes * 0,000150462963

earnings = played_minutes * reward_per_minute
earnings = played_minutes * ( subscription_price / (24*60 * average_days_in_month))
average_days_in_month = 30
subscription_price = 6.5 MATIC (value might change)
```

Any MATIC that is unspent (unplayed minutes in month) remains in the platform and is considered
platform fee.

Artists can claim rewards at any time.



