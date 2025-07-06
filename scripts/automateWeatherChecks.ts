#!/usr/bin/env npx ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import { Near, connect, keyStores, Contract } from 'near-api-js';
import { KeyStore } from 'near-api-js/lib/key_stores';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const execAsync = promisify(exec);

interface WeatherData {
  stationId: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  rainfall_mm: number;
  wind_speed: number;
  wind_direction: number;
  pressure: number;
  filecoinCid?: string;
}

interface PolicyData {
  policyId: string;
  farmerId: string;
  cropType: string;
  coverageAmount: number;
  premiumAmount: number;
  rainfallThreshold: number;
  status: 'Active' | 'Paid' | 'Expired';
  stationId: string;
  createdAt: string;
  payoutTrigger?: {
    triggeredAt: string;
    actualRainfall: number;
    expectedRainfall: number;
  };
}

class WeatherAutomation {
  private near!: Near;
  private contract: any;
  private contractId: string;
  private accountId: string;
  private cronTaskId: string | null = null;
  private simulationMode: boolean = false;

  constructor() {
    this.contractId = process.env.NEAR_CONTRACT_ID || '';
    this.accountId = process.env.NEAR_ACCOUNT_ID || '';
    
    if (!this.contractId || !this.accountId) {
      throw new Error('Missing required environment variables: NEAR_CONTRACT_ID, NEAR_ACCOUNT_ID');
    }
  }

  async init() {
    console.log('🔄 Initializing NEAR connection...');
    
    // Configure NEAR connection
    const homedir = require('os').homedir();
    const credentialsPath = path.join(homedir, '.near-credentials');
    const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

    const config = {
      networkId: 'testnet',
      keyStore,
      nodeUrl: 'https://rpc.testnet.near.org',
      walletUrl: 'https://testnet.mynearwallet.com',
      helperUrl: 'https://helper.testnet.near.org',
      explorerUrl: 'https://testnet.nearblocks.io',
    };

    this.near = await connect(config);
    
    // Initialize contract
    const account = await this.near.account(this.accountId);
    this.contract = new Contract(account, this.contractId, {
      viewMethods: [
        'get_policies',
        'get_weather_data',
        'get_policy_by_id',
        'get_station_weather_cids'
      ],
      changeMethods: [
        'receive_weather',
        'process_policy_claims',
        'update_policy_status'
      ],
      useLocalViewExecution: false
    });

    console.log('✅ NEAR connection initialized');
  }

  async storeWeatherData(stationId: string = 'WXM_STATION_001'): Promise<WeatherData> {
    console.log(`📡 Fetching weather data for station: ${stationId}`);
    
    try {
      // Run the storeWeather.ts script
      const { stdout, stderr } = await execAsync(
        `npx ts-node scripts/storeWeather.ts ${stationId}`
      );
      
      if (stderr) {
        console.error('⚠️ Weather storage warnings:', stderr);
      }
      
      // Parse the output to extract weather data and CID
      const lines = stdout.trim().split('\n');
      let weatherData: WeatherData | null = null;
      let filecoinCid: string | null = null;
      
      for (const line of lines) {
        if (line.includes('Weather data:')) {
          const dataStr = line.split('Weather data:')[1].trim();
          weatherData = JSON.parse(dataStr);
        }
        if (line.includes('Filecoin CID:')) {
          filecoinCid = line.split('Filecoin CID:')[1].trim();
        }
      }
      
      if (!weatherData || !filecoinCid) {
        throw new Error('Failed to parse weather data or CID from script output');
      }
      
      // Add CID to weather data
      weatherData.filecoinCid = filecoinCid;
      
      console.log(`✅ Weather data stored on Filecoin: ${filecoinCid}`);
      console.log(`🌡️  Temperature: ${weatherData.temperature}°C`);
      console.log(`💧 Rainfall: ${weatherData.rainfall_mm}mm`);
      
      return weatherData;
      
    } catch (error) {
      console.error('❌ Error storing weather data:', error);
      throw error;
    }
  }

  async submitWeatherToContract(weatherData: WeatherData): Promise<void> {
    console.log('📝 Submitting weather data to contract...');
    
    try {
      const result = await this.contract.receive_weather({
        station_id: weatherData.stationId,
        timestamp: weatherData.timestamp,
        rainfall_mm: weatherData.rainfall_mm,
        filecoin_cid: weatherData.filecoinCid
      }, {
        gas: '300000000000000', // 300 TGas
        attachedDeposit: '1000000000000000000000000' // 1 NEAR
      });
      
      console.log('✅ Weather data submitted to contract');
      console.log(`📊 Transaction: ${result.transaction?.hash || 'N/A'}`);
      
    } catch (error) {
      console.error('❌ Error submitting weather data:', error);
      throw error;
    }
  }

