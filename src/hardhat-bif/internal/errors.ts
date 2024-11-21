import { HardhatPluginError } from "hardhat/plugins";

export class HardhatBifError extends HardhatPluginError {
  constructor(message: string, parent?: Error) {
    super("@bifproject/hardhat-bif-tool[hardhat-bif]", message, parent);
  }
}

export class NetworkNotSupport extends HardhatBifError {
  constructor(networkName: string) {
    super(`please chose bif network, current network is ${networkName}`);
  }
}

export class NetworkSessionError extends HardhatBifError {
  constructor(desc: string) {
    super(`Error with chain: ${desc}`);
  }
}

export class BifAccountsFormatError extends HardhatBifError {
  constructor(pri: string) {
    super(`plugine bif accounts privateKey:${pri} format error`);
  }
}

export class MissingBifAccountsError extends HardhatBifError {
  constructor() {
    super(`plugine missing bif accounts`);
  }
}

export class MissingBifConfigError extends HardhatBifError {
  constructor() {
    super(`plugine missing bif config`);
  }
}

export class InvalidBifPrivateKeyError extends HardhatBifError {
  constructor(pri: string) {
    super(`bif privateKey: ${pri} Invalid`);
  }
}

export class NotExistAccountPrivateKeyError extends HardhatBifError {
  constructor(address: string) {
    super(`bif address: ${address} private key not found`);
  }
}

export class ProviderMethodError extends HardhatBifError {
  constructor(method: string, obj: string) {
    super(`provider method:${method} not found in obj:${obj}`);
  }
}

export class MethodInputError extends HardhatBifError {
  constructor(method: string) {
    super(`provider method:${method} Invalid input param`);
  }
}
