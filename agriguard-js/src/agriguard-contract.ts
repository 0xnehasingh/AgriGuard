import { NearBindgen, near, call, view, initialize, LookupMap, Vector, assert, bytes, UnorderedMap } from 'near-sdk-js';
import { AccountId, Balance, Gas } from 'near-sdk-js/lib/types';

// USDC Contract on NEAR Testnet
const USDC_CONTRACT = 'usdc.fakes.testnet';

// Constants for business logic
const BASIS_POINTS = 10000; // For percentage calculations (100% = 10000 basis points)
const MIN_PREMIUM_USDC = 1000000; // 1 USDC minimum premium
const MAX_COVERAGE_USDC = 1000000000000; // 1 million USDC max coverage
const DEFAULT_PREMIUM_RATE = 500; // 5% premium rate (500 basis points)

// Error messages
const ERRORS = {
  UNAUTHORIZED_ORACLE: 'Only authorized oracles can submit weather data',
  UNAUTHORIZED_USDC: 'Only USDC contract can call ft_on_transfer',
  POLICY_NOT_FOUND: 'Policy not found',
  CLAIM_NOT_FOUND: 'Claim not found',
  INSUFFICIENT_PREMIUM: 'Insufficient premium amount',
  POLICY_NOT_ACTIVE: 'Policy is not active',
  INVALID_POLICY_OWNER: 'Only policy owner can perform this action',
  INVALID_MESSAGE_FORMAT: 'Invalid message format',
  COVERAGE_AMOUNT_TOO_HIGH: 'Coverage amount exceeds maximum allowed',
  COVERAGE_AMOUNT_TOO_LOW: 'Coverage amount below minimum required',
  INVALID_DATE_RANGE: 'Invalid policy date range',
  CLAIM_ALREADY_PROCESSED: 'Claim has already been processed'
};

// Insurance Policy Structure
class InsurancePolicy {
  constructor(
    public policyId: string,
    public farmer: string,
    public cropType: string,
    public farmLocation: { lat: number; lng: number },
    public coverageAmount: string, // in USDC (6 decimals)
    public premium: string, // in USDC (6 decimals)
    public startDate: string,
    public endDate: string,
    public weatherParameters: {
      minTemp: number;
      maxTemp: number;
      minRainfall: number;
      maxRainfall: number;
    },
    public isActive: boolean,
    public claimsPaid: string,
    public premiumPaid: string, // Track USDC premium paid
    public status: 'pending' | 'active' | 'expired' | 'claimed',
    public weatherDataCids: string[] = [], // Array of Filecoin CIDs for weather data
    public payoutTrigger?: {
      triggeredAt: string;
      actualRainfall: number;
      expectedRainfall: number;
      weatherCid: string;
    }
  ) {}
}

// Weather Data Structure
class WeatherData {
  constructor(
    public stationId: string,
    public timestamp: string,
    public temperature: number,
    public rainfall: number,
    public humidity: number,
    public windSpeed: number,
    public filecoinCid?: string // Optional CID for Filecoin storage
  ) {}
}

// Claim Structure
class Claim {
  constructor(
    public claimId: string,
    public policyId: string,
    public farmer: string,
    public claimAmount: string,
    public reason: string,
    public weatherData: WeatherData,
    public status: 'pending' | 'approved' | 'rejected' | 'paid',
    public timestamp: string
  ) {}
}

@NearBindgen({})
export class AgriGuardContract {
  private policies: LookupMap<InsurancePolicy>;
  private claims: LookupMap<Claim>;
  private authorizedOracles: LookupMap<boolean>;
  private weatherDataStorage: LookupMap<WeatherData>; // Storage for weather data with CIDs
  private totalPolicies: number;
  private totalClaims: number;
  private totalPremiumsCollected: string;
  private totalClaimsPaid: string;
  private owner: string;

  constructor() {
    this.policies = new LookupMap('policies');
    this.claims = new LookupMap('claims');
    this.authorizedOracles = new LookupMap('oracles');
    this.weatherDataStorage = new LookupMap('weather');
    this.totalPolicies = 0;
    this.totalClaims = 0;
    this.totalPremiumsCollected = '0';
    this.totalClaimsPaid = '0';
    this.owner = '';
  }

