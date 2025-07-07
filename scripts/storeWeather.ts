import { create } from '@web3-storage/w3up-client'
import { gzip } from 'zlib'
import { promisify } from 'util'
import fetch from 'node-fetch'

// Promisify gzip for async/await usage
const gzipAsync = promisify(gzip)

/**
 * WeatherXM API Response Types
 */
interface WeatherXMStation {
  id: string
  name: string
  lat: number
  lng: number
  weather?: {
    temperature: number
    humidity: number
    rainfall: number
    windSpeed: number
    windDirection: number
    pressure: number
    uvIndex: number
    timestamp: string
  }
}

interface WeatherXMObservation {
  id: string
  stationId: string
  timestamp: string
  temperature: number
  humidity: number
  rainfall: number
  windSpeed: number
  windDirection: number
  pressure: number
  uvIndex: number
  coordinates: {
    lat: number
    lng: number
  }
}

interface FilecoinStorageResult {
  cid: string
  size: number
  compressionRatio: number
  timestamp: string
}

/**
 * Configuration for web3.storage client
 */
interface StorageConfig {
  email?: string
  space?: string
  agent?: string
}

/**
 * Fetches weather data from WeatherXM API for a specific station
 * @param stationId - WeatherXM station ID
 * @param apiKey - WeatherXM API key
 * @returns Promise<WeatherXMObservation | null>
 */
async function fetchWeatherXMData(
  stationId: string,
  apiKey: string
): Promise<WeatherXMObservation | null> {
  try {
    console.log(`🌦️  Fetching weather data for station: ${stationId}`)
    
    const response = await fetch(
      `https://api.weatherxm.com/api/v1/cells/${stationId}/observations/latest`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error(`❌ WeatherXM API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json() as any
    
    // Transform WeatherXM response to our format
    const observation: WeatherXMObservation = {
      id: `${stationId}-${Date.now()}`,
      stationId: stationId,
      timestamp: data.timestamp || new Date().toISOString(),
      temperature: data.temperature || 0,
      humidity: data.humidity || 0,
      rainfall: data.precipitation || 0,
      windSpeed: data.wind_speed || 0,
      windDirection: data.wind_direction || 0,
      pressure: data.pressure || 0,
      uvIndex: data.uv_index || 0,
      coordinates: {
        lat: data.lat || 0,
        lng: data.lng || 0,
      },
    }

    console.log(`✅ Successfully fetched weather data:`, {
      stationId,
      temperature: observation.temperature,
      humidity: observation.humidity,
      rainfall: observation.rainfall,
      timestamp: observation.timestamp,
    })

    return observation
  } catch (error) {
    console.error(`❌ Error fetching WeatherXM data:`, error)
    return null
  }
}

/**
 * Compresses weather data using gzip
 * @param data - Weather observation data
 * @returns Promise<Buffer>
 */
async function compressWeatherData(data: WeatherXMObservation): Promise<Buffer> {
  try {
    console.log(`🗜️  Compressing weather data...`)
    
    const jsonString = JSON.stringify(data, null, 2)
    const originalSize = Buffer.byteLength(jsonString, 'utf8')
    
    const compressed = await gzipAsync(Buffer.from(jsonString, 'utf8'))
    const compressedSize = compressed.length
    
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2)
    
    console.log(`✅ Compression complete:`, {
      originalSize: `${originalSize} bytes`,
      compressedSize: `${compressedSize} bytes`,
      compressionRatio: `${compressionRatio}%`,
    })
    
    return compressed
  } catch (error) {
    console.error(`❌ Error compressing weather data:`, error)
    throw error
  }
}

/**
 * Stores compressed weather data on Filecoin using w3up-client
 * @param compressedData - Gzipped weather data
 * @param config - Storage configuration
 * @returns Promise<string> - CID of stored data
 */
async function storeOnFilecoin(
  compressedData: Buffer,
  config: StorageConfig = {}
): Promise<string> {
  try {
    console.log(`🚀 Storing data on Filecoin...`)
    
    // Initialize w3up client
    const client = await create()
    
    // Login with email if provided
    if (config.email) {
      await client.login(config.email)
      console.log(`🔐 Logged in with email: ${config.email}`)
    }
    
    // Create a file from the compressed data
    const file = new File([compressedData], `weather-${Date.now()}.json.gz`, {
      type: 'application/gzip',
    })
    
    // Upload to web3.storage
    const cid = await client.uploadFile(file)
    
    console.log(`✅ Successfully stored on Filecoin:`, {
      cid: cid.toString(),
      size: `${compressedData.length} bytes`,
      retrievalUrl: `https://w3s.link/ipfs/${cid}`,
    })
    
    return cid.toString()
  } catch (error) {
    console.error(`❌ Error storing on Filecoin:`, error)
    throw error
  }
}

