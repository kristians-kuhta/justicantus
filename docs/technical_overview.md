# Technical overview of Justicantus

It is to be determined on which blockchain the platform runs.
The platform users visit the webpage and sign in with their wallets.

The user is offered to subscribe to a plan.
Upon subscribing to a plan for the first time, the user is asked to sign a signature that gets stored in the browser's local storage.

Plans can be configured by the smart contract owner.
Currently, we plan to have 3 plans, the longer the selected duration, the cheaper the plan.

Once the user subscribes, the songs of all of the platform artists can be played.

Users can then search for artists, open their songs list, and play their songs.

The player tracks how many seconds of songs have been played.
Every 10 seconds played, an update is sent to the back-end server with information about
the artist (its ID), the song (its ID), and the listener (his address and the subscription signature from local storage).

For the backend, we use a Google Cloud Function with Firestore as the database.

Upon receiving the above-mentioned update,
it stores `lastTrackedSong` record which contains information about:
* `account`
* `songId`
* `duration`

When the tracking event is being registered, we check if the last tracked song record exists for this `songId` and if the current duration is more than it was.
If so we assume that the user continues to listen to the song with the ID of `songId` and we add the newly listened seconds to the played seconds of the song.

Then there is a Google Cloud function which when called sends a batch update to the smart contract.
It updates the played minutes for the artists that have played minutes.
Updates can be done only by `reporter` accounts. The platform owner can mark an account as a `reporter` account.

This function is intended to be called by a scheduler, e.g. every 8 hours or so.

The platform owner can set a reward for a single played minute in WEI.
The artists then can claim unclaimed played minutes at any time and receive a payout in eth.

Any native currency (Eth, Matic) that is unspent (unplayed minutes in a month) remains on the platform and is considered
platform fee.



