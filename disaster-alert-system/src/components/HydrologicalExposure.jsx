import { useEffect, useState } from "react";
import "./HydrologicalExposure.css";

// =====================================================
// OVERPASS SERVERS
// =====================================================

const OVERPASS_SERVERS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

// =====================================================
// SEARCH RADII
// =====================================================

const RIVER_RADIUS = 20000;
const WATER_BODY_RADIUS = 30000;
const DAM_RADIUS = 50000;
const BRIDGE_RADIUS = 20000;

// =====================================================
// DISTANCE CALCULATION
// =====================================================

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// =====================================================
// GET ELEMENT COORDINATES
// =====================================================

function getElementCoordinates(element) {
  if (element.lat !== undefined && element.lon !== undefined) {
    return {
      latitude: Number(element.lat),
      longitude: Number(element.lon),
    };
  }

  if (element.center) {
    return {
      latitude: Number(element.center.lat),
      longitude: Number(element.center.lon),
    };
  }

  return null;
}

// =====================================================
// GET FEATURE NAME
// =====================================================

function getFeatureName(element, fallback, isBridge = false) {
  const tags = element.tags || {};

  return (
    tags.name ||
    tags["name:en"] ||
    tags.official_name ||
    tags.loc_name ||
    tags.alt_name ||
    (isBridge ? tags["bridge:name"] : null) ||
    tags.ref ||
    fallback
  );
}

// =====================================================
// FETCH OVERPASS DATA
// =====================================================

