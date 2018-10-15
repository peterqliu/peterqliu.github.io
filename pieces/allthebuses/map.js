mapboxgl.accessToken = 'pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImpvZmV0UEEifQ._D4bRmVcGfJvo1wjuOpA1g';

var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/peterqliu/cigcm7rg000079ilysislkqxv', //stylesheet location
    center: s.center, // starting position
    minZoom: 12,
    zoom: 13 // starting zoom
});