"use client";

import React, { useEffect, useState } from 'react';
import { useWallet } from '../components/WalletSelectorProvider';

export default function TestWalletPage() {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const {
    selector,
    accountId,
    isConnected,
    connectWallet,
    disconnectWallet,
    usdcBalance,
    fetchUSDCBalance,
    isLoading,
    error
  } = useWallet();

  // Capture console errors
  useEffect(() => {
    const originalError = console.error;
    const errors: string[] = [];
    
    console.error = (...args) => {
      const errorMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      errors.push(`[${new Date().toLocaleTimeString()}] ${errorMessage}`);
      setConsoleErrors([...errors]);
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    const logs: string[] = [];
    
    // Test wallet selector initialization
    if (selector) {
      logs.push("✅ Wallet selector initialized successfully");
      try {
        logs.push(`📋 Network: ${selector.options.network}`);
        logs.push(`🔗 Debug mode: ${selector.options.debug}`);
        const state = selector.store.getState();
        logs.push(`🔧 Modules: ${state.modules?.length || 0} wallets configured`);
      } catch (err) {
        logs.push(`❌ Error reading selector options: ${err}`);
      }
    } else {
      logs.push("❌ Wallet selector not initialized");
    }
    
    // Test account connection
    if (isConnected && accountId) {
      logs.push(`✅ Wallet connected: ${accountId}`);
      logs.push(`💰 USDC Balance: ${usdcBalance}`);
    } else {
      logs.push("❌ No wallet connected");
    }
    
    // Test environment variables
    const envVars = [
      'NEXT_PUBLIC_NEAR_NETWORK_ID',
      'NEXT_PUBLIC_NEAR_CONTRACT_ID',
      'NEXT_PUBLIC_USDC_CONTRACT_ID',
      'NEXT_PUBLIC_NEAR_NODE_URL',
      'NEXT_PUBLIC_NEAR_WALLET_URL'
    ];
    
    logs.push("📋 Environment Variables:");
    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        logs.push(`  ✅ ${varName}: ${value}`);
      } else {
        logs.push(`  ❌ ${varName}: Not set`);
      }
    });
    
    // Test any errors
    if (error) {
      logs.push(`❌ Wallet Error: ${error}`);
    }
    
    // Check near-api-js version
    try {
      logs.push("📦 Package Information:");
      logs.push(`  ℹ️ User Agent: ${navigator.userAgent}`);
      logs.push(`  ℹ️ Current URL: ${window.location.href}`);
    } catch (err) {
      logs.push(`❌ Error getting package info: ${err}`);
    }
    
    setDebugInfo(logs);
    setLoading(false);
  }, [selector, accountId, isConnected, usdcBalance, error]);

  const handleConnect = async () => {
    try {
      console.log('🔄 Test page: Initiating wallet connection...');
      await connectWallet();
      console.log('✅ Test page: Wallet connection completed');
    } catch (err) {
      console.error('❌ Test page: Connection error:', err);
      setDebugInfo(prev => [...prev, `❌ Connection error: ${err}`]);
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log('🔄 Test page: Initiating wallet disconnection...');
      await disconnectWallet();
      console.log('✅ Test page: Wallet disconnection completed');
    } catch (err) {
      console.error('❌ Test page: Disconnection error:', err);
      setDebugInfo(prev => [...prev, `❌ Disconnection error: ${err}`]);
    }
  };

  const handleRefreshBalance = async () => {
    try {
      console.log('🔄 Test page: Refreshing USDC balance...');
      await fetchUSDCBalance();
      console.log('✅ Test page: Balance refresh completed');
      setDebugInfo(prev => [...prev, `✅ Balance refreshed: ${usdcBalance}`]);
    } catch (err) {
      console.error('❌ Test page: Balance refresh error:', err);
      setDebugInfo(prev => [...prev, `❌ Balance refresh error: ${err}`]);
    }
  };

  const handleClearLogs = () => {
    setConsoleErrors([]);
    setDebugInfo([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Testing wallet selector...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          NEAR Wallet Selector Test
        </h1>
        
        {/* Status Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${selector ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Wallet Selector: {selector ? 'Initialized' : 'Not Initialized'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Connection: {isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <strong>Account:</strong> {accountId || 'None'}
              </div>
              <div className="text-sm text-gray-600">
                <strong>USDC Balance:</strong> {usdcBalance || '0'} USDC
              </div>
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex space-x-4 flex-wrap">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? 'Disconnecting...' : 'Disconnect Wallet'}
                </button>
                <button
                  onClick={handleRefreshBalance}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Refreshing...' : 'Refresh Balance'}
                </button>
              </>
            )}
            <button
              onClick={handleClearLogs}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Debug Info Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <div className="bg-gray-50 p-4 rounded-lg h-96 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {debugInfo.join('\n')}
              </pre>
            </div>
          </div>

          {/* Console Errors Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Console Errors 
              {consoleErrors.length > 0 && (
                <span className="text-red-500 text-sm ml-2">
                  ({consoleErrors.length})
                </span>
              )}
            </h2>
            <div className="bg-red-50 p-4 rounded-lg h-96 overflow-y-auto">
              {consoleErrors.length === 0 ? (
                <p className="text-green-600 text-sm">No errors detected ✅</p>
              ) : (
                <pre className="text-sm text-red-700 whitespace-pre-wrap">
                  {consoleErrors.join('\n')}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 