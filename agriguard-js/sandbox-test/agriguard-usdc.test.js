import { Worker, NearAccount } from 'near-workspaces';
import anyTest from 'ava';

/**
 * @typedef {import('near-workspaces').NearAccount} NearAccount
 * @typedef {import('near-workspaces').Worker} Worker
 */

/**
 * @typedef {Object} TestContext
 * @property {Worker} worker
 * @property {NearAccount} accounts
 */

const test = anyTest;

test.beforeEach(async (t) => {
  // Initialize the worker and start a Sandbox server
  const worker = await Worker.init();

  // Deploy the AgriGuard contract
  const root = worker.rootAccount;
  
  // Create test accounts
  const agriguardContract = await root.createSubAccount('agriguard-contract');
  const mockUsdc = await root.createSubAccount('usdc-mock');
  const farmer = await root.createSubAccount('farmer');
  const oracle = await root.createSubAccount('oracle');
  
  // Deploy the AgriGuard contract
  await agriguardContract.deploy(
    process.cwd() + '/build/agriguard_contract.wasm'
  );
  
  // Initialize the contract
  await agriguardContract.call(agriguardContract, 'init', {
    owner: agriguardContract.accountId
  });
  
  // Deploy a mock USDC contract for testing
  await mockUsdc.deploy(
    process.cwd() + '/sandbox-test/mock-usdc.wasm'
  );
  
  // Initialize mock USDC
  await mockUsdc.call(mockUsdc, 'new', {
    owner_id: mockUsdc.accountId,
    total_supply: '1000000000000000', // 1 billion USDC
    metadata: {
      spec: 'ft-1.0.0',
      name: 'Mock USDC',
      symbol: 'USDC',
      decimals: 6,
      icon: null
    }
  });

  // Register accounts with mock USDC
  await farmer.call(mockUsdc, 'storage_deposit', {
    account_id: farmer.accountId
  }, { attachedDeposit: '1250000000000000000000' });
  
  await agriguardContract.call(mockUsdc, 'storage_deposit', {
    account_id: agriguardContract.accountId
  }, { attachedDeposit: '1250000000000000000000' });

  // Transfer USDC to farmer for testing
  await mockUsdc.call(mockUsdc, 'ft_transfer', {
    receiver_id: farmer.accountId,
    amount: '1000000000', // 1,000 USDC
    memo: 'Test funds'
  }, { attachedDeposit: '1' });

  // Add oracle to the contract
  await agriguardContract.call(agriguardContract, 'addOracle', {
    oracle: oracle.accountId
  });

  // Save the state
  t.context.worker = worker;
  t.context.accounts = {
    agriguardContract,
    mockUsdc,
    farmer,
    oracle,
    root
  };
});

test.afterEach.always(async (t) => {
  await t.context.worker.tearDown().catch((error) => {
    console.log('Failed to tear down the worker:', error);
  });
});

test('should create a policy and accept USDC premium payment', async (t) => {
  const { agriguardContract, mockUsdc, farmer } = t.context.accounts;

  // Create a policy
  const policyId = await farmer.call(agriguardContract, 'createPolicy', {
    cropType: 'wheat',
    farmLocation: { lat: 40.7128, lng: -74.0060 },
    coverageAmount: '100000000', // 100 USDC
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    weatherParameters: {
      minTemp: 5,
      maxTemp: 30,
      minRainfall: 300,
      maxRainfall: 1000
    }
  });

  t.is(policyId, 'policy_1');

  // Check initial policy status
  const policy = await agriguardContract.view('getPolicy', { policyId });
  t.is(policy.status, 'pending');
  t.is(policy.isActive, false);
  t.is(policy.premiumPaid, '0');

  // Calculate expected premium (5% of 100 USDC = 5 USDC = 5,000,000 micro-USDC)
  const expectedPremium = '5000000';

  // Pay premium via ft_transfer_call
  await farmer.call(mockUsdc, 'ft_transfer_call', {
    receiver_id: agriguardContract.accountId,
    amount: expectedPremium,
    memo: 'Premium payment',
    msg: JSON.stringify({ policyId })
  }, { attachedDeposit: '1' });

  // Check policy status after payment
  const updatedPolicy = await agriguardContract.view('getPolicy', { policyId });
  t.is(updatedPolicy.status, 'active');
  t.is(updatedPolicy.isActive, true);
  t.is(updatedPolicy.premiumPaid, expectedPremium);

  // Check contract stats
  const stats = await agriguardContract.view('getContractStats');
  t.is(stats.totalPolicies, 1);
  t.is(stats.totalPremiumsCollected, expectedPremium);
});

