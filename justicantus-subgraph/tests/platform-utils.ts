import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred,
  RegistrationCreated,
  ResourceRegistered
} from "../generated/Platform/Platform"

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createRegistrationCreatedEvent(
  account: Address,
  resourceType: i32,
  requestId: BigInt
): RegistrationCreated {
  let registrationCreatedEvent = changetype<RegistrationCreated>(newMockEvent())

  registrationCreatedEvent.parameters = new Array()

  registrationCreatedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  registrationCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "resourceType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(resourceType))
    )
  )
  registrationCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )

  return registrationCreatedEvent
}

export function createResourceRegisteredEvent(
  account: Address,
  resourceType: i32,
  id: BigInt,
  data: string
): ResourceRegistered {
  let resourceRegisteredEvent = changetype<ResourceRegistered>(newMockEvent())

  resourceRegisteredEvent.parameters = new Array()

  resourceRegisteredEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  resourceRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "resourceType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(resourceType))
    )
  )
  resourceRegisteredEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  resourceRegisteredEvent.parameters.push(
    new ethereum.EventParam("data", ethereum.Value.fromString(data))
  )

  return resourceRegisteredEvent
}
