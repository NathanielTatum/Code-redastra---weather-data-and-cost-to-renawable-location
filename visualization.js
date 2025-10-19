
// All DOM interactions run after DOMContentLoaded to avoid undefined elements
document.addEventListener('DOMContentLoaded', function () {
    let isWind = false;
    let isSolar = false;

    // Helper to find elements by id or name
    const getEl = (idOrName) => document.getElementById(idOrName) || document.getElementsByName(idOrName)[0] || null;

    // Chart access (if Chart.js or similar attaches chart instance to element)
    const chartElement = getEl('myChart'); // Replace 'myChart' with your actual chart ID if different
    if (chartElement && chartElement.chart && chartElement.chart.data) {
        const chartData = chartElement.chart.data;
        const labels = chartData.labels;
        const datasets = chartData.datasets || [];
        const values = datasets[0] ? datasets[0].data : [];
        console.log('Labels:', labels);
        console.log('Values:', values);
    }

    // Find form inputs (safe-guarded)
    const maxWind = getEl('maxWind');
    const minWind = getEl('minWind');
    const preferredWind = getEl('preferredWind');
    const maxSolar = getEl('maxSolar');
    const minSolar = getEl('minSolar');
    const preferredSolar = getEl('preferredSolar');
    const longitude = getEl('Longitude');
    const latitude = getEl('Latitude');
    
    const MaxWind = maxWind ? maxWind.value : 1000000;
    const MinWind = minWind ? minWind.value : 0;
    const PreferredWind = preferredWind ? preferredWind.value : null;
    const MaxSolar = maxSolar ? maxSolar.value : 100000;
    const MinSolar = minSolar ? minSolar.value : 0;
    const PreferredSolar = preferredSolar ? preferredSolar.value : null;
    const Longitude = longitude ? longitude.value : null;
    const Latitude = latitude ? latitude.value : null;

    // Update visualization using current input values (guarding missing elements)
    const updateVisualization = () => {
        const MaxWind = maxWind ? maxWind.value : 1000000;
        const MinWind = minWind ? minWind.value : 0;
        const PreferredWind = preferredWind ? preferredWind.value : null;
        const MaxSolar = maxSolar ? maxSolar.value : 100000;
        const MinSolar = minSolar ? minSolar.value : 0;
        const PreferredSolar = preferredSolar ? preferredSolar.value : null;
        const Longitude = longitude ? longitude.value : null;
        const Latitude = latitude ? latitude.value : null;
        console.log('MaxWind:', MaxWind);
        console.log('MinWind:', MinWind);
        console.log('PreferredWind:', PreferredWind);
        console.log('MaxSolar:', MaxSolar);
        console.log('MinSolar:', MinSolar);
        console.log('PreferredSolar:', PreferredSolar);
        console.log('Longitude:', Longitude);
        console.log('Latitude:', Latitude);
    };

    // Update input visibility depending on sun/wind choice
    const updateInputValue = () => {
        const sunOrWind = getEl('sunOrWind');
        const solar = getEl('solar');
        const wind = getEl('wind');
        if (!sunOrWind) return; // nothing to do if selector missing

        const selectedOption = sunOrWind.value;
        if (selectedOption === 'Solar panels') {
            if (solar) solar.style.display = 'block';
            if (wind) wind.style.display = 'none';
            isSolar = true;
            isWind = false;
        } else {
            if (solar) solar.style.display = 'none';
            if (wind) wind.style.display = 'block';
            isWind = true;
            isSolar = false;
        }
    };

    // Attach listeners only when elements exist
    if (maxWind) maxWind.addEventListener('change', updateVisualization);
    if (minWind) minWind.addEventListener('change', updateVisualization);
    if (preferredWind) preferredWind.addEventListener('change', updateVisualization);
    if (maxSolar) maxSolar.addEventListener('change', updateVisualization);
    if (minSolar) minSolar.addEventListener('change', updateVisualization);
    if (preferredSolar) preferredSolar.addEventListener('change', updateVisualization);
    if (longitude) longitude.addEventListener('change', updateVisualization);
    if (latitude) latitude.addEventListener('change', updateVisualization);

    // Also attach listener for selector change (sun/wind) if present
    const sunOrWindSelector = getEl('sunOrWind');
    if (sunOrWindSelector) sunOrWindSelector.addEventListener('change', updateInputValue);

    // Initial run
    updateInputValue();
    updateVisualization();

    const sendData = () => {

        const iframe = document.getElementById('frame');

        // Data you want to send
        if(isSolar){
        const data = {
            type: 'temps',
            payload: {
                longitude: Longitude,
                latitude: Latitude,
                maxTemperature: MaxSolar,
                prefTemperature: PreferredSolar,
                minTemperature: MinSolar
            }
     };
    iframe.contentWindow.postMessage(data, '*')
    }else{
        
        const data = {
            type: 'winds',
            payload: {
                longitude: Longitude,
                latitude: Latitude,
                maxTemperature: MaxWind,
                prefTemperature: preferredWind,
                minTemperature: MinWind
            }
     };
    iframe.contentWindow.postMessage(data, '*')
    }
    
    const mapChange = () => {

        const iframe = document.getElementById('botFrame');

        // Data you want to send
        if(isSolar){
        const data = {
            type: 'temps',
            payload: {
                longitude: Longitude,
                latitude: Latitude,
                maxTemperature: MaxSolar,
                prefTemperature: PreferredSolar,
                minTemperature: MinSolar
            }
     };
    iframe.contentWindow.postMessage(data, '*')
    }else{
        
        const data = {
            type: 'winds',
            payload: {
                longitude: Longitude,
                latitude: Latitude,
                maxTemperature: MaxWind,
                prefTemperature: preferredWind,
                minTemperature: MinWind
            }
     };
    iframe.contentWindow.postMessage(data, '*')
    }
}
});