test('should reject USDC payment from non-USDC contract', async (t) => {
  const { agriguardContract, farmer } = t.context.accounts;

  // Create a policy first
  const policyId = await farmer.call(agriguardContract, 'createPolicy', {
    cropType: 'wheat',
    farmLocation: { lat: 40.7128, lng: -74.0060 },
    coverageAmount: '100000000', // 100 USDC
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    weatherParameters: {
      minTemp: 5,
      maxTemp: 30,
      minRainfall: 300,
      maxRainfall: 1000
    }
  });

  // Try to call ft_on_transfer directly (should fail)
  await t.throwsAsync(
    farmer.call(agriguardContract, 'ft_on_transfer', {
      sender_id: farmer.accountId,
      amount: '5000000',
      msg: JSON.stringify({ policyId })
    }),
    { message: /Only.*can call ft_on_transfer/ }
  );
});

test('should reject insufficient premium payment', async (t) => {
  const { agriguardContract, mockUsdc, farmer } = t.context.accounts;

  // Create a policy
  const policyId = await farmer.call(agriguardContract, 'createPolicy', {
    cropType: 'wheat',
    farmLocation: { lat: 40.7128, lng: -74.0060 },
    coverageAmount: '100000000', // 100 USDC
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    weatherParameters: {
      minTemp: 5,
      maxTemp: 30,
      minRainfall: 300,
      maxRainfall: 1000
    }
  });

  // Try to pay insufficient premium
  const insufficientAmount = '1000000'; // 1 USDC instead of 5 USDC
  
  await farmer.call(mockUsdc, 'ft_transfer_call', {
    receiver_id: agriguardContract.accountId,
    amount: insufficientAmount,
    memo: 'Insufficient premium payment',
    msg: JSON.stringify({ policyId })
  }, { attachedDeposit: '1' });

  // Verify policy remains in pending state
  const policy = await agriguardContract.view('getPolicy', { policyId });
  t.is(policy.status, 'pending');
  t.is(policy.isActive, false);
});

  // Policy should still be pending
  const policy = await agriguardContract.view('getPolicy', { policyId });
  t.is(policy.status, 'pending');
  t.is(policy.isActive, false);
  t.is(policy.premiumPaid, '0');
});

test('should process automatic claims and trigger USDC payouts', async (t) => {
  const { agriguardContract, mockUsdc, farmer, oracle } = t.context.accounts;

  // Create and fund a policy
  const policyId = await farmer.call(agriguardContract, 'createPolicy', {
    cropType: 'wheat',
    farmLocation: { lat: 40.7128, lng: -74.0060 },
    coverageAmount: '100000000', // 100 USDC
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    weatherParameters: {
      minTemp: 5,
      maxTemp: 30,
      minRainfall: 300,
      maxRainfall: 1000
    }
  });

  // Pay premium
  await farmer.call(mockUsdc, 'ft_transfer_call', {
    receiver_id: agriguardContract.accountId,
    amount: '5000000', // 5 USDC premium
    memo: 'Premium payment',
    msg: JSON.stringify({ policyId })
  }, { attachedDeposit: '1' });

  // Fund the contract with USDC for payouts
  await mockUsdc.call(mockUsdc, 'ft_transfer', {
    receiver_id: agriguardContract.accountId,
    amount: '100000000', // 100 USDC for payouts
    memo: 'Contract funding'
  }, { attachedDeposit: '1' });

  // File a claim with extreme weather data
  const claimId = await farmer.call(agriguardContract, 'fileClaim', {
    policyId,
    reason: 'Extreme temperature damage',
    weatherData: {
      stationId: 'test_station',
      timestamp: Date.now().toString(),
      temperature: 45, // Exceeds max temp of 30
      rainfall: 50, // Below min rainfall of 300
      humidity: 60,
      windSpeed: 15
    }
  });

  // Check claim status
  const claim = await agriguardContract.view('getClaim', { claimId });
  t.is(claim.status, 'paid'); // Should be automatically processed and paid
  t.truthy(BigInt(claim.claimAmount) > 0);

  // Check policy status
  const policy = await agriguardContract.view('getPolicy', { policyId });
  t.is(policy.status, 'claimed');
  t.is(policy.claimsPaid, claim.claimAmount);
});

test('should handle weather oracle data submission', async (t) => {
  const { agriguardContract, oracle } = t.context.accounts;

  // Submit weather data as oracle
  await oracle.call(agriguardContract, 'submitWeatherData', {
    stationId: 'WXM_001',
    temperature: 25,
    rainfall: 500,
    humidity: 70,
    windSpeed: 10
  });

  // Should not throw error - successful submission
  t.pass();
});

