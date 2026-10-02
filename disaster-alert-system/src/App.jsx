import { useState } from "react";
import "./App.css";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import RiskMonitoring from "./pages/RiskMonitoring";
import Alerts from "./pages/Alerts";
import Safety from "./pages/Safety";

import { findNearbyPlaces } from "./nearbyPlaces";
import { getZoneWeather } from "./zoneWeather";


// =====================================================
// FLOOD RISK CALCULATION
// =====================================================

function calculateFloodRisk(weatherData) {

  if (
    !weatherData ||
    !weatherData.hourly
  ) {
    return {
      level: "LOW",
      score: 0,
      message:
        "Insufficient weather data available.",
      totalRainfall: 0,
      maxHourlyRainfall: 0,
      maxRainProbability: 0,
      precautions: [],
    };
  }


  const rainfall =
    weatherData.hourly.rain || [];


  const rainProbability =
    weatherData.hourly
      .precipitation_probability || [];


  const totalRainfall =
    rainfall.reduce(
      (sum, value) =>
        sum + (Number(value) || 0),
      0
    );


  const maxHourlyRainfall =
    rainfall.length > 0
      ? Math.max(
          ...rainfall.map(
            (value) =>
              Number(value) || 0
          )
        )
      : 0;


  const maxRainProbability =
    rainProbability.length > 0
      ? Math.max(
          ...rainProbability.map(
            (value) =>
              Number(value) || 0
          )
        )
      : 0;


  const currentHumidity =
    weatherData.current
      ?.relative_humidity_2m || 0;


  // ===================================================
  // RISK SCORE
  // ===================================================

  let score = 0;


  // Total rainfall

  if (totalRainfall >= 100) {

    score += 4;

  } else if (totalRainfall >= 50) {

    score += 3;

  } else if (totalRainfall >= 20) {

    score += 2;

  } else if (totalRainfall >= 5) {

    score += 1;

  }


  // Maximum hourly rainfall

  if (maxHourlyRainfall >= 20) {

    score += 2;

  } else if (maxHourlyRainfall >= 10) {

    score += 1;

  }


  // Rain probability

  if (maxRainProbability >= 80) {

    score += 2;

  } else if (maxRainProbability >= 60) {

    score += 1;

  }


  // Humidity

  if (currentHumidity >= 80) {

    score += 1;

  }


  // ===================================================
  // CLASSIFICATION
  // ===================================================

  let level;
  let message;


  if (score >= 6) {

    level = "HIGH";

    message =
      "High potential flood risk detected based on the current environmental conditions.";

  } else if (score >= 3) {

    level = "MODERATE";

    message =
      "Moderate potential flood risk detected. Environmental conditions should be monitored.";

  } else {

    level = "LOW";

    message =
      "Low potential flood risk based on the available environmental conditions.";

  }


  // ===================================================
  // PRECAUTIONS
  // ===================================================

  const precautions = [

    "Monitor rainfall and weather conditions regularly.",

    "Avoid unnecessary travel through low-lying areas during heavy rainfall.",

    "Keep emergency contacts and essential supplies ready.",

    "Follow official disaster management advisories when issued.",

  ];


  return {

    level,

    score,

    message,

    totalRainfall:
      Number(
        totalRainfall.toFixed(2)
      ),

    maxHourlyRainfall:
      Number(
        maxHourlyRainfall.toFixed(2)
      ),

    maxRainProbability,

    precautions,

  };

}


// =====================================================
// POPULATION DATA — GEONAMES
// =====================================================

const GEONAMES_USERNAME =
  "shivani_rajput";


async function getPopulationData(
  selectedLocation
) {

  const params =
    new URLSearchParams({

      lat:
        String(
          selectedLocation.latitude
        ),

      lng:
        String(
          selectedLocation.longitude
        ),

      radius: "20",

      maxRows: "1",

      style: "FULL",

      localCountry: "true",

      username:
        GEONAMES_USERNAME,

    });


  const response =
    await fetch(
      `https://secure.geonames.org/findNearbyPlaceNameJSON?${params.toString()}`
    );


  if (!response.ok) {

    throw new Error(
      "Unable to retrieve population data."
    );

  }


  const data =
    await response.json();


  if (data.status) {

    throw new Error(
      data.status.message ||
        "GeoNames population service error."
    );

  }


  if (
    !data.geonames ||
    data.geonames.length === 0
  ) {

    return null;

  }


  const place =
    data.geonames[0];


  const population =
    Number(
      place.population
    );


  return {

    population:
      Number.isFinite(
        population
      ) &&
      population > 0
        ? population
        : null,

    placeName:
      place.name ||
      null,

    adminName:
      place.adminName1 ||
      null,

    countryName:
      place.countryName ||
      null,

    distance:
      place.distance
        ? Number(place.distance)
        : null,

    source:
      "GeoNames",

    geonameId:
      place.geonameId ||
      null,

  };

}

