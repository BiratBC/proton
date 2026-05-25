const OPENWEATHER_API_BASE = "https://api.openweathermap.org/data/2.5";
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY?.trim();

const DEFAULT_OPENWEATHER_POINTS = [
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
];

const fallbackDeviceLocationsData = DEFAULT_OPENWEATHER_POINTS.map((point, index) => ({
  id: point.id,
  lat: point.lat,
  lng: point.lng,
  pm25: [14.2, 85.6, 120.4, 22.1, 95.3, 45.8, 12.5, 145.2, 62.1, 31.4][index] ?? 30,
  co2: [410, 780, 1150, 435, 890, 560, 395, 1320, 680, 485][index] ?? 500,
  co: [0.6, 1.2, 1.8, 0.7, 1.4, 0.9, 0.5, 2.1, 1.0, 0.8][index] ?? 0.8,
  locationName: `OpenWeather Fallback ${index + 1} (${point.lat.toFixed(3)}, ${point.lng.toFixed(3)})`,
}));

function buildWeatherUrl(lat, lng) {
  return `${OPENWEATHER_API_BASE}/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
}

function buildAirPollutionUrl(lat, lng) {
  return `${OPENWEATHER_API_BASE}/air_pollution?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}`;
}

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

  const results = await Promise.allSettled(
    DEFAULT_OPENWEATHER_POINTS.map(async (point, index) => {
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
    }),
  );

  const validResults = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (validResults.length === 0) {
    console.warn("OpenWeather fetch failed for all points. Falling back to static heatmap points.");
    return fallbackDeviceLocationsData;
  }

  return validResults;
}

export const deviceLocationsData = fallbackDeviceLocationsData;
