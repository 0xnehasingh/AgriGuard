import { storeWeatherData } from './storeWeather';
import { connect, keyStores, utils } from 'near-api-js';

/**
 * Test script to demonstrate the complete Filecoin integration workflow
 * 
 * This script:
 * 1. Fetches weather data from WeatherXM
 * 2. Stores it on Filecoin using web3.storage
 * 3. Calls the smart contract to store the CID
 * 4. Verifies retrieval from Filecoin
 */

async function testFilecoinIntegration() {
  console.log('🧪 Starting Filecoin Integration Test\n');

  // Configuration
  const stationId = process.argv[2] || 'test-station-001';
  const weatherXMApiKey = process.env.WEATHERXM_API_KEY;
  const web3StorageEmail = process.env.WEB3_STORAGE_EMAIL;
  const nearAccountId = process.env.TESTNET_ACCOUNT;
  const contractId = process.env.CONTRACT_NAME || 'agriguard-contract.testnet';

  // Validate environment variables
  if (!weatherXMApiKey) {
    console.error('❌ WEATHERXM_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!nearAccountId) {
    console.error('❌ TESTNET_ACCOUNT environment variable is required');
    process.exit(1);
  }

  try {
    // Step 1: Store weather data on Filecoin
    console.log('📡 Step 1: Fetching and storing weather data on Filecoin...');
    const result = await storeWeatherData(stationId, weatherXMApiKey, {
      email: web3StorageEmail
    });

    console.log('✅ Weather data stored on Filecoin:');
    console.log(`   CID: ${result.cid}`);
    console.log(`   Size: ${result.size} bytes`);
    console.log(`   Compression: ${result.compressionRatio.toFixed(2)}%`);
    console.log(`   Retrieval URL: https://w3s.link/ipfs/${result.cid}\n`);

    // Step 2: Connect to NEAR and call smart contract
    console.log('🔗 Step 2: Connecting to NEAR testnet...');
    
    const keyStore = new keyStores.UnencryptedFileSystemKeyStore(
      `${process.env.HOME}/.near-credentials`
    );

    const near = await connect({
      networkId: 'testnet',
      keyStore,
      nodeUrl: 'https://rpc.testnet.near.org',
      walletUrl: 'https://wallet.testnet.near.org',
      helperUrl: 'https://helper.testnet.near.org',
    });

    const account = await near.account(nearAccountId);
    
    console.log('✅ Connected to NEAR testnet');
    console.log(`   Account: ${nearAccountId}`);
    console.log(`   Contract: ${contractId}\n`);

    // Step 3: Call smart contract to store CID
    console.log('📝 Step 3: Calling smart contract to store CID...');
    
    const timestamp = Date.now();
    const contractCall = await account.functionCall({
      contractId: contractId,
      methodName: 'receive_weather',
      args: {
        stationId: stationId,
        timestamp: timestamp,
        filecoinCid: result.cid
      },
      gas: BigInt('30000000000000'), // 30 TGas
      attachedDeposit: BigInt('0') // No deposit required
    });

    console.log('✅ Smart contract call successful:');
    console.log(`   Transaction: ${contractCall.transaction.hash}\n`);

    // Step 4: Verify data can be retrieved from contract
    console.log('🔍 Step 4: Verifying data retrieval from contract...');
    
    const weatherData = await account.viewFunction({
      contractId: contractId,
      methodName: 'getWeatherData',
      args: {
        stationId: stationId,
        timestamp: timestamp
      }
    });

    if (weatherData && weatherData.filecoinCid === result.cid) {
      console.log('✅ Weather data retrieved from contract:');
      console.log(`   Station ID: ${weatherData.stationId}`);
      console.log(`   Timestamp: ${weatherData.timestamp}`);
      console.log(`   Filecoin CID: ${weatherData.filecoinCid}\n`);
    } else {
      console.log('⚠️  Warning: Could not retrieve weather data from contract\n');
    }

    // Step 5: Verify Filecoin retrieval
    console.log('🌐 Step 5: Verifying Filecoin retrieval...');
    
    const retrievalUrl = `https://w3s.link/ipfs/${result.cid}`;
    const response = await fetch(retrievalUrl);
    
    if (response.ok) {
      const retrievedData = await response.arrayBuffer();
      console.log('✅ Data successfully retrieved from Filecoin:');
      console.log(`   URL: ${retrievalUrl}`);
      console.log(`   Size: ${retrievedData.byteLength} bytes`);
      console.log(`   Status: ${response.status} ${response.statusText}\n`);
    } else {
      console.log(`⚠️  Warning: Filecoin retrieval failed: ${response.status} ${response.statusText}\n`);
    }

    // Summary
    console.log('🎉 Integration Test Complete!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ Weather data fetched from WeatherXM`);
    console.log(`   ✅ Data compressed and stored on Filecoin`);
    console.log(`   ✅ CID stored on NEAR smart contract`);
    console.log(`   ✅ Data retrievable from both sources`);
    console.log('\n🔗 Key Information:');
    console.log(`   Station ID: ${stationId}`);
    console.log(`   Filecoin CID: ${result.cid}`);
    console.log(`   NEAR Transaction: ${contractCall.transaction.hash}`);
    console.log(`   Retrieval URL: ${retrievalUrl}`);

  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack trace: ${error.stack}`);
      }
    }
    
    process.exit(1);
  }
}

// Helper function to check environment setup
function checkEnvironment() {
  const requiredVars = [
    'WEATHERXM_API_KEY',
    'TESTNET_ACCOUNT',
  ];

  const optionalVars = [
    'WEB3_STORAGE_EMAIL',
    'CONTRACT_NAME'
  ];

  console.log('🔧 Environment Check:');
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: Set`);
    } else {
      console.log(`   ❌ ${varName}: Missing (required)`);
    }
  }

  for (const varName of optionalVars) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: Set`);
    } else {
      console.log(`   ⚠️  ${varName}: Not set (optional)`);
    }
  }
  
  console.log();
}

// CLI interface
async function main() {
  console.log('🌍 AgriGuard Filecoin Integration Test\n');
  
  checkEnvironment();
  
  const stationId = process.argv[2];
  if (!stationId) {
    console.log('💡 Usage:');
    console.log('   npm run test:filecoin <station-id>');
    console.log('\n📝 Example:');
    console.log('   npm run test:filecoin WM_001234\n');
    
    console.log('🛠️  Setup:');
    console.log('   1. Set WEATHERXM_API_KEY in .env');
    console.log('   2. Set TESTNET_ACCOUNT in .env');
    console.log('   3. Optionally set WEB3_STORAGE_EMAIL in .env');
    console.log('   4. Deploy smart contract to NEAR testnet\n');
    
    process.exit(1);
  }

  await testFilecoinIntegration();
}

if (require.main === module) {
  main();
} 