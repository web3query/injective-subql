import { Account, Contract, ContractTransaction, SpotLimitOrder, Transaction } from '../types'
import { CosmosMessage, CosmosTransaction } from '@subql/types-cosmos'

async function getOrCreateAccount(
  payer: string,
  granter: string,
  height: number,
  timestamp: bigint,
): Promise<{ payerAcc: Account | undefined; granterAcc: Account | undefined }> {
  let payerAcc = await Account.get(payer)
  let granterAcc = await Account.get(granter)

  if (!payerAcc && payer !== '') {
    payerAcc = Account.create({
      id: payer,
      blockHeight: height,
      timestamp,
    })
    await payerAcc.save()
  }
  if (!granterAcc && granter !== '') {
    granterAcc = Account.create({
      id: granter,
      blockHeight: height,
      timestamp,
    })
    await granterAcc.save()
  }
  return { payerAcc, granterAcc }
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

  if (fee) {
    const { payer, granter } = fee
    await getOrCreateAccount(payer, granter, height, BigInt(time.valueOf()))
  }
  const transactionRecord = Transaction.create({
    id: `${hash}-${idx}`,
    blockHeight: height,
    timestamp: BigInt(time.valueOf()),
    denom: fee && fee.amount[0].denom,
    gasUsed: BigInt(gasUsed),
    status: code === 0 ? 'success' : 'failed',
    chainId: chainId,
  })
  await transactionRecord.save()
}

type ExecuteContractCompatMessage = {
  sender: string
  contract: string
  msg: any
  funds: string
}

export async function handleContractExecute(msg_: CosmosMessage<ExecuteContractCompatMessage>): Promise<void> {
  const {
    msg,
    tx: {
      decodedTx: {
        authInfo: { fee },
      },
      hash,
      tx: { gasUsed, code },
    },
    block: {
      header: { height, time, chainId },
    },
  } = msg_
  const { decodedMsg } = msg

  let contract = await Contract.get(decodedMsg.contract)
  if (!contract) {
    contract = Contract.create({ id: decodedMsg.contract, blockHeight: height, timestamp: BigInt(time.valueOf()) })
    await contract.save()
  }

  const contractTx = ContractTransaction.create({
    id: `${hash}-${contract.id}`,
    blockHeight: height,
    timestamp: BigInt(time.valueOf()),
    chainId: chainId,
    contractId: contract.id,
    denom: fee && fee.amount[0].denom,
    gasUsed: BigInt(gasUsed),
    status: code === 0 ? 'success' : 'failed',
  })
  await contractTx.save()
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
