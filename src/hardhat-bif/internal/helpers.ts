import type { HardhatBifSigner } from "./hardhat-bif-signers";
import type { HardhatBifProvider } from "./hardhat-bif-provider";
import { Signer } from "../external/abstract-signer";
import { Provider } from "../external/abstract-provider";
import { Artifact, HardhatRuntimeEnvironment } from "hardhat/types";
import { Contract, ContractFactory } from "../external/contract"
import { HardhatBifError } from "./errors";
import { BytesLike } from "../external/bytes";
import { FactoryOptions, Libraries, DeployContractOptions } from "./types"

export interface HardhatBifHelpers {
    provider: HardhatBifProvider;
  
    getSigner: (address: string) => Promise<HardhatBifSigner>;
    getSigners: () => Promise<HardhatBifSigner[]>;
    getContractFactory: typeof getContractFactory;
    // getContractFactoryFromArtifact: typeof getContractFactoryFromArtifact;
    // getContractAt: (
    //     nameOrAbi: string | any[],
    //     address: string,
    //     signer?: Signer
    // ) => Promise<Contract>;
    // getContractAtFromArtifact: (
    //     artifact: Artifact,
    //     address: string,
    //     signer?: Signer
    // ) => Promise<Contract>;
    // deployContract: typeof deployContract;
  }

interface Link {
  sourceName: string;
  libraryName: string;
  address: string;
}

function isArtifact(artifact: any): artifact is Artifact {
  const {
    contractName,
    sourceName,
    abi,
    bytecode,
    deployedBytecode,
    linkReferences,
    deployedLinkReferences,
  } = artifact;

  return (
    typeof contractName === "string" &&
    typeof sourceName === "string" &&
    Array.isArray(abi) &&
    typeof bytecode === "string" &&
    typeof deployedBytecode === "string" &&
    linkReferences !== undefined &&
    deployedLinkReferences !== undefined
  );
}

export async function getSigners(
  hre: HardhatRuntimeEnvironment
): Promise<HardhatBifSigner[]> {
  const accounts: string[] = await hre.bif.provider.ethProvider.send("bif_accounts", []);

  const signersWithAddress = await Promise.all(
    accounts.map((account) => getSigner(hre, account))
  );

  return signersWithAddress;
}

export async function getSigner(
  hre: HardhatRuntimeEnvironment,
  address: string
): Promise<HardhatBifSigner> {
  const { HardhatBifSigner: SignerWithAddressImpl } = await import(
    "./hardhat-bif-signers"
  );

  const signerWithAddress = await SignerWithAddressImpl.create(
    hre.bif.provider,
    address
  );

  return signerWithAddress;
}

export async function getContractAt(
    hre: HardhatRuntimeEnvironment,
    nameOrAbi: string | any[],
    address: string,
    signer?: Signer
  ) {
    if (typeof nameOrAbi === "string") {
      const artifact = await hre.artifacts.readArtifact(nameOrAbi);
  
      return getContractAtFromArtifact(hre, artifact, address, signer);
    }
    
    if (signer === undefined) {
      const signers = await hre.bif.getSigners();
      signer = signers[0];
    }
  
    // If there's no signer, we want to put the provider for the selected network here.
    // This allows read only operations on the contract interface.
    const signerOrProvider: Signer | Provider =
      signer !== undefined ? signer : hre.bif.provider;
  
    return new Contract(address, nameOrAbi, signerOrProvider);
}


export async function getContractAtFromArtifact(
    hre: HardhatRuntimeEnvironment,
    artifact: Artifact,
    address: string,
    signer?: Signer
  ) {
    if (!isArtifact(artifact)) {
      throw new HardhatBifError(
        `You are trying to create a contract by artifact, but you have not passed a valid artifact parameter.`
      );
    }
  
    if (signer === undefined) {
      const signers = await hre.bif.getSigners();
      signer = signers[0];
    }
  
    let contract = new Contract(address, artifact.abi, signer);
  
    return contract;
}

async function getContractFactoryByAbiAndBytecode(
    hre: HardhatRuntimeEnvironment,
    abi: any[],
    bytecode: BytesLike,
    signer?: Signer
): Promise<ContractFactory> {

  if (signer === undefined) {
    const signers = await hre.bif.getSigners();
    signer = signers[0];
  }
  return new ContractFactory(abi, bytecode, signer);
}

export async function getContractFactory(
    hre: HardhatRuntimeEnvironment,
    name: string,
    bytecodeOrFactoryOptions?:
        | (Signer | FactoryOptions)
        | BytesLike,
    signer?: Signer
): Promise<ContractFactory> {
    const artifact = await hre.artifacts.readArtifact(name);
    return getContractFactoryFromArtifact(
        hre,
        artifact,
        bytecodeOrFactoryOptions as Signer | FactoryOptions | undefined
    );
}

function isFactoryOptions(
    signerOrOptions?: Signer | FactoryOptions
  ): signerOrOptions is FactoryOptions {
    if (signerOrOptions === undefined || "provider" in signerOrOptions) {
      return false;
    }
  
    return true;
  }