  @initialize({})
  init({ owner }: { owner: string }) {
    this.owner = owner;
    // Add initial weather oracle
    this.authorizedOracles.set('weather-oracle.testnet', true);
  }

  /**
   * Create a new insurance policy
   * Policy will be in 'pending' status until premium is paid via USDC transfer
   * 
   * @param cropType - Type of crop to insure
   * @param farmLocation - GPS coordinates of the farm
   * @param coverageAmount - Coverage amount in USDC micro-units (6 decimals)
   * @param startDate - Policy start date (ISO string)
   * @param endDate - Policy end date (ISO string)
   * @param weatherParameters - Weather thresholds that trigger claims
   * @returns Policy ID string
   */
  @call({})
  createPolicy({
    cropType,
    farmLocation,
    coverageAmount,
    startDate,
    endDate,
    weatherParameters
  }: {
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
  }): string {
    const farmer = near.predecessorAccountId();
    
    // Input validation
    this.validatePolicyInputs(cropType, farmLocation, coverageAmount, startDate, endDate, weatherParameters);
    
    // Calculate premium using enhanced calculation
    const premium = this.calculatePremium(coverageAmount, cropType, farmLocation);

    const policyId = `policy_${this.totalPolicies + 1}`;
    
    const policy = new InsurancePolicy(
      policyId,
      farmer,
      cropType,
      farmLocation,
      coverageAmount,
      premium,
      startDate,
      endDate,
      weatherParameters,
      false, // Not active until premium is paid
      '0',
      '0', // No premium paid yet
      'pending' // Status pending until premium payment
    );

    this.policies.set(policyId, policy);
    this.totalPolicies += 1;

    near.log(`Policy created: ${policyId} for farmer: ${farmer}. Premium required: ${premium} USDC (${this.formatUSDC(premium)} USD)`);
    return policyId;
  }

  /**
   * Validate policy creation inputs
   * Throws assertion errors if validation fails
   */
  private validatePolicyInputs(
    cropType: string,
    farmLocation: { lat: number; lng: number },
    coverageAmount: string,
    startDate: string,
    endDate: string,
    weatherParameters: any
  ) {
    // Validate coverage amount
    const coverage = BigInt(coverageAmount);
    assert(coverage >= BigInt(MIN_PREMIUM_USDC), ERRORS.COVERAGE_AMOUNT_TOO_LOW);
    assert(coverage <= BigInt(MAX_COVERAGE_USDC), ERRORS.COVERAGE_AMOUNT_TOO_HIGH);
    
    // Validate crop type
    const validCrops = ['wheat', 'corn', 'rice', 'soybeans', 'cotton', 'barley', 'oats', 'tomatoes', 'potatoes', 'onions'];
    assert(validCrops.includes(cropType.toLowerCase()), `Invalid crop type: ${cropType}`);
    
    // Validate location coordinates
    assert(farmLocation.lat >= -90 && farmLocation.lat <= 90, 'Invalid latitude');
    assert(farmLocation.lng >= -180 && farmLocation.lng <= 180, 'Invalid longitude');
    
    // Validate weather parameters
    assert(weatherParameters.minTemp < weatherParameters.maxTemp, 'Invalid temperature range');
    assert(weatherParameters.minRainfall < weatherParameters.maxRainfall, 'Invalid rainfall range');
    assert(weatherParameters.minTemp >= -50 && weatherParameters.maxTemp <= 60, 'Temperature out of reasonable range');
    assert(weatherParameters.minRainfall >= 0 && weatherParameters.maxRainfall <= 5000, 'Rainfall out of reasonable range');
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    assert(start.getTime() >= now.getTime(), 'Policy start date must be in the future');
    assert(end.getTime() > start.getTime(), 'Policy end date must be after start date');
    assert((end.getTime() - start.getTime()) >= (30 * 24 * 60 * 60 * 1000), 'Policy duration must be at least 30 days');
    assert((end.getTime() - start.getTime()) <= (365 * 24 * 60 * 60 * 1000), 'Policy duration cannot exceed 365 days');
  }

