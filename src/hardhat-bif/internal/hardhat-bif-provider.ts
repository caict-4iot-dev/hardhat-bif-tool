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
import { Deferrable } from "../external/properties";
import { BigNumber, BigNumberish } from "../external/bignumber";
import debug from "debug";
import { EthereumProvider } from "hardhat/types";
import { hexlify } from "../external/bytes";
import {
  BlockNumber,
  AccountBalance,
  AccountNonce,
  AccountPayload,
  EthBlock,
  BifBlock,
  BifTransaction,
  BifBlockTransaction,
  EthTransactionReceipt,
  contractInfo,
  EthLog,
  checkContractAddress,
  EthBlockWithTransactions,
  EthTransaction,
  BifSignData,
  BifTransactionResponse,
  BifContractQuery,
  BifContractQueryResponse,
} from "./bif-types";
import { HardhatBifError } from "./errors";

const log = debug("hardhat:hardhat-bif:provider");

export class HardhatBifProvider extends Provider {
  constructor(private readonly _hardhatProvider: EthereumProvider) {
    super();
  }

  public get ethProvider(): EthereumProvider {
    return this._hardhatProvider;
  }

  public get provider(): this {
    return this;
  }

  public async getBlockNumber(): Promise<number> {
    try {
      const response = (await this._hardhatProvider.request({
        method: "block.getBlockNumber",
      })) as BlockNumber;
      log("getBlockNumber() : ", JSON.stringify(response));
      if (response.errorCode !== 0) {
        return -1;
      }
      return Number(response.header?.blockNumber ?? "0");
    } catch (error) {
      throw new Error(
        `Failed to get block number from Hardhat provider: ${(error as Error).message}`,
      );
    }
  }

  public async getChainId(): Promise<number> {
    return -1;
  }

  public async getGasPrice(): Promise<BigNumber> {
    return BigNumber.from(1);
  }

