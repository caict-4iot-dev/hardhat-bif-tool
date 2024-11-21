import { CompilationJob, CompilerInput } from "hardhat/types";
import * as bs58 from "@bifproject/bs58";
import debug from "debug";

const log = debug("hardhat:hardhat-bif:bif-compile");

function processString(str: string): string {
  if (str.startsWith("did:bid:")) {
    const decodedArray = bs58.decode(str.substring(10));
    const signType = str.substring(8, 9);
    const encodeType = str.substring(9, 10);
    const signMap: { [key: string]: string } = { z: "7a" };
    const encodeMap: { [key: string]: string } = { s: "73", t: "74" };
    const hexString = Array.from(decodedArray)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const addressStr = `0x${signMap[signType] || "65"}${encodeMap[encodeType] || "66"}${hexString}`;
    log(`process before:${str}, after:${addressStr}`);
    return addressStr;
  }
  return str;
}

function replaceStringIfMatches(str: string): string {
  if (str.startsWith("0x") && str.length !== 50) {
    let oldStringWithoutPrefix = str.slice(2);
    while (oldStringWithoutPrefix.length < 44) {
      oldStringWithoutPrefix += "0";
    }
    const newString = `0x6566${oldStringWithoutPrefix}`;
    return newString;
  }
  return str;
}

function process0xString(data: string): string {
  try {
    const lines = data.split("\n");
    const processedLines = lines.map((line) => {
      if (line.includes("address")) {
        const regex = /0x([^,;\]\)]+)/g;
        let updatedLine = line;
        let match;
        while ((match = regex.exec(line)) !== null) {
          const originalString = `0x${match[1]}`;
          const processedString = replaceStringIfMatches(originalString);
          updatedLine = updatedLine.replace(originalString, processedString);
          log(`process process0xString:${updatedLine}`);
        }
        return updatedLine;
      }
      return line;
    });
    return processedLines.join("\n");
  } catch (error) {
    console.log("process0xString error");
    process.exit(1);
  }
}

function processFileSync(data: string): string {
  try {
    const regex = /did:bid:([^,;\]]+)/g;
    let updatedData = data;
    let match;
    while ((match = regex.exec(data)) !== null) {
      const originalString = `did:bid:${match[1]}`;
      const processedString = processString(originalString);
      updatedData = updatedData.replace(originalString, processedString);
    }
    return updatedData;
  } catch (error) {
    log("processFileSync error");
    process.exit(1);
  }
}

function dealingString(data: string): string {
  //const tmpdata = process0xString(data);
  return processFileSync(data);
}

export function getInputFromCompilationJob(
  compilationJob: CompilationJob,
): CompilerInput {
  const sources: { [sourceName: string]: { content: string } } = {};

  // we sort the files so that we always get the same compilation input
  const resolvedFiles = compilationJob
    .getResolvedFiles()
    .sort((a, b) => a.sourceName.localeCompare(b.sourceName));

  for (const file of resolvedFiles) {
    sources[file.sourceName] = {
      content: dealingString(file.content.rawContent),
    };
  }

  const { settings } = compilationJob.getSolcConfig();

  return {
    language: "Solidity",
    sources,
    settings,
  };
}
