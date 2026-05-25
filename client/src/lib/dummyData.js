const OPENWEATHER_API_BASE = "https://api.openweathermap.org/data/2.5";
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY?.trim();

// Expanded to 30 points with better geographic spread across the Bhaktapur/Kathmandu valley region
const DEFAULT_OPENWEATHER_POINTS = [
  // Original core cluster
  { id: "ow-01", lat: 27.6194, lng: 85.5385 },
  { id: "ow-02", lat: 27.6210, lng: 85.5412 },
  { id: "ow-03", lat: 27.6172, lng: 85.5350 },
  { id: "ow-04", lat: 27.6235, lng: 85.5391 },
  { id: "ow-05", lat: 27.6150, lng: 85.5321 },
  { id: "ow-06", lat: 27.6181, lng: 85.5445 },
  { id: "ow-07", lat: 27.6251, lng: 85.5362 },
  { id: "ow-08", lat: 27.6122, lng: 85.5378 },
  { id: "ow-09", lat: 27.6205, lng: 85.5310 },
  { id: "ow-10", lat: 27.6163, lng: 85.5402 },

  // Northern expansion — toward Nagarkot foothills
  { id: "ow-11", lat: 27.6310, lng: 85.5280 },
  { id: "ow-12", lat: 27.6350, lng: 85.5430 },
  { id: "ow-13", lat: 27.6290, lng: 85.5490 },
  { id: "ow-14", lat: 27.6380, lng: 85.5355 },
  { id: "ow-15", lat: 27.6330, lng: 85.5510 },

  // Southern expansion — toward Thimi and Madhyapur corridor
  { id: "ow-16", lat: 27.6080, lng: 85.5300 },
  { id: "ow-17", lat: 27.6050, lng: 85.5450 },
  { id: "ow-18", lat: 27.6100, lng: 85.5500 },
  { id: "ow-19", lat: 27.6030, lng: 85.5375 },
  { id: "ow-20", lat: 27.6070, lng: 85.5240 },

  // Eastern expansion — toward Sanga and outer ring
  { id: "ow-21", lat: 27.6195, lng: 85.5550 },
  { id: "ow-22", lat: 27.6240, lng: 85.5600 },
  { id: "ow-23", lat: 27.6140, lng: 85.5580 },
  { id: "ow-24", lat: 27.6170, lng: 85.5640 },
  { id: "ow-25", lat: 27.6280, lng: 85.5560 },

  // Western expansion — toward Koteshwor and Kathmandu boundary
  { id: "ow-26", lat: 27.6200, lng: 85.5220 },
  { id: "ow-27", lat: 27.6150, lng: 85.5180 },
  { id: "ow-28", lat: 27.6260, lng: 85.5200 },
  { id: "ow-29", lat: 27.6090, lng: 85.5160 },
  { id: "ow-30", lat: 27.6320, lng: 85.5150 },
];

// Realistic AQI-varied fallback values for all 30 points
// PM2.5 ranges reflect typical Kathmandu valley pollution gradients
const FALLBACK_PM25  = [14.2, 85.6, 120.4, 22.1, 95.3, 45.8, 12.5, 145.2, 62.1, 31.4, 18.3, 76.4, 110.2, 28.5, 88.7, 52.3, 134.6, 41.9, 99.8, 23.7, 67.5, 155.1, 35.2, 48.6, 82.4, 19.8, 108.3, 73.1, 126.5, 57.9];
const FALLBACK_CO2   = [410, 780, 1150, 435, 890, 560, 395, 1320, 680, 485, 420, 810, 1050, 445, 920, 590, 1280, 470, 980, 415, 730, 1380, 510, 625, 870, 430, 1100, 795, 1220, 665];
const FALLBACK_CO    = [0.6, 1.2, 1.8, 0.7, 1.4, 0.9, 0.5, 2.1, 1.0, 0.8, 0.55, 1.3, 1.65, 0.65, 1.45, 0.95, 2.0, 0.75, 1.55, 0.6, 1.1, 2.3, 0.85, 0.98, 1.35, 0.62, 1.72, 1.25, 1.92, 1.05];

