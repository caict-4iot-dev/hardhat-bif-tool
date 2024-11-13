"use strict";

import { getAddress } from "../../address";
import { hexZeroPad } from "../../bytes";
import { Logger } from "../../logger";

import { Coder, Reader, Writer } from "./abstract-coder";

import bs58 from '@bifproject/bs58';
import { Buffer } from 'buffer';

const version = "address/5.7.0";
const logger = new Logger(version);

export class AddressCoder extends Coder {

    constructor(localName: string) {
        super("address", "address", localName, false);
    }

    defaultValue(): string {
        return "0x0000000000000000000000000000000000000000";
    }

    encode(writer: Writer, value: string): number {
        let newValue :string = '';
        try {
            const bytes = bs58.decode(value.substring(10));
            const signType = value.substring(8, 9);  
            const encodeType = value.substring(9, 10);
            const signMap: { [key: string]: string } = { 'z': '7a' };  
            const encodeMap: { [key: string]: string } = { 's': '73', 't': '74' };
            const hex = Buffer.from(bytes).toString('hex');
            newValue = `0x${(signMap[signType] || '65')}${(encodeMap[encodeType] || '66')}${hex}`;
        } catch (error) {
            this._throwError(error.message, value);
        }
        logger.debug(`AddressCoder encode address value:${value}, newValue:${newValue}`)
        return writer.writeValue(newValue);
    }

    decode(reader: Reader): any {
        const value = reader.readValue().toHexString();
        const hex = value.substring(6)
        const bytes = Uint8Array.from(Buffer.from(hex, 'hex'))
        const address = bs58.encode(bytes)
        const signType = value.substring(2, 4)
        const encodeType = value.substring(4, 6)
        const signMap = {'7a': 'z'}
        const encodeMap = {'73': 's', '74': 't'}
        const newValue = `did:bid:${signMap[signType] || 'e'}${encodeMap[encodeType] || 'f'}${address}`;
        logger.debug(`AddressCoder decode address value:${value}, newValue:${newValue}`)
        return newValue;
    }
}

