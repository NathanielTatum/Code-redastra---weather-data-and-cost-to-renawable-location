let allEntities = [];  // stores all daily markers
let activeEntityIndex = 0;
let nasaData = null; // Store the full parameter object globally


async function plotAllNASAData(viewer, lon, lat, monthsBack) {
  function getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }

  function getStartDateMonthsAgo(monthsAgo) {
    const now = new Date();
    const past = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate());
    return `${past.getFullYear()}${String(past.getMonth() + 1).padStart(2, '0')}${String(past.getDate()).padStart(2, '0')}`;
  }

  const startDate = getStartDateMonthsAgo(monthsBack);
  const endDate = getTodayDate();

  const baseUrl = 'https://power.larc.nasa.gov/api/temporal/daily/point';
  const params = new URLSearchParams({
    parameters: 'T2M,T2M_MAX,T2M_MIN,WS50M,WS50M_MAX,WS50M_MIN',
    community: 'RE',
    latitude: lat,
    longitude: lon,
    start: startDate,
    end: endDate,
    format: 'JSON'
  });

  const url = `${baseUrl}?${params.toString()}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const p = data.properties.parameter;

    // Clear any previous entities
    allEntities.forEach(e => viewer.entities.remove(e));
    allEntities = [];

    const dates = Object.keys(p.T2M);

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        point: {
          pixelSize: 10,
          color: Cesium.Color.YELLOW,
        },
        show: i === 0, // Only show the first one
        description: `
          <strong>NASA Data (${date})</strong><br/>
          🌡 Temp: ${p.T2M[date]} °C (Min: ${p.T2M_MIN[date]}, Max: ${p.T2M_MAX[date]})<br/>
          💨 Wind @50m: ${p.WS50M[date]} m/s (Min: ${p.WS50M_MIN[date]}, Max: ${p.WS50M_MAX[date]})
        `
      });

      allEntities.push(entity);
    }

    // Fly to the first marker
    viewer.flyTo(allEntities[0]);

    function showDay(index, variable = "T2M") {
  if (!allEntities[index] || !nasaData || !nasaData[variable]) {
    console.warn("Invalid index or variable");
    return;
  }

  allEntities.forEach((entity, i) => {
    entity.show = i === index;
  });

  const date = Object.keys(nasaData[variable])[index];

  let label = {
    T2M: "Avg Temp (°C)",
    T2M_MAX: "Max Temp (°C)",
    T2M_MIN: "Min Temp (°C)",
    WS50M: "Wind Speed @50m (m/s)",
    WS50M_MAX: "Max Wind @50m (m/s)",
    WS50M_MIN: "Min Wind @50m (m/s)"
  }[variable] || variable;

  const value = nasaData[variable][date];

  allEntities[index].description = `
    <strong>${label}</strong><br/>
    Date: ${date}<br/>
    Value: ${value}
  `;

  activeEntityIndex = index;
}
async function playDays(variable, delayMs = 2000) {
  if (!nasaData || !allEntities.length) {
    console.warn("No data or entities loaded");
    return;
  }

  const totalDays = allEntities.length;

  for (let i = 0; i < totalDays; i++) {
    showDay(i, variable);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
playDays("T2M",1000)
  } catch (err) {
    console.error('Error fetching or plotting:', err);
  }
}
