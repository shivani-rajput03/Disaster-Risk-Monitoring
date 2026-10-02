// src/zoneWeather.js

const WEATHER_API =
  "https://api.open-meteo.com/v1/forecast";


// =====================================================
// GET WEATHER FOR 9 GIS ZONES
// =====================================================

export async function getZoneWeather(
  centerLocation,
  nearbyPlaces
) {

  // ---------------------------------------------------
  // Create the 3x3 locations
  // ---------------------------------------------------

  const zones = [

    {
      zone: "NW",
      location: nearbyPlaces.NW,
    },

    {
      zone: "N",
      location: nearbyPlaces.N,
    },

    {
      zone: "NE",
      location: nearbyPlaces.NE,
    },

    {
      zone: "W",
      location: nearbyPlaces.W,
    },

    {
      zone: "C",
      location: {
        name: centerLocation.name,
        latitude:
          centerLocation.latitude,
        longitude:
          centerLocation.longitude,
        type: "selected",
      },
    },

    {
      zone: "E",
      location: nearbyPlaces.E,
    },

    {
      zone: "SW",
      location: nearbyPlaces.SW,
    },

    {
      zone: "S",
      location: nearbyPlaces.S,
    },

    {
      zone: "SE",
      location: nearbyPlaces.SE,
    },

  ];


  // ---------------------------------------------------
  // Remove zones where no nearby place was found
  // ---------------------------------------------------

  const validZones =
    zones.filter(
      (zone) =>
        zone.location &&
        zone.location.latitude !==
          undefined &&
        zone.location.longitude !==
          undefined
    );


  if (validZones.length === 0) {
    throw new Error(
      "No valid GIS zones found."
    );
  }


  // ---------------------------------------------------
  // Prepare coordinates
  // ---------------------------------------------------

  const latitudes =
    validZones
      .map(
        (zone) =>
          zone.location.latitude
      )
      .join(",");


  const longitudes =
    validZones
      .map(
        (zone) =>
          zone.location.longitude
      )
      .join(",");


  // ---------------------------------------------------
  // One Open-Meteo request for all zones
  // ---------------------------------------------------

  const url =
    `${WEATHER_API}?` +
    `latitude=${latitudes}` +
    `&longitude=${longitudes}` +
    `&current=` +
    `temperature_2m,` +
    `relative_humidity_2m,` +
    `precipitation,` +
    `rain,` +
    `wind_speed_10m` +
    `&hourly=` +
    `precipitation_probability,` +
    `rain,` +
    `wind_speed_10m` +
    `&forecast_days=1`;


  console.log(
    "Fetching weather for GIS zones..."
  );


  const response =
    await fetch(url);


  if (!response.ok) {
    throw new Error(
      "Unable to retrieve weather for GIS zones."
    );
  }


  const weatherData =
    await response.json();


  // ---------------------------------------------------
  // Open-Meteo returns an array for multiple locations
  // ---------------------------------------------------

  const weatherArray =
    Array.isArray(weatherData)
      ? weatherData
      : [weatherData];


  // ---------------------------------------------------
  // Combine location + weather
  // ---------------------------------------------------

  const zoneResults =
    validZones.map(
      (zone, index) => {

        const weather =
          weatherArray[index];


        return {

          zone:
            zone.zone,

          location:
            zone.location,

          weather,

        };

      }
    );


  console.log(
    "GIS zone weather:",
    zoneResults
  );


  return zoneResults;
}