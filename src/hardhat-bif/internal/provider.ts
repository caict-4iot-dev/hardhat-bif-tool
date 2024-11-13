import { EIP1193Provider, RequestArguments } from "hardhat/types";
import { NotExistAccountPrivateKeyError, ProviderMethodError, MethodInputError } from "./errors"
import { EventEmitter } from "events";

const BIFCoreSDK = require('@caict/bif-core-sdk');

export class LocalBifAccountsProvider extends EventEmitter implements EIP1193Provider {
    private _addressToPrivateKey: Map<string, string> = new Map();
    private _url: string;
    private _sdk: typeof BIFCoreSDK | null;
  
    constructor(
      url: string,
      localBifAccountsPrivateKeys: string[]
    ) {
      super();
      this._url = url;
      this._initializePrivateKeys(localBifAccountsPrivateKeys);

      const options = {
        host: url
      }
      this._sdk = new BIFCoreSDK(options);
    }

    protected _getParams<ParamsT extends any[] = any[]>(
        args: RequestArguments
      ): ParamsT | [] {
        const params = args.params;
    
        if (params === undefined) {
          return [];
        }
    
        if (!Array.isArray(params)) {
          throw new MethodInputError(args.method);
        }
    
        return params as ParamsT;
      }
  
    public async request(args: RequestArguments): Promise<unknown> {      
        const params = this._getParams(args);
        if (args.method === "bif_accounts") {
            return [...this._addressToPrivateKey.keys()];
        }
        
        if (args.method === "bif_account_privatekey") {
            return this._getPrivateKeyForAddress(params[0] as string);
        }
        
        const [objectName, methodName] = args.method.split('.');
        const object = (this._sdk as any)[objectName];
        if (object && typeof object[methodName] === 'function') {
            if (params.length === 0) 
                return object[methodName]();
            else
                return object[methodName](...params);
        } else {  
            throw new ProviderMethodError(methodName, objectName);
        } 
    }

    public send(method: string, params?: any[]): Promise<any> {
        return this.request({ method, params });
    }
  
    public get url(): string {
        return this._url;
    }

    private _initializePrivateKeys(localBifAccountsPrivateKeys: string[]) {
      const {
        publicToAddress,
        getEncPublicKey,
        isPrivateKey,
      } = require("@caict/bif-encryption");
  
      const privateKeys: string[] = [...localBifAccountsPrivateKeys];
  
      for (const pk of privateKeys) {
        const address: string = publicToAddress(getEncPublicKey(pk));
        this._addressToPrivateKey.set(address, pk);
      }
    }
  
    private _getPrivateKeyForAddress(address: string): string {
      const pk = this._addressToPrivateKey.get(address);
      if (pk === undefined) {
        throw new NotExistAccountPrivateKeyError(address);
      }
  
      return pk;
    }
  
    public getPrivateKeyForAddressOrNull(address: string): string | null {
      try {
        return this._getPrivateKeyForAddress(address);
      } catch {
        return null;
      }
    }
  }