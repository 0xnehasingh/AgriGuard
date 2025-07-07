#!/usr/bin/env npx ts-node

import { Near, connect, keyStores, Contract } from 'near-api-js';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

interface TestPolicy {
  farmerId: string;
  cropType: string;
  coverageAmount: number;
  premiumAmount: number;
  rainfallThreshold: number;
  stationId: string;
  seasonStart: string;
  seasonEnd: string;
}

class PolicySetup {
  private near: Near;
  private contract: any;
  private contractId: string;
  private accountId: string;

  constructor() {
    this.contractId = process.env.NEAR_CONTRACT_ID || '';
    this.accountId = process.env.NEAR_ACCOUNT_ID || '';
    
    if (!this.contractId || !this.accountId) {
      throw new Error('Missing required environment variables: NEAR_CONTRACT_ID, NEAR_ACCOUNT_ID');
    }
  }

  async init() {
    console.log('🔄 Initializing NEAR connection...');
    
    const keyStore = new keyStores.FileSystemKeyStore(
      path.join(process.env.HOME || '.', '.near-credentials')
    );

    const config = {
      networkId: 'testnet',
      keyStore,
      nodeUrl: 'https://rpc.testnet.near.org',
      walletUrl: 'https://testnet.mynearwallet.com',
      helperUrl: 'https://helper.testnet.near.org',
      explorerUrl: 'https://testnet.nearblocks.io',
    };

    this.near = await connect(config);
    const account = await this.near.account(this.accountId);
    
    this.contract = new Contract(account, this.contractId, {
      viewMethods: ['get_policies', 'get_policy_by_id'],
      changeMethods: ['create_policy']
    });

    console.log('✅ NEAR connection initialized');
  }

