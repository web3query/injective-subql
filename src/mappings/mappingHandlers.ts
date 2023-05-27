import { Account, Chain, Contract, SpotLimitOrder, Transaction } from '../types'
import { CosmosMessage, CosmosTransaction } from '@subql/types-cosmos'

async function createAccountsIfNotExists(
  payer: string,
  granter: string,
  height: number,
  timestamp: bigint,
): Promise<void> {
  let payerAcc = await Account.get(payer)
  let granterAcc = await Account.get(granter)

  if (!payerAcc && payer !== '') {
    payerAcc = Account.create({
      id: payer,
      blockHeight: height,
      timestamp,
      address: payer,
    })
    await payerAcc.save()
  }
  if (!granterAcc && granter !== '') {
    granterAcc = Account.create({
      id: granter,
      blockHeight: height,
      timestamp,
      address: granter,
    })
    await granterAcc.save()
  }
}

export async function handleTransaction(_tx: CosmosTransaction): Promise<void> {
  const { fee } = _tx.decodedTx.authInfo
  const {
    hash,
    idx,
    block: {
      block: {
        header: { height, time, chainId },
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

  if (fee) {
    const { payer, granter } = fee
    await createAccountsIfNotExists(payer, granter, height, BigInt(time.valueOf()))
  }
  let chain = await Chain.get(chainId)
  if (chain) {
    chain.blockHeight = height
    chain.timestamp = BigInt(time.valueOf())
    chain.gasUsed = chain.gasUsed + BigInt(gasUsed)
    chain.txCount = chain.txCount + 1
    chain.failedTxCount = chain.failedTxCount + (Boolean(code) ? 1 : 0)
  } else {
    chain = Chain.create({
      id: chainId,
      chainId,
      blockHeight: height,
      timestamp: BigInt(time.valueOf()),
      gasUsed: BigInt(gasUsed),
      txCount: 1,
      failedTxCount: Boolean(code) ? 1 : 0,
    })
  }
  await chain.save()
}

type ExecuteContractCompatMessage = {
  sender: string
  contract: string
  msg: any
  funds: string
}

export async function handleContractExecute(msg_: CosmosMessage<ExecuteContractCompatMessage>): Promise<void> {
  const { msg, tx, block } = msg_
  const { decodedMsg } = msg

  const isFailed = Boolean(tx.tx.code) // code = 0 is success
  let contract = await Contract.get(decodedMsg.contract)

  if (contract) {
    contract.txCount = contract.txCount + 1
    contract.failedTxCount = contract.failedTxCount + (isFailed ? 1 : 0)
    contract.timestamp = BigInt(block.header.time.valueOf())
    contract.blockHeight = block.header.height
  } else {
    const { contract: address } = decodedMsg
    contract = Contract.create({
      id: address,
      address,
      blockHeight: block.header.height,
      timestamp: BigInt(block.header.time.valueOf()),
      txCount: 1,
      failedTxCount: isFailed ? 1 : 0,
      gasUsed: BigInt(tx.tx.gasUsed),
    })
  }
  await contract.save()
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

// MsgCreateDerivativeLimitOrder
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
