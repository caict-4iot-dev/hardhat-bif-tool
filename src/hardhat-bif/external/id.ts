import { keccak256 } from "./keccak256";
import { toUtf8Bytes } from "./strings";

export function id(text: string): string {
    return keccak256(toUtf8Bytes(text));
}
