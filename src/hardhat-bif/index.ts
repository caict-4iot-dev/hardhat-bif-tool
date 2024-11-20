import {
  extendConfig,
  extendProvider,
  extendEnvironment,
} from "hardhat/config";
import { LocalBifAccountsProvider } from "./internal/provider";
import { lazyObject } from "hardhat/plugins";
import { HttpNetworkUserConfig } from "hardhat/types/config";
import type { HardhatBifProvider as HardhatBifProviderT } from "./internal/hardhat-bif-provider";
import { getSigner, getSigners, getContractFactory } from "./internal/helpers";
import "./type-extensions";
import {
  BifAccountsFormatError,
  MissingBifAccountsError,
  NetworkNotSupport,
} from "./internal/errors";
import chalk from "chalk";

extendConfig((config, userConfig) => {
  let existBif = false;
  for (const networkName of Object.keys(config.networks)) {
    config.networks[networkName].bifNet =
      userConfig.networks?.[networkName]?.bifNet ?? false;
    config.networks[networkName].bifAccounts =
      userConfig.networks?.[networkName]?.bifAccounts ?? [];
    //just check Whether or not bifAccounts is start with pri
    if (config.networks[networkName].bifNet) {
      existBif = true;
      config.networks[networkName].bifAccounts.filter((account) => {
        if (!account.startsWith("pri")) {
          console.log(
            chalk.yellow(`Warning: account ${account} pri not exist`),
          );
          throw new BifAccountsFormatError(`${account}`);
        }
      });
      if (config.networks[networkName].bifAccounts.length === 0) {
        throw new MissingBifAccountsError();
      }
    }
  }

  //check is exist bif config info
  if (!existBif) {
    console.log(chalk.yellow(`Warning: bif net config not exist`));
  }
});

extendProvider(async (provider, config, network) => {
  //check if bifnet, then create localbifaccountsProvider
  if (config.networks[network].bifNet) {
    let net = config.networks[network] as HttpNetworkUserConfig;
    return new LocalBifAccountsProvider(net.url, net.bifAccounts);
  } else {
    return provider;
  }
});

extendEnvironment((hre) => {
  hre.bif = lazyObject(() => {
    if (!hre.network.config.bifNet) {
      throw new NetworkNotSupport(hre.network.name);
    }
    const { HardhatBifProvider } =
      require("./internal/hardhat-bif-provider") as {
        HardhatBifProvider: typeof HardhatBifProviderT;
      };

    const provider = new HardhatBifProvider(hre.network.provider);
    return {
      provider,

      getSigner: (address: string) => getSigner(hre, address),
      getSigners: () => getSigners(hre),
      getContractFactory: getContractFactory.bind(null, hre) as any,
    };
  });
});