export async function getContractFactoryFromArtifact(
    hre: HardhatRuntimeEnvironment,
    artifact: Artifact,
    signerOrOptions?: Signer | FactoryOptions
): Promise<ContractFactory> {
    let libraries: Libraries = {};
    let signer: Signer | undefined;

    if (!isArtifact(artifact)) {
        throw new HardhatBifError(
        `You are trying to create a contract factory from an artifact, but you have not passed a valid artifact parameter.`
        );
    }

    if (isFactoryOptions(signerOrOptions)) {
        signer = signerOrOptions.signer;
        libraries = signerOrOptions.libraries ?? {};
    } else {
        signer = signerOrOptions;
    }

    if (artifact.bytecode === "0x") {
        throw new HardhatBifError(
        `You are trying to create a contract factory for the contract ${artifact.contractName}, which is abstract and can't be deployed.
    If you want to call a contract using ${artifact.contractName} as its interface use the "getContractAt" function instead.`
        );
    }

    const linkedBytecode = await collectLibrariesAndLink(artifact, libraries);

    return getContractFactoryByAbiAndBytecode(
        hre,
        artifact.abi,
        linkedBytecode,
        signer
    );
}

async function collectLibrariesAndLink(
    artifact: Artifact,
    libraries: Libraries
) {

    const neededLibraries: Array<{
        sourceName: string;
        libName: string;
    }> = [];
    for (const [sourceName, sourceLibraries] of Object.entries(
        artifact.linkReferences
    )) {
        for (const libName of Object.keys(sourceLibraries)) {
        neededLibraries.push({ sourceName, libName });
        }
    }

    const linksToApply: Map<string, Link> = new Map();
    for (const [linkedLibraryName, linkedLibraryAddress] of Object.entries(
        libraries
    )) {
        const matchingNeededLibraries = neededLibraries.filter((lib) => {
        return (
            lib.libName === linkedLibraryName ||
            `${lib.sourceName}:${lib.libName}` === linkedLibraryName
        );
        });

    if (matchingNeededLibraries.length === 0) {
      let detailedMessage: string;
      if (neededLibraries.length > 0) {
        const libraryFQNames = neededLibraries
          .map((lib) => `${lib.sourceName}:${lib.libName}`)
          .map((x) => `* ${x}`)
          .join("\n");
        detailedMessage = `The libraries needed are:
${libraryFQNames}`;
      } else {
        detailedMessage = "This contract doesn't need linking any libraries.";
      }
      throw new HardhatBifError(
        `You tried to link the contract ${artifact.contractName} with ${linkedLibraryName}, which is not one of its libraries.
${detailedMessage}`
      );
    }

    if (matchingNeededLibraries.length > 1) {
      const matchingNeededLibrariesFQNs = matchingNeededLibraries
        .map(({ sourceName, libName }) => `${sourceName}:${libName}`)
        .map((x) => `* ${x}`)
        .join("\n");
      throw new HardhatBifError(
        `The library name ${linkedLibraryName} is ambiguous for the contract ${artifact.contractName}.
It may resolve to one of the following libraries:
${matchingNeededLibrariesFQNs}

To fix this, choose one of these fully qualified library names and replace where appropriate.`
      );
    }

    const [neededLibrary] = matchingNeededLibraries;

    const neededLibraryFQN = `${neededLibrary.sourceName}:${neededLibrary.libName}`;

    // The only way for this library to be already mapped is
    // for it to be given twice in the libraries user input:
    // once as a library name and another as a fully qualified library name.
    if (linksToApply.has(neededLibraryFQN)) {
      throw new HardhatBifError(
        `The library names ${neededLibrary.libName} and ${neededLibraryFQN} refer to the same library and were given as two separate library links.
Remove one of them and review your library links before proceeding.`
      );
    }

    linksToApply.set(neededLibraryFQN, {
      sourceName: neededLibrary.sourceName,
      libraryName: neededLibrary.libName,
      address: linkedLibraryAddress,
    });
  }

  if (linksToApply.size < neededLibraries.length) {
    const missingLibraries = neededLibraries
      .map((lib) => `${lib.sourceName}:${lib.libName}`)
      .filter((libFQName) => !linksToApply.has(libFQName))
      .map((x) => `* ${x}`)
      .join("\n");

    throw new HardhatBifError(
      `The contract ${artifact.contractName} is missing links for the following libraries:
${missingLibraries}

Learn more about linking contracts at https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-ethers#library-linking
`
    );
  }

  return linkBytecode(artifact, [...linksToApply.values()]);
}

function linkBytecode(artifact: Artifact, libraries: Link[]): string {
    let bytecode = artifact.bytecode;
  
    // TODO: measure performance impact
    for (const { sourceName, libraryName, address } of libraries) {
      const linkReferences = artifact.linkReferences[sourceName][libraryName];
      for (const { start, length } of linkReferences) {
        bytecode =
          bytecode.substr(0, 2 + start * 2) +
          address.substr(2) +
          bytecode.substr(2 + (start + length) * 2);
      }
    }
    return bytecode;
}

export async function deployContract(
    hre: HardhatRuntimeEnvironment,
    name: string,
    args?: any[],
    signerOrOptions?: Signer | DeployContractOptions
  ): Promise<Contract>;

export async function deployContract(
    hre: HardhatRuntimeEnvironment,
    name: string,
    signerOrOptions?: Signer | DeployContractOptions
  ): Promise<Contract>;
  
  export async function deployContract(
    hre: HardhatRuntimeEnvironment,
    name: string,
    argsOrSignerOrOptions?: any[] | Signer | DeployContractOptions,
    signerOrOptions?: Signer | DeployContractOptions
  ): Promise<Contract> {
    let args = [];
    if (Array.isArray(argsOrSignerOrOptions)) {
      args = argsOrSignerOrOptions;
    } else {
      signerOrOptions = argsOrSignerOrOptions;
    }
  
    const factory = await getContractFactory(hre, name, signerOrOptions);
    return factory.deploy(...args);
}