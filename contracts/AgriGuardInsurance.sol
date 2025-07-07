// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title AgriGuard Parametric Crop Insurance
 * @notice Decentralized crop insurance platform powered by WeatherXM data
 * @dev This contract manages insurance policies, premium collection, and automatic payouts
 * @author AgriGuard Team
 */
contract AgriGuardInsurance is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ============ STATE VARIABLES ============

    // Supported payment tokens
    mapping(address => bool) public supportedTokens;
    
    // Weather Oracle (WeatherXM integration)
    address public weatherOracle;
    
    // Platform fee (in basis points, 100 = 1%)
    uint256 public platformFee = 1000; // 10%
    
    // Pool for insurance payouts
    uint256 public insurancePool;
    
    // Policy counter
    uint256 public policyCounter;
    
    // Total premiums collected
    uint256 public totalPremiums;
    
    // Total payouts made
    uint256 public totalPayouts;

    // ============ STRUCTS ============

    struct WeatherData {
        uint256 timestamp;
        int256 temperature; // Celsius * 100 (e.g., 2550 = 25.5°C)
        uint256 precipitation; // mm * 100 (e.g., 1250 = 12.5mm)
        uint256 humidity; // Percentage * 100 (e.g., 7500 = 75%)
        uint256 windSpeed; // m/s * 100 (e.g., 850 = 8.5 m/s)
        bool isValid;
    }

    struct ParametricTrigger {
        uint256 id;
        TriggerType triggerType;
        int256 threshold;
        uint256 period; // in days
        uint256 payoutPercentage; // 0-10000 (basis points)
        bool isActivated;
        uint256 activatedTimestamp;
    }

    struct Policy {
        uint256 id;
        address farmer;
        string cropType;
        string weatherStationId;
        uint256 coverageAmount; // in USD (scaled by 1e18)
        uint256 premiumAmount; // in USD (scaled by 1e18)
        address paymentToken;
        uint256 startDate;
        uint256 endDate;
        PolicyStatus status;
        ParametricTrigger[] triggers;
        uint256 totalPayouts;
    }

    // ============ ENUMS ============

    enum TriggerType {
        DROUGHT,
        EXCESS_RAIN,
        HEAT_STRESS,
        FROST,
        WIND_DAMAGE,
        HAIL
    }

    enum PolicyStatus {
        ACTIVE,
        EXPIRED,
        CLAIMED,
        CANCELLED
    }

    // ============ MAPPINGS ============

    // Policy ID => Policy
    mapping(uint256 => Policy) public policies;
    
    // Farmer address => Policy IDs
    mapping(address => uint256[]) public farmerPolicies;
    
    // Weather Station ID => Latest Weather Data
    mapping(string => WeatherData) public weatherData;
    
    // Token address => Price feed (Chainlink)
    mapping(address => AggregatorV3Interface) public priceFeeds;

    // ============ EVENTS ============

    event PolicyCreated(
        uint256 indexed policyId,
        address indexed farmer,
        string cropType,
        uint256 coverageAmount,
        uint256 premiumAmount
    );

    event PremiumPaid(
        uint256 indexed policyId,
        address indexed farmer,
        uint256 amount,
        address token
    );

    event WeatherDataUpdated(
        string indexed stationId,
        uint256 timestamp,
        int256 temperature,
        uint256 precipitation
    );

    event TriggerActivated(
        uint256 indexed policyId,
        uint256 triggerId,
        TriggerType triggerType,
        uint256 payoutAmount
    );

    event PayoutExecuted(
        uint256 indexed policyId,
        address indexed farmer,
        uint256 amount,
        string reason
    );

    event InsurancePoolFunded(address indexed funder, uint256 amount);

    // ============ MODIFIERS ============

    modifier onlyWeatherOracle() {
        require(msg.sender == weatherOracle, "Only weather oracle can call this");
        _;
    }

    modifier validPolicy(uint256 policyId) {
        require(policyId > 0 && policyId <= policyCounter, "Invalid policy ID");
        _;
    }

    modifier onlyPolicyHolder(uint256 policyId) {
        require(policies[policyId].farmer == msg.sender, "Not policy holder");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _weatherOracle,
        address _usdcToken,
        address _usdcPriceFeed
    ) {
        weatherOracle = _weatherOracle;
        supportedTokens[_usdcToken] = true;
        priceFeeds[_usdcToken] = AggregatorV3Interface(_usdcPriceFeed);
    }

    // ============ EXTERNAL FUNCTIONS ============

    /**
     * @notice Create a new insurance policy
     * @param cropType Type of crop being insured
     * @param weatherStationId WeatherXM station ID
     * @param coverageAmount Coverage amount in USD (scaled by 1e18)
     * @param premiumAmount Premium amount in USD (scaled by 1e18)
     * @param paymentToken Token address for premium payment
     * @param startDate Policy start date (timestamp)
     * @param endDate Policy end date (timestamp)
     * @param triggers Array of parametric triggers
     */
    function createPolicy(
        string memory cropType,
        string memory weatherStationId,
        uint256 coverageAmount,
        uint256 premiumAmount,
        address paymentToken,
        uint256 startDate,
        uint256 endDate,
        ParametricTrigger[] memory triggers
    ) external whenNotPaused nonReentrant {
        require(supportedTokens[paymentToken], "Unsupported payment token");
        require(startDate < endDate, "Invalid date range");
        require(startDate >= block.timestamp, "Start date must be in future");
        require(coverageAmount > 0, "Coverage amount must be greater than 0");
        require(premiumAmount > 0, "Premium amount must be greater than 0");
        require(triggers.length > 0, "At least one trigger required");

        policyCounter++;
        uint256 policyId = policyCounter;

        // Create policy
        Policy storage policy = policies[policyId];
        policy.id = policyId;
        policy.farmer = msg.sender;
        policy.cropType = cropType;
        policy.weatherStationId = weatherStationId;
        policy.coverageAmount = coverageAmount;
        policy.premiumAmount = premiumAmount;
        policy.paymentToken = paymentToken;
        policy.startDate = startDate;
        policy.endDate = endDate;
        policy.status = PolicyStatus.ACTIVE;

        // Add triggers
        for (uint256 i = 0; i < triggers.length; i++) {
            policy.triggers.push(triggers[i]);
        }

        // Add to farmer's policies
        farmerPolicies[msg.sender].push(policyId);

        emit PolicyCreated(
            policyId,
            msg.sender,
            cropType,
            coverageAmount,
            premiumAmount
        );
    }

    /**
     * @notice Pay premium for a policy
     * @param policyId Policy ID
     */
    function payPremium(uint256 policyId) external validPolicy(policyId) onlyPolicyHolder(policyId) nonReentrant {
        Policy storage policy = policies[policyId];
        require(policy.status == PolicyStatus.ACTIVE, "Policy not active");
        require(block.timestamp < policy.startDate, "Policy already started");

        uint256 premiumAmount = policy.premiumAmount;
        address paymentToken = policy.paymentToken;

        // Calculate platform fee
        uint256 fee = (premiumAmount * platformFee) / 10000;
        uint256 poolAmount = premiumAmount - fee;

        // Transfer premium from farmer
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), premiumAmount);

        // Add to insurance pool
        insurancePool += poolAmount;
        totalPremiums += premiumAmount;

        emit PremiumPaid(policyId, msg.sender, premiumAmount, paymentToken);
    }

    /**
     * @notice Update weather data (called by WeatherXM oracle)
     * @param stationId Weather station ID
     * @param timestamp Data timestamp
     * @param temperature Temperature in Celsius * 100
     * @param precipitation Precipitation in mm * 100
     * @param humidity Humidity percentage * 100
     * @param windSpeed Wind speed in m/s * 100
     */
    function updateWeatherData(
        string memory stationId,
        uint256 timestamp,
        int256 temperature,
        uint256 precipitation,
        uint256 humidity,
        uint256 windSpeed
    ) external onlyWeatherOracle {
        weatherData[stationId] = WeatherData({
            timestamp: timestamp,
            temperature: temperature,
            precipitation: precipitation,
            humidity: humidity,
            windSpeed: windSpeed,
            isValid: true
        });

        emit WeatherDataUpdated(stationId, timestamp, temperature, precipitation);

        // Check all active policies for this station
        _checkTriggersForStation(stationId);
    }

    /**
     * @notice Check triggers for a specific policy
     * @param policyId Policy ID
     */
    function checkTriggers(uint256 policyId) external validPolicy(policyId) {
        Policy storage policy = policies[policyId];
        require(policy.status == PolicyStatus.ACTIVE, "Policy not active");
        require(block.timestamp >= policy.startDate, "Policy not started");
        require(block.timestamp <= policy.endDate, "Policy expired");

        _checkPolicyTriggers(policyId);
    }

    /**
     * @notice Execute payout for activated trigger
     * @param policyId Policy ID
     * @param triggerId Trigger ID
     */
    function executePayout(uint256 policyId, uint256 triggerId) external validPolicy(policyId) nonReentrant {
        Policy storage policy = policies[policyId];
        require(policy.status == PolicyStatus.ACTIVE, "Policy not active");

        bool triggerFound = false;
        uint256 payoutAmount = 0;

        for (uint256 i = 0; i < policy.triggers.length; i++) {
            if (policy.triggers[i].id == triggerId && policy.triggers[i].isActivated) {
                triggerFound = true;
                payoutAmount = (policy.coverageAmount * policy.triggers[i].payoutPercentage) / 10000;
                break;
            }
        }

        require(triggerFound, "Trigger not found or not activated");
        require(payoutAmount > 0, "No payout amount");
        require(insurancePool >= payoutAmount, "Insufficient insurance pool");

        // Execute payout
        insurancePool -= payoutAmount;
        policy.totalPayouts += payoutAmount;
        totalPayouts += payoutAmount;

        // Transfer payout to farmer
        IERC20(policy.paymentToken).safeTransfer(policy.farmer, payoutAmount);

        emit PayoutExecuted(policyId, policy.farmer, payoutAmount, "Trigger activated");
        emit TriggerActivated(policyId, triggerId, policy.triggers[0].triggerType, payoutAmount);
    }

    /**
     * @notice Fund insurance pool
     * @param token Token address
     * @param amount Amount to fund
     */
    function fundInsurancePool(address token, uint256 amount) external {
        require(supportedTokens[token], "Unsupported token");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        insurancePool += amount;

        emit InsurancePoolFunded(msg.sender, amount);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get policy details
     * @param policyId Policy ID
     * @return Policy details
     */
    function getPolicy(uint256 policyId) external view validPolicy(policyId) returns (Policy memory) {
        return policies[policyId];
    }

    /**
     * @notice Get farmer's policies
     * @param farmer Farmer address
     * @return Array of policy IDs
     */
    function getFarmerPolicies(address farmer) external view returns (uint256[] memory) {
        return farmerPolicies[farmer];
    }

    /**
     * @notice Get weather data for station
     * @param stationId Weather station ID
     * @return Weather data
     */
    function getWeatherData(string memory stationId) external view returns (WeatherData memory) {
        return weatherData[stationId];
    }

    /**
     * @notice Get policy triggers
     * @param policyId Policy ID
     * @return Array of triggers
     */
    function getPolicyTriggers(uint256 policyId) external view validPolicy(policyId) returns (ParametricTrigger[] memory) {
        return policies[policyId].triggers;
    }

    /**
     * @notice Calculate premium for coverage
     * @param coverageAmount Coverage amount
     * @param riskScore Risk score (0-10000)
     * @param coverageDays Coverage period in days
     * @return Premium amount
     */
    function calculatePremium(
        uint256 coverageAmount,
        uint256 riskScore,
        uint256 coverageDays
    ) external pure returns (uint256) {
        uint256 basePremiumRate = 500; // 5% base rate
        uint256 riskAdjustment = (riskScore * 500) / 10000; // 0-5% risk adjustment
        uint256 timeAdjustment = (coverageDays * 10000) / 365; // Time adjustment
        
        uint256 totalRate = basePremiumRate + riskAdjustment;
        uint256 premium = (coverageAmount * totalRate * timeAdjustment) / (10000 * 10000);
        
        return premium;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Check triggers for all policies using a specific station
     * @param stationId Weather station ID
     */
    function _checkTriggersForStation(string memory stationId) internal {
        for (uint256 i = 1; i <= policyCounter; i++) {
            Policy storage policy = policies[i];
            if (
                policy.status == PolicyStatus.ACTIVE &&
                keccak256(bytes(policy.weatherStationId)) == keccak256(bytes(stationId)) &&
                block.timestamp >= policy.startDate &&
                block.timestamp <= policy.endDate
            ) {
                _checkPolicyTriggers(i);
            }
        }
    }

    /**
     * @notice Check triggers for a specific policy
     * @param policyId Policy ID
     */
    function _checkPolicyTriggers(uint256 policyId) internal {
        Policy storage policy = policies[policyId];
        WeatherData memory weather = weatherData[policy.weatherStationId];
        
        if (!weather.isValid) return;

        for (uint256 i = 0; i < policy.triggers.length; i++) {
            ParametricTrigger storage trigger = policy.triggers[i];
            
            if (trigger.isActivated) continue;

            bool shouldTrigger = false;

            // Check different trigger types
            if (trigger.triggerType == TriggerType.DROUGHT) {
                // Check if precipitation is below threshold
                shouldTrigger = int256(weather.precipitation) < trigger.threshold;
            } else if (trigger.triggerType == TriggerType.EXCESS_RAIN) {
                // Check if precipitation is above threshold
                shouldTrigger = int256(weather.precipitation) > trigger.threshold;
            } else if (trigger.triggerType == TriggerType.HEAT_STRESS) {
                // Check if temperature is above threshold
                shouldTrigger = weather.temperature > trigger.threshold;
            } else if (trigger.triggerType == TriggerType.FROST) {
                // Check if temperature is below threshold
                shouldTrigger = weather.temperature < trigger.threshold;
            } else if (trigger.triggerType == TriggerType.WIND_DAMAGE) {
                // Check if wind speed is above threshold
                shouldTrigger = int256(weather.windSpeed) > trigger.threshold;
            }

            if (shouldTrigger) {
                trigger.isActivated = true;
                trigger.activatedTimestamp = block.timestamp;
                
                emit TriggerActivated(
                    policyId,
                    trigger.id,
                    trigger.triggerType,
                    (policy.coverageAmount * trigger.payoutPercentage) / 10000
                );
            }
        }
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Set weather oracle address
     * @param _weatherOracle New weather oracle address
     */
    function setWeatherOracle(address _weatherOracle) external onlyOwner {
        weatherOracle = _weatherOracle;
    }

    /**
     * @notice Set platform fee
     * @param _platformFee New platform fee in basis points
     */
    function setPlatformFee(uint256 _platformFee) external onlyOwner {
        require(_platformFee <= 2000, "Platform fee cannot exceed 20%");
        platformFee = _platformFee;
    }

    /**
     * @notice Add supported token
     * @param token Token address
     * @param priceFeed Chainlink price feed address
     */
    function addSupportedToken(address token, address priceFeed) external onlyOwner {
        supportedTokens[token] = true;
        priceFeeds[token] = AggregatorV3Interface(priceFeed);
    }

    /**
     * @notice Remove supported token
     * @param token Token address
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw (only owner)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
} 