async function fetchOverpass(query) {
  let lastError = null;

  for (const server of OVERPASS_SERVERS) {
    try {
      console.log(
        "Trying hydrological exposure server:",
        server
      );

      const response = await fetch(server, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(
          `Overpass server returned ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.warn(
        "Hydrological server failed:",
        server,
        error.message
      );

      lastError = error;
    }
  }

  throw (
    lastError ||
    new Error("All Overpass servers failed.")
  );
}

// =====================================================
// RUN ONE CATEGORY QUERY
// =====================================================

async function runHydrologicalQuery(
  query,
  categoryName
) {
  try {
    const data = await fetchOverpass(query);

    const elements = data.elements || [];

    console.log(
      `${categoryName} data received:`,
      elements.length
    );

    return elements;
  } catch (error) {
    console.warn(
      `${categoryName} query failed:`,
      error.message
    );

    return [];
  }
}

// =====================================================
// GET HYDROLOGICAL FEATURES
// =====================================================

async function getHydrologicalFeatures(
  latitude,
  longitude
) {
  // ---------------------------------------------------
  // RIVER QUERY
  // ---------------------------------------------------

  const riverQuery = `
[out:json][timeout:30];

nwr(
  around:${RIVER_RADIUS},${latitude},${longitude}
)["waterway"~"^(river|stream)$"];

out center tags;
`;

  // ---------------------------------------------------
  // WATER BODY QUERY
  // ---------------------------------------------------

  const waterBodyQuery = `
[out:json][timeout:30];

nwr(
  around:${WATER_BODY_RADIUS},${latitude},${longitude}
)["natural"="water"]["water"~"^(lake|reservoir)$"];

out center tags;
`;

  // ---------------------------------------------------
  // DAM QUERY
  // ---------------------------------------------------

  const damQuery = `
[out:json][timeout:30];

nwr(
  around:${DAM_RADIUS},${latitude},${longitude}
)["man_made"="dam"];

out center tags;
`;

  // ---------------------------------------------------
  // BRIDGE QUERY
  // ---------------------------------------------------

  const bridgeQuery = `
[out:json][timeout:30];

way(
  around:${BRIDGE_RADIUS},${latitude},${longitude}
)["bridge"];

out center tags;
`;

  // ---------------------------------------------------
  // FETCH ALL CATEGORIES
  // ---------------------------------------------------

  const [
    riverElements,
    waterBodyElements,
    damElements,
    bridgeElements,
  ] = await Promise.all([
    runHydrologicalQuery(
      riverQuery,
      "River / Stream"
    ),

    runHydrologicalQuery(
      waterBodyQuery,
      "Water Body"
    ),

    runHydrologicalQuery(
      damQuery,
      "Dam"
    ),

    runHydrologicalQuery(
      bridgeQuery,
      "Bridge"
    ),
  ]);

  // ---------------------------------------------------
  // RESULT STRUCTURE
  // ---------------------------------------------------

  const features = {
    rivers: [],
    waterBodies: [],
    dams: [],
    bridges: [],
  };

  // ===================================================
  // PROCESS RIVERS
  // ===================================================

  riverElements.forEach((element) => {
    const coordinates =
      getElementCoordinates(element);

    if (!coordinates) return;

    const distance = calculateDistance(
      latitude,
      longitude,
      coordinates.latitude,
      coordinates.longitude
    );

    const tags = element.tags || {};

    const isRiver =
      tags.waterway === "river";

    features.rivers.push({
      id: element.id,

      name: getFeatureName(
        element,
        isRiver
          ? "Unnamed mapped river"
          : "Unnamed mapped stream"
      ),

      type: isRiver
        ? "River"
        : "Stream",

      distance,
    });
  });

  // ===================================================
  // PROCESS WATER BODIES
  // ===================================================

  waterBodyElements.forEach((element) => {
    const coordinates =
      getElementCoordinates(element);

    if (!coordinates) return;

    const distance = calculateDistance(
      latitude,
      longitude,
      coordinates.latitude,
      coordinates.longitude
    );

    const tags = element.tags || {};

    const isReservoir =
      tags.water === "reservoir";

    features.waterBodies.push({
      id: element.id,

      name: getFeatureName(
        element,
        isReservoir
          ? "Unnamed mapped reservoir"
          : "Unnamed mapped lake"
      ),

      type: isReservoir
        ? "Reservoir"
        : "Lake",

      distance,
    });
  });

  // ===================================================
  // PROCESS DAMS
  // ===================================================

  damElements.forEach((element) => {
    const coordinates =
      getElementCoordinates(element);

    if (!coordinates) return;

    const distance = calculateDistance(
      latitude,
      longitude,
      coordinates.latitude,
      coordinates.longitude
    );

    features.dams.push({
      id: element.id,

      name: getFeatureName(
        element,
        "Unnamed mapped dam"
      ),

      type: "Dam",

      distance,
    });
  });

  // ===================================================
  // PROCESS BRIDGES
  // ===================================================

  bridgeElements.forEach((element) => {
    const coordinates =
      getElementCoordinates(element);

    if (!coordinates) return;

    const distance = calculateDistance(
      latitude,
      longitude,
      coordinates.latitude,
      coordinates.longitude
    );

    features.bridges.push({
      id: element.id,

      name: getFeatureName(
        element,
        "Unnamed mapped bridge",
        true
      ),

      type: "Bridge",

      distance,
    });
  });

  // ===================================================
  // SORT NEAREST → FARTHEST
  // ===================================================

  Object.keys(features).forEach((key) => {
    features[key].sort(
      (a, b) => a.distance - b.distance
    );
  });

  // ===================================================
  // FINAL LOG
  // ===================================================

  console.log(
    "Final hydrological feature counts:",
    {
      rivers: features.rivers.length,
      waterBodies:
        features.waterBodies.length,
      dams: features.dams.length,
      bridges: features.bridges.length,
    }
  );

  return features;
}

// =====================================================
// FEATURE LIST
// =====================================================

function FeatureList({
  items,
  emptyMessage,
}) {
  if (items.length === 0) {
    return (
      <div className="hydro-empty">
        {emptyMessage}
      </div>
    );
  }

  const visibleItems = items.slice(0, 5);

  return (
    <div className="hydro-feature-list">
      {visibleItems.map((item) => (
        <div
          className="hydro-feature"
          key={`${item.type}-${item.id}`}
        >
          <div>
            <strong>{item.name}</strong>

            <span>{item.type}</span>
          </div>

          <b>
            {item.distance.toFixed(1)} km
          </b>
        </div>
      ))}

      {items.length > 5 && (
        <div className="hydro-more">
          + {items.length - 5} more mapped
        </div>
      )}
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

function HydrologicalExposure({
  location,
  onDataChange,
}) {
  const [data, setData] = useState({
    rivers: [],
    waterBodies: [],
    dams: [],
    bridges: [],
  });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // ===================================================
  // LOAD HYDROLOGICAL DATA
  // ===================================================

  useEffect(() => {
    if (!location) return;

    const loadHydrologicalExposure =
      async () => {
        try {
          setLoading(true);
          setError("");

          const emptyData = {
            rivers: [],
            waterBodies: [],
            dams: [],
            bridges: [],
          };

          // Clear previous results
          setData(emptyData);

          if (onDataChange) {
            onDataChange(emptyData);
          }

          console.log(
            "Loading hydrological exposure..."
          );

          const result =
            await getHydrologicalFeatures(
              Number(location.latitude),
              Number(location.longitude)
            );

          console.log(
            "Hydrological exposure:",
            result
          );

          // Save data locally
          setData(result);

          // Send data to RiskMonitoring
          if (onDataChange) {
            onDataChange(result);
          }

          // ------------------------------------------------
          // If absolutely no data was returned
          // ------------------------------------------------

          const totalResults =
            result.rivers.length +
            result.waterBodies.length +
            result.dams.length +
            result.bridges.length;

          if (totalResults === 0) {
            setError(
              "Hydrological feature data is temporarily unavailable."
            );
          }
        } catch (hydroError) {
          console.warn(
            "Hydrological exposure failed:",
            hydroError.message
          );

          setError(
            "Hydrological feature data is temporarily unavailable."
          );

          const emptyData = {
            rivers: [],
            waterBodies: [],
            dams: [],
            bridges: [],
          };

          setData(emptyData);

          if (onDataChange) {
            onDataChange(emptyData);
          }
        } finally {
          setLoading(false);
        }
      };

    loadHydrologicalExposure();
  }, [location, onDataChange]);

  // =====================================================
  // TOTAL FEATURES
  // =====================================================

  const totalFeatures =
    data.rivers.length +
    data.waterBodies.length +
    data.dams.length +
    data.bridges.length;

  // =====================================================
  // UI
  // =====================================================

  return (
    <section className="hydro-exposure-card">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="hydro-header">
        <div>
          <span className="section-label">
            EXPOSURE ASSESSMENT
          </span>

          <h2>
            Water Bodies, Dams & Bridges
          </h2>

          <p>
            Nearby hydrological and transport
            features that may influence flood
            exposure and accessibility.
          </p>
        </div>

        <div className="hydro-icon">
          🌊
        </div>
      </div>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && (
        <div className="hydro-loading">
          <div className="hydro-spinner"></div>

          <div>
            <strong>
              Mapping nearby features...
            </strong>

            <p>
              Searching rivers, water bodies,
              dams and bridges around the
              selected location.
            </p>
          </div>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {!loading && error && (
        <div className="hydro-error">
          ⚠️ {error}
        </div>
      )}

      {/* =================================================
          DATA
      ================================================= */}

      {!loading && !error && (
        <>
          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="hydro-summary">
            <div>
              <span>
                TOTAL MAPPED
              </span>

              <strong>
                {totalFeatures}
              </strong>
            </div>

            <div>
              <span>
                RIVERS / STREAMS
              </span>

              <strong>
                {data.rivers.length}
              </strong>

              <small>
                20 km radius
              </small>
            </div>

            <div>
              <span>
                WATER BODIES
              </span>

              <strong>
                {data.waterBodies.length}
              </strong>

              <small>
                30 km radius
              </small>
            </div>

            <div>
              <span>
                DAMS
              </span>

              <strong>
                {data.dams.length}
              </strong>

              <small>
                50 km radius
              </small>
            </div>

            <div>
              <span>
                BRIDGES
              </span>

              <strong>
                {data.bridges.length}
              </strong>

              <small>
                20 km radius
              </small>
            </div>
          </div>

          {/* =================================================
              FEATURE GRID
          ================================================= */}

          <div className="hydro-grid">
            {/* =================================================
                RIVERS
            ================================================= */}

            <div className="hydro-category">
              <div className="hydro-category-header">
                <span>🌊</span>

                <div>
                  <h3>
                    Rivers & Streams
                  </h3>

                  <small>
                    20 km search radius
                  </small>
                </div>
              </div>

              <FeatureList
                items={data.rivers}
                emptyMessage="No mapped rivers or streams found."
              />
            </div>

            {/* =================================================
                WATER BODIES
            ================================================= */}

            <div className="hydro-category">
              <div className="hydro-category-header">
                <span>🏞️</span>

                <div>
                  <h3>
                    Lakes & Reservoirs
                  </h3>

                  <small>
                    30 km search radius
                  </small>
                </div>
              </div>

              <FeatureList
                items={data.waterBodies}
                emptyMessage="No mapped lakes or reservoirs found."
              />
            </div>

            {/* =================================================
                DAMS
            ================================================= */}

            <div className="hydro-category">
              <div className="hydro-category-header">
                <span>🏗️</span>

                <div>
                  <h3>
                    Dams
                  </h3>

                  <small>
                    50 km search radius
                  </small>
                </div>
              </div>

              <FeatureList
                items={data.dams}
                emptyMessage="No mapped dams found."
              />
            </div>

            {/* =================================================
                BRIDGES
            ================================================= */}

            <div className="hydro-category">
              <div className="hydro-category-header">
                <span>🌉</span>

                <div>
                  <h3>
                    Bridges
                  </h3>

                  <small>
                    20 km search radius
                  </small>
                </div>
              </div>

              <FeatureList
                items={data.bridges}
                emptyMessage="No mapped bridges found."
              />
            </div>
          </div>

          {/* =================================================
              NOTE
          ================================================= */}

          <div className="hydro-note">
            <span>ⓘ</span>

            <p>
              Distances are calculated from the
              selected monitoring coordinates to
              mapped geographic features. These
              features are exposure indicators and
              are not independently classified as
              Low, Moderate, or High risk.
            </p>
          </div>

          {/* =================================================
              SOURCE
          ================================================= */}

          <div className="hydro-source">
            Data Source:{" "}
            <strong>
              OpenStreetMap
            </strong>
          </div>
        </>
      )}
    </section>
  );
}

export default HydrologicalExposure;