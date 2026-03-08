import type { EvmMock } from '@chainlink/cre-sdk/test'
import type { Address } from 'viem'
import type { TxStatus } from '@chainlink/cre-sdk'

export interface XStocksPriceReceiverMock {
  latestPrice: () => bigint
  lastUpdatedAt: () => bigint
  writeReport: () => { txStatus: TxStatus; txHash: Uint8Array }
}

export function newXStocksPriceReceiverMock(
  address: Address,
  evmMock: EvmMock,
): XStocksPriceReceiverMock {
  const mock: XStocksPriceReceiverMock = {
    latestPrice: () => 0n,
    lastUpdatedAt: () => 0n,
    writeReport: () => ({ txStatus: 0 as TxStatus, txHash: new Uint8Array(32) }),
  }
  return mock
}
