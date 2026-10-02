AEGIS GIS update

Replace ONLY these files in your existing project:

src/components/RiskMap.jsx
src/pages/RiskMonitoring.jsx
src/App.css

No changes are required to App.jsx, nearbyPlaces.js, or zoneWeather.js.

What this update does:
- Displays the existing real GIS zoneResults on the Leaflet map.
- Shows NW, N, NE, W, C, E, SW, S, SE markers.
- Uses each zone's calculated risk level for marker color.
- Adds popup details for each real nearby location.
- Adds a 3x3 zone summary below the map.
- Keeps the main selected-location risk working if GIS lookup fails.