test('should reject weather data from unauthorized oracle', async (t) => {
  const { agriguardContract, farmer } = t.context.accounts;

  // Try to submit weather data as non-oracle
  await t.throwsAsync(
    farmer.call(agriguardContract, 'submitWeatherData', {
      stationId: 'WXM_001',
      temperature: 25,
      rainfall: 500,
      humidity: 70,
      windSpeed: 10
    }),
    { message: /Only authorized oracles can submit weather data/ }
  );
});

test('should calculate different premiums for different crops', async (t) => {
  const { agriguardContract, mockUsdc, farmer } = t.context.accounts;

  // Create policies for different crops
  const wheatPolicyId = await farmer.call(agriguardContract, 'createPolicy', {
    cropType: 'wheat',
    farmLocation: { lat: 40.7128, lng: -74.0060 },
    coverageAmount: '100000000', // 100 USDC
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    weatherParameters: {
      minTemp: 5,
      maxTemp: 30,
      minRainfall: 300,
      maxRainfall: 1000
    }
  });

  const ricePolicyId = await farmer.call(agriguardContract, 'createPolicy', {
    cropType: 'rice',
    farmLocation: { lat: 40.7128, lng: -74.0060 },
    coverageAmount: '100000000', // 100 USDC
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    weatherParameters: {
      minTemp: 20,
      maxTemp: 40,
      minRainfall: 1000,
      maxRainfall: 2000
    }
  });

  const wheatPolicy = await agriguardContract.view('getPolicy', { policyId: wheatPolicyId });
  const ricePolicy = await agriguardContract.view('getPolicy', { policyId: ricePolicyId });

  // Rice should have higher premium due to higher risk multiplier (1.5x)
  t.true(BigInt(ricePolicy.premium) > BigInt(wheatPolicy.premium));
});

test('should handle admin manual payouts', async (t) => {
  const { agriguardContract, mockUsdc, farmer } = t.context.accounts;

  // Create and fund a policy
  const policyId = await farmer.call(agriguardContract, 'createPolicy', {
    cropType: 'wheat',
    farmLocation: { lat: 40.7128, lng: -74.0060 },
    coverageAmount: '100000000', // 100 USDC
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    weatherParameters: {
      minTemp: 5,
      maxTemp: 30,
      minRainfall: 300,
      maxRainfall: 1000
    }
  });

  // Pay premium
  await farmer.call(mockUsdc, 'ft_transfer_call', {
    receiver_id: agriguardContract.accountId,
    amount: '5000000', // 5 USDC premium
    memo: 'Premium payment',
    msg: JSON.stringify({ policyId })
  }, { attachedDeposit: '1' });

  // Fund the contract with USDC for payouts
  await mockUsdc.call(mockUsdc, 'ft_transfer', {
    receiver_id: agriguardContract.accountId,
    amount: '100000000', // 100 USDC for payouts
    memo: 'Contract funding'
  }, { attachedDeposit: '1' });

  // File a claim
  const claimId = await farmer.call(agriguardContract, 'fileClaim', {
    policyId,
    reason: 'Manual claim processing test',
    weatherData: {
      stationId: 'test_station',
      timestamp: Date.now().toString(),
      temperature: 45, // Exceeds max temp
      rainfall: 50, // Below min rainfall
      humidity: 60,
      windSpeed: 15
    }
  });

  // Admin can manually trigger payout
  await agriguardContract.call(agriguardContract, 'adminTriggerPayout', {
    recipient: farmer.accountId,
    amount: '30000000', // 30 USDC
    claimId
  });

  // Check claim status
  const claim = await agriguardContract.view('getClaim', { claimId });
  t.is(claim.status, 'paid');
});

test('should return contract statistics correctly', async (t) => {
  const { agriguardContract, mockUsdc, farmer } = t.context.accounts;

  // Create multiple policies
  for (let i = 0; i < 3; i++) {
    const policyId = await farmer.call(agriguardContract, 'createPolicy', {
      cropType: 'wheat',
      farmLocation: { lat: 40.7128, lng: -74.0060 },
      coverageAmount: '100000000', // 100 USDC
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      weatherParameters: {
        minTemp: 5,
        maxTemp: 30,
        minRainfall: 300,
        maxRainfall: 1000
      }
    });

    // Pay premium for each policy
    await farmer.call(mockUsdc, 'ft_transfer_call', {
      receiver_id: agriguardContract.accountId,
      amount: '5000000', // 5 USDC premium
      memo: 'Premium payment',
      msg: JSON.stringify({ policyId })
    }, { attachedDeposit: '1' });
  }

  const stats = await agriguardContract.view('getContractStats');
  t.is(stats.totalPolicies, 3);
  t.is(stats.totalPremiumsCollected, '15000000'); // 3 * 5 USDC = 15 USDC
}); 