import {
  Provider,
  BlockTag,
  TransactionRequest,
  TransactionResponse,
  Block,
  BlockWithTransactions,
  TransactionReceipt,
  Filter,
  Log,
  EventType,
  Listener,
} from "../external/abstract-provider";
import { BigNumber, BigNumberish } from "../external/bignumber";

export interface BlockNumber {
  errorCode: number;
  header?: {
    blockNumber: string;
  };
}

export interface AccountBalance {
  errorCode: number;
  errorDesc: string;
  result?: {
    balance?: string;
  };
}

export interface AccountNonce {
  errorCode: number;
  errorDesc: string;
  result?: {
    nonce?: string;
  };
}

export interface AccountPayload {
  errorCode: number;
  errorDesc: string;
  result?: {
    contract?: {
      payload?: string;
    };
  };
}

export class EthBlock implements Block {
  transactions: string[] = []; // 初始化为空数组，或者根据需要初始化
  hash: string = "";
  parentHash: string = "";
  number: number = 0;
  timestamp: number = 0;
  nonce: string = "0";
  difficulty: number = 0;
  _difficulty: BigNumber = BigNumber.from(0);
  gasLimit: BigNumber = BigNumber.from(0);
  gasUsed: BigNumber = BigNumber.from(0);
  miner: string = "";
  extraData: string = "";
  baseFeePerGas?: BigNumber = undefined;
}

export interface BifBlock {
  errorCode: number;
  header?: {
    confirmTime?: string;
    number?: number;
    txCount?: number;
    version?: number;
    hash?: string;
  };
  leader?: string;
}

export class EthTransaction implements TransactionResponse {
  constructor() {
    this.wait = async (confirmations?: number): Promise<TransactionReceipt> => {
      return new EthTransactionReceipt();
    };
  }
  hash: string = "";
  blockNumber?: number;
  blockHash?: string;
  timestamp?: number;
  confirmations: number = 0;
  from: string = "";
  raw?: string;
  wait: (confirmations?: number) => Promise<TransactionReceipt>;
  to?: string;
  nonce: number = 0;
  gasLimit: BigNumber = BigNumber.from(0);
  gasPrice?: BigNumber;
  data: string = "";
  value: BigNumber = BigNumber.from(0);
  chainId: number = 0;
  r?: string;
  s?: string;
  v?: number;
  type?: number;
  maxPriorityFeePerGas?: BigNumber;
  maxFeePerGas?: BigNumber;
}

export interface BifTransaction {
  errorCode: number;
  result?: {
    total_count?: number;
    transactions?: [
      {
        actual_fee?: number;
        close_time?: number;
        contract_tx_hashes?: string[];
        error_code?: number;
        error_desc?: string;
        hash?: string;
        ledger_seq?: number;
        signatures?: [
          {
            public_key?: string;
            sign_data?: string;
          },
        ];
        tx_size?: number;
        transaction?: {
          fee_limit?: number;
          gas_price?: number;
          nonce?: number;
          source_address?: string;
          operations?: [
            {
              type?: number;
              pay_coin?: {
                dest_address?: string;
                input?: string;
                amount?: number;
              };
              log?: {
                datas?: string[];
                topic?: string;
                topics?: string[];
              };
              create_account?: {
                contract?: {
                  payload?: string;
                  type?: number;
                };
                init_balance?: number;
              };
            },
          ];
        };
        trigger?: {
          transaction?: {
            hash?: string;
          };
        };
      },
    ];
  };
}

export interface BifBlockTransaction {
  error_code: number;
  result?: {
    total_count?: number;
    transactions?: [
      {
        actual_fee?: number;
        close_time?: number;
        contract_tx_hashes?: string[];
        error_code?: number;
        error_desc?: string;
        hash?: string;
        ledger_seq?: number;
      },
    ];
  };
}

export class EthLog implements Log {
  blockNumber: number = 0;
  blockHash: string = "";
  transactionIndex: number = 0;
  removed: boolean = false;
  address: string = "";
  data: string = "";
  topics: string[] = [];
  transactionHash: string = "";
  logIndex: number = 0;
}

export class EthTransactionReceipt implements TransactionReceipt {
  to: string = "";
  from: string = "";
  contractAddress: string = "";
  transactionIndex: number = 0;
  root?: string;
  gasUsed: BigNumber = BigNumber.from(0);
  logsBloom: string = "";
  blockHash: string = "";
  transactionHash: string = "";
  logs: Log[] = [];
  blockNumber: number = 0;
  confirmations: number = 0;
  cumulativeGasUsed: BigNumber = BigNumber.from(0);
  effectiveGasPrice: BigNumber = BigNumber.from(0);
  byzantium: boolean = false;
  type: number = 0;
  status?: number;
}

export interface contractInfo {
  contract_address: string;
  contract_evm_address: string;
  operation_index: number;
  vm_type: number;
}

export interface checkContractAddress {
  errorCode: number;
  result: {
    isValid: boolean;
  };
}

export class EthBlockWithTransactions implements BlockWithTransactions {
  transactions: TransactionResponse[] = [];
  hash: string = "";
  parentHash: string = "";
  number: number = 0;
  timestamp: number = 0;
  nonce: string = "";
  difficulty: number = 0;
  _difficulty: BigNumber = BigNumber.from(0);
  gasLimit: BigNumber = BigNumber.from(0);
  gasUsed: BigNumber = BigNumber.from(0);
  miner: string = "";
  extraData: string = "";
  baseFeePerGas?: BigNumber = BigNumber.from(0);
}

export class signature {
  public_key?: string;
  sign_data?: string;
}

export class BifSignData {
  blob: string = "";
  signature: signature[] = [];
}

export class BifContractInvoke {
  to: string = "";
  amount: number = 0;
  input: string = "";
}

export class BifCreateContract {
  initBalance: number = 0;
  payload: string = "";
  initInput: string = "";
  type: number = 0;
}

export class BifTransactionParams {
  sourceAddress: string = "";
  nonce: number = 0;
  feeLimit: number = 0;
  gasPrice: number = 0;
  metadata?: string = "";
}

export interface BifHashResponse {
  error_code: number;
  error_desc: string;
  hash: string;
}

export interface BifTransactionResponse {
  results: BifHashResponse[];
  success_count: number;
}

export class BifContractQuery {
  sourceAddress: string = "";
  contractAddress: string = "";
  input: string = "";
}

export interface BifContractError {
  data: string;
}

export interface BifContractResult {
  code: number;
  data: string;
  desc: string;
  evmcode: string;
  gasused: number;
}

export interface BifContractRet {
  error: BifContractError;
  result: BifContractResult;
}

export interface BifContractQueryResponse {
  query_rets: BifContractRet[];
}