  // Fungible Token callback - called when USDC is transferred to this contract
  @call({})
  ft_on_transfer({
    sender_id,
    amount,
    msg
  }: {
    sender_id: string;
    amount: string;
    msg: string;
  }): string {
    // Verify the call is from the USDC contract
    assert(
      near.predecessorAccountId() === USDC_CONTRACT,
      `Only ${USDC_CONTRACT} can call ft_on_transfer`
    );

    near.log(`Received ${amount} USDC from ${sender_id} with message: ${msg}`);

    // Parse the message to get policy ID
    let policyId: string;
    try {
      const msgObj = JSON.parse(msg);
      policyId = msgObj.policyId;
    } catch (e) {
      near.log(`Invalid message format: ${msg}`);
      return amount; // Return all tokens if message is invalid
    }

    // Get the policy
    const policy = this.policies.get(policyId);
    if (!policy) {
      near.log(`Policy not found: ${policyId}`);
      return amount; // Return all tokens if policy not found
    }

    // Check if sender is the policy owner
    if (policy.farmer !== sender_id) {
      near.log(`Sender ${sender_id} is not the policy owner ${policy.farmer}`);
      return amount; // Return all tokens if not policy owner
    }

    // Check if premium amount is correct
    if (BigInt(amount) < BigInt(policy.premium)) {
      near.log(`Insufficient premium: ${amount} USDC, required: ${policy.premium} USDC`);
      return amount; // Return all tokens if insufficient premium
    }

    // Update policy status
    policy.premiumPaid = amount;
    policy.status = 'active';
    policy.isActive = true;
    this.policies.set(policyId, policy);

    // Update contract stats
    this.totalPremiumsCollected = (BigInt(this.totalPremiumsCollected) + BigInt(amount)).toString();

    near.log(`Policy ${policyId} activated with premium payment of ${amount} USDC`);

    // Return excess amount (if any)
    const excess = BigInt(amount) - BigInt(policy.premium);
    return excess.toString();
  }

  // Submit weather data (only authorized oracles)
  @call({})
  submitWeatherData({
    stationId,
    temperature,
    rainfall,
    humidity,
    windSpeed,
    filecoinCid
  }: {
    stationId: string;
    temperature: number;
    rainfall: number;
    humidity: number;
    windSpeed: number;
    filecoinCid?: string;
  }) {
    const caller = near.predecessorAccountId();
    assert(
      this.authorizedOracles.get(caller) === true,
      'Only authorized oracles can submit weather data'
    );

    const weatherData = new WeatherData(
      stationId,
      near.blockTimestamp().toString(),
      temperature,
      rainfall,
      humidity,
      windSpeed,
      filecoinCid
    );

    // Store weather data with unique key
    const weatherDataKey = `${stationId}_${near.blockTimestamp()}`;
    this.weatherDataStorage.set(weatherDataKey, weatherData);

    // Check for automatic claim triggers
    this.checkAutomaticClaims(weatherData);
    
    // Emit event for weather data submission
    if (filecoinCid) {
      near.log(`Weather data submitted by oracle: ${caller}, Station: ${stationId}, Filecoin CID: ${filecoinCid}`);
      // Emit structured event for indexing
      near.log(`EVENT_JSON:{"standard":"weather_data","version":"1.0.0","event":"weather_submitted","data":{"station_id":"${stationId}","oracle":"${caller}","filecoin_cid":"${filecoinCid}","timestamp":"${near.blockTimestamp()}"}}`);
    } else {
      near.log(`Weather data submitted by oracle: ${caller}, Station: ${stationId}`);
    }
  }

