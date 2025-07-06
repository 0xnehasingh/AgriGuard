"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WalletSelector, AccountState } from '@near-wallet-selector/core';
import { setupWalletSelectorConfig, CONTRACT_CONFIG, formatUSDC, parseUSDC, GAS_CONFIG, NEAR_CONFIG } from '@/lib/wallet-selector';
import { providers } from 'near-api-js';

interface WalletContextType {
  // Wallet state
  selector: WalletSelector | null;
  accounts: AccountState[];
  accountId: string | null;
  isConnected: boolean;
  
  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  
  // USDC functionality
  usdcBalance: string;
  fetchUSDCBalance: () => Promise<void>;
  payPremium: (policyId: string, amount: string) => Promise<void>;
  
  // Contract interactions
  createPolicy: (params: any) => Promise<string>;
  getPolicies: () => Promise<any[]>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletSelectorProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = accountId !== null;

  // Initialize wallet selector
  useEffect(() => {
    const initWalletSelector = async () => {
      try {
        console.log('🔄 Initializing wallet selector...');
        const walletSelector = await setupWalletSelectorConfig();
        console.log('✅ Wallet selector initialized successfully');
        setSelector(walletSelector);
        
        // Check if already connected
        const state = walletSelector.store.getState();
        if (state.accounts.length > 0) {
          console.log('✅ Found existing wallet connection:', state.accounts[0].accountId);
          setAccounts(state.accounts);
          setAccountId(state.accounts[0].accountId);
        }
      } catch (err) {
        console.error('❌ Failed to initialize wallet selector:', err);
        setError(`Failed to initialize wallet selector: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    initWalletSelector();
  }, []);

  // Subscribe to wallet state changes
  useEffect(() => {
    if (!selector) return;

    const subscription = selector.store.observable.subscribe((state) => {
      console.log('🔄 Wallet state changed:', state);
      setAccounts(state.accounts);
      setAccountId(state.accounts.length > 0 ? state.accounts[0].accountId : null);
    });

    return () => subscription.unsubscribe();
  }, [selector]);

  // Fetch USDC balance when account changes
  useEffect(() => {
    if (accountId) {
      console.log('🔄 Fetching USDC balance for:', accountId);
      fetchUSDCBalance();
    } else {
      setUsdcBalance('0');
    }
  }, [accountId]);

  const connectWallet = async () => {
    if (!selector) {
      console.error('❌ Wallet selector not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Connecting wallet...');
      
      // Get available wallet modules from selector store
      const state = selector.store.getState();
      const wallets = state.modules;
      console.log('📱 Available wallets:', wallets.map(w => w.metadata.name));
      
      const availableWallets = wallets.filter((wallet: any) => wallet.metadata.available !== false);
      console.log('✅ Available wallets:', availableWallets.map(w => w.metadata.name));
      
      if (availableWallets.length === 0) {
        throw new Error('No wallets available');
      }

      // Connect to the first available wallet (usually MyNearWallet)
      const walletModule = availableWallets[0];
      console.log('🔗 Connecting to:', walletModule.metadata.name);
      
      const wallet = await selector.wallet(walletModule.id);
      await wallet.signIn({
        contractId: CONTRACT_CONFIG.contractId,
        methodNames: Object.values(CONTRACT_CONFIG.methodNames),
        accounts: [], // Required for hardware wallets, optional for others
      });
    } catch (err) {
      console.error('❌ Failed to connect wallet:', err);
      setError(`Failed to connect wallet: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    if (!selector) return;

    try {
      console.log('🔄 Disconnecting wallet...');
      const wallet = await selector.wallet();
      await wallet.signOut();
      setAccounts([]);
      setAccountId(null);
      setUsdcBalance('0');
      console.log('✅ Wallet disconnected');
    } catch (err) {
      console.error('❌ Failed to disconnect wallet:', err);
      setError(`Failed to disconnect wallet: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const fetchUSDCBalance = async () => {
    if (!selector || !accountId) return;

    try {
      console.log('🔄 Fetching USDC balance...');
      
      // Use JsonRpcProvider (compatible with near-api-js v5)
      const provider = new providers.JsonRpcProvider({
        url: NEAR_CONFIG.nodeUrl,
      });

      const result = await provider.query({
        request_type: 'call_function',
        finality: 'final',
        account_id: CONTRACT_CONFIG.usdcContractId,
        method_name: 'ft_balance_of',
        args_base64: Buffer.from(JSON.stringify({
          account_id: accountId,
        })).toString('base64'),
      });

      if ('result' in result && result.result) {
        const balance = JSON.parse(Buffer.from(result.result as Uint8Array).toString());
        const formattedBalance = formatUSDC(balance);
        console.log('💰 USDC Balance:', formattedBalance);
        setUsdcBalance(formattedBalance);
      }
    } catch (err) {
      console.error('❌ Failed to fetch USDC balance:', err);
      setUsdcBalance('0');
    }
  };

  const payPremium = async (policyId: string, amount: string): Promise<void> => {
    if (!selector || !accountId) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('💳 Processing premium payment:', { policyId, amount });

      const wallet = await selector.wallet();
      const amountInMicroUnits = parseUSDC(amount);

      // Call ft_transfer_call on USDC contract
      await wallet.signAndSendTransaction({
        receiverId: CONTRACT_CONFIG.usdcContractId,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'ft_transfer_call',
              args: {
                receiver_id: CONTRACT_CONFIG.contractId,
                amount: amountInMicroUnits,
                msg: JSON.stringify({
                  policy_id: policyId,
                  action: 'pay_premium',
                }),
              },
              gas: GAS_CONFIG.FT_TRANSFER_GAS,
              deposit: GAS_CONFIG.YOCTO_NEAR,
            },
          },
        ],
      });

      console.log('✅ Premium payment processed');
      // Refresh USDC balance after payment
      await fetchUSDCBalance();
    } catch (err) {
      console.error('❌ Failed to pay premium:', err);
      setError(`Failed to pay premium: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createPolicy = async (params: {
    cropType: string;
    coverageAmount: number;
    premiumAmount: number;
    rainfallThreshold: number;
    stationId: string;
    seasonStart: string;
    seasonEnd: string;
  }): Promise<string> => {
    if (!selector || !accountId) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('📋 Creating policy:', params);

      const wallet = await selector.wallet();

      const result = await wallet.signAndSendTransaction({
        receiverId: CONTRACT_CONFIG.contractId,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'create_policy',
              args: {
                crop_type: params.cropType,
                coverage_amount: params.coverageAmount.toString(),
                premium_amount: params.premiumAmount.toString(),
                rainfall_threshold: params.rainfallThreshold,
                station_id: params.stationId,
                season_start: params.seasonStart,
                season_end: params.seasonEnd,
              },
              gas: GAS_CONFIG.DEFAULT_GAS,
              deposit: GAS_CONFIG.YOCTO_NEAR,
            },
          },
        ],
      });

      console.log('✅ Policy created:', result);
      // Extract policy ID from transaction result
      if (result && typeof result === 'object' && 'transaction' in result && 'hash' in result.transaction) {
        return result.transaction.hash;
      }

      throw new Error('Failed to create policy');
    } catch (err) {
      console.error('❌ Failed to create policy:', err);
      setError(`Failed to create policy: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getPolicies = async (): Promise<any[]> => {
    if (!selector || !accountId) return [];

    try {
      console.log('📋 Fetching policies for:', accountId);
      
      const provider = new providers.JsonRpcProvider({
        url: NEAR_CONFIG.nodeUrl,
      });

      const result = await provider.query({
        request_type: 'call_function',
        finality: 'final',
        account_id: CONTRACT_CONFIG.contractId,
        method_name: 'get_policies',
        args_base64: Buffer.from(JSON.stringify({
          account_id: accountId,
        })).toString('base64'),
      });

      if ('result' in result && result.result) {
        const policies = JSON.parse(Buffer.from(result.result as Uint8Array).toString());
        console.log('📋 Retrieved policies:', policies);
        return policies;
      }

      return [];
    } catch (err) {
      console.error('❌ Failed to get policies:', err);
      return [];
    }
  };

  const value: WalletContextType = {
    selector,
    accounts,
    accountId,
    isConnected,
    connectWallet,
    disconnectWallet,
    usdcBalance,
    fetchUSDCBalance,
    payPremium,
    createPolicy,
    getPolicies,
    isLoading,
    error,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletSelectorProvider');
  }
  return context;
};

export default WalletSelectorProvider; 