# 📚 AgriGuard Documentation

Welcome to the comprehensive documentation for the AgriGuard parametric crop insurance platform.

## 📖 Documentation Overview

### 🚀 Getting Started
- [Main README](../README.md) - Project overview and quick start
- [Setup Guide](NEAR_SETUP_GUIDE.md) - Complete environment setup
- [Implementation Plan](IMPLEMENTATION_PLAN.md) - Development roadmap and architecture

### 🛠️ Technical Documentation

#### Smart Contracts
- [Contract Methods](CONTRACT_METHODS.md) - Detailed smart contract API reference
- [Code Quality Improvements](CODE_QUALITY_IMPROVEMENTS.md) - Code refinements and best practices
- [USDC Integration](USDC_INTEGRATION_GUIDE.md) - USDC payment integration guide
- [Filecoin Integration](FILECOIN_INTEGRATION.md) - Decentralized weather data storage

#### Frontend & Integration
- [WeatherXM Integration](../lib/weatherxm.ts) - WeatherXM API integration
- [NEAR Integration](../lib/near-integration.ts) - NEAR Protocol integration

## 🏗️ Architecture Overview

```
AgriGuard Platform
├── Frontend (Next.js)
│   ├── app/ - Next.js 13 app router
│   ├── lib/ - Integration libraries
│   └── components/ - React components
├── Smart Contracts (NEAR)
│   ├── agriguard-js/ - NEAR smart contract
│   └── contracts/ - Solidity contracts (backup)
└── Documentation
    └── docs/ - All documentation files
```

## 🎯 Key Features Documented

### 🌾 Insurance Features
- **Parametric Policies**: Weather-based automatic payouts
- **Crop Coverage**: Support for 10+ crop types
- **Risk Assessment**: Dynamic pricing based on location and weather history
- **Instant Payouts**: No claims process required

### 🌡️ WeatherXM Integration
- **8000+ Stations**: Global weather station network
- **Real-time Data**: Live weather monitoring
- **Historical Analysis**: Multi-year weather patterns
- **Data Validation**: Cryptographic proof verification

### 💰 Financial Operations
- **USDC Payments**: Stable cryptocurrency transactions
- **Premium Calculation**: Risk-based pricing algorithms
- **Automated Payouts**: Smart contract triggered disbursements
- **Pool Management**: Liquidity and risk distribution

## 📋 Quick Reference

### Development Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Configure environment: Copy `.env.example` to `.env`
4. Start development: `npm run dev`

### Contract Deployment
1. Build contract: `cd agriguard-js && npm run build`
2. Deploy to testnet: `npm run deploy`
3. Initialize contract: Follow [NEAR Setup Guide](NEAR_SETUP_GUIDE.md)

### Testing
- Frontend tests: `npm test`
- Contract tests: `cd agriguard-js && npm test`
- End-to-end tests: `npm run test:e2e`

## 🔗 External Resources

### APIs & Services
- [WeatherXM API Documentation](https://docs.weatherxm.com)
- [NEAR Protocol Documentation](https://docs.near.org)
- [Next.js Documentation](https://nextjs.org/docs)

### Development Tools
- [NEAR CLI](https://github.com/near/near-cli)
- [NEAR Workspaces](https://github.com/near/workspaces-js)
- [TypeScript](https://www.typescriptlang.org/docs)

## 🤝 Contributing

### Documentation Guidelines
1. **Clear Structure**: Use headings and sections logically
2. **Code Examples**: Include practical examples for all APIs
3. **Update README**: Update this index when adding new docs
4. **Cross-Reference**: Link related documentation

### Adding New Documentation
1. Create new `.md` file in `/docs`
2. Follow existing documentation style
3. Add entry to this README index
4. Update relevant cross-references

## 📄 Document Index

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](../README.md) | Project overview | All users |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Development roadmap | Developers |
| [NEAR_SETUP_GUIDE.md](NEAR_SETUP_GUIDE.md) | Environment setup | Developers |
| [CONTRACT_METHODS.md](CONTRACT_METHODS.md) | Smart contract API | Developers |
| [CODE_QUALITY_IMPROVEMENTS.md](CODE_QUALITY_IMPROVEMENTS.md) | Code refinements | Developers |
| [USDC_INTEGRATION_GUIDE.md](USDC_INTEGRATION_GUIDE.md) | Payment integration | Developers |
| [FILECOIN_INTEGRATION.md](FILECOIN_INTEGRATION.md) | Decentralized storage | Developers |
| [CRONCAT_AUTOMATION.md](CRONCAT_AUTOMATION.md) | Automated weather checks | Developers |

## 🆘 Support

- **Technical Issues**: Create GitHub issue
- **Documentation Updates**: Submit pull request
- **Questions**: Check existing documentation first

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: AgriGuard Development Team 