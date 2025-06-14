// GAR Weather Service - Clean implementation for GAR assessments
import { 
  doc, 
  setDoc, 
  getDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  createPSTTimestamp
} from '../utils/timezone';

// Configuration
const STORMGLASS_API_BASE = 'https://api.stormglass.io/v2';
const STORMGLASS_API_KEY = process.env.REACT_APP_STORMGLASS_API_KEY;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Firebase collection for caching
const WEATHER_COLLECTION = 'weather_data';
const GAR_WEATHER_DOC = 'gar_weather_cache';

// GAR Assessment coordinates
const GAR_COORDINATES = {
  lat: 37.80999,
  lng: -122.47514
};

// Check if cached data is still fresh (using PST time)
const isCacheValid = (timestamp) => {
  if (!timestamp) return false;
  
  // Use UTC time for consistent cache validation regardless of user's timezone
  const now = new Date();
  const cacheTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  const timeDifferenceMs = now.getTime() - cacheTime.getTime();
  const timeDifferenceMinutes = Math.round(timeDifferenceMs / 60000);
  const isValid = timeDifferenceMs < CACHE_DURATION;
  
  console.log('🕐 Cache validation:', {
    now: now.toISOString(),
    cacheTime: cacheTime.toISOString(),
    timeDifferenceMinutes,
    isValid
  });
  
  return isValid;
};

// Mock weather data for development/CORS fallback
const getMockWeatherData = () => {
  console.log('🎭 Using mock weather data for GAR assessment');
  return {
    temperature: '60',
    temperatureUnit: '°F',
    wind: '8',
    windDirection: 'W',
    humidity: '65',
    precipitation: '0.00',
    precipitationRate: '0.00',
    waveHeight: '3.9',
    wavePeriod: '8',
    waveDirection: 'NW',
    alerts: ''
  };
};