  async processWeatherAndPolicies(stationId: string = 'WXM_STATION_001'): Promise<void> {
    console.log(`🔄 Processing weather data and policies for station: ${stationId}`);
    
    try {
      // Step 1: Store weather data on Filecoin
      const weatherData = await this.storeWeatherData(stationId);
      
      // Step 2: Submit weather data to contract
      await this.submitWeatherToContract(weatherData);
      
      // Step 3: Check for policy payouts
      await this.checkPolicyPayouts(weatherData);
      
    } catch (error) {
      console.error('❌ Error processing weather and policies:', error);
      throw error;
    }
  }

  async checkPolicyPayouts(weatherData: WeatherData): Promise<void> {
    console.log('💰 Checking for policy payouts...');
    
    try {
      // Get all active policies for this station
      const policies: PolicyData[] = await this.contract.get_policies({
        station_id: weatherData.stationId,
        status: 'Active'
      });
      
      console.log(`📋 Found ${policies.length} active policies for station ${weatherData.stationId}`);
      
      let payoutCount = 0;
      
      for (const policy of policies) {
        // Check if rainfall threshold is met
        if (weatherData.rainfall_mm < policy.rainfallThreshold) {
          console.log(`🚨 Policy ${policy.policyId} payout triggered!`);
          console.log(`   Expected: ${policy.rainfallThreshold}mm, Actual: ${weatherData.rainfall_mm}mm`);
          
          // Trigger payout
          await this.triggerPolicyPayout(policy, weatherData);
          payoutCount++;
        } else {
          console.log(`✅ Policy ${policy.policyId} threshold met (${weatherData.rainfall_mm}mm >= ${policy.rainfallThreshold}mm)`);
        }
      }
      
      console.log(`💸 Processed ${payoutCount} policy payouts`);
      
    } catch (error) {
      console.error('❌ Error checking policy payouts:', error);
      throw error;
    }
  }

  async triggerPolicyPayout(policy: PolicyData, weatherData: WeatherData): Promise<void> {
    console.log(`💰 Triggering payout for policy: ${policy.policyId}`);
    
    try {
      const result = await this.contract.process_policy_claims({
        policy_id: policy.policyId,
        actual_rainfall: weatherData.rainfall_mm,
        weather_cid: weatherData.filecoinCid,
        trigger_timestamp: weatherData.timestamp
      }, {
        gas: '300000000000000', // 300 TGas
        attachedDeposit: '1000000000000000000000000' // 1 NEAR
      });
      
      console.log(`✅ Policy ${policy.policyId} payout processed`);
      console.log(`💸 Payout amount: ${policy.coverageAmount} USDC`);
      console.log(`📊 Transaction: ${result.transaction?.hash || 'N/A'}`);
      
    } catch (error) {
      console.error(`❌ Error processing payout for policy ${policy.policyId}:`, error);
    }
  }

  async createCronTask(): Promise<void> {
    console.log('⏰ Creating CronCat task for 3-hourly weather checks...');
    
    try {
      // Create CronCat task to run every 3 hours
      const cadence = '0 */3 * * *'; // Every 3 hours
      
      const { stdout, stderr } = await execAsync(`
        croncat tasks create \\
          --contract-id "${this.contractId}" \\
          --function-id "automated_weather_check" \\
          --cadence "${cadence}" \\
          --recurring true \\
          --deposit "0" \\
          --gas "300000000000000" \\
          --amount "5"
      `);
      
      if (stderr) {
        console.error('⚠️ CronCat task creation warnings:', stderr);
      }
      
      console.log('✅ CronCat task created successfully');
      console.log(`📅 Schedule: Every 3 hours (${cadence})`);
      console.log(`🔄 Task output:`, stdout);
      
    } catch (error) {
      console.error('❌ Error creating CronCat task:', error);
      throw error;
    }
  }