  // File a claim
  @call({})
  fileClaim({
    policyId,
    reason,
    weatherData
  }: {
    policyId: string;
    reason: string;
    weatherData: WeatherData;
  }): string {
    const farmer = near.predecessorAccountId();
    const policy = this.policies.get(policyId);
    
    assert(policy !== null, 'Policy not found');
    assert(policy.farmer === farmer, 'Only policy owner can file claims');
    assert(policy.isActive, 'Policy is not active');

    const claimId = `claim_${this.totalClaims + 1}`;
    
    const claim = new Claim(
      claimId,
      policyId,
      farmer,
      '0', // Will be calculated based on weather data
      reason,
      weatherData,
      'pending',
      near.blockTimestamp().toString()
    );

    this.claims.set(claimId, claim);
    this.totalClaims += 1;

    // Auto-process if weather data meets threshold
    this.processClaimAutomatically(claimId);

    near.log(`Claim filed: ${claimId} for policy: ${policyId}`);
    return claimId;
  }

  // Process claim automatically based on weather data
  private processClaimAutomatically(claimId: string) {
    const claim = this.claims.get(claimId);
    if (!claim) return;
    
    const policy = this.policies.get(claim.policyId);
    
    if (!claim || !policy) return;

    const weatherData = claim.weatherData;
    const params = policy.weatherParameters;
    
    let shouldPay = false;
    let payoutPercentage = 0;

    // Check temperature thresholds
    if (weatherData.temperature < params.minTemp || weatherData.temperature > params.maxTemp) {
      shouldPay = true;
      payoutPercentage = Math.max(payoutPercentage, 50);
    }

    // Check rainfall thresholds
    if (weatherData.rainfall < params.minRainfall || weatherData.rainfall > params.maxRainfall) {
      shouldPay = true;
      payoutPercentage = Math.max(payoutPercentage, 60);
    }

    if (shouldPay) {
      const claimAmount = (BigInt(policy.coverageAmount) * BigInt(payoutPercentage) / BigInt(100)).toString();
      
      claim.claimAmount = claimAmount;
      claim.status = 'approved';
      this.claims.set(claimId, claim);
      
      // Execute payout
      this.executePayout(claimId);
    }
  }

  // Execute payout in USDC
  private executePayout(claimId: string) {
    const claim = this.claims.get(claimId);
    if (!claim || claim.status !== 'approved') return;

    // Use the new trigger_payout function
    this.triggerPayout(claim.farmer, claim.claimAmount);
    
    claim.status = 'paid';
    this.claims.set(claimId, claim);
    
    const policy = this.policies.get(claim.policyId);
    if (policy) {
      policy.claimsPaid = (BigInt(policy.claimsPaid) + BigInt(claim.claimAmount)).toString();
      policy.status = 'claimed';
      this.policies.set(claim.policyId, policy);
    }
    
    this.totalClaimsPaid = (BigInt(this.totalClaimsPaid) + BigInt(claim.claimAmount)).toString();
    
    near.log(`Payout executed: ${claim.claimAmount} USDC to ${claim.farmer}`);
  }

  // Trigger USDC payout to farmer
  @call({})
  triggerPayout(recipient: string, amount: string) {
    // Only contract can call this (internal method made public for testing)
    assert(
      near.predecessorAccountId() === near.currentAccountId(),
      'Only contract can trigger payouts'
    );

    // Create cross-contract call to transfer USDC
    const promise = near.promiseBatchCreate(USDC_CONTRACT);
    near.promiseBatchActionFunctionCall(
      promise,
      'ft_transfer',
      JSON.stringify({
        receiver_id: recipient,
        amount: amount,
        memo: `AgriGuard claim payout`
      }),
      BigInt(1), // 1 yoctoNEAR for security
      BigInt('30000000000000') // 30 TGas
    );

    near.log(`USDC payout triggered: ${amount} USDC to ${recipient}`);
  }

