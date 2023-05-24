import { GasConsumption, SpotLimitOrder } from "../types";
import { CosmosMessage, CosmosTransaction } from "@subql/types-cosmos";

type SpotLimitOrderMessage = {
  sender: string;
  order: {
    marketId: string;
    orderType: string;
    orderInfo: {
      subaccountId: string;
      feeRecipient: string;
      price: string;
      quantity: string;
    };
  };
};

/*
export async function handleBlock(block: CosmosBlock): Promise<void> {
  // If you want to index each block in Cosmos (CosmosHub), you could do that here
}
*/

/*
export async function handleTransaction(tx: CosmosTransaction): Promise<void> {
  // If you want to index each transaction in Cosmos (CosmosHub), you could do that here
  const transactionRecord = Transaction.create({
    id: tx.hash,
    blockHeight: BigInt(tx.block.block.header.height),
    timestamp: tx.block.block.header.time,
  });
  await transactionRecord.save();
}

export async function handleEvent(event: CosmosEvent): Promise<void> {
  const eventRecord = new TransferEvent(
    `${event.tx.hash}-${event.msg.idx}-${event.idx}`
  );
  eventRecord.blockHeight = BigInt(event.block.block.header.height);
  eventRecord.txHash = event.tx.hash;
  for (const attr of event.event.attributes) {
    switch (attr.key) {
      case "recipient":
        eventRecord.recipient = attr.value;
        break;
      case "amount":
        eventRecord.amount = attr.value;
        break;
      case "sender":
        eventRecord.sender = attr.value;
        break;
      default:
        break;
    }
  }
  await eventRecord.save();
}
*/

export async function handleTransaction(tx: CosmosTransaction): Promise<void> {
  // If you want to index each transaction in Cosmos (CosmosHub), you could do that here
  // logger.info(JSON.stringify(tx.decodedTx.authInfo.fee))
  const { fee } = tx.decodedTx.authInfo
  const gasConsumption = GasConsumption.create({
      id: `${tx.hash}-${tx.idx}`,
      denom: fee.amount[0].denom,
      gas: BigInt(fee.gasLimit.low),
      timestamp: tx.block.block.header.time
    })
  await gasConsumption.save()


  // const transactionRecord = Transaction.create({
  //   id: tx.hash,
  //   blockHeight: BigInt(tx.block.block.header.height),
  //   timestamp: tx.block.block.header.time,
  // });
  // await transactionRecord.save();
}

export async function handleMessage(
  msg: CosmosMessage<SpotLimitOrderMessage>
): Promise<void> {
  //logger.info(JSON.stringify(msg));
  const spotLimitOrder = SpotLimitOrder.create({
    id: `${msg.tx.hash}-${msg.idx}`,
    blockHeight: BigInt(msg.block.block.header.height),
    txHash: msg.tx.hash,
    from: msg.msg.decodedMsg.sender,
    marketID: msg.msg.decodedMsg.order.marketId,
    orderType: msg.msg.decodedMsg.order.orderType,
    subAccountID: msg.msg.decodedMsg.order.orderInfo.subaccountId,
    feeRecipient: msg.msg.decodedMsg.order.orderInfo.feeRecipient,
    price: BigInt(msg.msg.decodedMsg.order.orderInfo.price),
    quantity: BigInt(msg.msg.decodedMsg.order.orderInfo.quantity),
    amount:
      BigInt(msg.msg.decodedMsg.order.orderInfo.price) *
      BigInt(msg.msg.decodedMsg.order.orderInfo.quantity),
  });
  // await spotLimitOrder.save();
}

type ExecuteContractCompatMessage = {
  sender: string,
  contract: string
  msg: any
  funds: string
}

export async function handleContractExecute(msg: CosmosMessage<ExecuteContractCompatMessage>): Promise<void> {
  // logger.info(JSON.stringify(msg.msg.decodedMsg))
}