  async simulateAutomation(durationHours: number = 12): Promise<void> {
    console.log(`🧪 Starting ${durationHours}-hour automation simulation...`);
    this.simulationMode = true;
    
    const intervalMinutes = 180; // 3 hours = 180 minutes
    const totalIntervals = Math.floor((durationHours * 60) / intervalMinutes);
    
    console.log(`🕐 Will run ${totalIntervals} weather checks over ${durationHours} hours`);
    
    for (let i = 0; i < totalIntervals; i++) {
      const currentTime = new Date();
      console.log(`\n🔄 Simulation Check ${i + 1}/${totalIntervals} - ${currentTime.toISOString()}`);
      
      try {
        await this.processWeatherAndPolicies();
        
        // Wait for next interval (in simulation, we reduce the wait time)
        if (i < totalIntervals - 1) {
          const waitMinutes = this.simulationMode ? 1 : intervalMinutes; // 1 minute in simulation
          console.log(`⏱️  Waiting ${waitMinutes} minutes until next check...`);
          await new Promise(resolve => setTimeout(resolve, waitMinutes * 60 * 1000));
        }
        
      } catch (error) {
        console.error(`❌ Error in simulation check ${i + 1}:`, error);
      }
    }
    
    console.log('🎯 Simulation completed!');
    await this.generateSimulationReport();
  }

  async generateSimulationReport(): Promise<void> {
    console.log('📊 Generating simulation report...');
    
    try {
      // Get all weather data
      const weatherData = await this.contract.get_weather_data({
        station_id: 'WXM_STATION_001',
        limit: 20
      });
      
      // Get all policies
      const policies = await this.contract.get_policies({
        limit: 50
      });
      
      const paidPolicies = policies.filter((p: any) => p.status === 'Paid');
      const activePolicies = policies.filter((p: any) => p.status === 'Active');
      
      console.log('\n📋 SIMULATION REPORT');
      console.log('==================');
      console.log(`📡 Weather data points collected: ${weatherData.length}`);
      console.log(`📊 Total policies: ${policies.length}`);
      console.log(`💰 Paid policies: ${paidPolicies.length}`);
      console.log(`🟢 Active policies: ${activePolicies.length}`);
      
      if (paidPolicies.length > 0) {
        console.log('\n💸 POLICY PAYOUTS:');
        paidPolicies.forEach((policy: any, index: number) => {
          console.log(`${index + 1}. Policy ${policy.policyId}`);
          console.log(`   Farmer: ${policy.farmerId}`);
          console.log(`   Crop: ${policy.cropType}`);
          console.log(`   Payout: ${policy.coverageAmount} USDC`);
          if (policy.payoutTrigger) {
            console.log(`   Trigger: ${policy.payoutTrigger.actualRainfall}mm < ${policy.payoutTrigger.expectedRainfall}mm`);
          }
        });
      }
      
      if (weatherData.length > 0) {
        console.log('\n🌡️  RECENT WEATHER DATA:');
        weatherData.slice(0, 5).forEach((data: any, index: number) => {
          console.log(`${index + 1}. ${data.timestamp}`);
          console.log(`   Temperature: ${data.temperature}°C`);
          console.log(`   Rainfall: ${data.rainfall_mm}mm`);
          console.log(`   CID: ${data.filecoinCid}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error generating report:', error);
    }
  }

  async checkCronStatus(): Promise<void> {
    console.log('📊 Checking CronCat status...');
    
    try {
      const { stdout } = await execAsync('croncat tasks');
      console.log('📋 Active CronCat tasks:');
      console.log(stdout);
      
    } catch (error) {
      console.error('❌ Error checking CronCat status:', error);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const automation = new WeatherAutomation();
  
  try {
    await automation.init();
    
    switch (command) {
      case 'create-task':
        await automation.createCronTask();
        break;
        
      case 'simulate':
        const hours = parseInt(args[1]) || 12;
        await automation.simulateAutomation(hours);
        break;
        
      case 'check-weather':
        const stationId = args[1] || 'WXM_STATION_001';
        await automation.processWeatherAndPolicies(stationId);
        break;
        
      case 'status':
        await automation.checkCronStatus();
        break;
        
      case 'report':
        await automation.generateSimulationReport();
        break;
        
      default:
        console.log('🚀 AgriGuard Weather Automation');
        console.log('Usage:');
        console.log('  npm run automate create-task   - Create CronCat task');
        console.log('  npm run automate simulate [hours] - Run simulation (default: 12h)');
        console.log('  npm run automate check-weather [stationId] - Manual weather check');
        console.log('  npm run automate status - Check CronCat status');
        console.log('  npm run automate report - Generate simulation report');
        break;
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { WeatherAutomation }; 