  // Manual payout trigger for admin (emergency use)
  @call({})
  adminTriggerPayout(recipient: string, amount: string, claimId: string) {
    assert(
      near.predecessorAccountId() === this.owner,
      'Only contract owner can trigger manual payouts'
    );

    const claim = this.claims.get(claimId);
    assert(claim !== null, 'Claim not found');
    assert(claim.status === 'approved', 'Claim not approved');

    this.triggerPayout(recipient, amount);
    
    // Update claim status
    claim.status = 'paid';
    this.claims.set(claimId, claim);
    
    const policy = this.policies.get(claim.policyId);
    if (policy) {
      policy.claimsPaid = (BigInt(policy.claimsPaid) + BigInt(amount)).toString();
      policy.status = 'claimed';
      this.policies.set(claim.policyId, policy);
    }
    
    this.totalClaimsPaid = (BigInt(this.totalClaimsPaid) + BigInt(amount)).toString();
    
    near.log(`Manual payout executed: ${amount} USDC to ${recipient} for claim ${claimId}`);
  }

  // Check for automatic claims based on weather data
  private checkAutomaticClaims(weatherData: WeatherData) {
    // In a real implementation, this would check all active policies
    // and automatically trigger claims based on weather conditions
    near.log('Checking automatic claims for weather data');
  }

  /**
   * Enhanced premium calculation with crop-specific risk factors
   * Uses basis points for precise percentage calculations
   * 
   * @param coverageAmount - Coverage amount in USDC micro-units
   * @param cropType - Type of crop being insured
   * @param farmLocation - GPS coordinates for regional risk assessment
   * @returns Premium amount in USDC micro-units as string
   */
  private calculatePremium(coverageAmount: string, cropType: string, farmLocation: { lat: number; lng: number }): string {
    const baseAmount = BigInt(coverageAmount);
    let premiumRate = DEFAULT_PREMIUM_RATE; // Base 5% premium rate (500 basis points)
    
    // Crop-specific risk multipliers
    const cropRiskMultipliers: { [key: string]: number } = {
      'wheat': 1.0,
      'corn': 1.2,
      'rice': 1.5,
      'soybeans': 1.1,
      'cotton': 1.3,
      'barley': 1.0,
      'oats': 1.0,
      'tomatoes': 1.4,
      'potatoes': 1.2,
      'onions': 1.2,
      'default': 1.0
    };
    
    // Apply crop-specific multiplier
    const multiplier = cropRiskMultipliers[cropType.toLowerCase()] || cropRiskMultipliers['default'];
    premiumRate = Math.floor(premiumRate * multiplier);
    
    // Apply geographical risk factors
    const geographicalRisk = this.calculateGeographicalRisk(farmLocation);
    premiumRate = Math.floor(premiumRate * geographicalRisk);
    
    // Calculate premium using basis points
    const premium = (baseAmount * BigInt(premiumRate)) / BigInt(BASIS_POINTS);
    
    // Ensure minimum premium
    const minPremium = BigInt(MIN_PREMIUM_USDC);
    return premium < minPremium ? minPremium.toString() : premium.toString();
  }

  /**
   * Calculate geographical risk factor based on location
   * This is a simplified implementation - production would use historical weather data
   */
  private calculateGeographicalRisk(farmLocation: { lat: number; lng: number }): number {
    // Simple risk assessment based on latitude (climate zones)
    const lat = Math.abs(farmLocation.lat);
    
    if (lat < 10) return 1.3; // Tropical regions - higher risk
    if (lat < 23.5) return 1.2; // Subtropical regions
    if (lat < 35) return 1.0; // Temperate regions - baseline
    if (lat < 50) return 1.1; // Northern temperate - moderate risk
    return 1.2; // Arctic regions - higher risk
  }

  /**
   * Format USDC micro-units to human-readable dollar amount
   * 6 decimal places for USDC
   */
  private formatUSDC(microUnits: string): string {
    const units = BigInt(microUnits);
    const dollars = units / BigInt(1000000);
    const cents = (units % BigInt(1000000)) / BigInt(10000);
    return `${dollars}.${cents.toString().padStart(2, '0')}`;
  }

  /**
   * Parse human-readable dollar amount to USDC micro-units
   */
  private parseUSDC(dollarAmount: string): string {
    const parts = dollarAmount.split('.');
    const dollars = BigInt(parts[0] || '0');
    const cents = BigInt((parts[1] || '0').padEnd(6, '0').slice(0, 6));
    return (dollars * BigInt(1000000) + cents).toString();
  }

