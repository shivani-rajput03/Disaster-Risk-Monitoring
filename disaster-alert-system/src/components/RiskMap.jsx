import { useEffect } from "react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapAutoFit({ location, zoneResults }) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    // Center location
    if (
      location &&
      location.latitude !== undefined &&
      location.longitude !== undefined
    ) {
      points.push([
        Number(location.latitude),
        Number(location.longitude),
      ]);
    }

    // Surrounding GIS locations
    zoneResults.forEach((zone) => {
      if (
        zone.zone !== "C" &&
        zone.location &&
        zone.location.latitude !== undefined &&
        zone.location.longitude !== undefined
      ) {
        points.push([
          Number(zone.location.latitude),
          Number(zone.location.longitude),
        ]);
      }
    });

    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 11);
      return;
    }

    map.fitBounds(points, {
      padding: [45, 45],
      maxZoom: 12,
      animate: true,
    });
  }, [map, location, zoneResults]);

  return null;
}

function getRiskColor(level) {
  if (level === "HIGH") {
    return "#dc2626";
  }

  if (level === "MODERATE") {
    return "#f59e0b";
  }

  return "#16a34a";
}

function getRiskText(level) {
  if (level === "HIGH") {
    return "High Risk";
  }

  if (level === "MODERATE") {
    return "Moderate Risk";
  }

  return "Low Risk";
}

