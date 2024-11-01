"use strict";

import { BlockTag, FeeData, Provider, TransactionRequest, TransactionResponse } from "./abstract-provider";
import { BigNumber, BigNumberish } from "./bignumber";
import { Bytes, BytesLike } from "./bytes";
import { Deferrable, defineReadOnly, resolveProperties, shallowCopy } from "./properties";

import { Logger } from "./logger";
const version = "abstract-signer/5.7.0";
const logger = new Logger(version);

const allowedTransactionKeys: Array<string> = [
    "chainId", "customData", "data", "from", "gasLimit", "gasPrice", "nonce", "to", "type", "value"
];

const forwardErrors = [
    Logger.errors.INSUFFICIENT_FUNDS,
    Logger.errors.NONCE_EXPIRED,
    Logger.errors.REPLACEMENT_UNDERPRICED,
];

// EIP-712 Typed Data
// See: https://eips.ethereum.org/EIPS/eip-712

export interface TypedDataDomain {
    name?: string;
    version?: string;
    chainId?: BigNumberish;
    verifyingContract?: string;
    salt?: BytesLike;
};

export interface TypedDataField {
    name: string;
    type: string;
};

// Sub-classes of Signer may optionally extend this interface to indicate
// they have a private key available synchronously
export interface ExternallyOwnedAccount {
    readonly address: string;
    readonly privateKey: string;
}

// Sub-Class Notes:
//  - A Signer MUST always make sure, that if present, the "from" field
//    matches the Signer, before sending or signing a transaction
//  - A Signer SHOULD always wrap private information (such as a private
//    key or mnemonic) in a function, so that console.log does not leak
//    the data

// @TODO: This is a temporary measure to preserve backwards compatibility
//        In v6, the method on TypedDataSigner will be added to Signer
export interface TypedDataSigner {
    _signTypedData(domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, any>): Promise<string>;
}

export abstract class Signer {
    readonly provider?: Provider;

    ///////////////////
    // Sub-classes MUST implement these

    // Returns the checksum address
    abstract getAddress(): Promise<string>

    // Returns the signed prefixed-message. This MUST treat:
    // - Bytes as a binary message
    // - string as a UTF8-message
    // i.e. "0x1234" is a SIX (6) byte string, NOT 2 bytes of data
    abstract signMessage(message: Bytes | string): Promise<string>;

    // Signs a transaction and returns the fully serialized, signed transaction.
    // The EXACT transaction MUST be signed, and NO additional properties to be added.
    // - This MAY throw if signing transactions is not supports, but if
    //   it does, sentTransaction MUST be overridden.
    abstract signTransaction(transaction: Deferrable<TransactionRequest>): Promise<string>;

    // Returns a new instance of the Signer, connected to provider.
    // This MAY throw if changing providers is not supported.
    abstract connect(provider: Provider): Signer;

    readonly _isSigner: boolean;


    ///////////////////
    // Sub-classes MUST call super
    constructor() {
        logger.checkAbstract(new.target, Signer);
        defineReadOnly(this, "_isSigner", true);
    }


    ///////////////////
    // Sub-classes MAY override these

    async getBalance(blockTag?: BlockTag): Promise<BigNumber> {
        this._checkProvider("getBalance");
        return await this.provider.getBalance(await this.getAddress(), blockTag);
    }

    async getTransactionCount(blockTag?: BlockTag): Promise<number> {
        this._checkProvider("getTransactionCount");
        return await this.provider.getTransactionCount(await this.getAddress(), blockTag);
    }

    // Populates "from" if unspecified, and estimates the gas for the transaction
    async estimateGas(transaction: Deferrable<TransactionRequest>): Promise<BigNumber> {
        this._checkProvider("estimateGas");
        const tx = await resolveProperties(this.checkTransaction(transaction));
        return await this.provider.estimateGas(tx);
    }

    // Populates "from" if unspecified, and calls with the transaction
    async call(transaction: Deferrable<TransactionRequest>, blockTag?: BlockTag): Promise<string> {
        this._checkProvider("call");
        const tx = await resolveProperties(this.checkTransaction(transaction));
        return await this.provider.call(tx, blockTag);
    }