  // View methods
  @view({})
  getPolicy({ policyId }: { policyId: string }): InsurancePolicy | null {
    return this.policies.get(policyId);
  }

  @view({})
  getClaim({ claimId }: { claimId: string }): Claim | null {
    return this.claims.get(claimId);
  }

  @view({})
  getFarmerPolicies({ farmer }: { farmer: string }): InsurancePolicy[] {
    const policies: InsurancePolicy[] = [];
    // In a real implementation, we'd have an index for efficient querying
    return policies;
  }

  @view({})
  getContractStats(): {
    totalPolicies: number;
    totalClaims: number;
    totalPremiumsCollected: string;
    totalClaimsPaid: string;
  } {
    return {
      totalPolicies: this.totalPolicies,
      totalClaims: this.totalClaims,
      totalPremiumsCollected: this.totalPremiumsCollected,
      totalClaimsPaid: this.totalClaimsPaid
    };
  }

  // Admin methods
  @call({})
  addOracle({ oracle }: { oracle: string }) {
    assert(near.predecessorAccountId() === this.owner, 'Only owner can add oracles');
    this.authorizedOracles.set(oracle, true);
  }

  @call({})
  removeOracle({ oracle }: { oracle: string }) {
    assert(near.predecessorAccountId() === this.owner, 'Only owner can remove oracles');
    this.authorizedOracles.set(oracle, false);
  }

  /**
   * Receive weather data with explicit CID parameter for Filecoin integration
   * This method is designed to be called by the weather storage script
   * 
   * @param stationId - WeatherXM station ID
   * @param timestamp - Unix timestamp in milliseconds
   * @param filecoinCid - Filecoin CID of the stored weather data
   */
  @call({})
  receive_weather({
    stationId,
    timestamp,
    filecoinCid
  }: {
    stationId: string;
    timestamp: number;
    filecoinCid: string;
  }) {
    const caller = near.predecessorAccountId();
    assert(
      this.authorizedOracles.get(caller) === true,
      'Only authorized oracles can receive weather data'
    );

    // Create weather data entry with CID
    const weatherData = new WeatherData(
      stationId,
      timestamp.toString(),
      0, // Temperature will be stored in Filecoin
      0, // Rainfall will be stored in Filecoin
      0, // Humidity will be stored in Filecoin
      0, // Wind speed will be stored in Filecoin
      filecoinCid
    );

    // Store weather data with unique key
    const weatherDataKey = `${stationId}_${timestamp}`;
    this.weatherDataStorage.set(weatherDataKey, weatherData);

    // Update all active policies for this station to include the CID
    this.updatePoliciesWithWeatherCid(stationId, filecoinCid);

    // Emit structured event for indexing
    near.log(`EVENT_JSON:{"standard":"weather_data","version":"1.0.0","event":"weather_received","data":{"station_id":"${stationId}","oracle":"${caller}","filecoin_cid":"${filecoinCid}","timestamp":"${timestamp}","retrieval_url":"https://w3s.link/ipfs/${filecoinCid}"}}`);
    
    near.log(`Weather data received: Station ${stationId}, CID: ${filecoinCid}, Retrieval: https://w3s.link/ipfs/${filecoinCid}`);
  }

  /**
   * Update policies with weather data CID for relevant stations
   * This links weather data to policies based on geographical proximity
   */
  private updatePoliciesWithWeatherCid(stationId: string, filecoinCid: string) {
    // In a production system, this would use spatial indexing
    // For now, we'll update all active policies
    // TODO: Implement geographical proximity matching
    near.log(`Updating policies with weather data CID: ${filecoinCid} for station: ${stationId}`);
  }

  /**
   * Get weather data by station and timestamp
   * 
   * @param stationId - WeatherXM station ID
   * @param timestamp - Unix timestamp
   * @returns WeatherData or null
   */
  @view({})
  getWeatherData({
    stationId,
    timestamp
  }: {
    stationId: string;
    timestamp: number;
  }): WeatherData | null {
    const weatherDataKey = `${stationId}_${timestamp}`;
    return this.weatherDataStorage.get(weatherDataKey);
  }