const fallbackDeviceLocationsData = DEFAULT_OPENWEATHER_POINTS.map((point, index) => ({
  id: point.id,
  lat: point.lat,
  lng: point.lng,
  pm25: FALLBACK_PM25[index] ?? 30,
  co2: FALLBACK_CO2[index] ?? 500,
  co: FALLBACK_CO[index] ?? 0.8,
  locationName: `OpenWeather Fallback ${index + 1} (${point.lat.toFixed(3)}, ${point.lng.toFixed(3)})`,
}));

function buildWeatherUrl(lat, lng) {
  return `${OPENWEATHER_API_BASE}/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
}

function buildAirPollutionUrl(lat, lng) {
  return `${OPENWEATHER_API_BASE}/air_pollution?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}`;
}

// Concurrent batch fetcher with configurable batch size to avoid rate limits
// OpenWeather free tier allows 60 calls/min — 30 points × 2 calls = 60, right at the edge
// Batching into groups of 10 (20 calls/batch) with a small inter-batch delay is safer
async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`OpenWeather request failed: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchPointData(point, index) {
  const [weatherData, pollutionData] = await Promise.allSettled([
    fetchWithTimeout(buildWeatherUrl(point.lat, point.lng)),
    fetchWithTimeout(buildAirPollutionUrl(point.lat, point.lng)),
  ]);

  const weather = weatherData.status === "fulfilled" ? weatherData.value : null;
  const air = pollutionData.status === "fulfilled" ? pollutionData.value : null;
  const components = air?.list?.[0]?.components ?? {};

  const pm25 = Number.isFinite(Number(components.pm2_5)) ? Number(components.pm2_5) : 0;
  const co = Number.isFinite(Number(components.co)) ? Number(components.co) : 0;

  return {
    id: point.id,
    lat: point.lat,
    lng: point.lng,
    pm25,
    co,
    co2: estimateCo2(co),
    locationName: buildLocationName(weather, point, index),
  };
}

// Splits array into chunks of `size` and fetches each chunk sequentially
// with a configurable delay between batches to avoid hitting rate limits
async function fetchInBatches(points, batchSize = 10, delayMs = 1200) {
  const results = [];

  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map((point, batchIndex) => fetchPointData(point, i + batchIndex))
    );

    results.push(...batchResults);

    // Don't delay after the last batch
    const isLastBatch = i + batchSize >= points.length;
    if (!isLastBatch) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

function buildLocationName(weatherData, point, index) {
  const lat = Number(point.lat).toFixed(3);
  const lng = Number(point.lng).toFixed(3);
  const suffix = ` (${lat}, ${lng})`;

  if (!weatherData) {
    return `OpenWeather Point ${index + 1}${suffix}`;
  }

  const cityName = weatherData.name?.trim();
  const country = weatherData.sys?.country?.trim();

  if (cityName && country) {
    return `${cityName}, ${country}${suffix}`;
  }

  return `${cityName || `OpenWeather Point ${index + 1}`}${suffix}`;
}

function estimateCo2(coValue) {
  if (!Number.isFinite(coValue)) {
    return 400;
  }

  return Math.min(1500, Math.max(400, coValue * 1.2));
}

export async function fetchDeviceLocationsData() {
  if (!OPENWEATHER_API_KEY) {
    console.warn("Missing VITE_OPENWEATHER_API_KEY. Falling back to static heatmap points.");
    return fallbackDeviceLocationsData;
  }

  const results = await fetchInBatches(DEFAULT_OPENWEATHER_POINTS, 10, 1200);

  const validResults = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (validResults.length === 0) {
    console.warn("OpenWeather fetch failed for all points. Falling back to static heatmap points.");
    return fallbackDeviceLocationsData;
  }

  // Partial fallback: fill in any failed points with their static counterparts
  // so the heatmap always has complete coverage
  if (validResults.length < DEFAULT_OPENWEATHER_POINTS.length) {
    const fetchedIds = new Set(validResults.map((r) => r.id));
    const missingFallbacks = fallbackDeviceLocationsData.filter((f) => !fetchedIds.has(f.id));

    console.warn(`${missingFallbacks.length} point(s) failed — filling with fallback data.`);
    return [...validResults, ...missingFallbacks];
  }

  return validResults;
}

export const deviceLocationsData = fallbackDeviceLocationsData;