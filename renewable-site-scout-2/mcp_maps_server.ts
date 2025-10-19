/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This file provides a utility function to fetch and process data from the
 * NASA POWER API. It constructs the API request, retrieves the data, and
 * transforms it into a more usable format, including calculating summary
 * statistics for key metrics like solar irradiance, wind speed, and temperature.
 */

export interface NasaPowerData {
  meta: {
    lat: number;
    lon: number;
    start: string;
    end:string;
    parameters: string[];
  };
  daily: Record<string, Record<string, number>>;
  stats: {
    ghi?: { avg: number };
    wind?: { avg: number };
    temp?: { avg: number; min: number; max: number };
    precip?: { avg: number };
  };
}

interface FetchNasaPowerDataParams {
    latitude: number;
    longitude: number;
    start: string;
    end: string;
}

export async function fetchNasaPowerData(
  params: FetchNasaPowerDataParams,
): Promise<NasaPowerData> {
  const { latitude, longitude, start, end } = params;
  const parameters = ['ALLSKY_SFC_SW_DWN', 'WS10M', 'T2M', 'T2M_MIN', 'T2M_MAX', 'PRECTOTCORR'];
  const baseUrl = 'https://power.larc.nasa.gov/api/temporal/daily/point';
  
  const query = new URLSearchParams({
    parameters: parameters.join(','),
    community: 'RE',
    longitude: longitude.toString(),
    latitude: latitude.toString(),
    start: start,
    end: end,
    format: 'JSON',
  });

  const url = `${baseUrl}?${query.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NASA POWER API request failed with status ${response.status}`);
  }

  const data = await response.json();

  // Process data and calculate stats
  const properties = data.properties.parameter;
  const stats: NasaPowerData['stats'] = {};
  
  const ghiValues = Object.values(properties.ALLSKY_SFC_SW_DWN || {}) as number[];
  if (ghiValues.length > 0 && ghiValues[0] > -999) {
    const sum = ghiValues.reduce((a, b) => a + b, 0);
    stats.ghi = { avg: sum / ghiValues.length };
  }
  
  const windValues = Object.values(properties.WS10M || {}) as number[];
  if (windValues.length > 0 && windValues[0] > -999) {
    const sum = windValues.reduce((a, b) => a + b, 0);
    stats.wind = { avg: sum / windValues.length };
  }
  
  const tempValues = Object.values(properties.T2M || {}) as number[];
  const tempMinValues = Object.values(properties.T2M_MIN || {}) as number[];
  const tempMaxValues = Object.values(properties.T2M_MAX || {}) as number[];

  if (tempValues.length > 0 && tempValues[0] > -999) {
    const sum = tempValues.reduce((a, b) => a + b, 0);
    stats.temp = {
      avg: sum / tempValues.length,
      min: Math.min(...tempMinValues),
      max: Math.max(...tempMaxValues),
    };
  }

  const precipValues = Object.values(properties.PRECTOTCORR || {}) as number[];
  if (precipValues.length > 0 && precipValues[0] > -999) {
    const sum = precipValues.reduce((a, b) => a + b, 0);
    stats.precip = { avg: sum / precipValues.length };
  }

  return {
    meta: { lat: latitude, lon: longitude, start, end, parameters },
    daily: properties,
    stats: stats,
  };
}