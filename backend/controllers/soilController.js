import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.API_KEY;

// GRABBING THE BASIC SOIL DATA
export const getSoilData = async (req, res) => {
  const { polyid } = req.params;

  try {
    const response = await fetch(
      `http://api.agromonitoring.com/agro/1.0/soil?polyid=${polyid}&appid=${API_KEY}&duplicated=true`
    );
    const data = await response.json();
    console.log(data);
    return res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// CREATING THE POLYGON
export const createPolygon = async (req, res) => {
  try {
    const { coordinates } = req.body;

    // Close the polygon (repeat first coordinate at the end)
    // const closedCoords = [...coordinates, coordinates[0]];

    const properCoords = coordinates.map(([lat, lon]) => [lon, lat]);

    // Close the polygon by repeating the first coordinate
    if (
      properCoords[0][0] !== properCoords[properCoords.length - 1][0] ||
      properCoords[0][1] !== properCoords[properCoords.length - 1][1]
    ) {
      properCoords.push(properCoords[0]);
    }

    const payload = {
      name: "User Polygon fixed",
      geo_json: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [properCoords],
        },
      },
    };

    const response = await fetch(
      `https://api.agromonitoring.com/agro/1.0/polygons?appid=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Polygon creation failed:", data);
      return res
        .status(500)
        .json({ error: "Failed to create polygon", details: data });
    }

    // send back the polygon id to the frontend
    res.json({
      polyid: data.id,
      center: data.center,
      area: data.area,
    });
  } catch (err) {
    console.error("Error creating polygon:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GETTING THE POLYGON DATA (MORE SPICIFIC + HISTORICAL)
export const getPolygonData = async (req, res) => {
  const now = Math.floor(Date.now() / 1000) - 60 * 5; // 5 minutes ago
  const sixMonthsAgo = now - 60 * 60 * 24 * 30 * 1;

  const { polyid } = req.params;

  console.log({ start: sixMonthsAgo, end: now }, polyid);

  try {
    const response = await fetch(
      `https://api.agromonitoring.com/agro/1.0/ndvi/history?start=${sixMonthsAgo}&end=${now}&polyid=${polyid}&appid=${API_KEY}`
    );
    const data = await response.json();
    console.log(data);
    return res.json(data);
  } catch (err) {
    console.error("Error fetching polygon data:", err);
    throw err;
  }
};
