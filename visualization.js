
isWind = false;
isSolar = false;


wind.style.display = "none"
solar.style.display = "none"


// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the chart element
    const chartElement = document.getElementById('myChart'); // Replace 'myChart' with your actual chart ID

    // Check if the chart exists and has data
    if (chartElement && chartElement.chart) {
        // Get the chart data
        const chartData = chartElement.chart.data;

        // Set variables from chart data
        const labels = chartData.labels;
        const datasets = chartData.datasets;

        // Example: getting values from the first dataset
        const firstDataset = datasets[0];
        const values = firstDataset.data;

        // You can now use these variables as needed
        console.log('Labels:', labels);
        console.log('Values:', values);
    }
});
maxWind = document.getElementsByName("maxWind")[0];
minWind = document.getElementsByName("minWind")[0];
preferredWind = document.getElementsByName("preferredWind")[0];
maxSolar = document.getElementsByName("maxSolar")[0];
minSolar = document.getElementsByName("minSolar")[0];
longitude = document.getElementsByName("Longitude")[0];
latitude = document.getElementsByName("Latitude")[0];
preferredSolar = document.getElementsByName("preferredSolar")[0];
maxWind.addEventListener("change",function(){
    // Update the chart or map based on the new input values
    updateVisualization();
});

minWind.addEventListener("change",function(){
    // Update the chart or map based on the new input values
    updateVisualization();
});

preferredWind.addEventListener("change",function(){
    // Update the chart or map based on the new input values
    updateVisualization();
});

maxSolar.addEventListener("change",function(){
    // Update the chart or map based on the new input values
    updateVisualization();
});

minSolar.addEventListener("change",function(){
    // Update the chart or map based on the new input values
    updateVisualization();
});

preferredSolar.addEventListener("change",function(){
    // Update the chart or map based on the new input values
    updateVisualization();
});
longitude.addEventListener("change",function(){
    // Update the chart or map based on the new input values
    updateVisualization();
});
latitude.addEventListener("change",function(){
    // Update the chart or map based on the new input values
    updateVisualization();
});


updateVisualization = (() =>{
    MaxWind = maxWind.value;
    MinWind = minWind.value;
    PreferredWind = preferredWind.value;
    MaxSolar = maxSolar.value;
    MinSolar = minSolar.value;
    PreferredSolar = preferredSolar.value;
})

updateInputValue = (() =>{
    const selectedOption = sunOrWind.value;
    if (selectedOption == "Solar panels") {
        solar.style.display = "block";
        wind.style.display = "none";
        isSolar = true;
        isWind = false;
    } else {
        solar.style.display = "none";
        wind.style.display = "block";
        isWind = true;
        isSolar = false;
    }
})