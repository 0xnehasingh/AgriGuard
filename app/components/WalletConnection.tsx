"use client";

import React from 'react';
import { useWallet } from './WalletSelectorProvider';
import { Wallet, LogOut, RefreshCw, AlertCircle } from 'lucide-react';

interface WalletConnectionProps {
  className?: string;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ className = "" }) => {
  const {
    isConnected,
    accountId,
    usdcBalance,
    connectWallet,
    disconnectWallet,
    fetchUSDCBalance,
    isLoading,
    error,
  } = useWallet();

  const handleRefreshBalance = async () => {
    await fetchUSDCBalance();
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-5 w-5 text-gray-500" />
            <span className="text-gray-700 font-medium">Connect Wallet</span>
          </div>
          <button
            onClick={connectWallet}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                <span>Connect</span>
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Connect your NEAR wallet to access insurance services
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Wallet className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {accountId}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-500">USDC Balance:</span>
              <span className="text-sm font-semibold text-green-600">
                ${usdcBalance}
              </span>
              <button
                onClick={handleRefreshBalance}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                title="Refresh balance"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={disconnectWallet}
          disabled={isLoading}
          className="text-gray-500 hover:text-red-600 transition-colors duration-200 flex items-center space-x-1"
          title="Disconnect wallet"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Disconnect</span>
        </button>
      </div>
    </div>
  );
};

export default WalletConnection; 