// =====================================================
// AEGIS - HISTORICAL FLOOD LOOKUP
// Source: Dartmouth Flood Observatory (DFO)
// Global Flood Records: 1985-2023
// =====================================================

const FLOOD_DATA_URL =
  "https://zenodo.org/api/records/19288171/files/Global_Flood_Records.csv/content";

const SEARCH_RADIUS_KM = 100;

// -----------------------------------------------------
// Distance between two coordinates
// -----------------------------------------------------
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    R *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

// -----------------------------------------------------
// Simple CSV parser
// -----------------------------------------------------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (
      char === '"' &&
      insideQuotes &&
      next === '"'
    ) {
      value += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(value.trim());
      value = "";
      continue;
    }

    if (
      (char === "\n" || char === "\r") &&
      !insideQuotes
    ) {
      if (char === "\r" && next === "\n") {
        i++;
      }

      row.push(value.trim());
      value = "";

      if (row.some((item) => item !== "")) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  if (value || row.length > 0) {
    row.push(value.trim());
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) =>
    header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  );

  return rows.slice(1).map((values) => {
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = values[index] ?? "";
    });

    return obj;
  });
}

// -----------------------------------------------------
// Find a column from possible names
// -----------------------------------------------------
function findColumn(row, names) {
  const keys = Object.keys(row);

  return keys.find((key) =>
    names.includes(key)
  );
}

// -----------------------------------------------------
// Get historical floods near searched location
// -----------------------------------------------------
export async function getHistoricalFloods(
  latitude,
  longitude
) {
  if (
    latitude === undefined ||
    longitude === undefined
  ) {
    return {
      success: false,
      events: [],
      message:
        "Location coordinates unavailable.",
    };
  }

  try {
    // -------------------------------------------------
    // Download DFO global flood dataset
    // -------------------------------------------------
    const response = await fetch(FLOOD_DATA_URL);

    if (!response.ok) {
      throw new Error(
        `Flood dataset request failed: ${response.status}`
      );
    }

    const csvText = await response.text();

    const records = parseCSV(csvText);

    if (!records.length) {
      throw new Error(
        "Historical flood dataset is empty."
      );
    }

    const sample = records[0];

console.log("DFO CSV COLUMNS:", Object.keys(sample));

    // -------------------------------------------------
    // DFO DATASET COLUMNS
    //
    // DFO Centroid X = Longitude
    // DFO Centroid Y = Latitude
    // -------------------------------------------------

    const longitudeColumn = findColumn(sample, [
      "dfo_centroid_x",
      "centroid_x",
      "longitude",
      "lon",
      "lng",
      "event_lon",
      "event_longitude",
    ]);

    const latitudeColumn = findColumn(sample, [
      "dfo_centroid_y",
      "centroid_y",
      "latitude",
      "lat",
      "event_lat",
      "event_latitude",
    ]);

    const startDateColumn = findColumn(sample, [
      "began",
      "begin",
      "date_begin",
      "start_date",
      "date_start",
      "event_date",
    ]);

    const endDateColumn = findColumn(sample, [
      "ended",
      "end",
      "date_end",
      "end_date",
      "date_finish",
    ]);

    const countryColumn = findColumn(sample, [
      "country",
      "country_name",
      "dfo_country",
    ]);

    const severityColumn = findColumn(sample, [
      "severity",
      "flood_severity",
      "dfo_severity",
    ]);

    const causeColumn = findColumn(sample, [
      "cause",
      "main_cause",
      "primary_cause",
      "dfo_main_cause",
    ]);

    const locationColumn = findColumn(sample, [
      "detailed_locations",
      "detailed_location",
      "location",
      "location_name",
      "place",
      "region",
      "description",
    ]);

    // -------------------------------------------------
    // Debug information
    // -------------------------------------------------

    console.log(
      "DFO flood dataset records:",
      records.length
    );

    console.log(
      "DFO detected latitude column:",
      latitudeColumn
    );

    console.log(
      "DFO detected longitude column:",
      longitudeColumn
    );

    console.log(
      "DFO detected start date column:",
      startDateColumn
    );

    console.log(
      "DFO detected location column:",
      locationColumn
    );

    // -------------------------------------------------
    // Validate coordinate columns
    // -------------------------------------------------

    if (
      !latitudeColumn ||
      !longitudeColumn
    ) {
      throw new Error(
        "DFO latitude/longitude columns could not be detected."
      );
    }

    // -------------------------------------------------
    // Find events within search radius
    // -------------------------------------------------

    const nearbyEvents = records
      .map((record) => {
        const eventLatitude = Number(
          record[latitudeColumn]
        );

        const eventLongitude = Number(
          record[longitudeColumn]
        );

        if (
          !Number.isFinite(eventLatitude) ||
          !Number.isFinite(eventLongitude)
        ) {
          return null;
        }

        const distance = distanceKm(
          Number(latitude),
          Number(longitude),
          eventLatitude,
          eventLongitude
        );

        // Outside search radius
        if (
          distance > SEARCH_RADIUS_KM
        ) {
          return null;
        }

        return {
          latitude: eventLatitude,

          longitude: eventLongitude,

          distance: Number(
            distance.toFixed(1)
          ),

          startDate:
            startDateColumn
              ? record[startDateColumn]
              : "Historical record",

          endDate:
            endDateColumn
              ? record[endDateColumn]
              : "",

          country:
            countryColumn
              ? record[countryColumn]
              : "",

          severity:
            severityColumn
              ? record[severityColumn]
              : "",

          cause:
            causeColumn
              ? record[causeColumn]
              : "",

          location:
            locationColumn
              ? record[locationColumn]
              : "",
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          a.distance - b.distance
      );

    // -------------------------------------------------
    // Remove duplicate-looking records
    // -------------------------------------------------

    const uniqueEvents = [];

    const seen = new Set();

    nearbyEvents.forEach((event) => {
      const key = [
        event.startDate,
        event.latitude.toFixed(2),
        event.longitude.toFixed(2),
      ].join("|");

      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push(event);
      }
    });

    // -------------------------------------------------
    // Final result
    // -------------------------------------------------

    console.log(
      "Historical flood events near location:",
      uniqueEvents
    );

    return {
      success: true,

      events:
        uniqueEvents.slice(0, 10),

      radiusKm:
        SEARCH_RADIUS_KM,

      totalRecordsChecked:
        records.length,

      searchedLocation: {
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
    };
  } catch (error) {
    console.error(
      "Historical flood lookup failed:",
      error
    );

    return {
      success: false,

      events: [],

      message:
        "Historical flood records could not be loaded at this time.",
    };
  }
}