// Fetch all weather and marine data in one call from Stormglass API
const fetchAllWeatherData = async () => {
  // Combine all weather and marine parameters
  const params = 'airTemperature,humidity,windSpeed,windDirection,precipitation,waveHeight,wavePeriod,waveDirection';
  const now = new Date().toISOString();
  const url = `${STORMGLASS_API_BASE}/weather/point?lat=${GAR_COORDINATES.lat}&lng=${GAR_COORDINATES.lng}&params=${params}&start=${now}&end=${now}`;
  
  console.log('🌤️ Fetching all weather data from:', url);
  
  const response = await fetch(url, {
    headers: { 
      'Authorization': STORMGLASS_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Weather API Error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log('🌤️ Complete weather API response:', JSON.stringify(data, null, 2));
  
  if (data.hours && data.hours.length > 0) {
    console.log('✅ Weather data found:', data.hours[0]);
    return data.hours[0];
  }
  
  console.warn('⚠️ No hours data in weather response. Full response:', data);
  throw new Error('No weather data in response');
};

// Get the first available value from weather data sources
const getFirstValue = (dataObj) => {
  if (!dataObj || typeof dataObj !== 'object') return null;
  
  // Priority order for data sources (NOAA first for US locations)
  const sources = ['noaa', 'ecmwf', 'sg', 'icon', 'dwd', 'meteo'];
  
  for (const source of sources) {
    if (dataObj[source] !== undefined && dataObj[source] !== null) {
      return dataObj[source];
    }
  }
  
  return null;
};

// Convert Celsius to Fahrenheit
const celsiusToFahrenheit = (celsius) => {
  return Math.round((celsius * 9/5) + 32);
};

// Convert m/s to mph
const msToMph = (ms) => {
  return Math.round(ms * 2.237);
};

// Convert meters to feet
const metersToFeet = (meters) => {
  return Math.round(meters * 3.28084 * 10) / 10;
};

// Convert degrees to cardinal direction (16-point compass for marine/government accuracy)
const degreesToCardinal = (degrees) => {
  // Full 16-point compass for accurate marine weather reporting
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

// Create formatted PST timestamp
const createFormattedPSTTimestamp = () => {
  const now = new Date();
  return now.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    year: 'numeric', 
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) + ' PST';
};

// Format combined weather and marine data for GAR form
const formatGARWeatherData = (weatherData, marineData) => {
  console.log('🔧 Formatting weather data:', { weatherData, marineData });
  
  try {
    // Since we're now getting all data in one call, both objects are the same
    const data = weatherData || marineData;
    
    if (!data) {
      console.warn('⚠️ No data to format');
      return null;
    }
    
    // Extract weather values
    const temperature = getFirstValue(data.airTemperature);
    const humidity = getFirstValue(data.humidity);
    const windSpeed = getFirstValue(data.windSpeed);
    const windDirection = getFirstValue(data.windDirection);
    const precipitation = getFirstValue(data.precipitation);
    
    // Extract marine values
    const waveHeight = getFirstValue(data.waveHeight);
    const wavePeriod = getFirstValue(data.wavePeriod);
    const waveDirection = getFirstValue(data.waveDirection);
    
    console.log('🔍 Extracted values:', {
      temperature,
      humidity,
      windSpeed,
      windDirection,
      precipitation,
      waveHeight,
      wavePeriod,
      waveDirection
    });
    
    // Format wind speed and direction separately for GAR form
    const windSpeedMph = windSpeed !== null ? msToMph(windSpeed) : null;
    const windDirectionStr = windDirection !== null ? degreesToCardinal(windDirection) : null;
    
    // Determine primary data source based on what was used
    const getDataSource = () => {
      const sources = [];
      if (temperature !== null) {
        if (data.airTemperature?.noaa !== undefined) sources.push('NOAA');
        else if (data.airTemperature?.ecmwf !== undefined) sources.push('ECMWF');
        else if (data.airTemperature?.sg !== undefined) sources.push('StormGlass');
      }
      return sources.length > 0 ? sources[0] : 'StormGlass';
    };
    
    const dataSource = getDataSource();
    const lastUpdatedPST = createFormattedPSTTimestamp();
    
    const formatted = {
      temperature: temperature !== null ? celsiusToFahrenheit(temperature).toString() : '',
      temperatureUnit: '°F',
      wind: windSpeedMph !== null ? windSpeedMph.toString() : '',
      windDirection: windDirectionStr || 'NW',
      humidity: humidity !== null ? Math.round(humidity).toString() : '',
      precipitation: precipitation !== null ? (precipitation * 0.0393701).toFixed(2) : '0.00', // mm/h to in/h
      precipitationRate: precipitation !== null ? (precipitation * 0.0393701).toFixed(2) : '0.00',
      waveHeight: waveHeight !== null ? metersToFeet(waveHeight).toString() : '',
      wavePeriod: wavePeriod !== null ? Math.round(wavePeriod).toString() : '',
      waveDirection: waveDirection !== null ? degreesToCardinal(waveDirection) : 'N',
      alerts: '',
      // Weather data source info (separate from alerts)
      weatherDataSource: dataSource,
      lastUpdatedPST: lastUpdatedPST,
      apiSource: 'StormGlass API'
    };
    
    console.log('✅ Formatted GAR weather data:', formatted);
    return formatted;
  } catch (error) {
    console.error('❌ Error formatting weather data:', error);
    return null;
  }
};

// Main function to get GAR weather data
export const getGARWeatherData = async (forceRefresh = false) => {
  console.log('🚀 Starting GAR weather data fetch... Force refresh:', forceRefresh);
  
  try {
    // Always check cache first (unless force refresh)
    const cacheRef = doc(db, WEATHER_COLLECTION, GAR_WEATHER_DOC);
    const cacheDoc = await getDoc(cacheRef);
    
    if (!forceRefresh && cacheDoc.exists()) {
      const cacheData = cacheDoc.data();
      
      if (isCacheValid(cacheData.timestamp)) {
        console.log('✅ Using cached weather data from:', cacheData.lastUpdatedPST || 'Unknown time');
        
        // Always return cached data if it's valid
        if (cacheData.weatherData && cacheData.lastUpdatedPST) {
          const updatedWeatherData = {
            ...cacheData.weatherData,
            alerts: cacheData.weatherData.alerts || '',
            weatherDataSource: cacheData.weatherData.weatherDataSource || 'NOAA',
            lastUpdatedPST: `${cacheData.lastUpdatedPST} (Cached)`,
            apiSource: 'StormGlass API'
          };
          return updatedWeatherData;
        }
        return cacheData.weatherData;
      } else {
        console.log('🔄 Cache expired (>1 hour old), fetching fresh data');
      }
    } else if (!forceRefresh) {
      console.log('📭 No cached data found, fetching fresh data');
    }
    
    // Only fetch fresh data if cache is invalid or force refresh
    console.log('📡 Fetching fresh weather from API...');
    
    try {
      // Fetch all data in one call
      const allData = await fetchAllWeatherData();
      
      if (allData) {
        const formattedData = formatGARWeatherData(allData, allData);
        
        if (formattedData) {
          // Create PST timestamp for caching
          const cacheTimestamp = createFormattedPSTTimestamp();
          
          // Cache the formatted data
          const pstTimestamp = createPSTTimestamp();
          await setDoc(cacheRef, {
            weatherData: formattedData,
            timestamp: pstTimestamp,
            lastUpdatedPST: cacheTimestamp,
            rawData: allData,
            dataSource: 'StormGlass API'
          });
          
          console.log('💾 Fresh weather data cached at:', cacheTimestamp);
          return formattedData;
        }
      }
    } catch (error) {
      console.warn('⚠️ Weather API failed:', error.message);
      
      // If API fails, try to use cached data even if stale
      if (cacheDoc.exists()) {
        console.log('📦 API failed, using stale cached data as fallback');
        const cacheData = cacheDoc.data();
        if (cacheData.weatherData) {
          const staleData = {
            ...cacheData.weatherData,
            lastUpdatedPST: `${cacheData.lastUpdatedPST || 'Unknown'} (Stale)`
          };
          return staleData;
        }
      }
    }
    
    // If everything fails, return null
    console.warn('⚠️ No weather data available');
    return null;
    
  } catch (error) {
    console.error('❌ Error in getGARWeatherData:', error);
    return null;
  }
};

// Force refresh weather data (bypasses cache)
export const refreshGARWeatherData = async () => {
  console.log('🔄 Force refreshing GAR weather data...');
  
  try {
    // Force refresh by passing true parameter
    return await getGARWeatherData(true);
  } catch (error) {
    console.error('❌ Error refreshing weather data:', error);
    
    // For manual refresh, provide mock data as emergency fallback
    console.log('🎭 Using mock data as emergency fallback for manual refresh');
    return getMockWeatherData();
  }
};