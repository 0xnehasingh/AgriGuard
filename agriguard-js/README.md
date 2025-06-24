# 🌾 AgriGuard Smart Contract

**NEAR Protocol smart contract for parametric crop insurance powered by WeatherXM data**

## 📋 Overview

The AgriGuard smart contract enables farmers to purchase parametric crop insurance policies that automatically trigger payouts based on WeatherXM weather data. The contract handles policy management, premium collection, risk assessment, and automated claim processing.

## 🛠️ Core Features

### 📝 Policy Management
- Create and manage insurance policies
- Define weather-based trigger conditions  
- Set coverage amounts and premium rates
- Track policy status and expiration

### 🌡️ WeatherXM Integration
- Connect to WeatherXM weather stations
- Process real-time weather data
- Trigger automated payouts based on weather conditions
- Validate weather data authenticity

### 💰 Financial Operations
- Handle USDC premium payments
- Process automatic claim payouts
- Manage insurance pool liquidity
- Calculate risk-based pricing

### 🔒 Security Features
- Input validation and sanitization
- Access control and authorization
- Error handling and recovery
- Comprehensive logging

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- NEAR CLI installed
- WeatherXM API access

### Build and Test
```bash
# Install dependencies
npm install

# Build the contract
npm run build

# Run tests
npm test

# Deploy to testnet
npm run deploy
```

### Contract Methods

#### View Methods (Free to call)
- `get_policy(policy_id)` - Get policy details
- `get_policies_by_farmer(farmer_id)` - Get farmer's policies
- `get_station_data(station_id)` - Get weather station data
- `calculate_premium(coverage, crop_type, location)` - Calculate policy premium

#### Call Methods (Require gas)
- `create_policy(params)` - Create new insurance policy
- `pay_premium(policy_id)` - Pay policy premium
- `process_weather_data(station_id, data)` - Process weather data
- `trigger_payout(policy_id)` - Trigger automatic payout

## 📊 Policy Parameters

### Supported Crops
- Wheat, Corn, Rice, Soybeans
- Cotton, Barley, Oats
- Tomatoes, Potatoes, Onions

### Weather Triggers
- **Drought**: < 20mm rainfall in 30 days
- **Excess Rain**: > 200mm rainfall in 7 days  
- **Heat Stress**: > 35°C for 5 consecutive days
- **Frost**: < 0°C during growing season

### Coverage Limits
- Minimum: 10 USDC
- Maximum: 100,000 USDC
- Premium Rate: 5-15% of coverage amount

## 🧪 Testing

### Run Test Suite
```bash
# Run all tests
npm test

# Run specific test file
npm test -- agriguard-usdc.test.js

# Run with coverage
npm run test:coverage
```

### Test Environment
- Mock USDC contract for testing
- Simulated weather data scenarios
- Comprehensive error handling tests

## 🔧 Configuration

### Environment Variables
```bash
NEAR_NETWORK=testnet
CONTRACT_NAME=agriguard.testnet
WEATHERXM_API_KEY=your_api_key
USDC_CONTRACT_ID=usdc.testnet
```

### Contract Deployment
```bash
# Create account
near create-account agriguard.testnet --useFaucet

# Deploy contract
near deploy agriguard.testnet build/agriguard_contract.wasm

# Initialize contract
near call agriguard.testnet init '{"usdc_contract":"usdc.testnet"}' --accountId agriguard.testnet
```

## 📖 Documentation

For detailed documentation, see the `/docs` directory:
- [Contract Methods](../docs/CONTRACT_METHODS.md)
- [Code Quality Improvements](../docs/CODE_QUALITY_IMPROVEMENTS.md)
- [NEAR Setup Guide](../docs/NEAR_SETUP_GUIDE.md)
- [USDC Integration](../docs/USDC_INTEGRATION_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality  
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details