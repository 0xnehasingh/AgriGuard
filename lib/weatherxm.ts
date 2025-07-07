import axios, { AxiosInstance } from 'axios';
import { addDays, format, parseISO, subDays } from 'date-fns';

// WeatherXM API Types
export interface WeatherStation {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    country: string;
    timezone: string;
  };
  isActive: boolean;
  lastUpdate: string;
  claimedBy?: string;
  model: string;
  bundle: 'wifi' | 'helium' | 'pulse';
}

export interface WeatherReading {
  timestamp: string;
  temperature: number; // Celsius
  humidity: number; // Percentage 0-100
  precipitation: number; // mm
  precipitationRate: number; // mm/h
  windSpeed: number; // m/s
  windDirection: number; // degrees 0-360
  pressure: number; // hPa
  solarRadiation: number; // W/m²
  uvIndex: number;
  dewPoint: number; // Celsius
  feelsLike: number; // Celsius
}

export interface WeatherSummary {
  date: string;
  temperature: {
    min: number;
    max: number;
    avg: number;
  };
  precipitation: {
    total: number;
    intensity: 'light' | 'moderate' | 'heavy' | 'extreme';
  };
  humidity: {
    min: number;
    max: number;
    avg: number;
  };
  wind: {
    maxSpeed: number;
    avgSpeed: number;
    direction: number;
  };
}

export interface CropRiskParameters {
  cropType: string;
  plantingDate: string;
  expectedHarvestDate: string;
  location: {
    lat: number;
    lng: number;
  };
  thresholds: {
    droughtDays: number; // consecutive days with <1mm rain
    excessRainDays: number; // consecutive days with >50mm rain
    heatStressDays: number; // consecutive days with >35°C
    frostDays: number; // days with <0°C during growing season
    maxWindSpeed: number; // m/s for crop damage
  };
}

export interface ParametricTrigger {
  id: string;
  type: 'drought' | 'excess_rain' | 'heat_stress' | 'frost' | 'hail' | 'wind_damage';
  description: string;
  threshold: number;
  unit: string;
  period: number; // days
  activated: boolean;
  activatedDate?: string;
  payoutPercentage: number; // 0-100%
}