    // Populates all fields in a transaction, signs it and sends it to the network
    async sendTransaction(transaction: Deferrable<TransactionRequest>): Promise<TransactionResponse> {
        this._checkProvider("sendTransaction");
        const tx = await this.populateTransaction(transaction);
        const signedTx = await this.signTransaction(tx);
        let txResponse = await this.provider.sendTransaction(signedTx);
        txResponse.from = tx.from;
        txResponse.nonce = Number(tx.nonce);
        
        return txResponse;
    }

    async getChainId(): Promise<number> {
        this._checkProvider("getChainId");
        const chainId = await this.provider.getChainId();
        return chainId;
    }

    async getGasPrice(): Promise<BigNumber> {
        this._checkProvider("getGasPrice");
        return await this.provider.getGasPrice();
    }

    async getFeeData(): Promise<FeeData> {
        this._checkProvider("getFeeData");
        return await this.provider.getFeeData();
    }


    async resolveName(name: string): Promise<string> {
        this._checkProvider("resolveName");
        return await this.provider.resolveName(name);
    }

    checkTransaction(transaction: Deferrable<TransactionRequest>): Deferrable<TransactionRequest> {
        for (const key in transaction) {
            if (allowedTransactionKeys.indexOf(key) === -1) {
                logger.throwArgumentError("invalid transaction key: " + key, "transaction", transaction);
            }
        }

        const tx = shallowCopy(transaction);

        if (tx.from == null) {
            tx.from = this.getAddress();
        }

        return tx;
    }

    async populateTransaction(transaction: Deferrable<TransactionRequest>): Promise<TransactionRequest> {

        const tx: Deferrable<TransactionRequest> = await resolveProperties(this.checkTransaction(transaction))
        
        if (tx.to != null) {
            //contract call
            tx.type = 7;
        }
        else {
            //contract deploy
            tx.type = 1;
        }

        if (tx.nonce == null) { tx.nonce = await this.getTransactionCount() + 1; }
        if (tx.gasLimit == null) { tx.gasLimit = await this.estimateGas(tx) }
        if (tx.gasPrice == null) { tx.gasPrice = await this.getGasPrice() }

        logger.debug(`populateTransaction tx.from:${tx.from}`)
        logger.debug(`populateTransaction tx.to:${tx.to}`)
        logger.debug(`populateTransaction tx.type:${tx.type}`)
        logger.debug(`populateTransaction tx.nonce:${tx.nonce}`)
        logger.debug(`populateTransaction tx.gasLimit:${tx.gasLimit}`)

        return await resolveProperties(tx);
    }

    _checkProvider(operation?: string): void {
        if (!this.provider) { logger.throwError("missing provider", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: (operation || "_checkProvider") });
        }
    }

    static isSigner(value: any): value is Signer {
        return !!(value && value._isSigner);
    }
}

export class VoidSigner extends Signer implements TypedDataSigner {
    readonly address: string;

    constructor(address: string, provider?: Provider) {
        super();
        defineReadOnly(this, "address", address);
        defineReadOnly(this, "provider", provider || null);
    }

    getAddress(): Promise<string> {
        return Promise.resolve(this.address);
    }

    _fail(message: string, operation: string): Promise<any> {
        return Promise.resolve().then(() => {
            logger.throwError(message, Logger.errors.UNSUPPORTED_OPERATION, { operation: operation });
        });
    }

    signMessage(message: Bytes | string): Promise<string> {
        return this._fail("VoidSigner cannot sign messages", "signMessage");
    }

    signTransaction(transaction: Deferrable<TransactionRequest>): Promise<string> {
        return this._fail("VoidSigner cannot sign transactions", "signTransaction");
    }

    _signTypedData(domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, any>): Promise<string> {
        return this._fail("VoidSigner cannot sign typed data", "signTypedData");
    }

    connect(provider: Provider): VoidSigner {
        return new VoidSigner(this.address, provider);
    }
}

