# AgriGuard Smart Contract Methods Reference

## Contract Address
- **Testnet:** `your-account.testnet` (replace with your actual account)
- **Contract Name:** `agriguard_contract.wasm`

## View Methods (Read-only, no gas fees)

### `getPolicy({ policyId })`
Get details of a specific insurance policy.

**Parameters:**
- `policyId` (string): Unique policy identifier

**Returns:** `InsurancePolicy` object or `null`

**Example:**
```bash
near view your-account.testnet getPolicy --args '{"policyId": "policy_1"}'
```

### `getClaim({ claimId })`
Get details of a specific claim.

**Parameters:**
- `claimId` (string): Unique claim identifier

**Returns:** `Claim` object or `null`

**Example:**
```bash
near view your-account.testnet getClaim --args '{"claimId": "claim_1"}'
```

### `getFarmerPolicies({ farmer })`
Get all policies owned by a specific farmer.

**Parameters:**
- `farmer` (string): NEAR account ID of the farmer

**Returns:** Array of `InsurancePolicy` objects

**Example:**
```bash
near view your-account.testnet getFarmerPolicies --args '{"farmer": "farmer.testnet"}'
```

### `getContractStats()`
Get overall contract statistics.

**Returns:** Object with:
- `totalPolicies` (number)
- `totalClaims` (number)
- `totalPremiumsCollected` (string)
- `totalClaimsPaid` (string)

**Example:**
```bash
near view your-account.testnet getContractStats
```

## Change Methods (Require gas and potentially NEAR tokens)

### `createPolicy({ ... })` (Payable)
Create a new insurance policy.

**Parameters:**
- `cropType` (string): Type of crop (e.g., "wheat", "corn")
- `farmLocation` (object): `{ lat: number, lng: number }`
- `coverageAmount` (string): Coverage amount in yoctoNEAR
- `startDate` (string): Policy start date
- `endDate` (string): Policy end date
- `weatherParameters` (object): Weather thresholds

**Payment:** Premium (5% of coverage amount)

**Returns:** Policy ID (string)

**Example:**
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

### `fileClaim({ ... })`
File a claim for an existing policy.

**Parameters:**
- `policyId` (string): Policy to claim against
- `reason` (string): Reason for claim
- `weatherData` (object): Weather data supporting the claim

**Returns:** Claim ID (string)

**Example:**
```bash
near call your-account.testnet fileClaim \
  --args '{
    "policyId": "policy_1",
    "reason": "Extreme temperature damage",
    "weatherData": {
      "stationId": "station_001",
      "timestamp": "1640995200000",
      "temperature": 45,
      "rainfall": 0,
      "humidity": 15,
      "windSpeed": 25
    }
  }' \
  --accountId farmer.testnet
```

### `submitWeatherData({ ... })` (Oracle only)
Submit weather data to the contract (authorized oracles only).

**Parameters:**
- `stationId` (string): Weather station identifier
- `temperature` (number): Temperature in Celsius
- `rainfall` (number): Rainfall in mm
- `humidity` (number): Humidity percentage
- `windSpeed` (number): Wind speed in km/h

**Example:**
```bash
near call your-account.testnet submitWeatherData \
  --args '{
    "stationId": "WXM_001",
    "temperature": 35,
    "rainfall": 0,
    "humidity": 25,
    "windSpeed": 40
  }' \
  --accountId weather-oracle.testnet
```

## Admin Methods (Owner only)

### `addOracle({ oracle })`
Add a new authorized weather oracle.

**Parameters:**
- `oracle` (string): NEAR account ID of the oracle

**Example:**
```bash
near call your-account.testnet addOracle \
  --args '{"oracle": "weather-oracle.testnet"}' \
  --accountId your-account.testnet
```

### `removeOracle({ oracle })`
Remove an authorized weather oracle.

**Parameters:**
- `oracle` (string): NEAR account ID of the oracle

**Example:**
```bash
near call your-account.testnet removeOracle \
  --args '{"oracle": "weather-oracle.testnet"}' \
  --accountId your-account.testnet
```

## Data Structures

### InsurancePolicy
```typescript
{
  policyId: string;
  farmer: string;
  cropType: string;
  farmLocation: { lat: number; lng: number };
  coverageAmount: string;
  premium: string;
  startDate: string;
  endDate: string;
  weatherParameters: {
    minTemp: number;
    maxTemp: number;
    minRainfall: number;
    maxRainfall: number;
  };
  isActive: boolean;
  claimsPaid: string;
}
```

### Claim
```typescript
{
  claimId: string;
  policyId: string;
  farmer: string;
  claimAmount: string;
  reason: string;
  weatherData: WeatherData;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  timestamp: string;
}
```

### WeatherData
```typescript
{
  stationId: string;
  timestamp: string;
  temperature: number;
  rainfall: number;
  humidity: number;
  windSpeed: number;
}
```

## Gas Costs (Typical)
- `createPolicy`: ~300 TGas
- `fileClaim`: ~300 TGas
- `submitWeatherData`: ~300 TGas
- View methods: ~30 TGas

## Important Notes

1. **Premium Calculation:** Currently 5% of coverage amount
2. **Automatic Payouts:** Triggered when weather data exceeds thresholds
3. **Payout Percentage:** 50% for temperature, 60% for rainfall violations
4. **Oracle Authorization:** Only authorized accounts can submit weather data
5. **Claim Processing:** Automatic processing based on weather parameters

## Testing Commands

```bash
# Test policy creation
near call your-account.testnet createPolicy --args '{"cropType":"wheat","farmLocation":{"lat":40.7128,"lng":-74.0060},"coverageAmount":"1000000000000000000000000","startDate":"2024-01-01","endDate":"2024-12-31","weatherParameters":{"minTemp":5,"maxTemp":30,"minRainfall":300,"maxRainfall":1000}}' --accountId your-account.testnet --amount 50

# Test weather data submission
near call your-account.testnet submitWeatherData --args '{"stationId":"test_001","temperature":45,"rainfall":0,"humidity":15,"windSpeed":25}' --accountId your-account.testnet

# Check contract stats
near view your-account.testnet getContractStats
``` 