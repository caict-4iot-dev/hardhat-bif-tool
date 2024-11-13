import { HardhatBifProvider } from "./hardhat-bif-provider";
import { TransactionRequest } from "../external/abstract-provider";
import { Deferrable } from "../external/properties";
import { Signer } from "../external/abstract-signer";
import { Bytes, hexlify } from "../external/bytes";
import { NotExistAccountPrivateKeyError } from "./errors"
import { BifCreateContract, BifContractInvoke, BifTransactionParams, BifSignData } from "./bif-types"
import debug from "debug";

const log = debug("hardhat:hardhat-bif:signer");

export class HardhatBifSigner extends Signer {
    public readonly provider: HardhatBifProvider;
    private readonly address: string;
    private privateKey: string;

    public static async create(provider: HardhatBifProvider, address: string) {
        return new HardhatBifSigner(address, provider);
    }

    private constructor(
        address: string,
        provider: HardhatBifProvider
    ) {
        super();
        this.address = address;
        this.provider = provider;
        this.privateKey = '';
    }

    public connect(
        provider: HardhatBifProvider
    ): Signer {
        return new HardhatBifSigner(this.address, provider);
    }

    public async signTransaction(transaction: Deferrable<TransactionRequest>): Promise<string> {
        const Transaction = require('@caict/bif-core-sdk/src/transaction'); 
        let trans = new Transaction();
        if (transaction?.type === 1) {
            let createContract = new BifCreateContract();
            createContract.initBalance = Number(transaction?.value ?? 0);
            createContract.payload = (transaction?.data ?? '').toString();
            createContract.initInput = '';
            createContract.type = 1; //EVM
            log('signTransaction(transaction) : createContract');
            trans.addOperation('createContract', [createContract]);
        }
        else if (transaction?.type === 7) {
            let paycoin = new BifContractInvoke();
            paycoin.amount = Number(transaction?.value ?? 0);
            paycoin.input = (transaction?.data ?? '').toString();
            paycoin.to = await transaction?.to ?? '';
            log('signTransaction(transaction) : payCoin');
            trans.addOperation('payCoin', [paycoin]);
        }
        else {
            return "";
        }
        let params = new BifTransactionParams();
        params.sourceAddress = await transaction?.from ?? '';
        params.nonce = Number(transaction?.nonce ?? 1);
        let gasLimit = Number(transaction?.gasLimit ?? 1);
        let gasPrice = Number(transaction?.gasPrice ?? 1);
        params.gasPrice = Number(transaction?.gasPrice ?? 1);
        params.feeLimit = gasLimit * gasPrice;
        params.metadata = '';

        trans.buildTransaction(params);

        //sign
        let signature = trans.signTransSerialization([await this.getPrivateKey()], trans.blob)

        let signData = new BifSignData();
        signData.blob = trans.blob;
        signData.signature = signature;


        log('signTransaction(transaction) : ', JSON.stringify(signData));

        return JSON.stringify(signData);
    }

    public async getAddress(): Promise<string> {
        log('getAddress() : ', JSON.stringify(this.address));
        return this.address;
    }

    public async signMessage(message: Bytes | string): Promise<string> {
        let data :string = '';
        if (typeof message !== 'string') {
            data = hexlify(message);
        }
        else {
            data = message;
        }
        const Transaction = require('@caict/bif-core-sdk/src/transaction'); 
        let trans = new Transaction();
        let signature = trans.signTransSerialization([await this.getPrivateKey()], data)

        let signData = new BifSignData();
        signData.blob = data;
        signData.signature = signature;

        log('signMessage() : ', JSON.stringify(signData));

        return JSON.stringify(signData);
    }

    public async getPrivateKey(): Promise<string> {
        const privateKeyResult = await this.provider.ethProvider.request({method:'bif_account_privatekey', params: [this.address]});
        if (typeof privateKeyResult === 'string') {  
            this.privateKey = privateKeyResult;
        } else {
            throw new NotExistAccountPrivateKeyError(this.address);
        }
        return this.privateKey;
    }
}
