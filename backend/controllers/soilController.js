import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables (if not already loaded by server.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const API_KEY = process.env.API_KEY;

// Log API key status on module load (for debugging)
if (!API_KEY) {
  console.warn("⚠️  WARNING: API_KEY not found. Make sure .env file exists in backend/ directory");
} else {
  console.log("✓ API_KEY loaded successfully");
}

// GRABBING THE BASIC SOIL DATA
export const getSoilData = async (req, res) => {
  const { polyid } = req.params;

  if (!API_KEY) {
    console.error("API_KEY is not set in environment variables");
    return res.status(500).json({ error: "Server configuration error: API_KEY not found" });
  }

  try {
    const response = await fetch(
      `http://api.agromonitoring.com/agro/1.0/soil?polyid=${polyid}&appid=${API_KEY}&duplicated=true`
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Soil API error:", errorData);
      return res.status(response.status).json({ 
        error: "Failed to fetch soil data", 
        details: errorData 
      });
    }
    
    const data = await response.json();
    console.log("Soil data:", data);
    return res.json(data);
  } catch (error) {
    console.error("Error fetching soil data:", error);
    return res.status(500).json({ error: "Server error", message: error.message });
  }
};

// CREATING THE POLYGON
export const createPolygon = async (req, res) => {
  try {
    if (!API_KEY) {
      console.error("API_KEY is not set in environment variables");
      return res.status(500).json({ error: "Server configuration error: API_KEY not found" });
    }

    const { coordinates } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return res.status(400).json({ 
        error: "Invalid coordinates", 
        message: "Coordinates must be an array with at least 3 points" 
      });
    }

    // Validate and convert coordinates from [lat, lon] to [lon, lat] (GeoJSON format)
    let properCoords;
    try {
      properCoords = coordinates.map((coord, index) => {
        if (!Array.isArray(coord) || coord.length < 2) {
          throw new Error(`Invalid coordinate at index ${index}: must be an array with [lat, lon]`);
        }
        
        const [lat, lon] = coord;
        
        if (typeof lat !== 'number' || typeof lon !== 'number') {
          throw new Error(`Invalid coordinate at index ${index}: lat and lon must be numbers`);
        }
        
        // Validate latitude and longitude ranges
        if (lat < -90 || lat > 90) {
          throw new Error(`Invalid latitude at index ${index}: must be between -90 and 90`);
        }
        if (lon < -180 || lon > 180) {
          throw new Error(`Invalid longitude at index ${index}: must be between -180 and 180`);
        }
        
        // Convert from [lat, lon] to [lon, lat] for GeoJSON
        return [lon, lat];
      });
    } catch (coordError) {
      console.error("Coordinate validation error:", coordError.message);
      return res.status(400).json({
        error: "Invalid coordinates",
        message: coordError.message,
        received: coordinates
      });
    }

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

    console.log("Creating polygon with payload:", JSON.stringify(payload, null, 2));

    // Add duplicated=true parameter to allow creating polygons with same coordinates
    const response = await fetch(
      `https://api.agromonitoring.com/agro/1.0/polygons?appid=${API_KEY}&duplicated=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Polygon creation failed - Status:", response.status);
      console.error("Polygon creation failed - Response:", JSON.stringify(data, null, 2));
      console.error("Polygon creation failed - Request payload:", JSON.stringify(payload, null, 2));
      
      // Handle duplicate polygon error - extract existing polygon ID if mentioned
      let errorMessage = data.message || data.error || "Unknown error from AgroMonitoring API";
      let existingPolyid = null;
      
      if (data.message && data.message.includes("duplicated")) {
        // Extract polygon ID from error message if present
        const polyidMatch = data.message.match(/([a-f0-9]{24})/i);
        if (polyidMatch) {
          existingPolyid = polyidMatch[1];
          errorMessage = `Polygon already exists. Using existing polygon ID: ${existingPolyid}`;
          console.log("Found existing polygon ID in error:", existingPolyid);
        }
      }
      
      return res
        .status(response.status || 500)
        .json({ 
          error: "Failed to create polygon", 
          details: data,
          status: response.status,
          message: errorMessage,
          existingPolyid: existingPolyid
        });
    }

    console.log("Polygon created successfully:", data.id);

    // send back the polygon id to the frontend
    return res.json({
      polyid: data.id,
      center: data.center,
      area: data.area,
    });
  } catch (err) {
    console.error("Error creating polygon:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("NDVI API error:", errorData);
      return res.status(response.status).json({ 
        error: "Failed to fetch NDVI data", 
        details: errorData 
      });
    }
    
    const data = await response.json();
    console.log("NDVI data:", data);
    return res.json(data);
  } catch (err) {
    console.error("Error fetching polygon data:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
};
