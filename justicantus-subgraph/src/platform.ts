import {
  OwnershipTransferred as OwnershipTransferredEvent,
  RegistrationCreated as RegistrationCreatedEvent,
  ResourceRegistered as ResourceRegisteredEvent
} from "../generated/Platform/Platform"
import {
  OwnershipTransferred,
  RegistrationCreated,
  ResourceRegistered
} from "../generated/schema"

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRegistrationCreated(
  event: RegistrationCreatedEvent
): void {
  let entity = new RegistrationCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account
  entity.resourceType = event.params.resourceType
  entity.requestId = event.params.requestId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleResourceRegistered(event: ResourceRegisteredEvent): void {
  let entity = new ResourceRegistered(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account
  entity.resourceType = event.params.resourceType
  entity.Platform_id = event.params.id
  entity.data = event.params.data

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