  //ACCOUNT
  public async getBalance(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<BigNumber> {
    try {
      const response = (await this._hardhatProvider.request({
        method: "account.getAccountBalance",
        params: [
          {
            address: addressOrName,
          },
        ],
      })) as AccountBalance;
      log("getBalance(address) : ", JSON.stringify(response));
      if (response.errorCode !== 0) {
        return BigNumber.from(-1);
      }
      return BigNumber.from(response.result?.balance ?? "0");
    } catch (error) {
      throw new Error(
        `Failed to getBalance ${addressOrName} from Hardhat provider: ${(error as Error).message}`,
      );
    }
  }

  public async getTransactionCount(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<number> {
    try {
      const response = (await this._hardhatProvider.request({
        method: "account.getNonce",
        params: [
          {
            address: addressOrName,
          },
        ],
      })) as AccountNonce;
      log("getTransactionCount(address) : ", JSON.stringify(response));
      if (response.errorCode !== 0) {
        return -1;
      }
      return Number(response.result?.nonce ?? "0");
    } catch (error) {
      throw new Error(
        `Failed to getTransactionCount ${addressOrName} from Hardhat provider: ${(error as Error).message}`,
      );
    }
  }

  public async getCode(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    try {
      const response = (await this._hardhatProvider.request({
        method: "contract.getContractInfo",
        params: [
          {
            contractAddress: addressOrName,
          },
        ],
      })) as AccountPayload;
      log("getCode(address) : ", JSON.stringify(response));
      if (response.errorCode !== 0) {
        return "";
      }
      return response.result?.contract?.payload ?? "";
    } catch (error) {
      throw new Error(
        `Failed to getCode ${addressOrName} from Hardhat provider: ${(error as Error).message}`,
      );
    }
  }

  public async getStorageAt(
    addressOrName: string | Promise<string>,
    position: BigNumberish | Promise<BigNumberish>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    //not support
    return "";
  }

  // Execution
  public async sendTransaction(
    signedTransaction: string | Promise<string>,
  ): Promise<TransactionResponse> {
    try {
      let tmpTransaction = new EthTransaction();

      let transaction = JSON.parse(await signedTransaction) as BifSignData;
      const response = (await this._hardhatProvider.request({
        method: "transaction.submitTrans",
        params: [transaction.blob, transaction.signature],
      })) as BifTransactionResponse;

      log("sendTransaction(hash) : ", JSON.stringify(response));

      if (response?.success_count !== 1) {
        return tmpTransaction;
      }

      tmpTransaction.hash = response?.results[0]?.hash;
      tmpTransaction.wait = async (
        confirmations?: number,
      ): Promise<TransactionReceipt> => {
        let receiptDefault = new EthTransactionReceipt();
        receiptDefault.transactionHash = tmpTransaction.hash;
        const defaultConfirmations = 5;
        const usedConfirmations = confirmations || defaultConfirmations;
        const start = Date.now();
        let timeoutMs = 10000;
        let lastBlockNumber: number | null = null;

        while (true) {
          const now = Date.now();
          if (now - start > timeoutMs) {
            console.log("Transaction timed out.");
            return receiptDefault;
          }

          const blockNumber = await this.getBlockNumber();
          if (
            lastBlockNumber !== null &&
            blockNumber - lastBlockNumber > usedConfirmations
          ) {
            console.log("Exceeded maximum confirmation blocks.");
            return receiptDefault;
          }

          const receipt = await this.getTransactionReceipt(tmpTransaction.hash);
          if (receipt !== null && receipt.transactionHash !== undefined) {
            log("Transaction confirmed:", receipt);
            return receipt;
          }

          lastBlockNumber = blockNumber;

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      };
      return tmpTransaction;
    } catch (error) {
      throw new Error(
        `Failed to sendTransaction from Hardhat provider: ${(error as Error).message}`,
      );
    }
  }

  public async call(
    transaction: Deferrable<TransactionRequest>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    try {
      let tmpTransaction = new BifContractQuery();
      tmpTransaction.contractAddress = (await transaction?.to) ?? "";
      tmpTransaction.sourceAddress = (await transaction?.from) ?? "";
      tmpTransaction.input = hexlify((await transaction?.data) ?? "");

      const response = (await this._hardhatProvider.request({
        method: "contract.contractQuery",
        params: [tmpTransaction],
      })) as BifContractQueryResponse;
      log("call(transaction) : ", JSON.stringify(response));
      if (response?.query_rets[0]?.result?.code !== 0) {
        return "";
      }

      return "0x" + response?.query_rets[0]?.result?.evmcode;
    } catch (error) {
      throw new Error(
        `Failed to call from Hardhat provider: ${(error as Error).message}`,
      );
    }
  }

  public async estimateGas(
    transaction: Deferrable<TransactionRequest>,
  ): Promise<BigNumber> {
    // const ContractCreateOperation = require('@caict/bif-core-sdk/src/operation/contractCreateOperation')
    // const ContractInvokeOperation = require('@caict/bif-core-sdk/src/operation/contractInvokeOperation')
    // let request = {};
    // let gasLimit = Number(transaction?.gasLimit ?? 1);
    // let gasPrice = Number(transaction?.gasPrice ?? 1);
    // if (transaction?.type === 1) {
    //     let contractCreateOperation = new ContractCreateOperation(0, 1, (transaction?.data ?? '').toString(), '')
    //     request = {
    //         sourceAddress: transaction?.from?? '',
    //         privateKey: '',
    //         operations: contractCreateOperation,
    //         gasPrice: gasPrice.toString(),
    //         feeLimit: (gasPrice*gasLimit).toString(),
    //     }
    // }
    // else if (transaction?.type === 7) {
    //     let contractInvokeOperation = new ContractInvokeOperation(await transaction?.to ?? '', 0, (transaction?.data ?? '').toString());
    //     request = {
    //         sourceAddress: transaction?.from?? '',
    //         privateKey: '',
    //         operations: contractInvokeOperation,
    //         gasPrice: gasPrice.toString(),
    //         feeLimit: (gasPrice*gasLimit).toString(),
    //     }
    // }
    // else {
    //     return BigNumber.from(10000000);
    // }
    // console.log('estimateGas(transaction) req: ', JSON.stringify(request));
    // const response = await this._hardhatProvider.request({ method: "transaction.evaluateFee", params: [request] });
    // console.log('estimateGas(transaction) res: ', JSON.stringify(response));

    return BigNumber.from(10000000);
  }
  // Queries
  public async getBlock(
    blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>,
  ): Promise<Block> {
    try {
      let res = new EthBlock();
      if (blockHashOrBlockTag === "latest") {
        blockHashOrBlockTag = (await this.getBlockNumber()).toString();
        if (blockHashOrBlockTag === "-1") {
          return res;
        }
      }
      const responseBig = (await this._hardhatProvider.request({
        method: "block.getBlockInfo",
        params: [
          {
            blockNumber: blockHashOrBlockTag,
            withLeader: true,
          },
        ],
      })) as BifBlock;
      log("getBlock() : ", JSON.stringify(responseBig));
      if (responseBig.errorCode !== 0) {
        return res;
      }

      if (responseBig?.header?.number === 1) {
        res.parentHash = "";
      } else {
        const responseSmall = (await this._hardhatProvider.request({
          method: "block.getBlockInfo",
          params: [
            {
              blockNumber: (responseBig?.header?.number ?? 1 - 1).toString(),
              withLeader: false,
            },
          ],
        })) as BifBlock;

        if (responseSmall.errorCode !== 0) {
          return res;
        }
        res.parentHash = responseSmall?.header?.hash ?? "";
      }

      res.hash = responseBig?.header?.hash ?? "";
      res.number = responseBig?.header?.number ?? 0;
      res.timestamp = Number(responseBig?.header?.confirmTime ?? 0);
      res.extraData = (responseBig?.header?.version ?? 0).toString();
      res.miner = responseBig?.leader ?? "";

      //query block transaction hashes
      const responseTrans = (await this._hardhatProvider.request({
        method: "block.getTransactions",
        params: [
          {
            blockNumber: responseBig?.header?.number ?? 0,
          },
        ],
      })) as BifBlockTransaction;
      log("block.getTransactions ", JSON.stringify(responseTrans));
      if (responseTrans.error_code !== 0) {
        return res;
      }
      const totalCount = responseTrans.result?.total_count ?? 0;
      for (let i = 0; i < totalCount; i++) {
        const transactionHash = responseTrans.result?.transactions?.[i]?.hash;
        if (transactionHash) {
          res.transactions.push(transactionHash);
        }
      }
      return res;
    } catch (error) {
      throw new Error(
        `Failed to getBlock ${blockHashOrBlockTag} from Hardhat provider: ${(error as Error).message}`,
      );
    }
  }

  public async getBlockWithTransactions(
    blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>,
  ): Promise<BlockWithTransactions> {
    try {
      let blockWithTransactions = new EthBlockWithTransactions();
      const block = (await this.getBlock(blockHashOrBlockTag)) as EthBlock;
      if (block.transactions.length !== 0) {
        for (let i = 0; i < block.transactions.length; i++) {
          const transaction = (await this.getTransaction(
            block.transactions[i],
          )) as EthTransaction;
          blockWithTransactions.transactions.push(transaction);
        }
        blockWithTransactions.hash = block.hash;
        blockWithTransactions.parentHash = block.parentHash;
        blockWithTransactions.number = block.number;
        blockWithTransactions.timestamp = block.timestamp;
        blockWithTransactions.miner = block.miner;
        blockWithTransactions.extraData = block.extraData;
      }

      return blockWithTransactions;
    } catch (error) {
      throw new Error(
        `Failed to getBlockWithTransactions ${blockHashOrBlockTag} from Hardhat provider: ${(error as Error).message}`,
      );
    }
  }
  public async getTransaction(
    transactionHash: string,
  ): Promise<TransactionResponse> {
    try {
      const response = (await this._hardhatProvider.request({
        method: "transaction.getTransactionInfo",
        params: [
          {
            hash: transactionHash,
          },
        ],
      })) as BifTransaction;
      log("getTransaction(hash) : ", JSON.stringify(response));
      let tmpTransaction = new EthTransaction();
      if (response.errorCode !== 0) {
        return tmpTransaction;
      }

      if (
        response?.result?.transactions &&
        response.result.transactions.length > 0
      ) {
        tmpTransaction.hash = response?.result?.transactions[0]?.hash ?? "";
        tmpTransaction.blockNumber =
          response?.result?.transactions[0]?.ledger_seq ?? 0;
        tmpTransaction.timestamp =
          response?.result?.transactions[0]?.close_time ?? 0;
        tmpTransaction.confirmations = 0;
        tmpTransaction.from =
          response?.result?.transactions[0]?.transaction?.source_address ?? "";
        tmpTransaction.raw = JSON.stringify(response?.result?.transactions);
        //pay-coin
        let type =
          response?.result?.transactions[0]?.transaction?.operations[0]?.type ??
          0;
        if (type === 7) {
          tmpTransaction.to =
            response?.result?.transactions[0]?.transaction?.operations[0]
              ?.pay_coin?.dest_address ?? "0";
        } else {
          tmpTransaction.to = "";
        }
        tmpTransaction.nonce =
          response?.result?.transactions[0]?.transaction?.nonce ?? 0;
        tmpTransaction.gasLimit = BigNumber.from(
          response?.result?.transactions[0]?.transaction?.fee_limit ?? 0,
        );
        tmpTransaction.gasPrice = BigNumber.from(
          response?.result?.transactions[0]?.transaction?.gas_price ?? 0,
        );
        tmpTransaction.data = JSON.stringify(
          response?.result?.transactions[0]?.transaction?.operations,
        );
        if (
          response?.result?.transactions[0]?.transaction?.operations[0]
            ?.type === 1
        ) {
          tmpTransaction.value = BigNumber.from(
            response?.result?.transactions[0]?.transaction?.operations[0]
              ?.create_account?.init_balance ?? 0,
          );
        } else if (
          response?.result?.transactions[0]?.transaction?.operations[0]
            ?.type === 7
        ) {
          tmpTransaction.value = BigNumber.from(
            response?.result?.transactions[0]?.transaction?.operations[0]
              ?.pay_coin?.amount ?? 0,
          );
        } else {
          tmpTransaction.value = BigNumber.from(0);
        }
        //get blockHash
        const responseBlock = (await this._hardhatProvider.request({
          method: "block.getBlockInfo",
          params: [
            {
              blockNumber:
                (response?.result?.transactions[0]?.ledger_seq).toString(),
              withLeader: false,
            },
          ],
        })) as BifBlock;

        if (responseBlock.errorCode !== 0) {
          return tmpTransaction;
        }

        tmpTransaction.blockHash = responseBlock?.header?.hash ?? "";
        tmpTransaction.chainId = 0;
        tmpTransaction.type =
          response?.result?.transactions[0]?.transaction?.operations[0]?.type;
      }

      return tmpTransaction;
    } catch (error) {
      throw new Error(
        `Failed to getTransaction ${transactionHash} from Hardhat provider: ${(error as Error).message}`,
      );
    }
  }
  public async getTransactionReceipt(
    transactionHash: string,
  ): Promise<TransactionReceipt> {
    try {
      const response = (await this._hardhatProvider.request({
        method: "transaction.getTransactionInfo",
        params: [
          {
            hash: transactionHash,
          },
        ],
      })) as BifTransaction;
      log("getTransactionReceipt(hash) : ", JSON.stringify(response));
      if (response.errorCode === 4) {
        return null;
      }

      let tmpTransaction = new EthTransactionReceipt();
      tmpTransaction.transactionHash =
        response?.result?.transactions[0]?.hash ?? "";
      if (response?.result?.transactions[0]?.error_code != 0) {
        tmpTransaction.status =
          response?.result?.transactions[0]?.error_code ?? 1;
        tmpTransaction.logsBloom =
          response?.result?.transactions[0]?.error_desc ?? "error";
        return tmpTransaction;
      }

      tmpTransaction.from =
        response?.result?.transactions[0]?.transaction?.source_address ?? "";
      if (
        response?.result?.transactions[0]?.transaction?.operations[0]?.type ===
        7
      ) {
        tmpTransaction.to =
          response?.result?.transactions[0]?.transaction?.operations[0]
            ?.pay_coin?.dest_address ?? "";
        //checkout to address is contract address
        const responsecheckContractAddress =
          (await this._hardhatProvider.request({
            method: "contract.checkContractAddress",
            params: [
              {
                contractAddress: tmpTransaction.to,
              },
            ],
          })) as checkContractAddress;

        if (responsecheckContractAddress.errorCode !== 0) {
          return tmpTransaction;
        }
        tmpTransaction.contractAddress = tmpTransaction.to;
      } else {
        tmpTransaction.to = "";
      }

      if (
        response?.result?.transactions[0]?.transaction?.operations[0]?.type ===
        1
      ) {
        const contractInfo = JSON.parse(
          response?.result?.transactions[0]?.error_desc,
        ) as contractInfo[];
        tmpTransaction.contractAddress = contractInfo[0].contract_address;
      }

      tmpTransaction.transactionIndex = 0;
      tmpTransaction.gasUsed = BigNumber.from(
        response?.result?.transactions[0]?.actual_fee ?? 0,
      );
      tmpTransaction.blockNumber =
        response?.result?.transactions[0]?.ledger_seq ?? 0;
      tmpTransaction.confirmations = 1;
      const responseBlock = (await this._hardhatProvider.request({
        method: "block.getBlockInfo",
        params: [
          {
            blockNumber: (
              response?.result?.transactions[0]?.ledger_seq ?? 0
            ).toString(),
            withLeader: false,
          },
        ],
      })) as BifBlock;
      if (responseBlock.errorCode !== 0) {
        return tmpTransaction;
      }
      tmpTransaction.blockHash = responseBlock?.header?.hash ?? "";
      tmpTransaction.root = "";
      tmpTransaction.cumulativeGasUsed = BigNumber.from(
        response?.result?.transactions[0]?.transaction?.fee_limit ?? 0,
      );
      tmpTransaction.effectiveGasPrice = BigNumber.from(
        response?.result?.transactions[0]?.transaction?.gas_price ?? 0,
      );
      tmpTransaction.byzantium = true;
      tmpTransaction.type =
        response?.result?.transactions[0]?.transaction?.operations[0]?.type ??
        0;
      tmpTransaction.status = 0;

      if (response?.result?.transactions[0]?.contract_tx_hashes !== undefined) {
        for (
          let i = 0;
          i < response?.result?.transactions[0]?.contract_tx_hashes.length;
          i++
        ) {
          const responseSon = (await this._hardhatProvider.request({
            method: "transaction.getTransactionInfo",
            params: [
              {
                hash: response?.result?.transactions[0]?.contract_tx_hashes[i],
              },
            ],
          })) as BifTransaction;

          if (responseSon.errorCode !== 0) {
            log(
              "getTransactionReceipt(hash) error-hash : ",
              response?.result?.transactions[0]?.contract_tx_hashes[i],
            );
            continue;
          }

          if (
            responseSon?.result?.transactions[0]?.transaction?.operations[0]
              ?.type === 8
          ) {
            const log = new EthLog();
            log.blockNumber = tmpTransaction.blockNumber;
            log.blockHash = tmpTransaction.blockHash;
            log.transactionIndex = 0;
            log.transactionHash = tmpTransaction.transactionHash;
            log.removed = false;
            log.logIndex = i;
            log.address = tmpTransaction.contractAddress;
            if (
              responseSon?.result?.transactions[0]?.transaction?.operations[0]
                ?.log?.topics ??
              "" !== ""
            ) {
              for (
                let j = 0;
                j <
                responseSon?.result?.transactions[0]?.transaction?.operations[0]
                  ?.log?.topics.length;
                j++
              ) {
                log.topics.push(
                  responseSon?.result?.transactions[0]?.transaction
                    ?.operations[0]?.log?.topics[j] ?? "",
                );
              }
            }

            if (
              responseSon?.result?.transactions[0]?.transaction?.operations[0]
                ?.log?.datas !== undefined
            ) {
              log.data =
                responseSon?.result?.transactions[0]?.transaction?.operations[0]
                  ?.log?.datas[0] ?? "";
            }
            tmpTransaction.logs.push(log);
          }
        }
      }

      return tmpTransaction;
    } catch (error) {
      throw new Error(
        `Failed to getTransactionReceipt ${transactionHash} from Hardhat provider: ${(error as Error).message}`,
      );
    }
  }

  // Bloom-filter Queries
  public async getLogs(filter: Filter): Promise<Array<Log>> {
    return undefined;
  }

  //these api unsupport
  // ENS
  public async resolveName(
    name: string | Promise<string>,
  ): Promise<null | string> {
    return null;
  }
  public async lookupAddress(
    address: string | Promise<string>,
  ): Promise<null | string> {
    return null;
  }

  // Event Emitter (ish)
  public on(eventName: EventType, listener: Listener): Provider {
    return this;
  }
  public once(eventName: EventType, listener: Listener): Provider {
    return this;
  }
  public emit(eventName: EventType, ...args: Array<any>): boolean {
    return false;
  }
  public listenerCount(eventName?: EventType): number {
    return 0;
  }
  public listeners(eventName?: EventType): Array<Listener> {
    return undefined;
  }
  public off(eventName: EventType, listener?: Listener): Provider {
    return this;
  }
  public removeAllListeners(eventName?: EventType): Provider {
    return this;
  }

  // @TODO: This *could* be implemented here, but would pull in events...
  public async waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number,
  ): Promise<TransactionReceipt> {
    return new EthTransactionReceipt();
  }
}