  /**
   * Get weather data by Filecoin CID
   * This method searches through all weather data to find entries with matching CID
   * 
   * @param filecoinCid - Filecoin CID to search for
   * @returns Array of matching WeatherData
   */
  @view({})
  getWeatherDataByCid({
    filecoinCid
  }: {
    filecoinCid: string;
  }): WeatherData[] {
    const results: WeatherData[] = [];
    
    // Note: This is a simplified implementation
    // In production, you'd want to maintain a reverse index for CID lookups
    
    // For now, return empty array with log message
    near.log(`Searching for weather data with CID: ${filecoinCid}`);
    return results;
  }

  /**
   * Get all weather data CIDs for a specific station
   * 
   * @param stationId - WeatherXM station ID
   * @returns Array of CIDs
   */
  @view({})
  getStationWeatherCids({
    stationId
  }: {
    stationId: string;
  }): string[] {
    const cids: string[] = [];
    
    // Note: This is a simplified implementation
    // In production, you'd want to maintain indexed data for efficient queries
    
    near.log(`Retrieving weather CIDs for station: ${stationId}`);
    return cids;
  }

  @view({})
  get_policies({ station_id, status, limit }: { station_id?: string; status?: string; limit?: number }): InsurancePolicy[] {
    const policies: InsurancePolicy[] = [];
    const maxResults = limit || 100;
    
    for (const [policyId, policy] of this.policies) {
      if (policies.length >= maxResults) break;
      
      // Filter by station_id if provided
      if (station_id && policy.stationId !== station_id) continue;
      
      // Filter by status if provided
      if (status && policy.status !== status) continue;
      
      policies.push(policy);
    }
    
    return policies;
  }

  @view({})
  get_policy_by_id({ policy_id }: { policy_id: string }): InsurancePolicy | null {
    return this.policies.get(policy_id);
  }

  @call({})
  create_policy({
    farmer_id,
    crop_type,
    coverage_amount,
    premium_amount,
    rainfall_threshold,
    station_id,
    season_start,
    season_end
  }: {
    farmer_id: string;
    crop_type: string;
    coverage_amount: number;
    premium_amount: number;
    rainfall_threshold: number;
    station_id: string;
    season_start: string;
    season_end: string;
  }): string {
    const caller = near.predecessorAccountId();
    const policyId = `policy_${this.totalPolicies++}`;
    const timestamp = new Date().toISOString();
    
    const policy = new InsurancePolicy(
      policyId,
      farmer_id,
      crop_type,
      { lat: 0, lng: 0 }, // Placeholder for farmLocation
      coverage_amount.toString(),
      premium_amount.toString(),
      season_start,
      season_end,
      { minTemp: 0, maxTemp: 0, minRainfall: 0, maxRainfall: 0 }, // Placeholder for weatherParameters
      false,
      '0',
      '0',
      'pending',
      [],
      undefined
    );
    
    this.policies.set(policyId, policy);
    
    // Log policy creation event
    const eventLog = {
      type: 'policy_created',
      policyId,
      farmerId: farmer_id,
      cropType: crop_type,
      coverageAmount: coverage_amount,
      rainfallThreshold: rainfall_threshold,
      stationId: station_id,
      timestamp,
      createdBy: caller
    };
    
    near.log(`POLICY_CREATED: ${JSON.stringify(eventLog)}`);
    
    return policyId;
  }

