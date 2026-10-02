// src/nearbyPlaces.js

const OVERPASS_SERVERS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const REQUEST_TIMEOUT = 30000;

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function getDirection(
  centerLat,
  centerLon,
  placeLat,
  placeLon
) {
  const latDifference = placeLat - centerLat;
  const lonDifference = placeLon - centerLon;

  const angle =
    (Math.atan2(lonDifference, latDifference) * 180) /
    Math.PI;

  const normalizedAngle = (angle + 360) % 360;

  if (
    normalizedAngle >= 337.5 ||
    normalizedAngle < 22.5
  ) {
    return "N";
  }

  if (
    normalizedAngle >= 22.5 &&
    normalizedAngle < 67.5
  ) {
    return "NE";
  }

  if (
    normalizedAngle >= 67.5 &&
    normalizedAngle < 112.5
  ) {
    return "E";
  }

  if (
    normalizedAngle >= 112.5 &&
    normalizedAngle < 157.5
  ) {
    return "SE";
  }

  if (
    normalizedAngle >= 157.5 &&
    normalizedAngle < 202.5
  ) {
    return "S";
  }

  if (
    normalizedAngle >= 202.5 &&
    normalizedAngle < 247.5
  ) {
    return "SW";
  }

  if (
    normalizedAngle >= 247.5 &&
    normalizedAngle < 292.5
  ) {
    return "W";
  }

  return "NW";
}

function selectDirectionalPlaces(
  places,
  centerLatitude,
  centerLongitude
) {
  const directions = [
    "NW",
    "N",
    "NE",
    "W",
    "E",
    "SW",
    "S",
    "SE",
  ];

  const result = {};

  directions.forEach((direction) => {
    result[direction] = null;
  });

  const processedPlaces = places
    .map((place) => {
      const distance = calculateDistance(
        centerLatitude,
        centerLongitude,
        place.latitude,
        place.longitude
      );

      const direction = getDirection(
        centerLatitude,
        centerLongitude,
        place.latitude,
        place.longitude
      );

      return {
        ...place,
        distanceKm: Number(distance.toFixed(2)),
        direction,
      };
    })
    .filter((place) => place.distanceKm >= 3);

  directions.forEach((direction) => {
    const candidates = processedPlaces.filter(
      (place) => place.direction === direction
    );

    if (candidates.length === 0) {
      return;
    }

    /*
      Preference:
      1. City
      2. Town
      3. Village

      Within the same category, choose the
      closest location.
    */

    const cities = candidates.filter(
      (place) => place.type === "city"
    );

    const towns = candidates.filter(
      (place) => place.type === "town"
    );

    const villages = candidates.filter(
      (place) => place.type === "village"
    );

    let selected;

    if (cities.length > 0) {
      selected = [...cities].sort(
        (a, b) => a.distanceKm - b.distanceKm
      )[0];
    } else if (towns.length > 0) {
      selected = [...towns].sort(
        (a, b) => a.distanceKm - b.distanceKm
      )[0];
    } else {
      selected = [...villages].sort(
        (a, b) => a.distanceKm - b.distanceKm
      )[0];
    }

    result[direction] = selected;
  });

  return result;
}

export async function findNearbyPlaces(
  latitude,
  longitude
) {
  /*
    20 km radius is used to keep the Overpass
    query lightweight while still providing
    nearby real populated locations.
  */

  const radius = 20000;

  const query = `
    [out:json][timeout:20];

    node
      ["place"~"^(city|town|village)$"]
      (around:${radius},${latitude},${longitude});

    out body;
  `;

  for (const server of OVERPASS_SERVERS) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT);

    try {
      console.log(
        "Trying nearby places server:",
        server
      );

      const response = await fetch(server, {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          "data=" +
          encodeURIComponent(query),

        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(
          "Server failed:",
          server,
          "Status:",
          response.status
        );

        continue;
      }

      const data = await response.json();

      if (
        !data ||
        !Array.isArray(data.elements)
      ) {
        console.warn(
          "Invalid Overpass response:",
          server
        );

        continue;
      }

      const places = data.elements
        .filter(
          (place) =>
            place.tags &&
            place.tags.name &&
            place.tags.place &&
            place.lat !== undefined &&
            place.lon !== undefined
        )
        .map((place) => ({
          name: place.tags.name,
          latitude: place.lat,
          longitude: place.lon,
          type: place.tags.place,
        }));

      console.log(
        "Nearby populated places found:",
        places.length
      );

      if (places.length === 0) {
        console.warn(
          "No nearby populated places found:",
          server
        );

        continue;
      }

      const directionalPlaces =
        selectDirectionalPlaces(
          places,
          latitude,
          longitude
        );

      console.log(
        "Selected directional places:",
        directionalPlaces
      );

      return directionalPlaces;
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === "AbortError") {
        console.warn(
          "Nearby places server timed out:",
          server
        );
      } else {
        console.warn(
          "Nearby places server error:",
          server,
          error.message
        );
      }
    }
  }

  throw new Error(
    "Unable to fetch nearby places"
  );
}