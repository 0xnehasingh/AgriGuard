import { Near, keyStores, ConnectConfig, WalletConnection, Contract, utils } from 'near-api-js';

// NEAR configuration
const config: ConnectConfig = {
  networkId: 'testnet',
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://testnet.mynearwallet.com/',
  helperUrl: 'https://helper.testnet.near.org',
  explorerUrl: 'https://explorer.testnet.near.org',
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

// Gas configuration
const GAS_CONFIG = {
  DEFAULT_GAS: '300000000000000', // 300 TGas
  FUNCTION_CALL_GAS: '100000000000000', // 100 TGas
  ATTACHED_DEPOSIT: '1', // 1 yoctoNEAR for security
};

// Error types
export enum AgriGuardErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  POLICY_NOT_FOUND = 'POLICY_NOT_FOUND',
  INVALID_PARAMS = 'INVALID_PARAMS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  USDC_TRANSFER_ERROR = 'USDC_TRANSFER_ERROR',
  WEATHER_DATA_ERROR = 'WEATHER_DATA_ERROR',
}

export class AgriGuardError extends Error {
  constructor(
    public type: AgriGuardErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AgriGuardError';
  }
}

/**
 * Sleep function for retry delays
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper for async operations
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.maxRetries,
  baseDelay: number = RETRY_CONFIG.baseDelay
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw new AgriGuardError(
          AgriGuardErrorType.NETWORK_ERROR,
          `Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`,
          lastError
        );
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        RETRY_CONFIG.maxDelay
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

// Contract interface
interface AgriGuardContract extends Contract {
  // View methods
  getPolicy(args: { policyId: string }): Promise<InsurancePolicy | null>;
  getClaim(args: { claimId: string }): Promise<Claim | null>;
  getFarmerPolicies(args: { farmer: string }): Promise<InsurancePolicy[]>;
  getContractStats(): Promise<ContractStats>;
  
  // Call methods
  createPolicy(args: {
    cropType: string;
    farmLocation: { lat: number; lng: number };
    coverageAmount: string;
    startDate: string;
    endDate: string;
    weatherParameters: {
      minTemp: number;
      maxTemp: number;
      minRainfall: number;
      maxRainfall: number;
    };
  }, gas?: string, amount?: string): Promise<string>;
  
  fileClaim(args: {
    policyId: string;
    reason: string;
    weatherData: WeatherData;
  }, gas?: string): Promise<string>;
  
  submitWeatherData(args: {
    stationId: string;
    temperature: number;
    rainfall: number;
    humidity: number;
    windSpeed: number;
  }, gas?: string): Promise<void>;
}

// Type definitions
export interface InsurancePolicy {
  policyId: string;
  farmer: string;
  cropType: string;
  farmLocation: { lat: number; lng: number };
  coverageAmount: string; // in USDC micro-units
  premium: string; // in USDC micro-units
  startDate: string;
  endDate: string;
  weatherParameters: {
    minTemp: number;
    maxTemp: number;
    minRainfall: number;
    maxRainfall: number;
  };
  isActive: boolean;
  claimsPaid: string; // in USDC micro-units
  premiumPaid: string; // in USDC micro-units
  status: 'pending' | 'active' | 'expired' | 'claimed';
}

export interface WeatherData {
  stationId: string;
  timestamp: string;
  temperature: number;
  rainfall: number;
  humidity: number;
  windSpeed: number;
}

export interface Claim {
  claimId: string;
  policyId: string;
  farmer: string;
  claimAmount: string;
  reason: string;
  weatherData: WeatherData;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  timestamp: string;
}

export interface ContractStats {
  totalPolicies: number;
  totalClaims: number;
  totalPremiumsCollected: string;
  totalClaimsPaid: string;
}

export class NEARAgriGuard {
  private near: Near;
  private wallet: WalletConnection;
  private contract: AgriGuardContract;
  private contractId: string;

  constructor(contractId: string) {
    this.contractId = contractId;
    this.near = new Near(config);
    this.wallet = new WalletConnection(this.near, 'agriguard');
    
    // Initialize contract
    this.contract = new Contract(
      this.wallet.account(),
      this.contractId,
      {
        viewMethods: [
          'getPolicy',
          'getClaim', 
          'getFarmerPolicies',
          'getContractStats'
        ],
        changeMethods: [
          'createPolicy',
          'fileClaim',
          'submitWeatherData'
        ]
      }
    ) as AgriGuardContract;
  }

  // Wallet methods
  isSignedIn(): boolean {
    return this.wallet.isSignedIn();
  }

  getAccountId(): string | null {
    return this.wallet.getAccountId();
  }

  signIn(): void {
    this.wallet.requestSignIn({
      contractId: this.contractId,
      methodNames: ['createPolicy', 'fileClaim']
    });
  }

  signOut(): void {
    this.wallet.signOut();
  }

  // Contract interaction methods
  /**
   * Create a new insurance policy with comprehensive error handling
   * @param cropType - Type of crop to insure
   * @param farmLocation - GPS coordinates of the farm
   * @param coverageAmount - Coverage amount in USDC micro-units
   * @param startDate - Policy start date (ISO string)
   * @param endDate - Policy end date (ISO string)
   * @param weatherParameters - Weather thresholds for claims
   * @returns Promise<string> - Policy ID
   */
  async createPolicy(
    cropType: string,
    farmLocation: { lat: number; lng: number },
    coverageAmount: string, // in USDC (6 decimals)
    startDate: string,
    endDate: string,
    weatherParameters: {
      minTemp: number;
      maxTemp: number;
      minRainfall: number;
      maxRainfall: number;
    }
  ): Promise<string> {
    try {
      // Validate inputs
      this.validatePolicyInputs(cropType, farmLocation, coverageAmount, startDate, endDate, weatherParameters);

      const args = {
        cropType,
        farmLocation,
        coverageAmount,
        startDate,
        endDate,
        weatherParameters
      };

      // Create policy with retry logic
      return await withRetry(async () => {
        return await this.contract.createPolicy(
          args,
          GAS_CONFIG.DEFAULT_GAS
        );
      });
    } catch (error) {
      throw new AgriGuardError(
        AgriGuardErrorType.CONTRACT_ERROR,
        `Failed to create policy: ${error.message}`,
        error as Error
      );
    }
  }

  /**
   * Validate policy creation inputs
   */
  private validatePolicyInputs(
    cropType: string,
    farmLocation: { lat: number; lng: number },
    coverageAmount: string,
    startDate: string,
    endDate: string,
    weatherParameters: any
  ): void {
    if (!cropType || cropType.trim().length === 0) {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Crop type is required');
    }

    if (!farmLocation || typeof farmLocation.lat !== 'number' || typeof farmLocation.lng !== 'number') {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Valid farm location coordinates are required');
    }

    if (farmLocation.lat < -90 || farmLocation.lat > 90) {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Latitude must be between -90 and 90');
    }

    if (farmLocation.lng < -180 || farmLocation.lng > 180) {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Longitude must be between -180 and 180');
    }

    try {
      const coverage = BigInt(coverageAmount);
      if (coverage <= 0) {
        throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Coverage amount must be positive');
      }
    } catch (error) {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Invalid coverage amount format');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime())) {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Invalid start date');
    }

    if (isNaN(end.getTime())) {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Invalid end date');
    }

    if (start.getTime() <= now.getTime()) {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Policy start date must be in the future');
    }

    if (end.getTime() <= start.getTime()) {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Policy end date must be after start date');
    }

    if (!weatherParameters || typeof weatherParameters !== 'object') {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Weather parameters are required');
    }

    if (weatherParameters.minTemp >= weatherParameters.maxTemp) {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Invalid temperature range');
    }

    if (weatherParameters.minRainfall >= weatherParameters.maxRainfall) {
      throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Invalid rainfall range');
    }
  }

  /**
   * Pay premium via USDC transfer with comprehensive error handling
   * @param policyId - Policy ID to pay premium for
   * @param premiumAmount - Premium amount in USDC micro-units
   * @param usdcContractId - USDC contract address
   */
  async payPremium(
    policyId: string,
    premiumAmount: string, // in USDC micro-units (6 decimals)
    usdcContractId: string = 'usdc.fakes.testnet'
  ): Promise<void> {
    try {
      // Validate inputs
      if (!policyId || policyId.trim().length === 0) {
        throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Policy ID is required');
      }

      if (!premiumAmount || BigInt(premiumAmount) <= 0) {
        throw new AgriGuardError(AgriGuardErrorType.INVALID_PARAMS, 'Premium amount must be positive');
      }

      if (!this.wallet.isSignedIn()) {
        throw new AgriGuardError(AgriGuardErrorType.UNAUTHORIZED, 'User must be signed in to pay premium');
      }

      // Check if policy exists
      const policy = await this.getPolicy(policyId);
      if (!policy) {
        throw new AgriGuardError(AgriGuardErrorType.POLICY_NOT_FOUND, `Policy ${policyId} not found`);
      }

      // Verify the premium amount matches the policy
      if (policy.premium !== premiumAmount) {
        throw new AgriGuardError(
          AgriGuardErrorType.INVALID_PARAMS,
          `Premium amount mismatch. Expected: ${formatUSDC(policy.premium)}, Provided: ${formatUSDC(premiumAmount)}`
        );
      }

      // Create USDC contract instance
      const usdcContract = new Contract(
        this.wallet.account(),
        usdcContractId,
        {
          viewMethods: ['ft_balance_of', 'ft_metadata'],
          changeMethods: ['ft_transfer_call']
        }
      ) as any;

      // Check user's USDC balance
      const accountId = this.wallet.getAccountId();
      const balance = await usdcContract.ft_balance_of({ account_id: accountId });
      
      if (BigInt(balance) < BigInt(premiumAmount)) {
        throw new AgriGuardError(
          AgriGuardErrorType.INSUFFICIENT_FUNDS,
          `Insufficient USDC balance. Available: ${formatUSDC(balance)}, Required: ${formatUSDC(premiumAmount)}`
        );
      }

      // Transfer USDC to AgriGuard contract with policy ID in message
      await withRetry(async () => {
        return await usdcContract.ft_transfer_call(
          {
            receiver_id: this.contractId,
            amount: premiumAmount,
            memo: `AgriGuard premium payment for policy ${policyId}`,
            msg: JSON.stringify({ policyId })
          },
          GAS_CONFIG.DEFAULT_GAS,
          GAS_CONFIG.ATTACHED_DEPOSIT
        );
      });

    } catch (error) {
      if (error instanceof AgriGuardError) {
        throw error;
      }
      throw new AgriGuardError(
        AgriGuardErrorType.USDC_TRANSFER_ERROR,
        `Failed to pay premium: ${error.message}`,
        error as Error
      );
    }
  }

  // Combined create policy and pay premium
  async createAndPayPolicy(
    cropType: string,
    farmLocation: { lat: number; lng: number },
    coverageAmountUSDC: number, // in USDC (not micro-units)
    startDate: string,
    endDate: string,
    weatherParameters: {
      minTemp: number;
      maxTemp: number;
      minRainfall: number;
      maxRainfall: number;
    },
    usdcContractId: string = 'usdc.fakes.testnet'
  ): Promise<string> {
    // Convert USDC to micro-units (6 decimals)
    const coverageAmount = (coverageAmountUSDC * 1000000).toString();
    
    // Step 1: Create policy
    const policyId = await this.createPolicy(
      cropType,
      farmLocation,
      coverageAmount,
      startDate,
      endDate,
      weatherParameters
    );

    // Step 2: Calculate premium (we need to get it from the created policy)
    const policy = await this.getPolicy(policyId);
    if (!policy) {
      throw new Error('Failed to create policy');
    }

    // Step 3: Pay premium
    await this.payPremium(policyId, policy.premium, usdcContractId);

    return policyId;
  }

  async fileClaim(
    policyId: string,
    reason: string,
    weatherData: WeatherData
  ): Promise<string> {
    return await this.contract.fileClaim(
      {
        policyId,
        reason,
        weatherData
      },
      '300000000000000' // 300 TGas
    );
  }

  async getPolicy(policyId: string): Promise<InsurancePolicy | null> {
    return await this.contract.getPolicy({ policyId });
  }

  async getClaim(claimId: string): Promise<Claim | null> {
    return await this.contract.getClaim({ claimId });
  }

  async getFarmerPolicies(farmer: string): Promise<InsurancePolicy[]> {
    return await this.contract.getFarmerPolicies({ farmer });
  }

  async getContractStats(): Promise<ContractStats> {
    return await this.contract.getContractStats();
  }

  // Utility methods
  formatNearAmount(amount: string): string {
    return utils.format.formatNearAmount(amount);
  }

  parseNearAmount(amount: string): string | null {
    return utils.format.parseNearAmount(amount);
  }

  // Weather oracle methods (for authorized oracles only)
  async submitWeatherData(
    stationId: string,
    temperature: number,
    rainfall: number,
    humidity: number,
    windSpeed: number
  ): Promise<void> {
    return await this.contract.submitWeatherData(
      {
        stationId,
        temperature,
        rainfall,
        humidity,
        windSpeed
      },
      '300000000000000' // 300 TGas
    );
  }

  // Integration with WeatherXM
  async submitWeatherXMData(weatherXMData: any): Promise<void> {
    const weatherData = {
      stationId: weatherXMData.id,
      temperature: weatherXMData.temperature,
      rainfall: weatherXMData.precipitation,
      humidity: weatherXMData.humidity,
      windSpeed: weatherXMData.windSpeed
    };

    return await this.submitWeatherData(
      weatherData.stationId,
      weatherData.temperature,
      weatherData.rainfall,
      weatherData.humidity,
      weatherData.windSpeed
    );
  }

  // Risk assessment helper
  assessRisk(
    weatherData: WeatherData,
    weatherParameters: {
      minTemp: number;
      maxTemp: number;
      minRainfall: number;
      maxRainfall: number;
    }
  ): { risk: 'low' | 'medium' | 'high'; score: number } {
    let riskScore = 0;

    // Temperature risk
    if (weatherData.temperature < weatherParameters.minTemp || 
        weatherData.temperature > weatherParameters.maxTemp) {
      riskScore += 40;
    }

    // Rainfall risk
    if (weatherData.rainfall < weatherParameters.minRainfall || 
        weatherData.rainfall > weatherParameters.maxRainfall) {
      riskScore += 50;
    }

    // Humidity risk (extreme values)
    if (weatherData.humidity < 20 || weatherData.humidity > 95) {
      riskScore += 20;
    }

    // Wind speed risk (extreme values)
    if (weatherData.windSpeed > 30) {
      riskScore += 30;
    }

    let risk: 'low' | 'medium' | 'high';
    if (riskScore < 30) {
      risk = 'low';
    } else if (riskScore < 70) {
      risk = 'medium';
    } else {
      risk = 'high';
    }

    return { risk, score: riskScore };
  }
}

