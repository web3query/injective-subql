import { Account, AccountBalance, Contract, ContractTransaction, SpotLimitOrder, Transaction } from '../types'
import { CosmosEvent, CosmosMessage, CosmosTransaction } from '@subql/types-cosmos'

async function getOrCreateAccount(
  accountId: string,
  height: number,
  timestamp: number,
  chainId: string,
): Promise<Account> {
  let account = await Account.get(accountId)
  if (!account) {
    account = Account.create({
      id: accountId,
      blockHeight: height,
      timestamp: BigInt(timestamp),
      chainId,
    })
    await account.save()
  }
  return account
}

async function getOrCreateAccountBalance(
  account: Account,
  amount: bigint,
  height: number,
  timestamp: number,
  operation: 'inc' | 'dec',
): Promise<AccountBalance> {
  let accountBalance = await AccountBalance.get(account.id)
  if (!accountBalance) {
    accountBalance = AccountBalance.create({
      id: account.id,
      accountId: account.id,
      amount: amount,
      blockHeight: height,
      timestamp: BigInt(timestamp),
      chainId: account.chainId,
    })
  } else {
    accountBalance.amount = operation === 'inc' ? accountBalance.amount + amount : accountBalance.amount - amount
  }
  return accountBalance
}

export async function handleTransferEvent(event: CosmosEvent): Promise<void> {
  let recipient, sender
  let amount = BigInt(0)
  for (const attr of event.event.attributes) {
    switch (attr.key) {
      case 'recipient':
        recipient = attr.value
        break
      case 'amount':
        amount = BigInt(attr.value)
        break
      case 'sender':
        sender = attr.value
        break
      default:
        break
    }
  }
  const { time, height, chainId } = event.block.block.header
  if (sender) {
    const senderAccount = await getOrCreateAccount(sender, height, time.valueOf(), chainId)
    await getOrCreateAccountBalance(senderAccount, amount, height, time.valueOf(), 'dec')
  }
  if (recipient) {
    const recipientAccount = await getOrCreateAccount(recipient, height, time.valueOf(), chainId)
    await getOrCreateAccountBalance(recipientAccount, amount, height, time.valueOf(), 'inc')
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
    contract = Contract.create({
      id: decodedMsg.contract,
      blockHeight: height,
      timestamp: BigInt(time.valueOf()),
      chainId,
    })
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
