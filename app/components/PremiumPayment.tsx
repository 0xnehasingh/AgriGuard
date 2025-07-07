"use client";

import React, { useState } from 'react';
import { useWallet } from './WalletSelectorProvider';
import { CreditCard, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface PremiumPaymentProps {
  policyId: string;
  premiumAmount: string;
  cropType: string;
  coverageAmount: string;
  onPaymentComplete?: () => void;
  className?: string;
}

const PremiumPayment: React.FC<PremiumPaymentProps> = ({
  policyId,
  premiumAmount,
  cropType,
  coverageAmount,
  onPaymentComplete,
  className = "",
}) => {
  const { isConnected, usdcBalance, payPremium, isLoading, error } = useWallet();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handlePayPremium = async () => {
    if (!isConnected) {
      setPaymentError('Please connect your wallet first');
      return;
    }

    const balance = parseFloat(usdcBalance);
    const premium = parseFloat(premiumAmount);

    if (balance < premium) {
      setPaymentError(`Insufficient USDC balance. You need $${premium} but only have $${balance}`);
      return;
    }

    try {
      setPaymentStatus('processing');
      setPaymentError(null);

      await payPremium(policyId, premiumAmount);
      
      setPaymentStatus('success');
      
      // Call completion callback after a delay
      setTimeout(() => {
        if (onPaymentComplete) {
          onPaymentComplete();
        }
        setPaymentStatus('idle');
      }, 3000);

    } catch (err) {
      console.error('Payment failed:', err);
      setPaymentStatus('error');
      setPaymentError(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'Processing payment...';
      case 'success':
        return 'Payment successful!';
      case 'error':
        return 'Payment failed';
      default:
        return 'Pay Premium';
    }
  };

  return (
    <div className={`border rounded-lg p-6 ${getStatusColor()} ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon()}
        </div>
        
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {getStatusText()}
          </h3>
          
          {paymentStatus === 'idle' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Policy ID:</span>
                  <p className="font-medium text-gray-900">{policyId}</p>
                </div>
                <div>
                  <span className="text-gray-500">Crop Type:</span>
                  <p className="font-medium text-gray-900">{cropType}</p>
                </div>
                <div>
                  <span className="text-gray-500">Coverage Amount:</span>
                  <p className="font-medium text-gray-900">${coverageAmount}</p>
                </div>
                <div>
                  <span className="text-gray-500">Premium Amount:</span>
                  <p className="font-medium text-green-600">${premiumAmount}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Your USDC Balance: <span className="font-semibold">${usdcBalance}</span>
                </div>
                <button
                  onClick={handlePayPremium}
                  disabled={!isConnected || isLoading || parseFloat(usdcBalance) < parseFloat(premiumAmount)}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200 flex items-center space-x-2"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Pay ${premiumAmount}</span>
                </button>
              </div>
            </div>
          )}
          
          {paymentStatus === 'processing' && (
            <div className="space-y-3">
              <p className="text-blue-700">
                Please confirm the transaction in your wallet...
              </p>
              <div className="bg-blue-100 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Amount:</strong> ${premiumAmount} USDC<br />
                  <strong>Policy:</strong> {policyId}
                </p>
              </div>
            </div>
          )}
          
          {paymentStatus === 'success' && (
            <div className="space-y-3">
              <p className="text-green-700">
                Your premium payment has been processed successfully!
              </p>
              <div className="bg-green-100 rounded-md p-3">
                <p className="text-sm text-green-800">
                  <strong>Paid:</strong> ${premiumAmount} USDC<br />
                  <strong>Policy:</strong> {policyId}<br />
                  <strong>Status:</strong> Policy activated
                </p>
              </div>
            </div>
          )}
          
          {(paymentStatus === 'error' || paymentError) && (
            <div className="space-y-3">
              <p className="text-red-700">
                {paymentError || 'An error occurred while processing your payment.'}
              </p>
              <button
                onClick={() => {
                  setPaymentStatus('idle');
                  setPaymentError(null);
                }}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumPayment; 