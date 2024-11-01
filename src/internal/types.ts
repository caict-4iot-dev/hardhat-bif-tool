import type { Artifact } from "hardhat/types";
import { Signer } from "../external/abstract-signer";
import { Contract, ContractFactory } from "../external/contract";
import { BytesLike } from "../external/bytes";

export interface Libraries {
  [libraryName: string]: string;
}

export interface FactoryOptions {
  signer?: Signer;
  libraries?: Libraries;
}

export type DeployContractOptions = FactoryOptions;

export declare function deployContract(
  name: string,
  signerOrOptions?: Signer | DeployContractOptions
): Promise<Contract>;

export declare function deployContract(
  name: string,
  args: any[],
  signerOrOptions?: Signer | DeployContractOptions
): Promise<Contract>;

export declare function getContractFactoryFromArtifact(
  artifact: Artifact,
  signerOrOptions?: Signer | FactoryOptions
): Promise<ContractFactory>;
