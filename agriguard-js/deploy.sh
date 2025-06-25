#!/bin/bash

# AgriGuard NEAR Contract Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AgriGuard NEAR Contract Deployment${NC}"
echo "=================================="

# Check if near-cli is installed
if ! command -v near &> /dev/null; then
    echo -e "${RED}❌ near-cli is not installed. Please install it first:${NC}"
    echo "npm install -g near-cli"
    exit 1
fi

# Check if logged in
if [ ! -d ~/.near-credentials ]; then
    echo -e "${RED}❌ Not logged in to NEAR. Please login first:${NC}"
    echo "near login"
    exit 1
fi

# Build the contract
echo -e "${YELLOW}📦 Building contract...${NC}"
npm run build

# Check if build was successful
if [ ! -f "build/agriguard_contract.wasm" ]; then
    echo -e "${RED}❌ Build failed. Contract WASM file not found.${NC}"
    exit 1
fi

# Deploy to testnet
echo -e "${YELLOW}🚀 Deploying to testnet...${NC}"

# Get account ID from environment or prompt
if [ -z "$TESTNET_ACCOUNT" ]; then
    echo -e "${BLUE}Enter your testnet account ID (e.g., agriguard.testnet):${NC}"
    read TESTNET_ACCOUNT
fi

# Deploy contract
echo -e "${YELLOW}Deploying contract to $TESTNET_ACCOUNT...${NC}"
near deploy --accountId $TESTNET_ACCOUNT --wasmFile build/agriguard_contract.wasm

# Initialize contract
echo -e "${YELLOW}🔧 Initializing contract...${NC}"
near call $TESTNET_ACCOUNT init --args "{\"owner\": \"$TESTNET_ACCOUNT\"}" --accountId $TESTNET_ACCOUNT

# Add weather oracle
echo -e "${YELLOW}🌡️ Adding weather oracle...${NC}"
near call $TESTNET_ACCOUNT addOracle --args "{\"oracle\": \"weather-oracle.testnet\"}" --accountId $TESTNET_ACCOUNT

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo "=================================="
echo -e "${GREEN}Contract deployed to: $TESTNET_ACCOUNT${NC}"
echo -e "${GREEN}Weather oracle added: weather-oracle.testnet${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Update your .env file with the contract address"
echo "2. Test the contract using the provided scripts"
echo "3. Integrate with your frontend application"
echo ""
echo -e "${BLUE}🧪 Test the contract:${NC}"
echo "near view $TESTNET_ACCOUNT getContractStats"
echo ""
echo -e "${BLUE}💰 Fund the contract for payouts:${NC}"
echo "near send $TESTNET_ACCOUNT 100 --accountId $TESTNET_ACCOUNT" 