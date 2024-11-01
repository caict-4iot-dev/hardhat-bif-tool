

# hardhat-bif-box
[Hardhat](https://hardhat.org) plugin to develop smart contracts and compile bif solidty contract.


## What
The current add-on pack encompasses two fundamental features:

Integration of bif Chain Solidity Contract Compilation: This plugin incorporates the compilation capabilities of bif Chain's Solidity contracts, enabling users to effortlessly compile their contract code. Once installed, bif solidity contracts can be compiled by running the `compile` task. **The existing solidity plugin functionality will no longer be available**. plugin bindings for the [bif Solidity compiler](https://github.com/caict-4iot-dev/solc-js.git).

Deployment and Interaction with bif Chain Solidity Contracts: By integrating the Hardhat framework, this plugin facilitates the direct deployment of Solidity contracts onto the bif chain and offers comprehensive functionalities for contract transaction deployment, invocation, and querying. This significantly streamlines both the contract deployment process and subsequent operational tasks.
This plugin adds support for bif solidity compiler to Hardhat. 


## Installation

First, you need to install the plugin by running

```bash
npm install @bifproject/hardhat-bif-tool
```

And add the following statement to your `hardhat.config.js`:

```js
require("@bifproject/hardhat-bif-tool");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@bifproject/hardhat-bif-tool";
```

## Required plugins

No plugins dependencies.

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugins adds an `bif` object to the Hardhat Runtime Environment.

## Provider extensions

The provider supplied by Hardhat will be extended using [`extendProvider`](https://hardhat.org/hardhat-runner/docs/advanced/building-plugins#extending-the-hardhat-provider), decorating it to be a `HardhatBifProvider`. Any successive calls to `extendProvider` will be added on top of this.

A `HardhatBifProvider` knows how to connect and interact with bif chain.

### Helpers

These helpers are added to the `bif` object:

function getContractFactory(name: string, name: string,
    bytecodeOrFactoryOptions?:
        | (Signer | FactoryOptions)
        | BytesLike,
    signer?: Signer): Promise<ContractFactory>;

function getSigners() => Promise<Signer[]>;

function getSigner(address: string) => Promise<Signer>;

```

## Configuration

For deploy and call contract, the only additional step to make this plugin work is to configure it properly through the Hardhat Config. For example, in your `hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-ledger");

module.exports = {
  networks: {
    hardhat: {
      bifchain: [
        "bifchain": {
            url: "http://test.bifcore.bitfactory.cn",
            bifNet: true,
            bifAccounts: [ "priSPKnVwNrzJ7KiWxddfUtap7f52B8pnLtoCu6wEW3MmpuKQd","priSPKoJ8vUfXk92axGtokCDiw8cM7KHznL6iugvNxeANctrdL" ]
        }
      ],
    },
  },
};
```

This will make those three accounts available to the `HardhatBifProvider`.

For compile, this plugin adds an optional `solidity` entry to Hardhat's config, which lets you specify the solidity version to use.

This is an example of how to set it:

```js
module.exports = {
  solidity: "0.8.21",
};
```

## Usage

If you want to deploy and call contract, you could, for example in a task:

```
// Sample contract is used in the following tasks
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/**
 * @title TitleEscrow
 * @dev Title escrow contract for managing the beneficiaries and holders of a transferable record.
 */
contract test  {
  address private  registry;
  uint256 private val2;
    event Departure(  
        address indexed user,  // 触发事件的用户地址  
        string indexed entity, // 出发的实体（如车辆ID、航班号等）  
        uint256 location,       // 出发地点  
        uint256 timestamp       // 出发时间戳  
    );
  constructor(address ad, uint256 val) payable {
    registry = ad;
    val2 = val;
  }

  function setaddress(address ad) public {
    registry = ad;
    emit Departure(msg.sender, "setaddress", val2, block.timestamp);  
  }

  function getaddress() public returns(address) {
    return registry;
  }
}
```

```js
//getSigners
task("getsigners", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.bif.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

//getSigner
task("getsigner", "Prints an account's key")
  .addParam("account", "The account's address")
  .setAction(async (taskArgs) => {
  const key = await hre.bif.getSigner(taskArgs.account);
  console.log(await key.getPrivateKey());
});

//deploy contract
task("deploy", "deploy", async (taskArgs, hre) => {
  try{
    const factory = await hre.bif.getContractFactory("test");
    console.log(factory.bytecode);
    const contract = await factory.deploy("did:bid:ef56JqCtiFNBU7z8Y8Nd47QsNPVNbTu3",10,{value:10})
    const tx = contract.deployTransaction;
    console.log(`[Transaction] Pending ${tx.hash}`);

    const ct = await contract.deployed();
    if (ct !== null)
        console.log(`[Address] Deployed to ${contract.address}`);
    }catch(e) {
        console.log(e)
    }
});

//call
task("callStatic", "callStatic", async (taskArgs, hre) => {
  try{
    const factory = await hre.bif.getContractFactory("test");
    const contract = await factory.attach("did:bid:efehs2xrzswELV2ZKJE3AMFd8g33i4Kt");
    const val = await contract.callStatic["getaddress"]()

    console.log(`val = ${val}`)
  } catch(e) {
    console.log(e)
  }
});

//transaction
task("functions", "functions", async (taskArgs, hre) => {
  try{
    const factory = await hre.bif.getContractFactory("test");
    const contract = await factory.attach("did:bid:ef249KNPXngaVydMUhPCggEx5s1X9DLYM");
    const val = await contract.functions["setaddress"]("did:bid:efehs2xrzswELV2ZKJE3AMFd8g33i4Kt")

    console.log(`val = ${JSON.stringify(val)}`)
  } catch(e) {
    console.log(e)
  }
});

//parselog
task("parselog", "parselog", async (taskArgs, hre) => {
  try{
    const factory = await hre.bif.getContractFactory("test");
    let log = {
            "topics":[
                    "0x1d4ee578ef4b9699acd9140a4bdceb9f5c765bf42c262b109e3d55dd9f3cdd1b",
                    "0x000000000000000065660f132ff1eb3c4575312b3100a0db43990e73b83ccf28",
                    "0xfe3200aef86ac4a9d022abb87c4f2d6e6a310331ae0e29729515dd6d9aa60077"
            ],
            "data": "0x000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000625be8c2050e6"
    };
    const result = factory.interface.parseLog(log);

    console.log(`val = ${JSON.stringify(result)}`)
  } catch(e) {
    console.log(e)
  }
});

```

If you want to compile bif solidity contract, The following contract files can be used to test the usability of the BIF-Compiler. The procedure is the same as the original solidity contract compilation

Example:

```
pragma solidity ^0.8.20;

contract MyContract {
    address a = did:bid:efHQin9bi9s747KaePMdMFZ3mRVzV5a5; //for ed25519
    address b = did:bid:zfP8ckFNhiGmRvEXAsU6Eb57PEnAc45L; //for sm2
}
```