  async createTestPolicies(): Promise<void> {
    console.log('📝 Creating test policies...');
    
    const testPolicies: TestPolicy[] = [
      {
        farmerId: 'farmer1.testnet',
        cropType: 'Corn',
        coverageAmount: 5000,
        premiumAmount: 250,
        rainfallThreshold: 50, // 50mm minimum rainfall
        stationId: 'WXM_STATION_001',
        seasonStart: '2024-03-01',
        seasonEnd: '2024-09-30'
      },
      {
        farmerId: 'farmer2.testnet',
        cropType: 'Wheat',
        coverageAmount: 3000,
        premiumAmount: 150,
        rainfallThreshold: 30, // 30mm minimum rainfall
        stationId: 'WXM_STATION_001',
        seasonStart: '2024-04-01',
        seasonEnd: '2024-08-31'
      },
      {
        farmerId: 'farmer3.testnet',
        cropType: 'Soybeans',
        coverageAmount: 4000,
        premiumAmount: 200,
        rainfallThreshold: 40, // 40mm minimum rainfall
        stationId: 'WXM_STATION_001',
        seasonStart: '2024-05-01',
        seasonEnd: '2024-10-31'
      },
      {
        farmerId: 'farmer4.testnet',
        cropType: 'Rice',
        coverageAmount: 6000,
        premiumAmount: 300,
        rainfallThreshold: 80, // 80mm minimum rainfall (higher for rice)
        stationId: 'WXM_STATION_001',
        seasonStart: '2024-06-01',
        seasonEnd: '2024-11-30'
      },
      {
        farmerId: 'farmer5.testnet',
        cropType: 'Cotton',
        coverageAmount: 3500,
        premiumAmount: 175,
        rainfallThreshold: 35, // 35mm minimum rainfall
        stationId: 'WXM_STATION_001',
        seasonStart: '2024-04-15',
        seasonEnd: '2024-09-15'
      }
    ];

    console.log(`📊 Creating ${testPolicies.length} test policies...`);
    
    for (let i = 0; i < testPolicies.length; i++) {
      const policy = testPolicies[i];
      console.log(`\n🌱 Creating policy ${i + 1}/${testPolicies.length}:`);
      console.log(`   Farmer: ${policy.farmerId}`);
      console.log(`   Crop: ${policy.cropType}`);
      console.log(`   Coverage: $${policy.coverageAmount}`);
      console.log(`   Threshold: ${policy.rainfallThreshold}mm`);
      
      try {
        const result = await this.contract.create_policy({
          farmer_id: policy.farmerId,
          crop_type: policy.cropType,
          coverage_amount: policy.coverageAmount,
          premium_amount: policy.premiumAmount,
          rainfall_threshold: policy.rainfallThreshold,
          station_id: policy.stationId,
          season_start: policy.seasonStart,
          season_end: policy.seasonEnd
        }, {
          gas: '300000000000000',
          attachedDeposit: '1000000000000000000000000' // 1 NEAR
        });
        
        console.log(`   ✅ Policy created: ${result}`);
        
      } catch (error) {
        console.error(`   ❌ Error creating policy:`, error);
      }
      
      // Wait a bit between policy creations
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n✅ Test policies creation completed!');
  }

  async listPolicies(): Promise<void> {
    console.log('📋 Listing all policies...');
    
    try {
      const policies = await this.contract.get_policies({
        limit: 20
      });
      
      console.log(`\n📊 Found ${policies.length} policies:`);
      
      policies.forEach((policy, index) => {
        console.log(`\n${index + 1}. Policy ID: ${policy.policyId}`);
        console.log(`   Farmer: ${policy.farmerId}`);
        console.log(`   Crop: ${policy.cropType}`);
        console.log(`   Coverage: $${policy.coverageAmount}`);
        console.log(`   Premium: $${policy.premiumAmount}`);
        console.log(`   Rainfall Threshold: ${policy.rainfallThreshold}mm`);
        console.log(`   Status: ${policy.status}`);
        console.log(`   Station: ${policy.stationId}`);
        console.log(`   Season: ${policy.seasonStart} to ${policy.seasonEnd}`);
      });
      
    } catch (error) {
      console.error('❌ Error listing policies:', error);
    }
  }

  async generateSummary(): Promise<void> {
    console.log('📈 Generating policy summary...');
    
    try {
      const policies = await this.contract.get_policies({
        limit: 100
      });
      
      const summary = {
        total: policies.length,
        active: policies.filter(p => p.status === 'active').length,
        pending: policies.filter(p => p.status === 'pending').length,
        paid: policies.filter(p => p.status === 'claimed').length,
        totalCoverage: policies.reduce((sum, p) => sum + parseInt(p.coverageAmount), 0),
        totalPremiums: policies.reduce((sum, p) => sum + parseInt(p.premiumAmount), 0),
        cropTypes: [...new Set(policies.map(p => p.cropType))],
        averageThreshold: policies.reduce((sum, p) => sum + p.rainfallThreshold, 0) / policies.length || 0
      };
      
      console.log('\n📊 POLICY SUMMARY');
      console.log('=================');
      console.log(`📋 Total Policies: ${summary.total}`);
      console.log(`🟢 Active: ${summary.active}`);
      console.log(`🟡 Pending: ${summary.pending}`);
      console.log(`💰 Paid: ${summary.paid}`);
      console.log(`💵 Total Coverage: $${summary.totalCoverage.toLocaleString()}`);
      console.log(`💰 Total Premiums: $${summary.totalPremiums.toLocaleString()}`);
      console.log(`🌾 Crop Types: ${summary.cropTypes.join(', ')}`);
      console.log(`🌧️  Average Rainfall Threshold: ${summary.averageThreshold.toFixed(1)}mm`);
      
    } catch (error) {
      console.error('❌ Error generating summary:', error);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const setup = new PolicySetup();
  
  try {
    await setup.init();
    
    switch (command) {
      case 'create':
        await setup.createTestPolicies();
        break;
        
      case 'list':
        await setup.listPolicies();
        break;
        
      case 'summary':
        await setup.generateSummary();
        break;
        
      case 'setup':
        await setup.createTestPolicies();
        await setup.generateSummary();
        break;
        
      default:
        console.log('🚀 AgriGuard Policy Setup');
        console.log('Usage:');
        console.log('  npm run setup-policies create   - Create test policies');
        console.log('  npm run setup-policies list     - List all policies');
        console.log('  npm run setup-policies summary  - Generate policy summary');
        console.log('  npm run setup-policies setup    - Create policies and show summary');
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

export { PolicySetup }; 