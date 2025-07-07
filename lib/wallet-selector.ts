import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupLedger } from "@near-wallet-selector/ledger";
import { setupMathWallet } from "@near-wallet-selector/math-wallet";
import type { NetworkId } from "@near-wallet-selector/core";

// NEAR configuration
export const NEAR_CONFIG = {
  networkId: (process.env.NEXT_PUBLIC_NEAR_NETWORK_ID || "testnet") as NetworkId,
  keyStore: undefined, // Will be set by wallet selector
  nodeUrl: process.env.NEXT_PUBLIC_NEAR_NODE_URL || "https://rpc.testnet.near.org",
  walletUrl: process.env.NEXT_PUBLIC_NEAR_WALLET_URL || "https://testnet.mynearwallet.com/",
  helperUrl: process.env.NEXT_PUBLIC_NEAR_HELPER_URL || "https://helper.testnet.near.org",
  explorerUrl: process.env.NEXT_PUBLIC_NEAR_EXPLORER_URL || "https://testnet.nearblocks.io",
};

// Contract configuration
export const CONTRACT_CONFIG = {
  contractId: process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || "agriguard-contract.testnet",
  usdcContractId: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || "usdc.fakes.testnet",
  methodNames: {
    // View methods
    get_policies: "get_policies",
    get_policy_by_id: "get_policy_by_id",
    ft_balance_of: "ft_balance_of",
    get_weather_data: "get_weather_data",
    // Change methods
    create_policy: "create_policy",
    ft_transfer_call: "ft_transfer_call",
    process_policy_claims: "process_policy_claims",
    update_policy_status: "update_policy_status",
  },
};

// Wallet selector setup
export const setupWalletSelectorConfig = async () => {
  try {
    console.log('🔧 Setting up wallet selector with config:', {
      network: NEAR_CONFIG.networkId,
      nodeUrl: NEAR_CONFIG.nodeUrl,
      contractId: CONTRACT_CONFIG.contractId,
    });

    const selector = await setupWalletSelector({
      network: NEAR_CONFIG.networkId,
      debug: process.env.NODE_ENV === "development",
      modules: [
        setupMyNearWallet({
          walletUrl: NEAR_CONFIG.walletUrl,
          iconUrl: "https://mynearwallet.com/favicon.ico",
        }),
        setupHereWallet({
          iconUrl: "https://here.wallet/favicon.ico",
        }),
        setupMeteorWallet({
          iconUrl: "https://wallet.meteorwallet.app/favicon.ico",
        }),
        setupLedger({
          iconUrl: "https://www.ledger.com/favicon.ico",
        }),
        setupMathWallet({
          iconUrl: "https://mathwallet.org/favicon.ico",
        }),
      ],
    });

    console.log('✅ Wallet selector setup completed');
    return selector;
  } catch (error) {
    console.error('❌ Failed to setup wallet selector:', error);
    throw error;
  }
};

// USDC utility functions
export const formatUSDC = (amount: string): string => {
  try {
    const formatted = (parseFloat(amount) / 1e6).toFixed(2);
    return formatted;
  } catch (error) {
    console.error('❌ Error formatting USDC amount:', error);
    return "0.00";
  }
};

export const parseUSDC = (dollarAmount: string): string => {
  try {
    const microUnits = (parseFloat(dollarAmount) * 1e6).toString();
    return microUnits;
  } catch (error) {
    console.error('❌ Error parsing USDC amount:', error);
    return "0";
  }
};

// Gas configuration
export const GAS_CONFIG = {
  DEFAULT_GAS: "300000000000000", // 300 TGas
  DEPOSIT_GAS: "100000000000000", // 100 TGas
  FT_TRANSFER_GAS: "200000000000000", // 200 TGas
  YOCTO_NEAR: "1", // 1 yoctoNEAR for storage deposit
};

export default setupWalletSelectorConfig; 