/**
 * Verifies data can be retrieved from Filecoin
 * @param cid - Content Identifier
 * @returns Promise<boolean>
 */
async function verifyRetrieval(cid: string): Promise<boolean> {
  try {
    console.log(`🔍 Verifying retrieval from Filecoin...`)
    
    const response = await fetch(`https://w3s.link/ipfs/${cid}`)
    
    if (!response.ok) {
      console.error(`❌ Retrieval verification failed: ${response.status}`)
      return false
    }
    
    const data = await response.arrayBuffer()
    console.log(`✅ Retrieval verified:`, {
      cid,
      size: `${data.byteLength} bytes`,
      url: `https://w3s.link/ipfs/${cid}`,
    })
    
    return true
  } catch (error) {
    console.error(`❌ Error verifying retrieval:`, error)
    return false
  }
}

/**
 * Main function to fetch, compress, store, and verify weather data
 * @param stationId - WeatherXM station ID
 * @param apiKey - WeatherXM API key
 * @param config - Storage configuration
 * @returns Promise<FilecoinStorageResult>
 */
export async function storeWeatherData(
  stationId: string,
  apiKey: string,
  config: StorageConfig = {}
): Promise<FilecoinStorageResult> {
  try {
    console.log(`🌍 Starting weather data storage process for station: ${stationId}`)
    
    // Step 1: Fetch weather data from WeatherXM
    const weatherData = await fetchWeatherXMData(stationId, apiKey)
    if (!weatherData) {
      throw new Error('Failed to fetch weather data from WeatherXM')
    }
    
    // Step 2: Compress the data
    const compressedData = await compressWeatherData(weatherData)
    
    // Step 3: Store on Filecoin
    const cid = await storeOnFilecoin(compressedData, config)
    
    // Step 4: Verify retrieval
    const isVerified = await verifyRetrieval(cid)
    if (!isVerified) {
      console.warn(`⚠️  Retrieval verification failed for CID: ${cid}`)
    }
    
    const result: FilecoinStorageResult = {
      cid,
      size: compressedData.length,
      compressionRatio: ((JSON.stringify(weatherData).length - compressedData.length) / JSON.stringify(weatherData).length * 100),
      timestamp: new Date().toISOString(),
    }
    
    console.log(`🎉 Weather data storage complete:`, result)
    return result
    
  } catch (error) {
    console.error(`❌ Weather data storage failed:`, error)
    throw error
  }
}

/**
 * CLI interface for the script
 */
async function main() {
  const stationId = process.argv[2]
  const apiKey = process.env.WEATHERXM_API_KEY
  const email = process.env.WEB3_STORAGE_EMAIL
  
  if (!stationId) {
    console.error('❌ Please provide a WeatherXM station ID as the first argument')
    process.exit(1)
  }
  
  if (!apiKey) {
    console.error('❌ Please set WEATHERXM_API_KEY environment variable')
    process.exit(1)
  }
  
  try {
    const result = await storeWeatherData(stationId, apiKey, { email })
    console.log('\n🎯 Final Result:')
    console.log(`CID: ${result.cid}`)
    console.log(`Size: ${result.size} bytes`)
    console.log(`Compression: ${result.compressionRatio.toFixed(2)}%`)
    console.log(`Retrieval URL: https://w3s.link/ipfs/${result.cid}`)
    
    // Output CID for use in smart contracts
    console.log(`\n📋 For smart contract integration:`)
    console.log(`receive_weather("${stationId}", ${Date.now()}, "${result.cid}")`)
    
  } catch (error) {
    console.error('❌ Script execution failed:', error)
    process.exit(1)
  }
}

// Run the script if called directly
if (require.main === module) {
  main()
} 