function RiskMap({
  location,
  risk,
  zoneResults = [],
  gisLoading = false,
}) {
  if (!location || !risk) {
    return null;
  }

  const position = [
    Number(location.latitude),
    Number(location.longitude),
  ];

  const riskColor = getRiskColor(risk.level);

  const matrixZones = [
    "NW",
    "N",
    "NE",
    "W",
    "C",
    "E",
    "SW",
    "S",
    "SE",
  ];

  return (
    <div className="risk-map-card">

      {/* =================================================
          MAP HEADER
      ================================================= */}

      <div className="risk-map-header">

        <div>
          <span className="section-label">
            GIS RISK VISUALIZATION
          </span>

          <h2>GIS Risk Assessment Map</h2>

          <p>
            Risk assessment for the selected location and surrounding real
            locations using their available environmental conditions.
          </p>
        </div>

        <div
          className="map-risk-status"
          style={{
            borderColor: riskColor,
            color: riskColor,
          }}
        >
          <span
            className="map-risk-dot"
            style={{
              backgroundColor: riskColor,
            }}
          ></span>

          {getRiskText(risk.level)}
        </div>

      </div>


      {/* =================================================
          LOCATION INFORMATION
      ================================================= */}

      <div className="map-location-info">

        <div>
          <span>MONITORING LOCATION</span>

          <strong>
            {location.name}
            {location.admin1 ? `, ${location.admin1}` : ""}
          </strong>
        </div>

        <div className="coordinates">

          <div>
            <span>LATITUDE</span>

            <strong>
              {Number(location.latitude).toFixed(4)}
            </strong>
          </div>

          <div>
            <span>LONGITUDE</span>

            <strong>
              {Number(location.longitude).toFixed(4)}
            </strong>
          </div>

        </div>

      </div>


      {/* =================================================
          MAP
      ================================================= */}

      <div className="map-container-wrapper">

        <MapContainer
          center={position}
          zoom={10}
          scrollWheelZoom={true}
          className="risk-map"
        >
<MapAutoFit
  location={location}
  zoneResults={zoneResults}
/>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />


          {/* =================================================
              SELECTED LOCATION / CENTER
          ================================================= */}

          <CircleMarker
            center={position}
            radius={13}
            pathOptions={{
              color: "#ffffff",
              fillColor: riskColor,
              fillOpacity: 1,
              weight: 4,
            }}
          >

            <Tooltip
              permanent
              direction="top"
              offset={[0, -10]}
            >
              C
            </Tooltip>

            <Popup>

              <div className="map-popup">

                <strong>{location.name}</strong>

                <span>
                  {location.admin1}, {location.country}
                </span>

                <hr />

                <div>
                  <b>Zone:</b> C — Selected Location
                </div>

                <div>
                  <b>Risk Level:</b> {risk.level}
                </div>

                <div>
                  <b>Risk Score:</b> {risk.score}
                </div>

                <div>
                  <b>24-Hour Rainfall:</b>{" "}
                  {risk.totalRainfall} mm
                </div>

                <div>
                  <b>Rain Probability:</b>{" "}
                  {risk.maxRainProbability}%
                </div>

                <div>
                  <b>Coordinates:</b>
                  <br />
                  {Number(location.latitude).toFixed(4)},{" "}
                  {Number(location.longitude).toFixed(4)}
                </div>

              </div>

            </Popup>

          </CircleMarker>


          {/* =================================================
              REAL SURROUNDING GIS LOCATIONS
          ================================================= */}

          {zoneResults
            .filter(
              (zone) =>
                zone.zone !== "C" &&
                zone.location &&
                zone.risk &&
                zone.location.latitude !== undefined &&
                zone.location.longitude !== undefined
            )
            .map((zone) => {

              const color = getRiskColor(
                zone.risk.level
              );

              return (
                <CircleMarker
                  key={`${zone.zone}-${zone.location.name}`}
                  center={[
                    Number(zone.location.latitude),
                    Number(zone.location.longitude),
                  ]}
                  radius={9}
                  pathOptions={{
                    color: "#ffffff",
                    fillColor: color,
                    fillOpacity: 0.95,
                    weight: 3,
                  }}
                >

                  <Tooltip
                    permanent
                    direction="top"
                    offset={[0, -7]}
                  >
                    {zone.zone}
                  </Tooltip>

                  <Popup>

                    <div className="map-popup">

                      <strong>
                        {zone.location.name}
                      </strong>

                      <span>
                        {zone.location.type ||
                          "Nearby location"}
                      </span>

                      <hr />

                      <div>
                        <b>Zone:</b> {zone.zone}
                      </div>

                      <div>
                        <b>Risk Level:</b>{" "}
                        {zone.risk.level}
                      </div>

                      <div>
                        <b>Risk Score:</b>{" "}
                        {zone.risk.score}
                      </div>

                      <div>
                        <b>24-Hour Rainfall:</b>{" "}
                        {zone.risk.totalRainfall} mm
                      </div>

                      <div>
                        <b>Rain Probability:</b>{" "}
                        {zone.risk.maxRainProbability}%
                      </div>

                      <div>
                        <b>Coordinates:</b>
                        <br />
                        {Number(
                          zone.location.latitude
                        ).toFixed(4)},{" "}
                        {Number(
                          zone.location.longitude
                        ).toFixed(4)}
                      </div>

                    </div>

                  </Popup>

                </CircleMarker>
              );
            })}

        </MapContainer>


        {/* =================================================
            GIS LOADING MESSAGE
        ================================================= */}

        {gisLoading && (

          <div className="gis-loading-overlay">

            <div className="gis-loading-box">

              <strong>
                Analyzing surrounding locations...
              </strong>

              <span>
                Fetching nearby places and environmental
                conditions.
              </span>

            </div>

          </div>

        )}

      </div>


      {/* =================================================
          3 × 3 ZONE MATRIX
      ================================================= */}

      <div className="zone-analysis-section">

        <div className="zone-analysis-header">

          <div>

            <span className="section-label">
              SPATIAL RISK ANALYSIS
            </span>

            <h3>
              3 × 3 Surrounding Zone Assessment
            </h3>

          </div>

          <span className="zone-analysis-note">
            {zoneResults.length > 0
              ? `${zoneResults.length} real locations analyzed`
              : gisLoading
                ? "Analysis in progress"
                : "Nearby zone data unavailable"}
          </span>

        </div>


        {/* =================================================
            MATRIX
        ================================================= */}

        <div
          className="zone-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "12px",
            marginTop: "20px",
            width: "100%",
          }}
        >

          {matrixZones.map((zoneName) => {

            const zone = zoneResults.find(
              (item) => item.zone === zoneName
            );

            const isCenter = zoneName === "C";

            const zoneRisk = isCenter
              ? risk
              : zone?.risk;

            const color = zoneRisk
              ? getRiskColor(zoneRisk.level)
              : "#94a3b8";

            const zoneLocation = isCenter
              ? location
              : zone?.location;

            const hasData =
              Boolean(zoneRisk && zoneLocation);

            return (

              <div
                className={`zone-cell ${
                  isCenter ? "zone-center" : ""
                }`}
                key={zoneName}
                style={{
                  minHeight: "145px",
                  padding: "18px",
                  borderRadius: "14px",
                  border: `2px solid ${
                    hasData ? color : "#dfe6ee"
                  }`,
                  background: isCenter
                    ? "linear-gradient(145deg, #eef7ff, #ffffff)"
                    : "#ffffff",
                  boxShadow: isCenter
                    ? "0 6px 18px rgba(23, 105, 170, 0.12)"
                    : "0 4px 14px rgba(15, 35, 55, 0.06)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxSizing: "border-box",
                  transition:
                    "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >

                {/* TOP ROW */}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >

                  <span
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "9px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isCenter
                        ? "#1769aa"
                        : hasData
                          ? `${color}15`
                          : "#f1f5f9",
                      color: isCenter
                        ? "#ffffff"
                        : hasData
                          ? color
                          : "#64748b",
                      fontSize: "12px",
                      fontWeight: "800",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {zoneName}
                  </span>


                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: color,
                      boxShadow: `0 0 0 4px ${color}18`,
                    }}
                  ></span>

                </div>


                {/* LOCATION */}

                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >

                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      lineHeight: "1.35",
                      color: "#172033",
                      wordBreak: "break-word",
                    }}
                  >
                    {zoneLocation?.name ||
                      (gisLoading
                        ? "Loading..."
                        : "No nearby location")}
                  </span>

                  {zoneLocation?.type && !isCenter && (

                    <span
                      style={{
                        marginTop: "5px",
                        fontSize: "10px",
                        color: "#64748b",
                        textTransform: "capitalize",
                      }}
                    >
                      {zoneLocation.type}
                    </span>

                  )}

                </div>


                {/* RISK BADGE */}

                <div
                  style={{
                    marginTop: "14px",
                  }}
                >

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 9px",
                      borderRadius: "999px",
                      background: `${color}15`,
                      color: color,
                      fontSize: "10px",
                      fontWeight: "800",
                      letterSpacing: "0.5px",
                    }}
                  >

                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: color,
                      }}
                    ></span>

                    {zoneRisk?.level || "N/A"}

                  </span>

                </div>

              </div>

            );
          })}

        </div>

      </div>


      {/* =================================================
          LEGEND
      ================================================= */}

      <div className="map-legend">

        <strong className="legend-title">
          Risk Classification
        </strong>

        <div>
          <span className="legend-dot low"></span>
          Low
        </div>

        <div>
          <span className="legend-dot moderate"></span>
          Moderate
        </div>

        <div>
          <span className="legend-dot high"></span>
          High
        </div>

        <div>
          <span className="legend-dot selected"></span>
          Selected monitoring location
        </div>

      </div>

    </div>
  );
}

export default RiskMap;