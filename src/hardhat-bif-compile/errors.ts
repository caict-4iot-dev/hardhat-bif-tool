import { HardhatPluginError } from "hardhat/plugins";

export class HardhatBifError extends HardhatPluginError {
  constructor(message: string, parent?: Error) {
    super("@bifproject/hardhat-bif-tool[hardhat-bif-compile]", message, parent);
  }
}

export class InvalidSolidityVersionError extends HardhatBifError {
  constructor(desc: string) {
    super(`not support current solidity version:${desc}`);
  }
}
