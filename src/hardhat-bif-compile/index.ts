import debug from "debug";
import * as path from "path";

import {
  TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT,
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
} from "hardhat/builtin-tasks/task-names";

import { subtask } from "hardhat/config";
import { CompilationJob, CompilerInput, SolcBuild } from "hardhat/types";
import { getInputFromCompilationJob } from "./compiler-input";
import { InvalidSolidityVersionError } from "./errors";

const log = debug("hardhat:hardhat-bif:bif-compile");

subtask(TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT).setAction(
  async ({
    compilationJob,
  }: {
    compilationJob: CompilationJob;
  }): Promise<CompilerInput> => {
    return getInputFromCompilationJob(compilationJob);
  },
);

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(
  async ({
    quiet,
    solcVersion,
  }: {
    quiet: boolean;
    solcVersion: string;
  }): Promise<SolcBuild> => {
    if (solcVersion !== "0.8.21") {
      log("The bif-solidity version must be 0.8.21");
      throw new InvalidSolidityVersionError(
        "The bif-solidity version must be 0.8.21",
      );
    }

    const currentDir = __dirname;
    const solcBifPath = require.resolve("@bifproject/solc-bif");
    const solPath = path.join(path.dirname(solcBifPath), "soljson.js");
    log(`Using solc version: ${solcVersion} ${solPath}`);
    return {
      version: solcVersion,
      longVersion: `${solcVersion}`,
      compilerPath: `${solPath}`,
      isSolcJs: true,
    };
  },
);
