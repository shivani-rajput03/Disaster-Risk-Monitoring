const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const CACHE_DURATION = 10 * 60 * 1000;
const REQUEST_TIMEOUT = 30000;

const cache = new Map();

let requestQueue = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCacheKey(query) {
  return query.trim();
}

async function executeRequest(query) {
  const cacheKey = getCacheKey(query);

  const cached = cache.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.timestamp < CACHE_DURATION
  ) {
    console.log("Overpass cache hit");
    return cached.data;
  }

  let lastError = null;

  for (const server of OVERPASS_SERVERS) {
    try {
      console.log("Overpass request:", server);

      const controller = new AbortController();

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT);

      try {
        const response = await fetch(server, {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Overpass server returned ${response.status}`
          );
        }

        const data = await response.json();

        cache.set(cacheKey, {
          timestamp: Date.now(),
          data,
        });

        console.log("Overpass request successful");

        return data;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error;

      console.warn(
        "Overpass server failed:",
        server,
        error.name === "AbortError"
          ? "Request timed out"
          : error.message
      );

      // Give the public server a little breathing room
      // before trying another server.
      await sleep(1000);
    }
  }

  throw (
    lastError ||
    new Error("All Overpass servers failed.")
  );
}

export function fetchOverpass(query) {
  // IMPORTANT:
  // All components share this queue.
  // Only ONE Overpass request runs at a time.
  const request = requestQueue.then(() =>
    executeRequest(query)
  );

  requestQueue = request.catch(() => {});

  return request;
}

export function clearOverpassCache() {
  cache.clear();
}