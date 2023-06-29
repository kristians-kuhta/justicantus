import {
  ResourceRegistered as ResourceRegisteredEvent
} from "../generated/Platform/Platform";

import { Artist } from "../generated/schema";

export function handleResourceRegistered(event: ResourceRegisteredEvent): void {
  // NOTE: currently only Artist resources are supported.
  //       If we decide to add other resources, this logic will have to branch based on resourceType.
  if (event.params.resourceType !== 1) return;

  const { account, id, data } = event.params;

  let artist = new Artist(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  artist.account = account;
  artist.title = data;
  artist.platformId = id;

  artist.save();
}
