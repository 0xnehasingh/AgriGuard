'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Thermometer, 
  CloudRain, 
  Wind, 
  AlertTriangle, 
  Check, 
  ArrowRight,
  Loader2,
  Info,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { weatherXM, cropRiskAssessment, calculateInsurancePremium } from '../../lib/weatherxm';
import { useWallet } from '../components/WalletSelectorProvider';
import WalletConnection from '../components/WalletConnection';
import PremiumPayment from '../components/PremiumPayment';

interface FormData {
  farmLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  cropType: string;
  plantingDate: string;
  harvestDate: string;
  farmSize: number;
  cropValue: number;
  coverage: number;
}

interface RiskAssessment {
  riskScore: number;
  triggers: Array<{
    type: string;
    description: string;
    threshold: number;
    payoutPercentage: number;
  }>;
  recommendations: string[];
}

interface Quote {
  premium: number;
  breakdown: {
    basePremium: number;
    riskAdjustment: number;
    platformFee: number;
    total: number;
  };
  coverage: number;
  payoutTriggers: Array<{
    type: string;
    description: string;
    maxPayout: number;
  }>;
}

export default function InsurancePage() {
  const { isConnected, accountId, createPolicy, payPremium, usdcBalance } = useWallet();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    farmLocation: { lat: 0, lng: 0, address: '' },
    cropType: '',
    plantingDate: '',
    harvestDate: '',
    farmSize: 0,
    cropValue: 0,
    coverage: 80
  });
  const [isLoading, setIsLoading] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [nearbyStations, setNearbyStations] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [createdPolicyId, setCreatedPolicyId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const cropTypes = [
    { id: 'wheat', name: 'Wheat', icon: '🌾', avgValue: 800 },
    { id: 'corn', name: 'Corn', icon: '🌽', avgValue: 1200 },
    { id: 'rice', name: 'Rice', icon: '🍚', avgValue: 1500 },
    { id: 'soybeans', name: 'Soybeans', icon: '🫘', avgValue: 900 },
    { id: 'cotton', name: 'Cotton', icon: '🌸', avgValue: 1100 },
    { id: 'coffee', name: 'Coffee', icon: '☕', avgValue: 2000 }
  ];

  const handleLocationSearch = async (address: string) => {
    // Mock geocoding - in production, use Google Maps API
    const mockCoords = {
      lat: 40.7128 + (Math.random() - 0.5) * 10,
      lng: -74.0060 + (Math.random() - 0.5) * 10
    };
    
    setFormData(prev => ({
      ...prev,
      farmLocation: { ...mockCoords, address }
    }));

    // Find nearby weather stations
    try {
      // Mock nearby stations - in production, use WeatherXM API
      const mockStations = [
        {
          id: 'station-001',
          name: 'WeatherXM Station Alpha',
          distance: 2.3,
          location: { lat: mockCoords.lat + 0.01, lng: mockCoords.lng + 0.01 },
          lastReading: {
            temperature: 24.5,
            precipitation: 0.2,
            humidity: 65,
            windSpeed: 8.1
          }
        },
        {
          id: 'station-002',
          name: 'WeatherXM Station Beta',
          distance: 5.7,
          location: { lat: mockCoords.lat - 0.02, lng: mockCoords.lng + 0.02 },
          lastReading: {
            temperature: 23.8,
            precipitation: 0.1,
            humidity: 62,
            windSpeed: 9.3
          }
        }
      ];
      
      setNearbyStations(mockStations);
      setSelectedStation(mockStations[0]);
    } catch (error) {
      console.error('Error finding nearby stations:', error);
    }
  };

  const handleRiskAssessment = async () => {
    if (!formData.farmLocation.lat || !formData.cropType || !selectedStation) {
      return;
    }

    setIsLoading(true);
    try {
      // Mock risk assessment - in production, use real WeatherXM data
      const mockRiskAssessment = {
        riskScore: 35,
        triggers: [
          {
            type: 'drought',
            description: 'Less than 20mm rainfall in 30 days',
            threshold: 20,
            payoutPercentage: 60
          },
          {
            type: 'excess_rain',
            description: 'More than 150mm rainfall in 7 days',
            threshold: 150,
            payoutPercentage: 40
          },
          {
            type: 'heat_stress',
            description: 'Temperature above 38°C for 5 consecutive days',
            threshold: 38,
            payoutPercentage: 50
          }
        ],
        recommendations: [
          'Consider drought-resistant crop varieties',
          'Implement efficient irrigation systems',
          'Monitor weather forecasts closely during growing season'
        ]
      };

      setRiskAssessment(mockRiskAssessment);
      
      // Calculate premium
      const coverageAmount = (formData.farmSize * formData.cropValue * formData.coverage) / 100;
      const premium = calculateInsurancePremium(
        coverageAmount,
        mockRiskAssessment.riskScore,
        Math.ceil((new Date(formData.harvestDate).getTime() - new Date(formData.plantingDate).getTime()) / (1000 * 60 * 60 * 24))
      );

      setQuote({
        premium: premium.premium,
        breakdown: premium.breakdown,
        coverage: coverageAmount,
        payoutTriggers: mockRiskAssessment.triggers.map(trigger => ({
          type: trigger.type,
          description: trigger.description,
          maxPayout: (coverageAmount * trigger.payoutPercentage) / 100
        }))
      });

    } catch (error) {
      console.error('Error calculating risk assessment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && formData.farmLocation.address) {
      setStep(2);
    } else if (step === 2 && formData.cropType && formData.plantingDate && formData.harvestDate) {
      setStep(3);
    } else if (step === 3 && formData.farmSize && formData.cropValue) {
      handleRiskAssessment();
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const handlePurchasePolicy = async () => {
    if (!quote || !isConnected) return;
    
    setIsLoading(true);
    try {
      // Create policy using NEAR smart contract
      const policyResult = await createPolicy({
        cropType: formData.cropType,
        coverageAmount: quote.coverage,
        premiumAmount: quote.premium,
        rainfallThreshold: riskAssessment?.triggers.find(t => t.type === 'drought')?.threshold || 20,
        stationId: selectedStation?.id || 'WXM_STATION_001',
        seasonStart: formData.plantingDate,
        seasonEnd: formData.harvestDate,
      });
      
      // Extract policy ID from transaction result
      const policyId = `policy_${Date.now()}`; // This should come from the transaction result
      setCreatedPolicyId(policyId);
      setShowPaymentModal(true);
      
    } catch (error) {
      console.error('Error creating policy:', error);
      alert('Error creating policy. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    setShowPaymentModal(false);
    
    // Reset form and show success
    setStep(6);
    setCreatedPolicyId(null);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Where is your farm located?
              </h2>
              <p className="text-gray-600">
                We'll find the nearest WeatherXM station to monitor your crops
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Farm Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter your farm address"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={formData.farmLocation.address}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        farmLocation: { ...prev.farmLocation, address: e.target.value }
                      }));
                    }}
                    onBlur={() => {
                      if (formData.farmLocation.address) {
                        handleLocationSearch(formData.farmLocation.address);
                      }
                    }}
                  />
                </div>
              </div>

              {nearbyStations.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    Nearby WeatherXM Stations
                  </h3>
                  <div className="space-y-2">
                    {nearbyStations.map((station) => (
                      <div
                        key={station.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedStation?.id === station.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedStation(station)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">{station.name}</div>
                            <div className="text-sm text-gray-600">{station.distance} km away</div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="flex items-center">
                                <Thermometer className="w-4 h-4 mr-1" />
                                {station.lastReading.temperature}°C
                              </span>
                              <span className="flex items-center">
                                <CloudRain className="w-4 h-4 mr-1" />
                                {station.lastReading.precipitation}mm
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What are you growing?
              </h2>
              <p className="text-gray-600">
                Select your crop type and growing season
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Crop Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {cropTypes.map((crop) => (
                  <div
                    key={crop.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      formData.cropType === crop.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, cropType: crop.id }))}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{crop.icon}</div>
                      <div className="font-medium text-gray-900">{crop.name}</div>
                      <div className="text-sm text-gray-600">${crop.avgValue}/hectare</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Planting Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={formData.plantingDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, plantingDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Harvest Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={formData.harvestDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, harvestDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Farm Details
              </h2>
              <p className="text-gray-600">
                Tell us about your farm size and crop value
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Farm Size (hectares)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 5.5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.farmSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, farmSize: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crop Value (USD per hectare)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    placeholder="e.g., 1200"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={formData.cropValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, cropValue: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coverage Level: {formData.coverage}%
              </label>
              <input
                type="range"
                min="60"
                max="100"
                step="5"
                value={formData.coverage}
                onChange={(e) => setFormData(prev => ({ ...prev, coverage: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>60%</span>
                <span>80%</span>
                <span>100%</span>
              </div>
            </div>

            {formData.farmSize > 0 && formData.cropValue > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Coverage Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Farm Value:</span>
                    <div className="font-medium">${(formData.farmSize * formData.cropValue).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Coverage Amount:</span>
                    <div className="font-medium">${((formData.farmSize * formData.cropValue * formData.coverage) / 100).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Analyzing Weather Risk
                </h2>
                <p className="text-gray-600">
                  Processing WeatherXM data for your location...
                </p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Risk Assessment Complete
                  </h2>
                  <p className="text-gray-600">
                    Based on WeatherXM data from {selectedStation?.name}
                  </p>
                </div>

                {riskAssessment && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg border p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Risk Score</h3>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          riskAssessment.riskScore < 30 ? 'bg-green-100 text-green-800' :
                          riskAssessment.riskScore < 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {riskAssessment.riskScore}% Risk
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${riskAssessment.riskScore}%` }}
                        ></div>
                      </div>

                      <div className="text-sm text-gray-600">
                        {riskAssessment.riskScore < 30 ? 'Low risk - Favorable conditions expected' :
                         riskAssessment.riskScore < 60 ? 'Moderate risk - Some weather concerns' :
                         'High risk - Significant weather threats detected'}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border p-6">
                      <h3 className="text-lg font-semibold mb-4">Parametric Triggers</h3>
                      <div className="space-y-4">
                        {riskAssessment.triggers.map((trigger, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                              <div className="font-medium capitalize">{trigger.type.replace('_', ' ')}</div>
                              <div className="text-sm text-gray-600">{trigger.description}</div>
                              <div className="text-sm font-medium text-green-600">
                                Max payout: {trigger.payoutPercentage}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">
                        Recommendations
                      </h3>
                      <ul className="space-y-1 text-sm text-blue-800">
                        {riskAssessment.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <Check className="w-4 h-4 mt-0.5 mr-2 text-blue-600" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Insurance Quote
              </h2>
              <p className="text-gray-600">
                Review and purchase your parametric insurance policy
              </p>
            </div>

            {quote && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">
                      ${quote.premium.toLocaleString()}
                    </div>
                    <div className="text-lg opacity-90">
                      Annual Premium
                    </div>
                    <div className="text-sm opacity-75 mt-2">
                      ${quote.coverage.toLocaleString()} coverage
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Premium Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Base Premium</span>
                      <span>${quote.breakdown.basePremium.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Adjustment</span>
                      <span>${quote.breakdown.riskAdjustment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Fee</span>
                      <span>${quote.breakdown.platformFee.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between font-semibold">
                        <span>Total Premium</span>
                        <span>${quote.breakdown.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Payout Triggers</h3>
                  <div className="space-y-4">
                    {quote.payoutTriggers.map((trigger, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium capitalize">{trigger.type.replace('_', ' ')}</div>
                          <div className="text-sm text-gray-600">{trigger.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            ${trigger.maxPayout.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">max payout</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                    <div className="text-sm">
                      <div className="font-medium text-yellow-800 mb-1">
                        How Parametric Insurance Works
                      </div>
                      <div className="text-yellow-700">
                        Payouts are automatically triggered when weather conditions meet predefined thresholds, 
                        based on data from WeatherXM station <strong>{selectedStation?.name}</strong>. 
                        No claims process required - payments are instant and transparent.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Policy Activated!
              </h2>
              <p className="text-gray-600">
                Your parametric insurance policy is now active and monitoring weather conditions
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">
                Policy Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Policy ID:</span>
                  <div className="font-medium">#AG{Date.now().toString().slice(-6)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Coverage:</span>
                  <div className="font-medium">${quote?.coverage.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Premium:</span>
                  <div className="font-medium">${quote?.premium.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Weather Station:</span>
                  <div className="font-medium">{selectedStation?.name}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">AgriGuard</span>
            </div>
            <div className="text-sm text-gray-600">
              Step {step} of 6
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Connection */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <WalletConnection />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(step / 6) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-lg p-8"
        >
          {renderStep()}

          {step < 6 && (
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="px-6 py-3 text-gray-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              
              {step === 5 ? (
                <button
                  onClick={handlePurchasePolicy}
                  disabled={isLoading || !isConnected}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {!isConnected ? (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      Connect Wallet to Purchase
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Purchase Policy
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNextStep}
                  disabled={
                    (step === 1 && !formData.farmLocation.address) ||
                    (step === 2 && (!formData.cropType || !formData.plantingDate || !formData.harvestDate)) ||
                    (step === 3 && (!formData.farmSize || !formData.cropValue))
                  }
                  className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Next
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Premium Payment Modal */}
      {showPaymentModal && createdPolicyId && quote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pay Premium</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <PremiumPayment
                policyId={createdPolicyId}
                premiumAmount={quote.premium.toString()}
                cropType={formData.cropType}
                coverageAmount={quote.coverage.toString()}
                onPaymentComplete={handlePaymentComplete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 