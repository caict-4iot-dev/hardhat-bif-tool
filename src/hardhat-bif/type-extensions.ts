import "hardhat/types/runtime";
import { HardhatBifHelpers } from "./internal/helpers"

//拓展原有配置文件类型
declare module "hardhat/types/config" {
    interface HardhatNetworkUserConfig {
        bifNet ?: boolean;
        bifAccounts ?: string[];
    }
    
    interface HardhatNetworkConfig {
        bifNet : boolean;
        bifAccounts : string[];
    }
  
    interface HttpNetworkUserConfig {
        bifNet ?: boolean;
        bifAccounts ?: string[];
    }

    interface HttpNetworkConfig {
        bifNet :boolean;
        bifAccounts : string[];
    }
}

declare module "hardhat/types/runtime" {
    interface HardhatRuntimeEnvironment {
      bif: HardhatBifHelpers;
    }
}
