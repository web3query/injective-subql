import { SpotLimitOrder, Transaction } from '../types'
import { CosmosMessage, CosmosTransaction } from '@subql/types-cosmos'

export async function handleTransaction(_tx: CosmosTransaction): Promise<void> {
  const { fee } = _tx.decodedTx.authInfo
  const {
    hash,
    idx,
    block: {
      block: {
        header: { height, time },
      },
    },
    tx: { gasUsed, code },
  } = _tx
  const transactionRecord = Transaction.create({
    id: `${hash}-${idx}`,
    blockHeight: height,
    timestamp: BigInt(time.valueOf()),
    denom: fee && fee.amount[0].denom,
    gasUsed: BigInt(gasUsed),
    status: code === 0 ? 'success' : 'failed',
  })
  await transactionRecord.save()
}

type SpotLimitOrderMessage = {
  sender: string
  order: {
    marketId: string
    orderType: string
    orderInfo: {
      subaccountId: string
      feeRecipient: string
      price: string
      quantity: string
    }
  }
}

export async function handleMessage(msg: CosmosMessage<SpotLimitOrderMessage>): Promise<void> {
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
    amount: BigInt(msg.msg.decodedMsg.order.orderInfo.price) * BigInt(msg.msg.decodedMsg.order.orderInfo.quantity),
  })
  // await spotLimitOrder.save();
}

type ExecuteContractCompatMessage = {
  sender: string
  contract: string
  msg: any
  funds: string
}

export async function handleContractExecute(msg: CosmosMessage<ExecuteContractCompatMessage>): Promise<void> {
  // logger.info(JSON.stringify(msg.msg.decodedMsg))
}
