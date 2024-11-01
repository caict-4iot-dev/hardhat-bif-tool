"use strict";

import { BytesLike } from "./bytes";
import { BigNumberish } from "./bignumber";

import { Logger } from "./logger";

import * as cryptoJs from 'crypto-js';  
import * as bs58 from '@bifproject/bs58';  

const version = "address/5.7.0";
const logger = new Logger(version);

function didAddressToHex(address: string): string {
    if (address.startsWith('did:bid')) {
        let finalHexString = '';
        const decodedArray = bs58.decode(address.substring(10));
        const hexString = Array.from(decodedArray)
          .map(byte => byte.toString(16).padStart(2, '0'))  
          .join('');
        if (address.startsWith('did:bid:ef')) {
            finalHexString = `0x6566${hexString}`;
        }
        else if (address.startsWith('did:bid:zf')) {
            finalHexString = `0x7a66${hexString}`;
        }
        else {
            return '0x000000000000000000000000000000000000000000000000'
        }
        return finalHexString;
    }
    else {
        return address;
    }
}

function hexAddressToDid(address: string): string {
    if (address.startsWith('0x')) {
        let finalDidString = '';
        if (address.startsWith('0x6566')) {
            finalDidString = 'did:bid:ef'
        }
        else if (address.startsWith('0x7a66')) {
            finalDidString = 'did:bid:zf'
        }
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(address.substring(6));
        const encodedString = bs58.encode(uint8Array);
        finalDidString += encodedString;
        return finalDidString;
    }
    else {
        return address;
    }
}

export function getAddress(address: string): string {
    const ad = hexAddressToDid(address);
    logger.debug(`getAddress before:${address}, after:${ad}`)
    return ad;
}

function hexStringToByteArray(hexString: string): Array<number> {  
    if (hexString.length % 2 !== 0) {  
        throw new Error("Invalid hex string length");  
    }  
  
    const byteArray: Array<number> = [];  
    for (let i = 0; i < hexString.length; i += 2) {  
        // 解析每两个十六进制字符为一个字节  
        const byteString = hexString.substr(i, 2);  
        const byte = parseInt(byteString, 16); // 将十六进制字符串解析为十进制整数  
        byteArray.push(byte);  
    }  
  
    return byteArray;  
}

export function getContractAddress(transaction: { from: string, nonce: BigNumberish }):string {
    const srcAddress = transaction.from;
    let raw = '';
    raw += srcAddress;
    raw += '-'
    raw += Number(transaction.nonce).toString();
    raw += '-'
    raw += Number(0).toString();
    raw += '-'
    raw += Number(0).toString();

    const sha256Hash = cryptoJs.SHA256(raw);
    const hashStr = sha256Hash.toString(cryptoJs.enc.Hex);
    const address = bs58.encode(hexStringToByteArray(hashStr).slice(10))

    return `did:bid:ef${address}`
}

export function getCreate2Address(from: string, salt: BytesLike, initCodeHash: BytesLike): string {
    //not support
    return '0x000000000000000000000000000000000000000000000000'
}