  @call({})
  process_policy_claims({
    policy_id,
    actual_rainfall,
    weather_cid,
    trigger_timestamp
  }: {
    policy_id: string;
    actual_rainfall: number;
    weather_cid: string;
    trigger_timestamp: string;
  }): boolean {
    const policy = this.policies.get(policy_id);
    if (!policy) {
      throw new Error(`Policy ${policy_id} not found`);
    }
    
    if (policy.status !== 'pending') {
      throw new Error(`Policy ${policy_id} is not pending (status: ${policy.status})`);
    }
    
    // Get the policy's rainfall threshold (for now use a default of 30mm)
    const rainfallThreshold = 30; // This should come from policy parameters when available
    
    // Check if payout should be triggered
    if (actual_rainfall >= rainfallThreshold) {
      near.log(`Policy ${policy_id} threshold met: ${actual_rainfall}mm >= ${rainfallThreshold}mm`);
      return false;
    }
    
    // Trigger payout
    policy.status = 'claimed';
    policy.payoutTrigger = {
      triggeredAt: trigger_timestamp,
      actualRainfall: actual_rainfall,
      expectedRainfall: rainfallThreshold,
      weatherCid: weather_cid
    };
    
    this.policies.set(policy_id, policy);
    
    // Log payout event
    const eventLog = {
      type: 'policy_payout',
      policyId: policy_id,
      farmerId: policy.farmer,
      cropType: policy.cropType,
      coverageAmount: policy.coverageAmount,
      actualRainfall: actual_rainfall,
      expectedRainfall: rainfallThreshold,
      weatherCid: weather_cid,
      triggerTimestamp: trigger_timestamp,
      payoutTimestamp: new Date().toISOString()
    };
    
    near.log(`POLICY_PAYOUT: ${JSON.stringify(eventLog)}`);
    
    return true;
  }

  @call({})
  update_policy_status({
    policy_id,
    new_status
  }: {
    policy_id: string;
    new_status: string;
  }): void {
    const policy = this.policies.get(policy_id);
    if (!policy) {
      throw new Error(`Policy ${policy_id} not found`);
    }
    
    const oldStatus = policy.status;
    policy.status = new_status as 'pending' | 'active' | 'expired' | 'claimed';
    this.policies.set(policy_id, policy);
    
    // Log status change event
    const eventLog = {
      type: 'policy_status_change',
      policyId: policy_id,
      oldStatus,
      newStatus: new_status,
      timestamp: new Date().toISOString(),
      changedBy: near.predecessorAccountId()
    };
    
    near.log(`POLICY_STATUS_CHANGE: ${JSON.stringify(eventLog)}`);
  }

  @call({})
  automated_weather_check({ station_id }: { station_id?: string }): void {
    // This method is called by CronCat to trigger automated weather checks
    const stationId = station_id || 'WXM_STATION_001';
    const timestamp = new Date().toISOString();
    
    // Log automation trigger
    const eventLog = {
      type: 'automated_weather_check',
      stationId,
      timestamp,
      triggeredBy: near.predecessorAccountId()
    };
    
    near.log(`AUTOMATED_WEATHER_CHECK: ${JSON.stringify(eventLog)}`);
    
    // This method serves as a trigger point for off-chain automation
    // The actual weather fetching and processing is handled by the automation script
  }

  @view({})
  get_weather_data({ station_id, limit }: { station_id?: string; limit?: number }): WeatherData[] {
    const weatherData: WeatherData[] = [];
    const maxResults = limit || 50;
    
    for (const [key, data] of this.weatherDataStorage) {
      if (weatherData.length >= maxResults) break;
      
      if (station_id && data.stationId !== station_id) continue;
      
      weatherData.push(data);
    }
    
    // Sort by timestamp (most recent first)
    weatherData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return weatherData;
  }

  @view({})
  get_active_policies_count(): number {
    let count = 0;
    for (const [_, policy] of this.policies) {
      if (policy.status === 'active') {
        count++;
      }
    }
    return count;
  }

  @view({})
  get_paid_policies_count(): number {
    let count = 0;
    for (const [_, policy] of this.policies) {
      if (policy.status === 'claimed') {
        count++;
      }
    }
    return count;
  }

  @view({})
  get_total_coverage(): number {
    let total = 0;
    for (const [_, policy] of this.policies) {
      if (policy.status === 'active') {
        total += BigInt(policy.coverageAmount);
      }
    }
    return total;
  }

  @view({})
  get_total_payouts(): number {
    let total = 0;
    for (const [_, policy] of this.policies) {
      if (policy.status === 'claimed') {
        total += BigInt(policy.coverageAmount);
      }
    }
    return total;
  }
} 