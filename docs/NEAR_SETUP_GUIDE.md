# 🚀 NEAR Blockchain Integration Guide for AgriGuard

## Overview

This guide will help you set up and integrate NEAR blockchain functionality with your AgriGuard parametric crop insurance platform.

## ✅ Completed Tasks

### 1. NEAR CLI Installation & Setup
- ✅ **near-cli** installed globally
- ✅ **near-sdk-js@latest** and **near-api-js@^2** installed as devDependencies
- ✅ **agriguard-js** project scaffolded with TypeScript contract

### 2. Project Structure
```
agriguard-js/
├── src/
│   └── agriguard-contract.ts    # Main insurance smart contract
├── sandbox-test/                # Contract tests
├── build/                       # Compiled WASM files
├── deploy.sh                    # Deployment script
├── package.json                 # Project dependencies
└── README.md                    # Project documentation
```

### 3. Smart Contract Features
- ✅ **Parametric Insurance Logic** - Automatic claim processing based on weather data
- ✅ **Policy Management** - Create, view, and manage insurance policies
- ✅ **Weather Oracle Integration** - Submit weather data for claim triggers
- ✅ **Automatic Payouts** - Smart contract-based claim settlements
- ✅ **Risk Assessment** - Built-in risk calculation algorithms

### 4. Frontend Integration
- ✅ **NEAR API Integration** (`lib/near-integration.ts`)
- ✅ **Wallet Connection** - Sign in/out functionality
- ✅ **Contract Interaction** - Create policies, file claims, view data
- ✅ **WeatherXM Integration** - Submit weather data to contract

---

## 🔧 Next Steps

### Step 1: Complete NEAR Login
You need to complete the NEAR login process that was started:

```bash
near login
```

**Instructions:**
1. The command should open your browser to https://testnet.mynearwallet.com/
2. Create a new account or sign in with an existing one
3. Choose an account name like `agriguard.testnet` or `your-name.testnet`
4. Authorize the CLI application
5. Complete the login process

### Step 2: Fund Your Account
Once logged in, fund your testnet account:

