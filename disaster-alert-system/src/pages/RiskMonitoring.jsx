import { useEffect, useState } from "react";
import RiskMap from "../components/RiskMap";
import InfrastructureExposure from "../components/InfrastructureExposure";
import HydrologicalExposure from "../components/HydrologicalExposure";
import TerrainVulnerability from "../components/TerrainVulnerability";
import DrainageVulnerability from "../components/DrainageVulnerability";
import InfrastructureVulnerability from "../components/InfrastructureVulnerability";
import CapacityAssessment from "../components/CapacityAssessment";
import { getHistoricalFloods } from "../historicalFlood";

function RiskMonitoring({

  city,

  setCity,

  location,

  weather,

  risk,

    onRiskUpdate,

  populationData,

  elevationData,

  error,

  zoneResults,

  gisLoading,

  onCheckWeather,

  loading,

}) {

  const [infrastructureData, setInfrastructureData] =
    useState(null);

    const [hydrologicalData, setHydrologicalData] = useState({
  rivers: [],
  waterBodies: [],
  dams: [],
  bridges: [],
});

const [historicalFloods, setHistoricalFloods] = useState({
  loading: false,
  events: [],
  message: "",
});

// =====================================================
// HISTORICAL FLOOD OCCURRENCE
// =====================================================

useEffect(() => {
  if (
    !location ||
    location.latitude === undefined ||
    location.longitude === undefined
  ) {
    setHistoricalFloods({
      loading: false,
      events: [],
      message: "",
    });

    return;
  }

  const loadHistoricalFloods = async () => {
    setHistoricalFloods({
      loading: true,
      events: [],
      message: "",
    });

    const result =
      await getHistoricalFloods(
        location.latitude,
        location.longitude
      );

    setHistoricalFloods({
      loading: false,
      events: result.events || [],
      message:
        result.message || "",
    });
  };

  loadHistoricalFloods();
}, [location]);

  // =====================================================
  // AEGIS COMPOSITE RISK ASSESSMENT
  // =====================================================

  useEffect(() => {
    if (!weather || !onRiskUpdate) return;

    const hourly = weather.hourly || {};

    const rainfall = Array.isArray(hourly.rain)
      ? hourly.rain
      : [];

    const rainProbability = Array.isArray(
      hourly.precipitation_probability
    )
      ? hourly.precipitation_probability
      : [];

    const totalRainfall = rainfall
      .slice(0, 24)
      .reduce((sum, value) => sum + Number(value || 0), 0);

    const maxHourlyRainfall =
      rainfall.length > 0
        ? Math.max(...rainfall.map(Number))
        : 0;

    const maxRainProbability =
      rainProbability.length > 0
        ? Math.max(...rainProbability.map(Number))
        : 0;

    // -----------------------------
    // 1. HAZARD
    // -----------------------------

    let hazardScore = 0;

    hazardScore += Math.min(
      15,
      (totalRainfall / 100) * 15
    );

    hazardScore += Math.min(
      10,
      (maxHourlyRainfall / 20) * 10
    );

    hazardScore += Math.min(
      10,
      (maxRainProbability / 100) * 10
    );

    const nearestRiver =
      hydrologicalData?.rivers?.length > 0
        ? hydrologicalData.rivers[0]
        : null;

    if (nearestRiver) {
      const distance = Number(nearestRiver.distance || 0);

      if (distance <= 1) hazardScore += 5;
      else if (distance <= 3) hazardScore += 4;
      else if (distance <= 5) hazardScore += 3;
      else if (distance <= 10) hazardScore += 1;
    }

    hazardScore = Math.round(
      Math.min(40, hazardScore)
    );

    // -----------------------------
    // 2. EXPOSURE
    // -----------------------------

    const population =
      Number(populationData?.population || 0);

    const hospitals =
      infrastructureData?.hospitals?.length || 0;

    const schools =
      infrastructureData?.schools?.length || 0;

    const roads =
      infrastructureData?.roads?.length || 0;

    let exposureScore = 0;

    // Population exposure
    if (population > 100000) exposureScore += 10;
    else if (population > 50000) exposureScore += 8;
    else if (population > 10000) exposureScore += 5;
    else if (population > 1000) exposureScore += 3;

    // Critical infrastructure exposure
    exposureScore += Math.min(
      8,
      (hospitals + schools) / 20
    );

    // Road exposure
    exposureScore += Math.min(
      7,
      roads / 50
    );

    exposureScore = Math.round(
      Math.min(25, exposureScore)
    );

    // -----------------------------
    // 3. VULNERABILITY
    // -----------------------------

    let vulnerabilityScore = 0;

    const elevation =
      Number(elevationData?.elevation || 0);

    // Relative terrain indicator
    if (elevation > 0 && elevation < 300) {
      vulnerabilityScore += 6;
    } else if (elevation < 600) {
      vulnerabilityScore += 3;
    }

    // Proximity to river increases
    // potential flood vulnerability
    if (nearestRiver) {
      const distance = Number(
        nearestRiver.distance || 0
      );

      if (distance <= 1) vulnerabilityScore += 8;
      else if (distance <= 3) vulnerabilityScore += 6;
      else if (distance <= 5) vulnerabilityScore += 4;
      else if (distance <= 10) vulnerabilityScore += 2;
    }

    // Water-body exposure
    if (
      hydrologicalData?.waterBodies?.length > 0
    ) {
      vulnerabilityScore += 3;
    }

    vulnerabilityScore = Math.round(
      Math.min(20, vulnerabilityScore)
    );

    // -----------------------------
    // 4. RESPONSE CAPACITY
    // -----------------------------

    let capacityScore = 0;

    if (hospitals > 0) {
      capacityScore += Math.min(
        5,
        hospitals / 10
      );
    }

    if (
      infrastructureData?.fireStations?.length > 0
    ) {
      capacityScore += 5;
    }

    if (roads > 0) {
      capacityScore += Math.min(
        5,
        roads / 50
      );
    }

    capacityScore = Math.round(
      Math.min(15, capacityScore)
    );

    // -----------------------------
    // FINAL AEGIS SCORE
    // -----------------------------

    const finalScore = Math.round(
      Math.max(
        0,
        hazardScore +
          exposureScore +
          vulnerabilityScore -
          capacityScore
      )
    );

    let level = "LOW";

    if (finalScore >= 60) {
      level = "HIGH";
    } else if (finalScore >= 35) {
      level = "MODERATE";
    }

    onRiskUpdate({
      level,
      score: finalScore,

      totalRainfall: Number(
        totalRainfall.toFixed(1)
      ),

      maxHourlyRainfall: Number(
        maxHourlyRainfall.toFixed(1)
      ),

      maxRainProbability,

      hazardScore,
      exposureScore,
      vulnerabilityScore,
      capacityScore,

      methodology:
        "AEGIS composite assessment using Hazard, Exposure, Vulnerability and Response Capacity indicators.",

      precautions: [
        "Monitor rainfall and official flood advisories.",
        "Avoid unnecessary travel through low-lying or flood-prone areas.",
        "Keep emergency contacts and essential supplies ready.",
        "Follow local evacuation and disaster-management instructions.",
      ],
    });
  }, [
    weather,
    populationData,
    elevationData,
    infrastructureData,
    hydrologicalData,
    onRiskUpdate,
  ]);

  // =====================================================
  // DEBUG
  // =====================================================

  useEffect(() => {

    console.log(
      "Risk Monitoring State:",
      {
        city,
        location,
        weather,
        risk,
        populationData,
      }
    );

  }, [
    city,
    location,
    weather,
    risk,
    populationData,
  ]);


  // =====================================================
  // HANDLE FORM SUBMIT
  // =====================================================

  const handleSubmit = (
    event
  ) => {

    event.preventDefault();


    if (
      !city ||
      !city.trim()
    ) {

      return;

    }


    onCheckWeather(
      city.trim()
    );

  };


  // =====================================================
  // EARLY WARNING CONTENT
  // =====================================================

  const getWarningContent =
    () => {

      if (!risk) {

        return {

          title:
            "No Warning Available",

          message:
            "Complete the environmental risk assessment to generate an early warning.",

          icon:
            "🔔",

          className:
            "low",

          factors:
            [],

        };

      }


      if (
        risk.level ===
        "HIGH"
      ) {

        return {

          title:
            "High Risk — Immediate Preparedness Recommended",

          message:
            "Environmental conditions indicate a high potential flood risk. Immediate preparedness measures are recommended.",

          icon:
            "🚨",

          className:
            "high",

          factors:
            [

              `Risk score: ${risk.score}`,

              `24-hour rainfall: ${risk.totalRainfall} mm`,

              `Maximum hourly rainfall: ${risk.maxHourlyRainfall} mm`,

              `Rain probability: ${risk.maxRainProbability}%`,

            ],

        };

      }


      if (
        risk.level ===
        "MODERATE"
      ) {

        return {

          title:
            "Moderate Risk — Prepare Early",

          message:
            "Environmental conditions indicate a moderate potential flood risk. Continue monitoring conditions and take early preparedness measures.",

          icon:
            "⚠️",

          className:
            "moderate",

          factors:
            [

              `Risk score: ${risk.score}`,

              `24-hour rainfall: ${risk.totalRainfall} mm`,

              `Maximum hourly rainfall: ${risk.maxHourlyRainfall} mm`,

              `Rain probability: ${risk.maxRainProbability}%`,

            ],

        };

      }


      return {

        title:
          "No Immediate Warning",

        message:
          "Current environmental conditions indicate a low potential flood risk. Continue monitoring conditions and remain prepared.",

        icon:
          "✓",

        className:
          "low",

        factors:
          [

            `Risk score: ${risk.score}`,

            `24-hour rainfall: ${risk.totalRainfall} mm`,

            `Maximum hourly rainfall: ${risk.maxHourlyRainfall} mm`,

            `Rain probability: ${risk.maxRainProbability}%`,

          ],

      };

    };

    const nearestRiver = hydrologicalData.rivers?.[0] || null;
const nearestWaterBody = hydrologicalData.waterBodies?.[0] || null;
const nearestDam = hydrologicalData.dams?.[0] || null;

  const warning =
    getWarningContent();


  return (

    <main
      className="risk-monitoring-page"
    >


      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <section
        className="page-hero"
      >

        <span
          className="section-label"
        >

          LIVE MONITORING

        </span>


        <h1>

          Risk Monitoring

        </h1>


        <p>

          Enter a location to analyze current weather
          conditions and assess potential flood risk.

        </p>

      </section>



      {/* =================================================
          MONITORING SECTION
      ================================================= */}

      <section
        className="monitoring-section"
      >


        {/* =================================================
            LOCATION SEARCH
        ================================================= */}

        <div
          className="search-card"
        >

          <div
            className="search-title"
          >

            <span
              className="pin-icon"
            >

              📍

            </span>


            <h3>

              Select Location

            </h3>

          </div>


          <form
            className="location-form"
            onSubmit={
              handleSubmit
            }
          >

            <input

              type="text"

              value={
                city || ""
              }

              onChange={
                (event) =>
                  setCity(
                    event.target.value
                  )
              }

              placeholder="Enter city name..."

              autoComplete="off"

            />


            <button

              type="submit"

              disabled={
                loading ||
                !city ||
                !city.trim()
              }

            >

              {loading
                ? "Analyzing..."
                : "Check Risk"}

            </button>

          </form>


          {/* ERROR */}

          {error && (

            <div
              className="error-message"
            >

              {error}

            </div>

          )}

        </div>



        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {
          !location &&
          !loading &&
          !error && (

            <div
              className="empty-state"
            >

              <div
                className="empty-icon"
              >

                🌦️

              </div>


              <h2>

                No Location Selected

              </h2>


              <p>

                Enter a city above to retrieve weather
                conditions and calculate the potential
                flood risk.

              </p>

            </div>

          )
        }



        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (

          <div
            className="empty-state"
          >

            <div
              className="loading-icon"
            >

              🌧️

            </div>


            <h2>

              Analyzing Environmental Conditions

            </h2>


            <p>

              Retrieving weather data, population
              exposure and calculating potential
              flood risk...

            </p>

          </div>

        )}



        {/* =================================================
            ERROR STATE
        ================================================= */}

        {
          error &&
          !loading && (

            <div
              className="empty-state error-state"
            >

              <div
                className="empty-icon"
              >

                ⚠️

              </div>


              <h2>

                Unable to Analyze Location

              </h2>


              <p>

                {error}

              </p>

            </div>

          )
        }



        {/* =================================================
            RISK RESULT
        ================================================= */}

        {
          location &&
          risk &&
          !loading && (

            <>

              {/* =================================================
                  LOCATION CARD
              ================================================= */}

              <div
                className="location-result-card"
              >

                <div>

                  <span
                    className="result-label"
                  >

                    MONITORING LOCATION

                  </span>


                  <h2>

                    {location.name}

                  </h2>


                  <p>

                    {
                      location.admin1
                        ? `${location.admin1}, `
                        : ""
                    }

                    {
                      location.country
                    }

                  </p>

                </div>


                <div
                  className="result-coordinates"
                >

                  <div>

                    <span>

                      LATITUDE

                    </span>


                    <strong>

                      {
                        Number(
                          location.latitude
                        ).toFixed(4)
                      }

                    </strong>

                  </div>


                  <div>

                    <span>

                      LONGITUDE

                    </span>


                    <strong>

                      {
                        Number(
                          location.longitude
                        ).toFixed(4)
                      }

                    </strong>

                  </div>

                </div>

              </div>



              {/* =================================================
                  POPULATION EXPOSURE ASSESSMENT
              ================================================= */}

              <div
                className="exposure-assessment-card"
              >

                <div
                  className="exposure-header"
                >

                  <div>

                    <span
                      className="section-label"
                    >

                      EXPOSURE ASSESSMENT

                    </span>


                    <h2>

                      Population Exposure

                    </h2>


                    <p>

                      Population information for the
                      searched location is used as the
                      first exposure indicator in the
                      disaster risk assessment.

                    </p>

                  </div>


                  <div
                    className="exposure-icon"
                  >

                    👥

                  </div>

                </div>


                <div
                  className="population-details"
                >

                  <div
                    className="population-main"
                  >

                    <span>

                      POPULATION

                    </span>


                    <strong>

                      {
                        populationData?.population
                          ? populationData.population.toLocaleString(
                              "en-IN"
                            )
                          : "Data unavailable"
                      }

                    </strong>

                  </div>


                  <div
                    className="population-info"
                  >

                    <div>

                      <span>

                        REFERENCE PLACE

                      </span>


                      <strong>

                        {
                          populationData?.placeName ||
                          location.name
                        }

                      </strong>

                    </div>


                    <div>

                      <span>

                        DATA SOURCE

                      </span>


                      <strong>

                        GeoNames

                      </strong>

                    </div>


                    <div>

                      <span>

                        DISTANCE FROM SEARCHED POINT

                      </span>


                      <strong>

                        {
                          populationData?.distance !==
                            null &&
                          populationData?.distance !==
                            undefined

                            ? `${populationData.distance.toFixed(
                                2
                              )} km`

                            : "—"
                        }

                      </strong>

                    </div>

                  </div>

                </div>


                <div
                  className="exposure-note"
                >

                  <span>

                    ⓘ

                  </span>


                  <p>

                    Population is used as an
                    exposure indicator. It is not
                    independently classified as Low,
                    Moderate, or High at this stage.

                  </p>

                </div>

              </div>

{/* =================================================
    INFRASTRUCTURE & CRITICAL FACILITY EXPOSURE
================================================= */}

<InfrastructureExposure
  location={location}
  onDataChange={setInfrastructureData}
/>

<InfrastructureVulnerability
  location={location}
  infrastructureData={infrastructureData}
/>


{/* =================================================
    HYDROLOGICAL EXPOSURE
================================================= */}

<HydrologicalExposure
  location={location}
  onDataChange={setHydrologicalData}
/>

{/* =================================================
    TERRAIN VULNERABILITY — STEP 3A
================================================= */}

<TerrainVulnerability
  location={location}
  elevationData={elevationData}
/>

<DrainageVulnerability
  location={location}
/>

<CapacityAssessment
  location={location}
  infrastructureData={infrastructureData}
/>

{/* =================================================
    FLOOD HAZARD ASSESSMENT
================================================= */}

<div
  className="risk-summary-card"
  style={{
    marginTop: "20px",
  }}
>
  <div className="risk-summary-header">
    <div>
      <span className="section-label">
        HAZARD ASSESSMENT
      </span>

      <h2>
        Flood Hazard Assessment
      </h2>
    </div>

    <div
      style={{
        fontSize: "28px",
      }}
    >
      🌊
    </div>
  </div>

  <p className="risk-message">
    Environmental and hydrological indicators used
    to understand the potential for flooding at the
    selected monitoring location.
  </p>

  {/* RAINFALL CONDITIONS */}

  <div style={{ marginTop: "20px" }}>
    <h3>🌧️ Rainfall Conditions</h3>

    <div className="risk-metrics">
      <div className="risk-metric">
        <span>24-HOUR RAINFALL</span>
        <strong>
          {risk?.totalRainfall ?? "—"} mm
        </strong>
      </div>

      <div className="risk-metric">
        <span>MAX HOURLY RAIN</span>
        <strong>
          {risk?.maxHourlyRainfall ?? "—"} mm
        </strong>
      </div>

      <div className="risk-metric">
        <span>RAIN PROBABILITY</span>
        <strong>
          {risk?.maxRainProbability ?? "—"}%
        </strong>
      </div>
    </div>
  </div>

  {/* RIVER PROXIMITY */}

  <div style={{ marginTop: "24px" }}>
    <h3>🌊 River / Stream Proximity</h3>

    <div className="risk-metrics">
      <div className="risk-metric">
        <span>NEAREST RIVER / STREAM</span>
        <strong>
          {nearestRiver?.name || "No mapped river"}
        </strong>
      </div>

      <div className="risk-metric">
        <span>DISTANCE</span>
        <strong>
          {nearestRiver
            ? `${nearestRiver.distance.toFixed(1)} km`
            : "—"}
        </strong>
      </div>
    </div>
  </div>

  {/* TERRAIN */}

  <div style={{ marginTop: "24px" }}>
    <h3>🏔️ Terrain</h3>

    <div className="risk-metrics">
      <div className="risk-metric">
        <span>ELEVATION</span>
        <strong>
          {elevationData?.elevation !== undefined
            ? `${elevationData.elevation} m`
            : "Data unavailable"}
        </strong>
      </div>
    </div>
  </div>

  {/* WATER BODY */}

  <div style={{ marginTop: "24px" }}>
    <h3>💧 Nearby Water Body</h3>

    <div className="risk-metrics">
      <div className="risk-metric">
        <span>NEAREST LAKE / RESERVOIR</span>
        <strong>
          {nearestWaterBody?.name ||
            "No mapped water body"}
        </strong>
      </div>

      <div className="risk-metric">
        <span>DISTANCE</span>
        <strong>
          {nearestWaterBody
            ? `${nearestWaterBody.distance.toFixed(1)} km`
            : "—"}
        </strong>
      </div>
    </div>
  </div>

  {/* DAM */}

  <div style={{ marginTop: "24px" }}>
    <h3>🏗️ Nearby Dam</h3>

    <div className="risk-metrics">
      <div className="risk-metric">
        <span>NEAREST DAM</span>
        <strong>
          {nearestDam?.name || "No mapped dam"}
        </strong>
      </div>

      <div className="risk-metric">
        <span>DISTANCE</span>
        <strong>
          {nearestDam
            ? `${nearestDam.distance.toFixed(1)} km`
            : "—"}
        </strong>
      </div>
    </div>
  </div>

  {/* INTERPRETATION */}

  <div
    className="exposure-note"
    style={{ marginTop: "24px" }}
  >
    <span>ⓘ</span>

    <p>
      These measurements represent environmental and
      hydrological indicators relevant to flood hazard
      assessment. They are presented as evidence and
      are not independently assigned Low, Moderate, or
      High classifications at this stage.
    </p>
  </div>
</div>

              {/* =================================================
                  RISK SUMMARY
              ================================================= */}

              <div
                className="risk-summary-card"
              >

                <div
                  className="risk-summary-header"
                >

                  <div>

                    <span
                      className="section-label"
                    >

                      ENVIRONMENTAL RISK ASSESSMENT

                    </span>


                    <h2>

                      Potential Flood Risk

                    </h2>

                  </div>


                  <div
                    className={`risk-badge ${risk.level.toLowerCase()}`}
                  >

                    <span
                      className="risk-dot"
                    ></span>

                    {risk.level}

                  </div>

                </div>


                <p
                  className="risk-message"
                >

                  {risk.message}

                </p>


                {/* RISK METRICS */}

                <div
                  className="risk-metrics"
                >

                  <div
                    className="risk-metric"
                  >

                    <span>

                      RISK SCORE

                    </span>


                    <strong>

                      {risk.score}

                    </strong>

                  </div>


                  <div
                    className="risk-metric"
                  >

                    <span>

                      24-HOUR RAINFALL

                    </span>


                    <strong>

                      {risk.totalRainfall} mm

                    </strong>

                  </div>


                  <div
                    className="risk-metric"
                  >

                    <span>

                      MAX HOURLY RAIN

                    </span>


                    <strong>

                      {risk.maxHourlyRainfall} mm

                    </strong>

                  </div>


                  <div
                    className="risk-metric"
                  >

                    <span>

                      RAIN PROBABILITY

                    </span>


                    <strong>

                      {risk.maxRainProbability}%

                    </strong>

                  </div>

                </div>

              </div>



              {/* =================================================
                  EARLY WARNING
              ================================================= */}

              <div
                className={`early-warning-card ${warning.className}`}
              >

                <div
                  className="early-warning-header"
                >

                  <div
                    className="early-warning-icon"
                  >

                    {warning.icon}

                  </div>


                  <div>

                    <span
                      className="section-label"
                    >

                      EARLY WARNING

                    </span>


                    <h2>

                      {warning.title}

                    </h2>

                  </div>

                </div>


                <p
                  className="early-warning-message"
                >

                  {warning.message}

                </p>


                {
                  warning.factors.length >
                    0 && (

                    <div
                      className="early-warning-factors"
                    >

                      <span
                        className="early-warning-factors-title"
                      >

                        Risk Factors

                      </span>


                      <div
                        className="early-warning-factor-grid"
                      >

                        {
                          warning.factors.map(
                            (
                              factor,
                              index
                            ) => (

                              <div
                                className="early-warning-factor"
                                key={index}
                              >

                                <span>

                                  ✓

                                </span>


                                <p>

                                  {factor}

                                </p>

                              </div>

                            )
                          )
                        }

                      </div>

                    </div>

                  )
                }

              </div>



              {/* =================================================
                  GIS MAP
              ================================================= */}

              <RiskMap

                location={
                  location
                }

                risk={
                  risk
                }

                zoneResults={
                  zoneResults
                }

                gisLoading={
                  gisLoading
                }

              />



              {/* =================================================
                  PRECAUTIONARY MEASURES
              ================================================= */}

              {
                risk.precautions &&
                risk.precautions.length >
                  0 && (

                  <div
                    className="precautions-card"
                  >

                    <div
                      className="precautions-header"
                    >

                      <span>

                        🛡️

                      </span>


                      <div>

                        <span
                          className="section-label"
                        >

                          EARLY PREPAREDNESS

                        </span>


                        <h2>

                          Recommended Precautions

                        </h2>

                      </div>

                    </div>


                    <div
                      className="precautions-list"
                    >

                      {
                        risk.precautions.map(
                          (
                            precaution,
                            index
                          ) => (

                            <div
                              className="precaution-item"
                              key={index}
                            >

                              <span>

                                {index + 1}

                              </span>


                              <p>

                                {precaution}

                              </p>

                            </div>

                          )
                        )
                      }

                    </div>

                  </div>

                )
              }
              
  {/* =================================================
    HISTORICAL FLOOD OCCURRENCE
================================================= */}

<section className="historical-flood-card">

  <div className="historical-flood-header">

    <div>
      <span className="section-label">
        HISTORICAL RECORDS
      </span>

      <h2>
        Historical Flood Occurrence
      </h2>

      <p>
        Documented flood events recorded near the
        searched location.
      </p>
    </div>

    <div className="historical-flood-source">
      DFO
    </div>

  </div>


  {historicalFloods.loading && (

    <div className="historical-flood-loading">
      Loading historical flood records...
    </div>

  )}


  {!historicalFloods.loading &&
    historicalFloods.events.length === 0 && (

      <div className="historical-flood-empty">

        <div className="historical-empty-icon">
          ✓
        </div>

        <div>

          <strong>
            No documented flood event found
          </strong>

          <p>
            No matching event was found within
            the available historical dataset and
            search radius for this location.
          </p>

        </div>

      </div>

    )}


  {!historicalFloods.loading &&
    historicalFloods.events.length > 0 && (

      <>

        <div className="historical-flood-summary">

          <strong>
            {historicalFloods.events.length}
          </strong>

          <span>
            documented event
            {historicalFloods.events.length !== 1
              ? "s"
              : ""}{" "}
            found within 100 km
          </span>

        </div>


        <div className="historical-flood-events">

          {historicalFloods.events.map(
            (event, index) => (

              <div
                className="historical-flood-event"
                key={`${event.date}-${event.latitude}-${event.longitude}-${index}`}
              >

                <div className="historical-event-year">

                  {event.date
                    ? String(event.date).slice(
                        0,
                        4
                      )
                    : "—"}

                </div>


                <div className="historical-event-details">

                  <strong>
                    {event.location ||
                      event.country ||
                      "Recorded Flood Event"}
                  </strong>

                  <span>
                    {event.date ||
                      "Historical record"}
                  </span>

                  <span>
                    Approx.{" "}
                    {event.distance} km from
                    searched location
                  </span>

                  {event.cause && (
                    <span>
                      Cause: {event.cause}
                    </span>
                  )}

                  {event.severity && (
                    <span>
                      Severity: {event.severity}
                    </span>
                  )}

                </div>

              </div>

            )
          )}

        </div>

      </>

    )}


  <div className="historical-flood-note">

    <strong>Data source:</strong>{" "}
    Dartmouth Flood Observatory (DFO) Global
    Flood Records. Historical records represent
    documented large flood events and should not
    be interpreted as proof that every point inside
    the search radius was inundated.

  </div>

</section>

            </>

          )
        }

      </section>

    </main>

  );

}


export default RiskMonitoring;