// Export singleton instance
let nearAgriGuard: NEARAgriGuard | null = null;

export const initNEAR = (contractId: string): NEARAgriGuard => {
  if (!nearAgriGuard) {
    nearAgriGuard = new NEARAgriGuard(contractId);
  }
  return nearAgriGuard;
};

export const getNEAR = (): NEARAgriGuard => {
  if (!nearAgriGuard) {
    throw new Error('NEAR not initialized. Call initNEAR first.');
  }
  return nearAgriGuard;
};

// Helper functions
export const formatNEAR = (amount: string): string => {
  return utils.format.formatNearAmount(amount);
};

export const parseNEAR = (amount: string): string | null => {
  return utils.format.parseNearAmount(amount);
};

// USDC helper functions (6 decimals)
export const formatUSDC = (amount: string): string => {
  const usdcAmount = BigInt(amount) / BigInt(1000000);
  const remainder = BigInt(amount) % BigInt(1000000);
  
  if (remainder === BigInt(0)) {
    return usdcAmount.toString();
  } else {
    const decimal = remainder.toString().padStart(6, '0').replace(/0+$/, '');
    return `${usdcAmount}.${decimal}`;
  }
};

export const parseUSDC = (amount: string): string => {
  const [whole, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(6, '0').slice(0, 6);
  return (BigInt(whole) * BigInt(1000000) + BigInt(paddedDecimal || 0)).toString();
};

export const USDC_DECIMALS = 6;
export const USDC_TESTNET_CONTRACT = 'usdc.fakes.testnet';

export const cropTypes = [
  { value: 'wheat', label: 'Wheat', icon: '🌾' },
  { value: 'corn', label: 'Corn', icon: '🌽' },
  { value: 'rice', label: 'Rice', icon: '🍚' },
  { value: 'soybeans', label: 'Soybeans', icon: '🫘' },
  { value: 'cotton', label: 'Cotton', icon: '🌸' },
  { value: 'barley', label: 'Barley', icon: '🌾' },
  { value: 'oats', label: 'Oats', icon: '🌾' },
  { value: 'tomatoes', label: 'Tomatoes', icon: '🍅' },
  { value: 'potatoes', label: 'Potatoes', icon: '🥔' },
  { value: 'onions', label: 'Onions', icon: '🧅' }
];

export const weatherParameterDefaults = {
  wheat: {
    minTemp: 5,
    maxTemp: 30,
    minRainfall: 300,
    maxRainfall: 1000
  },
  corn: {
    minTemp: 15,
    maxTemp: 35,
    minRainfall: 500,
    maxRainfall: 1200
  },
  rice: {
    minTemp: 20,
    maxTemp: 40,
    minRainfall: 1000,
    maxRainfall: 2000
  },
  soybeans: {
    minTemp: 10,
    maxTemp: 35,
    minRainfall: 400,
    maxRainfall: 1000
  }
}; 