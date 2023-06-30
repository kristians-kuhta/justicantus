import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts";
import { ResourceRegistered } from "../generated/Platform/Platform";

export function createResourceRegisteredEvent(
  account: Address,
  resourceType: i32,
  id: i32,
  data: string
): ResourceRegistered {
  const resourceRegisteredEvent = changetype<ResourceRegistered>(newMockEvent());

  resourceRegisteredEvent.parameters = new Array();

  resourceRegisteredEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  );

  resourceRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "resourceType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(resourceType))
    )
  );

  resourceRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "id",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(id))
    )
  );

  resourceRegisteredEvent.parameters.push(
    new ethereum.EventParam("data", ethereum.Value.fromString(data))
  );

  return resourceRegisteredEvent;
}