export interface InsurancePolicy {
  id: string;
  farmerId: string;
  stationId: string;
  cropType: string;
  coverage: {
    area: number; // hectares
    valuePerHectare: number; // USD
    totalValue: number; // USD
  };
  premium: {
    amount: number; // USD
    currency: 'USD' | 'USDC' | 'WXM';
    paid: boolean;
    paymentDate?: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  triggers: ParametricTrigger[];
  status: 'active' | 'expired' | 'claimed' | 'cancelled';
  payouts: Array<{
    triggerId: string;
    amount: number;
    date: string;
    txHash: string;
  }>;
}

// WeatherXM API Client
export class WeatherXMClient {
  private api: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL = 'https://api.weatherxm.com/api/v1') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request interceptor for logging
    this.api.interceptors.request.use((config) => {
      console.log(`WeatherXM API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('WeatherXM API Error:', error.response?.data || error.message);
        throw new Error(`WeatherXM API Error: ${error.response?.data?.message || error.message}`);
      }
    );
  }

  // Get all weather stations
  async getStations(): Promise<WeatherStation[]> {
    try {
      const response = await this.api.get('/stations');
      return response.data.map(this.transformStation);
    } catch (error) {
      console.error('Error fetching stations:', error);
      throw error;
    }
  }

  // Get stations near a location
  async getNearbyStations(lat: number, lng: number, radius = 50): Promise<WeatherStation[]> {
    try {
      const response = await this.api.get('/stations/nearby', {
        params: { lat, lng, radius }
      });
      return response.data.map(this.transformStation);
    } catch (error) {
      console.error('Error fetching nearby stations:', error);
      throw error;
    }
  }

  // Get station details
  async getStation(stationId: string): Promise<WeatherStation> {
    try {
      const response = await this.api.get(`/stations/${stationId}`);
      return this.transformStation(response.data);
    } catch (error) {
      console.error(`Error fetching station ${stationId}:`, error);
      throw error;
    }
  }

  // Get current weather for a station
  async getCurrentWeather(stationId: string): Promise<WeatherReading> {
    try {
      const response = await this.api.get(`/stations/${stationId}/current`);
      return this.transformReading(response.data);
    } catch (error) {
      console.error(`Error fetching current weather for ${stationId}:`, error);
      throw error;
    }
  }

  // Get historical weather data
  async getHistoricalWeather(
    stationId: string,
    startDate: string,
    endDate: string
  ): Promise<WeatherReading[]> {
    try {
      const response = await this.api.get(`/stations/${stationId}/history`, {
        params: {
          start_date: startDate,
          end_date: endDate,
          format: 'hourly'
        }
      });
      return response.data.map(this.transformReading);
    } catch (error) {
      console.error(`Error fetching historical weather for ${stationId}:`, error);
      throw error;
    }
  }

  // Get weather forecast
  async getForecast(stationId: string, days = 7): Promise<WeatherReading[]> {
    try {
      const response = await this.api.get(`/stations/${stationId}/forecast`, {
        params: { days }
      });
      return response.data.map(this.transformReading);
    } catch (error) {
      console.error(`Error fetching forecast for ${stationId}:`, error);
      throw error;
    }
  }

  // Get daily weather summary
  async getDailySummary(
    stationId: string,
    startDate: string,
    endDate: string
  ): Promise<WeatherSummary[]> {
    try {
      const response = await this.api.get(`/stations/${stationId}/summary`, {
        params: {
          start_date: startDate,
          end_date: endDate,
          aggregation: 'daily'
        }
      });
      return response.data.map(this.transformSummary);
    } catch (error) {
      console.error(`Error fetching daily summary for ${stationId}:`, error);
      throw error;
    }
  }

  // Transform raw API response to our types
  private transformStation(raw: any): WeatherStation {
    return {
      id: raw.id || raw.station_id,
      name: raw.name,
      location: {
        lat: raw.lat || raw.latitude,
        lng: raw.lng || raw.longitude,
        address: raw.address || `${raw.lat}, ${raw.lng}`,
        country: raw.country || 'Unknown',
        timezone: raw.timezone || 'UTC'
      },
      isActive: raw.is_active !== false,
      lastUpdate: raw.last_update || raw.updated_at || new Date().toISOString(),
      claimedBy: raw.claimed_by,
      model: raw.model || 'Unknown',
      bundle: raw.bundle || 'wifi'
    };
  }

  private transformReading(raw: any): WeatherReading {
    return {
      timestamp: raw.timestamp || raw.datetime || new Date().toISOString(),
      temperature: raw.temperature || raw.temp || 0,
      humidity: raw.humidity || 0,
      precipitation: raw.precipitation || raw.rain || 0,
      precipitationRate: raw.precipitation_rate || raw.rain_rate || 0,
      windSpeed: raw.wind_speed || 0,
      windDirection: raw.wind_direction || 0,
      pressure: raw.pressure || raw.atmospheric_pressure || 1013.25,
      solarRadiation: raw.solar_radiation || raw.solar || 0,
      uvIndex: raw.uv_index || raw.uv || 0,
      dewPoint: raw.dew_point || raw.dewpoint || 0,
      feelsLike: raw.feels_like || raw.apparent_temperature || raw.temperature || 0
    };
  }

  private transformSummary(raw: any): WeatherSummary {
    return {
      date: raw.date,
      temperature: {
        min: raw.temperature?.min || raw.temp_min || 0,
        max: raw.temperature?.max || raw.temp_max || 0,
        avg: raw.temperature?.avg || raw.temp_avg || 0
      },
      precipitation: {
        total: raw.precipitation?.total || raw.rain_total || 0,
        intensity: this.classifyPrecipitationIntensity(raw.precipitation?.total || 0)
      },
      humidity: {
        min: raw.humidity?.min || 0,
        max: raw.humidity?.max || 100,
        avg: raw.humidity?.avg || 50
      },
      wind: {
        maxSpeed: raw.wind?.max_speed || 0,
        avgSpeed: raw.wind?.avg_speed || 0,
        direction: raw.wind?.direction || 0
      }
    };
  }

  private classifyPrecipitationIntensity(total: number): 'light' | 'moderate' | 'heavy' | 'extreme' {
    if (total < 2.5) return 'light';
    if (total < 10) return 'moderate';
    if (total < 50) return 'heavy';
    return 'extreme';
  }
}

// Risk Assessment Functions
export class CropRiskAssessment {
  private weatherClient: WeatherXMClient;

  constructor(weatherClient: WeatherXMClient) {
    this.weatherClient = weatherClient;
  }

  // Assess crop risk based on weather conditions
  async assessCropRisk(parameters: CropRiskParameters): Promise<{
    riskScore: number; // 0-100 (0 = low risk, 100 = high risk)
    triggers: ParametricTrigger[];
    recommendations: string[];
  }> {
    const stations = await this.weatherClient.getNearbyStations(
      parameters.location.lat,
      parameters.location.lng,
      25 // 25km radius
    );

    if (stations.length === 0) {
      throw new Error('No WeatherXM stations found near this location');
    }

    const nearestStation = stations[0];
    
    // Get historical data for the last 30 days
    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    
    const historicalData = await this.weatherClient.getHistoricalWeather(
      nearestStation.id,
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd')
    );

    const dailySummaries = await this.weatherClient.getDailySummary(
      nearestStation.id,
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd')
    );

    return this.calculateRiskScore(parameters, historicalData, dailySummaries);
  }

  private calculateRiskScore(
    parameters: CropRiskParameters,
    historicalData: WeatherReading[],
    dailySummaries: WeatherSummary[]
  ): {
    riskScore: number;
    triggers: ParametricTrigger[];
    recommendations: string[];
  } {
    const triggers: ParametricTrigger[] = [];
    const recommendations: string[] = [];
    let totalRisk = 0;

    // Check for drought conditions
    const droughtDays = this.countConsecutiveDroughtDays(dailySummaries);
    if (droughtDays >= parameters.thresholds.droughtDays) {
      triggers.push({
        id: 'drought',
        type: 'drought',
        description: `${droughtDays} consecutive days with minimal rainfall`,
        threshold: parameters.thresholds.droughtDays,
        unit: 'days',
        period: 30,
        activated: true,
        activatedDate: new Date().toISOString(),
        payoutPercentage: Math.min(50 + (droughtDays - parameters.thresholds.droughtDays) * 5, 100)
      });
      totalRisk += 30;
      recommendations.push('Consider emergency irrigation due to drought conditions');
    }

    // Check for excess rainfall
    const excessRainDays = this.countExcessRainDays(dailySummaries);
    if (excessRainDays >= parameters.thresholds.excessRainDays) {
      triggers.push({
        id: 'excess_rain',
        type: 'excess_rain',
        description: `${excessRainDays} days with excessive rainfall`,
        threshold: parameters.thresholds.excessRainDays,
        unit: 'days',
        period: 30,
        activated: true,
        activatedDate: new Date().toISOString(),
        payoutPercentage: Math.min(40 + excessRainDays * 8, 100)
      });
      totalRisk += 25;
      recommendations.push('Improve drainage to prevent waterlogging');
    }

    // Check for heat stress
    const heatStressDays = this.countHeatStressDays(dailySummaries);
    if (heatStressDays >= parameters.thresholds.heatStressDays) {
      triggers.push({
        id: 'heat_stress',
        type: 'heat_stress',
        description: `${heatStressDays} consecutive days with extreme heat`,
        threshold: parameters.thresholds.heatStressDays,
        unit: 'days',
        period: 30,
        activated: true,
        activatedDate: new Date().toISOString(),
        payoutPercentage: Math.min(35 + heatStressDays * 7, 100)
      });
      totalRisk += 20;
      recommendations.push('Provide shade or cooling for heat-sensitive crops');
    }

    // Check for frost risk
    const frostDays = this.countFrostDays(dailySummaries);
    if (frostDays > 0) {
      triggers.push({
        id: 'frost',
        type: 'frost',
        description: `${frostDays} days with frost conditions`,
        threshold: 0,
        unit: 'days',
        period: 30,
        activated: true,
        activatedDate: new Date().toISOString(),
        payoutPercentage: Math.min(60 + frostDays * 10, 100)
      });
      totalRisk += 35;
      recommendations.push('Implement frost protection measures');
    }

    // Check for high wind conditions
    const maxWindSpeed = Math.max(...dailySummaries.map(d => d.wind.maxSpeed));
    if (maxWindSpeed > parameters.thresholds.maxWindSpeed) {
      triggers.push({
        id: 'wind_damage',
        type: 'wind_damage',
        description: `Wind speeds reached ${maxWindSpeed.toFixed(1)} m/s`,
        threshold: parameters.thresholds.maxWindSpeed,
        unit: 'm/s',
        period: 30,
        activated: true,
        activatedDate: new Date().toISOString(),
        payoutPercentage: Math.min(30 + (maxWindSpeed - parameters.thresholds.maxWindSpeed) * 5, 100)
      });
      totalRisk += 15;
      recommendations.push('Install windbreaks to protect crops');
    }

    // Add non-activated triggers for monitoring
    if (triggers.length === 0) {
      triggers.push(
        {
          id: 'drought_monitor',
          type: 'drought',
          description: 'Monitoring for drought conditions',
          threshold: parameters.thresholds.droughtDays,
          unit: 'days',
          period: 30,
          activated: false,
          payoutPercentage: 50
        },
        {
          id: 'excess_rain_monitor',
          type: 'excess_rain',
          description: 'Monitoring for excessive rainfall',
          threshold: parameters.thresholds.excessRainDays,
          unit: 'days',
          period: 30,
          activated: false,
          payoutPercentage: 40
        }
      );
      recommendations.push('Weather conditions are currently favorable for crop growth');
    }

    return {
      riskScore: Math.min(totalRisk, 100),
      triggers,
      recommendations
    };
  }

  private countConsecutiveDroughtDays(summaries: WeatherSummary[]): number {
    let consecutiveDays = 0;
    let maxConsecutive = 0;

    for (const summary of summaries.reverse()) {
      if (summary.precipitation.total < 1) {
        consecutiveDays++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveDays);
      } else {
        consecutiveDays = 0;
      }
    }

    return maxConsecutive;
  }

  private countExcessRainDays(summaries: WeatherSummary[]): number {
    return summaries.filter(s => s.precipitation.total > 50).length;
  }

  private countHeatStressDays(summaries: WeatherSummary[]): number {
    let consecutiveDays = 0;
    let maxConsecutive = 0;

    for (const summary of summaries.reverse()) {
      if (summary.temperature.max > 35) {
        consecutiveDays++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveDays);
      } else {
        consecutiveDays = 0;
      }
    }

    return maxConsecutive;
  }

  private countFrostDays(summaries: WeatherSummary[]): number {
    return summaries.filter(s => s.temperature.min < 0).length;
  }
}

// Premium Calculation
export function calculateInsurancePremium(
  cropValue: number,
  riskScore: number,
  coveragePeriod: number, // days
  basePremiumRate = 0.05 // 5% base rate
): {
  premium: number;
  breakdown: {
    basePremium: number;
    riskAdjustment: number;
    platformFee: number;
    total: number;
  };
} {
  const basePremium = cropValue * basePremiumRate;
  const riskMultiplier = 1 + (riskScore / 100) * 0.5; // 0-50% risk adjustment
  const timeMultiplier = coveragePeriod / 365; // Adjust for coverage period
  
  const adjustedPremium = basePremium * riskMultiplier * timeMultiplier;
  const platformFee = adjustedPremium * 0.1; // 10% platform fee
  const total = adjustedPremium + platformFee;

  return {
    premium: total,
    breakdown: {
      basePremium,
      riskAdjustment: adjustedPremium - basePremium,
      platformFee,
      total
    }
  };
}

// Export singleton instance
export const weatherXM = new WeatherXMClient(
  process.env.WEATHERXM_API_KEY || 'demo-key'
);

export const cropRiskAssessment = new CropRiskAssessment(weatherXM); 