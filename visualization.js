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
sunOrWind.addEventListener("click",function(){
    const selectedOption = sunOrWind.value;
    if (selectedOption === "Solar panels") {
        solar.style.display = "block";
        wind.style.display = "none";
    } else {
        solar.style.display = "none";
        wind.style.display = "block";
    }
})