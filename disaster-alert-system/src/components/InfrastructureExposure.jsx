import { useEffect, useState } from "react";
import "./InfrastructureExposure.css";

const OVERPASS_SERVERS = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const SEARCH_RADIUS = 5000; // 5 km

// Keep successful results temporarily so repeated searches
// for the same location do not make another Overpass request.
const infrastructureCache = new Map();

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const REQUEST_TIMEOUT = 30000; // 12 seconds


async function fetchInfrastructure(latitude, longitude) {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

  const cached = infrastructureCache.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.timestamp < CACHE_DURATION
  ) {
    console.log(
      "Using cached infrastructure data:",
      cacheKey
    );

    return cached.data;
  }

  const query = `
  [out:json][timeout:25];

  (
    nwr(
      around:${SEARCH_RADIUS},${latitude},${longitude}
    )["amenity"="hospital"];

    nwr(
      around:${SEARCH_RADIUS},${latitude},${longitude}
    )["amenity"="school"];

    nwr(
      around:${SEARCH_RADIUS},${latitude},${longitude}
    )["amenity"="fire_station"];

    way(
      around:${SEARCH_RADIUS},${latitude},${longitude}
    )["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"];
  );

  out center tags;
  `;

  let lastError = null;

  for (const server of OVERPASS_SERVERS) {
    let timeoutId = null;

    try {
      console.log(
        "Trying infrastructure server:",
        server
      );

      const controller = new AbortController();

      timeoutId = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT);

      const response = await fetch(server, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Overpass server returned ${response.status}`
        );
      }

      const data = await response.json();

      const result = processInfrastructure(
        data.elements || []
      );

      // Save only successful results.
      infrastructureCache.set(cacheKey, {
        timestamp: Date.now(),
        data: result,
      });

      console.log(
        "Infrastructure exposure loaded:",
        result
      );

      return result;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const message =
        error.name === "AbortError"
          ? "Request timed out"
          : error.message;

      console.warn(
        `Infrastructure server failed: ${server}`,
        message
      );

      lastError = error;
    }
  }

  throw (
    lastError ||
    new Error(
      "Unable to retrieve infrastructure data."
    )
  );
}


function getElementCoordinates(element) {
  if (
    element.lat !== undefined &&
    element.lon !== undefined
  ) {
    return {
      latitude: Number(element.lat),
      longitude: Number(element.lon),
    };
  }

  if (
    element.center &&
    element.center.lat !== undefined &&
    element.center.lon !== undefined
  ) {
    return {
      latitude: Number(element.center.lat),
      longitude: Number(element.center.lon),
    };
  }

  return null;
}


function processInfrastructure(elements) {
  const hospitals = [];
  const schools = [];
  const fireStations = [];
  const settlements = [];
  const roads = [];

  elements.forEach((element) => {
    const tags = element.tags || {};

    const coordinates =
      getElementCoordinates(element);

    if (!coordinates) {
      return;
    }

    const item = {
      id: `${element.type}-${element.id}`,
      name:
        tags.name ||
        tags["name:en"] ||
        "Unnamed facility",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    };

    if (tags.amenity === "hospital") {
      hospitals.push(item);
    }

    if (tags.amenity === "school") {
      schools.push(item);
    }

    if (tags.amenity === "fire_station") {
      fireStations.push(item);
    }

    if (
      ["city", "town", "village"].includes(
        tags.place
      )
    ) {
      settlements.push({
        ...item,
        type: tags.place,
      });
    }

    if (tags.highway) {
      roads.push({
        ...item,
        type: tags.highway,
      });
    }
  });

  return {
    hospitals: removeDuplicates(hospitals),
    schools: removeDuplicates(schools),
    fireStations:
      removeDuplicates(fireStations),
    settlements:
      removeDuplicates(settlements),
    roads: removeDuplicates(roads),
  };
}


function removeDuplicates(items) {
  const seen = new Set();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);

    return true;
  });
}


function FacilityList({
  title,
  icon,
  items,
  emptyText,
}) {
  return (
    <div className="infrastructure-category">

      <div className="infrastructure-category-header">

        <span className="infrastructure-category-icon">
          {icon}
        </span>

        <div>
          <strong>{title}</strong>

          <span>
            {items.length} mapped
          </span>
        </div>

      </div>


      {items.length > 0 ? (

        <div className="infrastructure-list">

          {items.slice(0, 5).map((item) => (

            <div
              className="infrastructure-item"
              key={item.id}
            >
              <span>•</span>

              <p>{item.name}</p>
            </div>

          ))}


          {items.length > 5 && (
            <small>
              + {items.length - 5} more mapped
            </small>
          )}

        </div>

      ) : (

        <div className="infrastructure-empty">
          {emptyText}
        </div>

      )}

    </div>
  );
}


function InfrastructureExposure({
  location,
  onDataChange,
}) {
  const [data, setData] = useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState("");


  useEffect(() => {

    if (
      !location ||
      location.latitude === undefined ||
      location.longitude === undefined
    ) {
      setData(null);

      if (onDataChange) {
        onDataChange(null);
      }

      return;
    }


    let cancelled = false;


    const loadInfrastructure = async () => {

      try {

        setLoading(true);
        setError("");
        setData(null);

        if (onDataChange) {
          onDataChange(null);
        }


        console.log(
          "Loading infrastructure exposure..."
        );


        const result =
          await fetchInfrastructure(
            Number(location.latitude),
            Number(location.longitude)
          );


        if (cancelled) {
          return;
        }


        console.log(
          "Infrastructure exposure:",
          result
        );


        setData(result);


        // Send the already-fetched data
        // to RiskMonitoring.
        if (onDataChange) {
          onDataChange(result);
        }

      } catch (requestError) {

        if (cancelled) {
          return;
        }


        console.error(
          "Infrastructure exposure failed:",
          requestError
        );


        setError(
          "Infrastructure data could not be retrieved."
        );


        if (onDataChange) {
          onDataChange(null);
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    };


    loadInfrastructure();


    return () => {
      cancelled = true;
    };

  }, [location, onDataChange]);


  if (!location) {
    return null;
  }


  const totalMapped =
    data
      ? data.hospitals.length +
        data.schools.length +
        data.fireStations.length +
        data.settlements.length +
        data.roads.length
      : 0;


  return (
    <div className="infrastructure-exposure-card">

      <div className="infrastructure-exposure-header">

        <div>

          <span className="section-label">
            EXPOSURE ASSESSMENT
          </span>


          <h2>
            Infrastructure & Critical Facilities
          </h2>


          <p>
            Geographic features and essential
            facilities mapped around the selected
            monitoring location.
          </p>

        </div>


        <div className="infrastructure-exposure-icon">
          🏥
        </div>

      </div>


      {loading && (

        <div className="infrastructure-loading">

          <span>⏳</span>


          <div>

            <strong>
              Mapping exposed infrastructure...
            </strong>


            <p>
              Searching OpenStreetMap geographic
              data within 5 km of the monitoring
              location.
            </p>

          </div>

        </div>

      )}


      {error && !loading && (

        <div className="infrastructure-error">
          ⚠️ {error}
        </div>

      )}


      {data && !loading && !error && (

        <>

          <div className="infrastructure-summary">

            <div>

              <span>
                TOTAL MAPPED FEATURES
              </span>


              <strong>
                {totalMapped}
              </strong>

            </div>


            <div>

              <span>
                SEARCH RADIUS
              </span>


              <strong>
                5 km
              </strong>

            </div>


            <div>

              <span>
                DATA SOURCE
              </span>


              <strong>
                OpenStreetMap
              </strong>

            </div>

          </div>


          <div className="infrastructure-grid">

            <FacilityList
              title="Hospitals"
              icon="🏥"
              items={data.hospitals}
              emptyText="No mapped hospitals found."
            />


            <FacilityList
              title="Schools"
              icon="🏫"
              items={data.schools}
              emptyText="No mapped schools found."
            />


            <FacilityList
              title="Fire Stations"
              icon="🚒"
              items={data.fireStations}
              emptyText="No mapped fire stations found."
            />


            <FacilityList
              title="Settlements"
              icon="🏘️"
              items={data.settlements}
              emptyText="No mapped settlements found."
            />


            <FacilityList
              title="Major Roads"
              icon="🛣️"
              items={data.roads}
              emptyText="No mapped major roads found."
            />

          </div>


          <div className="infrastructure-note">

            <span>ⓘ</span>


            <p>
              These values represent mapped
              geographic exposure features within
              the search radius. They are not
              independently classified as Low,
              Moderate, or High risk.
            </p>

          </div>

        </>

      )}

    </div>
  );
}


export default InfrastructureExposure;