import { 
  NearBindgen, 
  near, 
  call, 
  view, 
  initialize, 
  LookupMap, 
  assert 
} from 'near-sdk-js';

// Mock USDC Contract for Testing
@NearBindgen({})
export class MockUSDC {
  private balances: LookupMap<string>;
  private totalSupply: string;
  private owner: string;
  private metadata: {
    spec: string;
    name: string;
    symbol: string;
    decimals: number;
    icon: string | null;
  };

  constructor() {
    this.balances = new LookupMap('b');
    this.totalSupply = '0';
    this.owner = '';
    this.metadata = {
      spec: 'ft-1.0.0',
      name: 'Mock USDC',
      symbol: 'USDC',
      decimals: 6,
      icon: null
    };
  }

  @initialize({})
  new({
    owner_id,
    total_supply,
    metadata
  }: {
    owner_id: string;
    total_supply: string;
    metadata: {
      spec: string;
      name: string;
      symbol: string;
      decimals: number;
      icon: string | null;
    };
  }) {
    this.owner = owner_id;
    this.totalSupply = total_supply;
    this.metadata = metadata;
    
    // Give total supply to owner
    this.balances.set(owner_id, total_supply);
    
    near.log(`Mock USDC initialized with ${total_supply} tokens for ${owner_id}`);
  }

  @call({})
  storage_deposit({
    account_id,
    registration_only
  }: {
    account_id?: string;
    registration_only?: boolean;
  }) {
    const accountId = account_id || near.predecessorAccountId();
    
    // For testing, just register the account
    if (!this.balances.containsKey(accountId)) {
      this.balances.set(accountId, '0');
    }
    
    near.log(`Storage deposit for ${accountId}`);
    return {
      total: '1250000000000000000000',
      available: '0'
    };
  }

  @call({ payableFunction: true })
  ft_transfer({
    receiver_id,
    amount,
    memo
  }: {
    receiver_id: string;
    amount: string;
    memo?: string;
  }) {
    const senderId = near.predecessorAccountId();
    const attachedDeposit = near.attachedDeposit();
    
    assert(attachedDeposit === BigInt(1), 'Requires attached deposit of exactly 1 yoctoNEAR');
    
    this.internalTransfer(senderId, receiver_id, amount, memo);
  }

  @call({ payableFunction: true })
  ft_transfer_call({
    receiver_id,
    amount,
    memo,
    msg
  }: {
    receiver_id: string;
    amount: string;
    memo?: string;
    msg: string;
  }): string {
    const senderId = near.predecessorAccountId();
    const attachedDeposit = near.attachedDeposit();
    
    assert(attachedDeposit === BigInt(1), 'Requires attached deposit of exactly 1 yoctoNEAR');
    
    // Transfer tokens to receiver
    this.internalTransfer(senderId, receiver_id, amount, memo);
    
    // Call ft_on_transfer on receiver contract
    const promise = near.promiseBatchCreate(receiver_id);
    near.promiseBatchActionFunctionCall(
      promise,
      'ft_on_transfer',
      JSON.stringify({
        sender_id: senderId,
        amount: amount,
        msg: msg
      }),
      BigInt(0), // No attached deposit
      BigInt('30000000000000') // 30 TGas
    );
    
    // For testing, assume no tokens are returned
    return '0';
  }

  private internalTransfer(
    senderId: string,
    receiverId: string,
    amount: string,
    memo?: string
  ) {
    const senderBalance = this.balances.get(senderId) || '0';
    const receiverBalance = this.balances.get(receiverId) || '0';
    
    assert(
      BigInt(senderBalance) >= BigInt(amount),
      `Insufficient balance: ${senderBalance}, required: ${amount}`
    );
    
    const newSenderBalance = (BigInt(senderBalance) - BigInt(amount)).toString();
    const newReceiverBalance = (BigInt(receiverBalance) + BigInt(amount)).toString();
    
    this.balances.set(senderId, newSenderBalance);
    this.balances.set(receiverId, newReceiverBalance);
    
    near.log(`Transfer: ${amount} USDC from ${senderId} to ${receiverId}`);
    if (memo) {
      near.log(`Memo: ${memo}`);
    }
  }

  @view({})
  ft_balance_of({ account_id }: { account_id: string }): string {
    return this.balances.get(account_id) || '0';
  }

  @view({})
  ft_total_supply(): string {
    return this.totalSupply;
  }

  @view({})
  ft_metadata(): {
    spec: string;
    name: string;
    symbol: string;
    decimals: number;
    icon: string | null;
  } {
    return this.metadata;
  }

  @call({})
  mint({ account_id, amount }: { account_id: string; amount: string }) {
    assert(
      near.predecessorAccountId() === this.owner,
      'Only owner can mint tokens'
    );
    
    const currentBalance = this.balances.get(account_id) || '0';
    const newBalance = (BigInt(currentBalance) + BigInt(amount)).toString();
    
    this.balances.set(account_id, newBalance);
    this.totalSupply = (BigInt(this.totalSupply) + BigInt(amount)).toString();
    
    near.log(`Minted ${amount} USDC to ${account_id}`);
  }
} 