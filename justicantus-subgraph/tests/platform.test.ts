import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index";

import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Artist } from "../generated/schema";

import { ResourceRegistered } from "../generated/Platform/Platform";

import { handleResourceRegistered } from "../src/platform";
import { createResourceRegisteredEvent } from "./platform-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

function createEventAndHandleResourceRegistration(resourceType: i32): ResourceRegistered {
  const artistAddress = Address.fromString(
    "0x0000000000000000000000000000000000000001"
  );
  const id = 0x1234;
  const data = "First Artist";

  let resourceRegisteredEvent = createResourceRegisteredEvent(
    artistAddress,
    resourceType,
    id,
    data
  );

  handleResourceRegistered(resourceRegisteredEvent);

  return resourceRegisteredEvent;
};

describe("Artist creation", () => {
  afterEach(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("Artist created and stored", () => {

    // NOTE: song resource type -> 2
    let resourceRegisteredEvent = createEventAndHandleResourceRegistration(0x1);

    assert.entityCount("Artist", 1);

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    const transaction = resourceRegisteredEvent.transaction;
    const logIndex = resourceRegisteredEvent.logIndex;

    assert.fieldEquals(
      "Artist",
      transaction.hash.concatI32(logIndex.toI32()).toHexString(),
      "account",
      "0x0000000000000000000000000000000000000001"
    );

    assert.fieldEquals(
      "Artist",
      transaction.hash.concatI32(logIndex.toI32()).toHexString(),
      "title",
      "First Artist"
    );

    assert.fieldEquals(
      "Artist",
      transaction.hash.concatI32(logIndex.toI32()).toHexString(),
      "platformId",
      // 0x1234 to dec -> 4660
      "4660"
    );
  });

  describe("When resource registered is a song", () => {
    test("Artist is not created", () => {
      // NOTE: song resource type -> 2
      let resourceRegisteredEvent = createEventAndHandleResourceRegistration(0x2);

      assert.entityCount("Artist", 0);
    });
  });
});