1. **Visit the faucet:** https://near-faucet.io/
2. **Enter your account ID:** `your-account.testnet`
3. **Request testnet NEAR tokens** (you'll need ~10-50 NEAR for testing)

### Step 3: Deploy the Contract
Navigate to the NEAR project and deploy:

```bash
cd agriguard-js
npm install
npm run build
npm run deploy
```

### Step 4: Update Environment Variables
Create a `.env` file in your main project root:

```bash
cp .env.template .env
```

Update the `.env` file with your actual values:
```env
# Your NEAR testnet account ID
TESTNET_ACCOUNT=your-account.testnet

# Your contract deployment address (usually same as account)
CONTRACT_NAME=your-account.testnet

# Your private key (found in ~/.near-credentials/testnet/your-account.testnet.json)
PRIVATE_KEY=your-private-key-here
```

---

## 🧪 Testing the Contract

### View Contract Stats
```bash
near view your-account.testnet getContractStats
```

### Create a Test Policy
```bash
near call your-account.testnet createPolicy \
  --args '{
    "cropType": "wheat",
    "farmLocation": {"lat": 40.7128, "lng": -74.0060},
    "coverageAmount": "1000000000000000000000000",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "weatherParameters": {
      "minTemp": 5,
      "maxTemp": 30,
      "minRainfall": 300,
      "maxRainfall": 1000
    }
  }' \
  --accountId your-account.testnet \
  --amount 50
```

### Submit Weather Data (as oracle)
```bash
near call your-account.testnet submitWeatherData \
  --args '{
    "stationId": "station_001",
    "temperature": 35,
    "rainfall": 50,
    "humidity": 60,
    "windSpeed": 15
  }' \
  --accountId your-account.testnet
```

---

## 🔗 Frontend Integration

### Initialize NEAR in Your React App

```typescript
// In your main App.tsx or layout component
import { initNEAR } from './lib/near-integration';

// Initialize NEAR
const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || 'your-account.testnet';
const nearAgriGuard = initNEAR(contractId);

// Check if user is signed in
if (nearAgriGuard.isSignedIn()) {
  console.log('User signed in:', nearAgriGuard.getAccountId());
}
```

### Create a Policy from Frontend

```typescript
import { getNEAR } from './lib/near-integration';

const createPolicy = async () => {
  const near = getNEAR();
  
  try {
    const policyId = await near.createPolicy(
      'wheat',                              // crop type
      { lat: 40.7128, lng: -74.0060 },     // farm location
      '100',                               // coverage amount in NEAR
      '2024-01-01',                        // start date
      '2024-12-31',                        // end date
      {                                    // weather parameters
        minTemp: 5,
        maxTemp: 30,
        minRainfall: 300,
        maxRainfall: 1000
      }
    );
    
    console.log('Policy created:', policyId);
  } catch (error) {
    console.error('Error creating policy:', error);
  }
};
```

### File a Claim from Frontend

```typescript
import { getNEAR } from './lib/near-integration';

const fileClaim = async (policyId: string, weatherData: any) => {
  const near = getNEAR();
  
  try {
    const claimId = await near.fileClaim(
      policyId,
      'Extreme weather conditions',
      weatherData
    );
    
    console.log('Claim filed:', claimId);
  } catch (error) {
    console.error('Error filing claim:', error);
  }
};
```

---

## 📊 WeatherXM Integration

### Submit WeatherXM Data to Contract

```typescript
import { getNEAR } from './lib/near-integration';
import { fetchWeatherData } from './lib/weatherxm';

const submitWeatherData = async (stationId: string) => {
  const near = getNEAR();
  
  try {
    // Fetch data from WeatherXM
    const weatherData = await fetchWeatherData(stationId);
    
    // Submit to NEAR contract
    await near.submitWeatherXMData(weatherData);
    
    console.log('Weather data submitted to contract');
  } catch (error) {
    console.error('Error submitting weather data:', error);
  }
};
```

---

## 🛠️ Development Commands

### Build Contract
```bash
cd agriguard-js
npm run build
```

### Run Tests
```bash
cd agriguard-js
npm run test
```

### Deploy Contract
```bash
cd agriguard-js
npm run deploy
```

### View Contract Methods
```bash
near view your-account.testnet getContractStats
```

---

## 🔐 Security Considerations

### Private Key Management
- **Never commit private keys** to version control
- Store private keys securely in environment variables
- Use different keys for development and production

### Contract Security
- The contract includes authorization checks for oracles
- Only the contract owner can add/remove weather oracles
- Policies are validated before creation

### Testing Best Practices
- Always test on testnet before mainnet deployment
- Verify contract behavior with edge cases
- Test automatic claim processing thoroughly

---

## 📚 Resources

### NEAR Documentation
- [NEAR CLI Guide](https://docs.near.org/tools/near-cli)
- [NEAR SDK JS](https://github.com/near/near-sdk-js)
- [NEAR API JS](https://github.com/near/near-api-js)

### WeatherXM Resources
- [WeatherXM API Documentation](https://docs.weatherxm.com/)
- [Weather Station Network](https://app.weatherxm.com/)

### AgriGuard Integration
- See `lib/near-integration.ts` for complete API reference
- Check `agriguard-js/src/agriguard-contract.ts` for contract methods
- Review tests in `agriguard-js/sandbox-test/` for usage examples

---

## 🎯 Next Development Steps

1. **Complete NEAR Login** - Finish the authentication process
2. **Deploy Contract** - Get your contract live on testnet
3. **Frontend Integration** - Connect your UI to the NEAR contract
4. **Weather Oracle Setup** - Configure automatic weather data submission
5. **Testing** - Thoroughly test policy creation and claim processing
6. **Production Deployment** - Deploy to mainnet when ready

---

## 🆘 Troubleshooting

### Common Issues

**Login Problems:**
- Make sure you're using a valid testnet account
- Check that you have sufficient NEAR tokens
- Verify your browser allows popup windows

**Contract Deployment:**
- Ensure you're logged in with the correct account
- Check that the contract builds successfully
- Verify you have enough NEAR for deployment

**Frontend Integration:**
- Make sure contract ID matches your deployed contract
- Check that NEAR API JS is properly configured
- Verify wallet connection is established

### Get Help
- Check the NEAR Discord: https://discord.gg/near
- Review GitHub issues in near-sdk-js repository
- Ask questions in the WeatherXM community

---

**✅ Your AgriGuard platform is now enhanced with NEAR blockchain capabilities!**

The integration provides:
- **Decentralized Insurance** - Trustless policy management
- **Automatic Payouts** - Smart contract-based claim processing  
- **Weather Oracle Integration** - Real-time weather data from WeatherXM
- **Transparent Operations** - All transactions on-chain and verifiable 