// =====================================================
// TERRAIN / ELEVATION DATA
// =====================================================

async function getElevationData(selectedLocation) {
  const latitude = Number(selectedLocation.latitude);
  const longitude = Number(selectedLocation.longitude);

  const response = await fetch(
    `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`
  );

  if (!response.ok) {
    throw new Error("Unable to retrieve elevation data.");
  }

  const data = await response.json();

  if (
    !data.elevation ||
    !Array.isArray(data.elevation) ||
    data.elevation.length === 0
  ) {
    throw new Error("Elevation data is unavailable.");
  }

  const elevation = Number(data.elevation[0]);

  if (!Number.isFinite(elevation)) {
    throw new Error("Invalid elevation data received.");
  }

  return {
    elevation,
    unit: "metres",
    source: "Copernicus DEM / Open-Meteo",
  };
}

// =====================================================
// MAIN APP
// =====================================================

function App() {

  // ===================================================
  // SELECTED LOCATION
  // ===================================================

  const [city, setCity] =
    useState("");


  const [location, setLocation] =
    useState(null);


  const [weather, setWeather] =
    useState(null);


  const [risk, setRisk] =
    useState(null);


  // ===================================================
  // POPULATION EXPOSURE DATA
  // ===================================================

  const [populationData, setPopulationData] =
    useState(null);

    // ===================================================
// VULNERABILITY / TERRAIN DATA
// ===================================================

const [elevationData, setElevationData] =
  useState(null);

  // ===================================================
  // GIS ZONE DATA
  // ===================================================

  const [zoneResults, setZoneResults] =
    useState([]);


  const [gisLoading, setGisLoading] =
    useState(false);


  // ===================================================
  // MAIN LOADING
  // ===================================================

  const [loading, setLoading] =
    useState(false);


  // ===================================================
  // ERROR
  // ===================================================

  const [error, setError] =
    useState("");


  // ===================================================
  // LOAD GIS ZONES
  // ===================================================

  const loadGISZones =
    async (selectedLocation) => {

      try {

        setGisLoading(true);

        setZoneResults([]);


        console.log(
          "Starting GIS zone analysis..."
        );


        // ------------------------------------------------
        // FIND REAL NEARBY CITIES / TOWNS
        // ------------------------------------------------

        const nearbyPlaces =
          await findNearbyPlaces(
            selectedLocation.latitude,
            selectedLocation.longitude
          );


        console.log(
          "Nearby places:",
          nearbyPlaces
        );


        // ------------------------------------------------
        // GET WEATHER FOR ALL GIS ZONES
        // ------------------------------------------------

        const zoneWeather =
          await getZoneWeather(
            selectedLocation,
            nearbyPlaces
          );


        console.log(
          "Zone weather received:",
          zoneWeather
        );


        // ------------------------------------------------
        // CALCULATE RISK FOR EACH ZONE
        // ------------------------------------------------

        const results =
          zoneWeather.map(
            (zone) => {

              const zoneRisk =
                calculateFloodRisk(
                  zone.weather
                );


              return {

                ...zone,

                risk:
                  zoneRisk,

              };

            }
          );


        console.log(
          "FINAL GIS ZONE RISK RESULTS:",
          results
        );


        setZoneResults(
          results
        );


      } catch (gisError) {

        console.warn(
          "GIS zone analysis failed:",
          gisError.message
        );


        // Main location risk remains visible
        // even if GIS service fails.

        setZoneResults([]);


      } finally {

        setGisLoading(false);

      }

    };


  // ===================================================
  // CHECK WEATHER
  // ===================================================

  const checkWeather =
    async (city) => {

      if (!city.trim()) {

        setError(
          "Please enter a location."
        );

        return;

      }


      try {

        setLoading(true);

        setError("");

        // Clear previous terrain / elevation data
setElevationData(null);

        // Clear previous GIS data
        setZoneResults([]);


        // ------------------------------------------------
        // STEP 1 — GEOCODING
        // ------------------------------------------------

        const geoResponse =
          await fetch(

            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
              city
            )}&count=1&language=en&format=json`

          );


        if (!geoResponse.ok) {

          throw new Error(
            "Unable to find the location."
          );

        }


        const geoData =
          await geoResponse.json();


        if (
          !geoData.results ||
          geoData.results.length === 0
        ) {

          throw new Error(
            "Location not found. Please enter a valid city or town."
          );

        }


        const selectedLocation =
          geoData.results[0];


        // ------------------------------------------------
        // STEP 1.5 — POPULATION / EXPOSURE DATA
        // ------------------------------------------------

        try {

          const populationResult =
            await getPopulationData(
              selectedLocation
            );


          setPopulationData(
            populationResult
          );


          console.log(
            "Population Exposure Data:",
            populationResult
          );


        } catch (populationError) {

          console.warn(
            "Population lookup failed:",
            populationError.message
          );


          // Population failure must NOT stop
          // the main flood assessment.

          setPopulationData(
            null
          );

        }

        // ------------------------------------------------
// STEP 1.6 — TERRAIN / ELEVATION DATA
// ------------------------------------------------

try {

  const elevationResult =
    await getElevationData(
      selectedLocation
    );

  setElevationData(
    elevationResult
  );

  console.log(
    "Terrain / Elevation Data:",
    elevationResult
  );

} catch (elevationError) {

  console.warn(
    "Elevation lookup failed:",
    elevationError.message
  );

  // Elevation failure must NOT stop
  // the main flood assessment.

  setElevationData(null);
}

        // ------------------------------------------------
        // STEP 2 — WEATHER DATA
        // ------------------------------------------------

        const weatherResponse =
          await fetch(

            `https://api.open-meteo.com/v1/forecast?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m&hourly=precipitation_probability,rain,wind_speed_10m&forecast_days=1`

          );


        if (!weatherResponse.ok) {

          throw new Error(
            "Unable to retrieve weather data."
          );

        }


        const weatherData =
          await weatherResponse.json();


        // ------------------------------------------------
        // STEP 3 — MAIN LOCATION
        // ------------------------------------------------

        setLocation(
          selectedLocation
        );


        setWeather(
          weatherData
        );


        // ------------------------------------------------
        // STEP 4 — MAIN LOCATION RISK
        // ------------------------------------------------

        const calculatedRisk =
          calculateFloodRisk(
            weatherData
          );


        setRisk(
          calculatedRisk
        );


        // ------------------------------------------------
        // MAIN RESULT IS READY
        // ------------------------------------------------

        setLoading(false);


        // ------------------------------------------------
        // STEP 5 — START GIS ANALYSIS
        //
        // This is intentionally NOT awaited.
        //
        // Main result appears immediately while
        // the 3×3 GIS analysis continues.
        // ------------------------------------------------

        loadGISZones(
          selectedLocation
        );


      } catch (requestError) {

        console.error(
          requestError
        );


        setError(
          requestError.message ||
            "Something went wrong while retrieving environmental data."
        );


        setLoading(false);

      }

    };


  // ===================================================
  // ROUTES
  // ===================================================

  return (

    <BrowserRouter>

      <Navbar />


      <Routes>

        {/* HOME */}

        <Route
          path="/"
          element={
            <Home
              onCheckWeather={
                checkWeather
              }

              loading={
                loading
              }
            />
          }
        />


        {/* RISK MONITORING */}

        <Route
          path="/risk-monitoring"
          element={

            <RiskMonitoring

              city={
                city
              }

              setCity={
                setCity
              }

              location={
                location
              }

              weather={
                weather
              }

              risk={
                risk
              }

              onRiskUpdate={setRisk}

              populationData={
                populationData
              }

              elevationData={
  elevationData
}

              error={
                error
              }

              zoneResults={
                zoneResults
              }

              gisLoading={
                gisLoading
              }

              onCheckWeather={
                checkWeather
              }

              loading={
                loading
              }

            />

          }
        />


        {/* ALERTS */}

        <Route
          path="/alerts"
          element={

            <Alerts
              risk={
                risk
              }

              location={
                location
              }
            />

          }
        />


        {/* SAFETY */}

        <Route
          path="/safety"
          element={
            <Safety />
          }
        />

      </Routes>


      {/* FOOTER */}

      <footer className="app-footer">

        © 2026 AEGIS | Environmental Risk Monitoring & Early Warning Platform

      </footer>

    </BrowserRouter>

  );

}


export default App;