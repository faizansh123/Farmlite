/**
 * AI Agriculture Analyst Controller
 * Analyzes soil data, NDVI history, and provides predictions and recommendations
 * Uses ONLY Gemini AI for analysis
 */

import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const API_KEY = process.env.API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Call Gemini API to analyze agriculture data
 * @param {object} data - Agriculture data object
 * @returns {object} Gemini analysis response
 */
async function callGeminiAI(data) {
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not found, skipping Gemini analysis");
    return null;
  }

  if (!data) {
    console.error("callGeminiAI: data parameter is undefined");
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Use Gemini models - gemini-2.5-flash is the latest and most available model
    // Based on working implementation using gemini-2.5-flash
    const defaultModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    let modelName = defaultModel;
    let model = genAI.getGenerativeModel({ model: modelName });
    console.log(`Attempting to use Gemini model: ${modelName}`);
    console.log(`Note: If this fails, the code will automatically try alternative models.`);

    // Format timestamp - safely access soilData
    const soilDataDt = data.soilData && typeof data.soilData === 'object' ? data.soilData.dt : null;
    const timestamp = soilDataDt 
      ? new Date(soilDataDt * 1000).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : "N/A";

    // Safely access data properties with defaults
    const polygonInfo = data.polygonInfo || {};
    const polyid = data.polyid || "N/A";
    const temp0cm = data.temp0cm !== null && data.temp0cm !== undefined ? data.temp0cm : null;
    const temp10cm = data.temp10cm !== null && data.temp10cm !== undefined ? data.temp10cm : null;
    const moisture = data.moisture !== null && data.moisture !== undefined ? data.moisture : null;
    const ndviMean = data.ndviMean !== null && data.ndviMean !== undefined ? data.ndviMean : null;
    const ndviMedian = data.ndviMedian !== null && data.ndviMedian !== undefined ? data.ndviMedian : null;
    const ndviMin = data.ndviMin !== null && data.ndviMin !== undefined ? data.ndviMin : null;
    const ndviMax = data.ndviMax !== null && data.ndviMax !== undefined ? data.ndviMax : null;
    const ndviStd = data.ndviStd !== null && data.ndviStd !== undefined ? data.ndviStd : null;

    // Build coordinates string safely
    let coordinatesStr = "";
    if (polygonInfo.coordinates && Array.isArray(polygonInfo.coordinates)) {
      coordinatesStr = polygonInfo.coordinates
        .map((coord, idx) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            return `${idx + 1}. [${coord[0]}, ${coord[1]}]`;
          }
          return null;
        })
        .filter(Boolean)
        .join('\n');
    }

    // Build location string from API data
    let locationCenter = "N/A";
    if (polygonInfo.center && Array.isArray(polygonInfo.center) && polygonInfo.center.length >= 2) {
      // Center is in [lat, lon] format from API, display as [lon, lat] for consistency
      locationCenter = `[${polygonInfo.center[1]}, ${polygonInfo.center[0]}]`;
    }
    
    // Build the prompt using ONLY data from API
    const prompt = `You are an Agricultural AI Analyst for the Smart Farming Assistant — "Earth from Space."

Use the following field data to assess soil quality, vegetation health, and overall fertility.

Provide your analysis clearly and explain what the numbers mean in plain language.

Input Data

Polygon ID: ${polyid}

${locationCenter !== "N/A" ? `Location Center: ${locationCenter}` : ""}

Soil Data:
- Surface Temperature: ${temp0cm !== null ? `${temp0cm.toFixed(2)}°C` : "N/A"}
- Temperature at 10 cm: ${temp10cm !== null ? `${temp10cm.toFixed(2)}°C` : "N/A"}
- Soil Moisture: ${moisture !== null ? `${moisture.toFixed(1)}%` : "N/A"}
- Timestamp: ${timestamp}

NDVI Data (Vegetation Index - Measures Plant Health and Density):
${ndviMean !== null && !isNaN(ndviMean) 
  ? `✅ VEGETATION DATA AVAILABLE:
- Mean NDVI: ${ndviMean.toFixed(4)} (This is the primary vegetation health indicator)
- Median NDVI: ${ndviMedian !== null && !isNaN(ndviMedian) ? ndviMedian.toFixed(4) : "N/A"}
- Min NDVI: ${ndviMin !== null && !isNaN(ndviMin) ? ndviMin.toFixed(4) : "N/A"}
- Max NDVI: ${ndviMax !== null && !isNaN(ndviMax) ? ndviMax.toFixed(4) : "N/A"}
- Standard Deviation: ${ndviStd !== null && !isNaN(ndviStd) ? ndviStd.toFixed(4) : "N/A"}

IMPORTANT: The Mean NDVI value of ${ndviMean.toFixed(4)} indicates ${ndviMean < 0.1 ? "very poor or no vegetation" : ndviMean < 0.3 ? "poor/sparse vegetation" : ndviMean < 0.5 ? "moderate vegetation health" : ndviMean < 0.7 ? "good vegetation density" : "excellent vegetation health"}. Use this value to assess vegetation cover and plant health.`
  : `❌ VEGETATION DATA NOT AVAILABLE:
- Mean NDVI: N/A
- Median NDVI: N/A
- Min NDVI: N/A
- Max NDVI: N/A
- Standard Deviation: N/A

NOTE: NDVI (vegetation) data is not available for this polygon. This could be because:
  * The polygon is too new (NDVI data processing takes time)
  * The location has limited satellite coverage
  * The polygon was recently created and data is still being collected

Please analyze based on soil data only and explicitly state that vegetation/NDVI data is unavailable.`}

Your Tasks

Analyze Soil Condition
- Describe if the soil is dry, optimal, or wet based on the moisture value.
- Explain if the temperature range is suitable for plant growth.
- If moisture or temperature is too low or high, explain how it affects the crops.

Analyze Vegetation Health
- NDVI (Normalized Difference Vegetation Index) measures vegetation health and density.
- NDVI values range from -1 to 1:
  * < 0.1: Very poor / Bare soil / No vegetation
  * 0.1 - 0.3: Poor / Sparse vegetation / Stressed plants
  * 0.3 - 0.5: Moderate / Healthy vegetation / Growing crops
  * 0.5 - 0.7: Good / Dense vegetation / Healthy crops
  * > 0.7: Excellent / Very dense vegetation / Thriving crops
- Use the NDVI Mean value provided above to assess current vegetation cover.
- If NDVI Mean is provided (not N/A), describe the vegetation condition based on the value.
- If NDVI Mean is N/A or missing, note that vegetation data is unavailable.

Determine Overall Soil Quality
- Combine your soil and vegetation observations to rate overall soil quality as: High, Moderate, or Low
- Explain this rating clearly and give a confidence level (e.g., "Confidence: 90%").

Summarize Field Condition
- Provide a one-sentence summary of the field's health and growth potential.
- Example: "The soil is dry and vegetation is weak, suggesting low fertility but stable temperatures."

Give AI Recommendations
- Suggest 3–4 short, practical actions to improve soil or crop growth (like adding organic compost, adjusting irrigation, or monitoring NDVI again next week).

Return a structured JSON output:
{
  "Soil_Quality_Level": "",
  "Confidence": "",
  "Field_Summary": "",
  "Predicted_Crops": [],
  "Recommendations": []
}

IMPORTANT: 
- Respond ONLY with valid JSON. 
- Do not include any markdown formatting, code blocks, or additional text outside the JSON object.
- Use only the data provided above from the API.
- Soil_Quality_Level should be: "High", "Moderate", or "Low"
- Confidence should be a percentage string (e.g., "90%") or a decimal number (e.g., 0.9)
- Field_Summary should be a clear one-sentence summary.
- Predicted_Crops should be an array of crop names (e.g., ["barley", "wheat", "rye"])
- Recommendations should be an array of 3-4 actionable improvement steps.`;

    // Log NDVI values before sending to Gemini
    console.log("=".repeat(60));
    console.log("NDVI VALUES BEING SENT TO GEMINI:");
    console.log(`  Mean: ${ndviMean !== null && !isNaN(ndviMean) ? ndviMean.toFixed(4) : "N/A"}`);
    console.log(`  Median: ${ndviMedian !== null && !isNaN(ndviMedian) ? ndviMedian.toFixed(4) : "N/A"}`);
    console.log(`  Min: ${ndviMin !== null && !isNaN(ndviMin) ? ndviMin.toFixed(4) : "N/A"}`);
    console.log(`  Max: ${ndviMax !== null && !isNaN(ndviMax) ? ndviMax.toFixed(4) : "N/A"}`);
    console.log(`  Std: ${ndviStd !== null && !isNaN(ndviStd) ? ndviStd.toFixed(4) : "N/A"}`);
    console.log("=".repeat(60));
    
    // Also log a snippet of the prompt to verify NDVI data is included
    const promptSnippet = prompt.substring(prompt.indexOf("NDVI Data"), prompt.indexOf("Your Tasks"));
    console.log("Prompt snippet (NDVI section):");
    console.log(promptSnippet);
    console.log("=".repeat(60));
    
    console.log("Sending prompt to Gemini AI...");
    let result;
    let response;
    let text;
    
    try {
      result = await model.generateContent(prompt);
      response = await result.response;
      text = response.text();
      console.log(`✓ Received response from Gemini AI (${modelName}), length:`, text.length);
    } catch (apiError) {
      // If model fails during generateContent, try alternative models
      console.error(`✗ Error with model ${modelName}:`, apiError.message);
      
      if (apiError.message && (apiError.message.includes("not found") || apiError.message.includes("404") || apiError.status === 404)) {
        console.warn("Model not found, trying alternative models...");
        
        // Try alternative models in order of preference
        // gemini-2.5-flash is the latest and most available model (2025)
        const alternativeModels = [
          "gemini-2.5-flash",        // Latest model (2025) - most likely to work
          "gemini-2.0-flash-exp",    // Experimental 2.0 model
          "gemini-1.5-flash",        // Fallback to 1.5 flash
          "gemini-1.5-pro",          // Fallback to 1.5 pro
          "gemini-1.5-flash-latest", // Latest 1.5 flash
          "gemini-1.5-pro-latest",   // Latest 1.5 pro
          "gemini-pro"               // Legacy model (unlikely to work)
        ].filter(m => m !== modelName);
        
        let success = false;
        for (const altModelName of alternativeModels) {
          try {
            console.log(`Trying alternative model: ${altModelName}`);
            const altModel = genAI.getGenerativeModel({ model: altModelName });
            result = await altModel.generateContent(prompt);
            response = await result.response;
            text = response.text();
            modelName = altModelName;
            console.log(`✓ Success with model ${modelName}, response length:`, text.length);
            success = true;
            break;
          } catch (altError) {
            console.warn(`✗ Model ${altModelName} also failed:`, altError.message);
            continue;
          }
        }
        
        if (!success) {
          throw new Error(`All Gemini models failed. Original error: ${apiError.message}. Please verify your GEMINI_API_KEY and check available models.`);
        }
      } else {
        // Non-404 error (auth, rate limit, etc.)
        throw apiError;
      }
    }

    // Parse JSON from response (remove markdown code blocks if present)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Try to extract JSON from the response if it's wrapped in text
    // Look for JSON object pattern
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Parse JSON
    try {
      const geminiResult = JSON.parse(jsonText);
      return geminiResult;
    } catch (parseError) {
      console.error("Error parsing Gemini JSON response:", parseError);
      console.error("Response text:", jsonText.substring(0, 500));
      return null;
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error.message) {
      console.error("Error message:", error.message);
    }
    return null;
  }
}

/**
 * Main AI Analysis function - Uses ONLY Gemini AI
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const analyzeAgriculture = async (req, res) => {
  try {
    const { polyid } = req.params;
    
    if (!polyid) {
      return res.status(400).json({ 
        error: "Polygon ID is required",
        message: "Please provide a valid polygon ID" 
      });
    }

    // Check if Gemini API key is available
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "Gemini API key not configured", 
        message: "GEMINI_API_KEY is required for AI analysis. Please add it to backend/.env" 
      });
    }
    
    // Log incoming request for debugging
    console.log("AI Analysis Request - polyid:", polyid);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    // Fetch soil data and NDVI history from API
    // Frontend doesn't send data in body, so we always fetch from API using polyid
    let soilData = null;
    let ndviHistory = null;
    
    // Check if data was provided in request body (optional, for testing)
    if (req.body && req.body.soilData) {
      console.log("Using soilData from request body");
      soilData = req.body.soilData;
    }
    
    if (req.body && req.body.ndviHistory) {
      console.log("Using ndviHistory from request body");
      ndviHistory = req.body.ndviHistory;
    }
    
    // Fetch data from API if not provided in body
    if (!soilData || !ndviHistory) {
      if (!API_KEY) {
        return res.status(500).json({ 
          error: "Server configuration error", 
          message: "API_KEY not found. Please add it to backend/.env" 
        });
      }
      
      try {
        // Fetch soil data from API
        if (!soilData) {
          console.log(`Fetching soil data from API for polyid: ${polyid}`);
          const soilRes = await fetch(
            `http://api.agromonitoring.com/agro/1.0/soil?polyid=${polyid}&appid=${API_KEY}&duplicated=true`
          );
          if (soilRes.ok) {
            soilData = await soilRes.json();
            console.log("Soil data fetched successfully:", Object.keys(soilData));
          } else {
            const errorData = await soilRes.json().catch(() => ({}));
            console.error("Error fetching soil data for analysis:", errorData);
            return res.status(soilRes.status).json({ 
              error: "Failed to fetch soil data", 
              message: errorData.message || "Could not fetch soil data from API",
              details: errorData
            });
          }
        }
        
        // Fetch NDVI history from API
        if (!ndviHistory) {
          console.log(`Fetching NDVI history from API for polyid: ${polyid}`);
          
          // Try multiple time ranges - newer polygons might not have historical data
          // Try wider ranges first, then narrow down
          const now = Math.floor(Date.now() / 1000);
          const timeRanges = [
            { name: "Last 1 year", start: now - (60 * 60 * 24 * 365), end: now },
            { name: "Last 6 months", start: now - (60 * 60 * 24 * 30 * 6), end: now },
            { name: "Last 3 months", start: now - (60 * 60 * 24 * 30 * 3), end: now },
            { name: "Last 30 days", start: now - (60 * 60 * 24 * 30), end: now },
            { name: "Last 7 days", start: now - (60 * 60 * 24 * 7), end: now },
            { name: "Last 1 day", start: now - (60 * 60 * 24), end: now }
          ];
          
          let ndviFetched = false;
          
          for (const timeRange of timeRanges) {
            if (ndviFetched) break;
            
            try {
              const ndviUrl = `https://api.agromonitoring.com/agro/1.0/ndvi/history?start=${timeRange.start}&end=${timeRange.end}&polyid=${polyid}&appid=${API_KEY}`;
              console.log(`Trying NDVI fetch with ${timeRange.name} range...`);
              console.log("NDVI API URL:", ndviUrl.replace(API_KEY, "API_KEY_HIDDEN"));
              
              const ndviRes = await fetch(ndviUrl);
              
              if (ndviRes.ok) {
                const responseData = await ndviRes.json();
                
                // Check if we got valid NDVI data
                // Valid means: array with entries containing data.mean/data.value, or object with data
                let hasValidData = false;
                if (Array.isArray(responseData)) {
                  if (responseData.length > 0) {
                    // Check if any entry has valid NDVI data
                    hasValidData = responseData.some(item => {
                      if (!item || typeof item !== 'object') return false;
                      // Check for data.mean or data.value
                      if (item.data && typeof item.data === 'object') {
                        return item.data.mean !== undefined || item.data.value !== undefined;
                      }
                      // Check for direct value or mean
                      return item.value !== undefined || item.mean !== undefined;
                    });
                  }
                } else if (responseData && typeof responseData === 'object') {
                  // Single object response
                  hasValidData = Object.keys(responseData).length > 0 && 
                    (responseData.data || responseData.mean !== undefined || responseData.value !== undefined);
                }
                
                if (hasValidData) {
                  ndviHistory = responseData;
                  ndviFetched = true;
                  console.log(`✅ NDVI history fetched successfully with ${timeRange.name} range`);
                  console.log("NDVI history raw response (first 1000 chars):", JSON.stringify(ndviHistory).substring(0, 1000));
                  
                  if (Array.isArray(ndviHistory) && ndviHistory.length > 0) {
                    console.log(`NDVI array has ${ndviHistory.length} entries`);
                    console.log("First NDVI entry (full):", JSON.stringify(ndviHistory[0], null, 2));
                    if (ndviHistory[0].data) {
                      console.log("First entry data keys:", Object.keys(ndviHistory[0].data));
                      console.log("  Has 'mean'?", ndviHistory[0].data.mean !== undefined, "→", ndviHistory[0].data.mean);
                      console.log("  Has 'value'?", ndviHistory[0].data.value !== undefined, "→", ndviHistory[0].data.value);
                    }
                  }
                  break;
                } else {
                  if (Array.isArray(responseData) && responseData.length === 0) {
                    console.log(`⚠️  NDVI API returned empty array [] for ${timeRange.name} range (no data available)`);
                  } else if (Array.isArray(responseData) && responseData.length > 0) {
                    console.log(`⚠️  NDVI API returned ${responseData.length} entries but none have valid NDVI structure`);
                    console.log(`    Sample entry:`, JSON.stringify(responseData[0]).substring(0, 300));
                  } else {
                    console.log(`⚠️  NDVI API returned invalid response for ${timeRange.name} range`);
                  }
                  console.log(`    Trying next time range...`);
                }
              } else if (ndviRes.status === 404) {
                console.log(`⚠️  NDVI not found (404) for ${timeRange.name} range - polygon may be too new or no NDVI data available`);
                // Continue to next time range
              } else {
                const errorData = await ndviRes.json().catch(() => ({}));
                console.warn(`⚠️  NDVI API error (${ndviRes.status}) for ${timeRange.name}:`, errorData);
                // Continue to next time range
              }
            } catch (fetchError) {
              console.warn(`⚠️  Error fetching NDVI with ${timeRange.name} range:`, fetchError.message);
              // Continue to next time range
            }
          }
          
          if (!ndviFetched) {
            console.warn("⚠️  Could not fetch NDVI data with any time range. Possible reasons:");
            console.warn("   1. Polygon is too new (NDVI data takes 3-5 days to process after creation)");
            console.warn("   2. Polygon is too small (< 1 hectare - Sentinel-2 has 10m resolution)");
            console.warn("   3. Polygon location has no satellite coverage");
            console.warn("   4. Time range doesn't include any NDVI captures (Sentinel-2 revisits every 5 days)");
            console.warn("   5. Cloud cover prevented satellite data collection");
            console.warn("");
            console.warn("💡 Solutions:");
            console.warn("   - Wait 3-5 days after polygon creation");
            console.warn("   - Ensure polygon covers at least 1-2 hectares");
            console.warn("   - Try a wider date range (6+ months)");
            console.warn("   - Check polygon coordinates are valid");
            console.warn("");
            console.warn("   Analysis will continue without NDVI data");
            ndviHistory = null;
          }
        }
      } catch (fetchError) {
        console.error("Error fetching data for analysis:", fetchError);
        console.error("Error stack:", fetchError.stack);
        return res.status(500).json({ 
          error: "Failed to fetch data for analysis", 
          message: fetchError.message || "Network error while fetching data from API"
        });
      }
    }
    
    // Validate that we have soil data
    if (!soilData || typeof soilData !== 'object') {
      console.error("Invalid soilData:", soilData);
      return res.status(404).json({ 
        error: "Soil data not available", 
        message: "Could not fetch soil data for analysis. Please ensure the polygon ID is valid.",
        received: soilData
      });
    }
    
    console.log("Processing soil data:", {
      hasT0: soilData.t0 !== undefined,
      hasT10: soilData.t10 !== undefined,
      hasMoisture: soilData.moisture !== undefined,
      keys: Object.keys(soilData)
    });
    
    // Extract and convert temperature data (API returns in Kelvin)
    const temp0cm = soilData.t0 !== undefined && soilData.t0 !== null && !isNaN(soilData.t0) 
      ? soilData.t0 - 273.15 
      : null;
    const temp10cm = soilData.t10 !== undefined && soilData.t10 !== null && !isNaN(soilData.t10) 
      ? soilData.t10 - 273.15 
      : null;
    
    // Extract and convert moisture data (API may return as decimal or percentage)
    let moisture = null;
    if (soilData.moisture !== undefined && soilData.moisture !== null) {
      if (typeof soilData.moisture === 'number') {
        // If moisture is less than 1, it's likely a decimal (0-1), convert to percentage
        // If it's already a percentage (0-100), use as is
        moisture = soilData.moisture < 1 ? soilData.moisture * 100 : soilData.moisture;
      } else if (typeof soilData.moisture === 'string') {
        moisture = parseFloat(soilData.moisture);
        if (moisture < 1 && !isNaN(moisture)) {
          moisture = moisture * 100;
        }
      }
    }
    
    console.log("Extracted values:", {
      temp0cm,
      temp10cm,
      moisture,
      soilDataKeys: Object.keys(soilData)
    });
    
    // Process NDVI data with extensive logging
    console.log("=".repeat(60));
    console.log("PROCESSING NDVI DATA");
    console.log("=".repeat(60));
    console.log("ndviHistory type:", typeof ndviHistory);
    console.log("ndviHistory is null?", ndviHistory === null);
    console.log("ndviHistory is array?", Array.isArray(ndviHistory));
    if (ndviHistory) {
      console.log("ndviHistory value (first 500 chars):", JSON.stringify(ndviHistory).substring(0, 500));
      if (Array.isArray(ndviHistory)) {
        console.log(`ndviHistory is array with ${ndviHistory.length} entries`);
        if (ndviHistory.length > 0) {
          console.log("First entry structure:", JSON.stringify(ndviHistory[0]));
        }
      } else if (typeof ndviHistory === 'object') {
        console.log("ndviHistory object keys:", Object.keys(ndviHistory));
      }
    } else {
      console.error("❌ ndviHistory is null or undefined!");
    }
    
    let ndviMean = null;
    let ndviMedian = null;
    let ndviMin = null;
    let ndviMax = null;
    let ndviStd = null;
    
    let ndviArray = null;
    if (ndviHistory) {
      if (Array.isArray(ndviHistory)) {
        ndviArray = ndviHistory;
        console.log(`✅ NDVI is array with ${ndviArray.length} entries`);
      } else if (typeof ndviHistory === 'object') {
        // Try different possible structures from AgroMonitoring API
        if (ndviHistory.data && Array.isArray(ndviHistory.data)) {
          ndviArray = ndviHistory.data;
          console.log("✅ Found NDVI data in ndviHistory.data array");
        } else if (ndviHistory.data && typeof ndviHistory.data === 'object') {
          ndviArray = [ndviHistory];
          console.log("✅ Found NDVI data as single object");
        } else if (ndviHistory.value !== undefined) {
          ndviArray = [ndviHistory];
          console.log("✅ Found NDVI value directly in object");
        } else {
          console.warn("⚠️  Unknown NDVI object structure. Keys:", Object.keys(ndviHistory));
          // Try to use it as-is
          ndviArray = [ndviHistory];
        }
      }
    } else {
      console.error("❌ ndviHistory is null/undefined - cannot process NDVI data");
    }
    
    // Extract NDVI values from array
    // The API can return multiple formats:
    // 1. [{ dt: timestamp, data: { mean, median, min, max, std } }] - Pre-calculated stats
    // 2. [{ dt: timestamp, data: { value: number } }] - Single value per entry
    // 3. [{ value: number }] - Direct value
    // 4. [] - Empty (polygon too new or no data)
    if (ndviArray && ndviArray.length > 0) {
      console.log(`Processing ${ndviArray.length} NDVI entries...`);
      
      const firstEntry = ndviArray[0];
      console.log("First entry structure:", JSON.stringify(firstEntry));
      
      if (firstEntry && typeof firstEntry === 'object') {
        // Try Format 1: Pre-calculated statistics in data object
        // Structure: { dt: timestamp, data: { mean, median, min, max, std } }
        if (firstEntry.data && typeof firstEntry.data === 'object') {
          const dataObj = firstEntry.data;
          
          // Check for mean (primary method)
          if (dataObj.mean !== undefined && typeof dataObj.mean === 'number' && !isNaN(dataObj.mean)) {
            console.log("✅ Found NDVI statistics with 'mean' in data object");
            
            // Use the latest entry's statistics (most recent data)
            const latestEntry = ndviArray[ndviArray.length - 1];
            if (latestEntry && latestEntry.data) {
              const stats = latestEntry.data;
              
              // Extract all available statistics
              if (stats.mean !== undefined && typeof stats.mean === 'number' && !isNaN(stats.mean)) {
                ndviMean = stats.mean;
                console.log(`  ✅ Mean: ${ndviMean}`);
              }
              if (stats.median !== undefined && typeof stats.median === 'number' && !isNaN(stats.median)) {
                ndviMedian = stats.median;
                console.log(`  ✅ Median: ${ndviMedian}`);
              }
              if (stats.min !== undefined && typeof stats.min === 'number' && !isNaN(stats.min)) {
                ndviMin = stats.min;
                console.log(`  ✅ Min: ${ndviMin}`);
              }
              if (stats.max !== undefined && typeof stats.max === 'number' && !isNaN(stats.max)) {
                ndviMax = stats.max;
                console.log(`  ✅ Max: ${ndviMax}`);
              }
              if (stats.std !== undefined && typeof stats.std === 'number' && !isNaN(stats.std)) {
                ndviStd = stats.std;
                console.log(`  ✅ Std: ${ndviStd}`);
              }
            }
            
            // If we have multiple entries, calculate average from all means
            if (ndviArray.length > 1 && ndviMean !== null) {
              const allMeans = ndviArray
                .map(entry => entry.data?.mean)
                .filter(val => val !== undefined && typeof val === 'number' && !isNaN(val) && val >= -1 && val <= 1);
              
              if (allMeans.length > 1) {
                // Use average of all means for better accuracy
                const avgMean = allMeans.reduce((a, b) => a + b, 0) / allMeans.length;
                ndviMean = avgMean;
                ndviMin = Math.min(...allMeans, ndviMin !== null ? ndviMin : Infinity);
                ndviMax = Math.max(...allMeans, ndviMax !== null ? ndviMax : -Infinity);
                
                const sorted = [...allMeans].sort((a, b) => a - b);
                ndviMedian = sorted.length % 2 === 0
                  ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                  : sorted[Math.floor(sorted.length / 2)];
                
                if (allMeans.length > 1) {
                  const variance = allMeans.reduce((acc, val) => acc + Math.pow(val - ndviMean, 2), 0) / allMeans.length;
                  ndviStd = Math.sqrt(variance);
                }
                
                console.log(`✅ Calculated aggregate statistics from ${allMeans.length} entries`);
              }
            }
          }
          // Try Format 2: Single value in data.value (fallback if mean doesn't exist)
          else if (dataObj.value !== undefined && typeof dataObj.value === 'number' && !isNaN(dataObj.value)) {
            console.log("✅ Found NDVI 'value' in data object (using as mean)");
            console.log("Note: API returned 'value' instead of 'mean' - treating value as mean");
            
            // Extract all values from the array
            const ndviValues = [];
            for (let i = 0; i < ndviArray.length; i++) {
              const item = ndviArray[i];
              if (item.data && item.data.value !== undefined) {
                const val = item.data.value;
                if (typeof val === 'number' && !isNaN(val) && val >= -1 && val <= 1) {
                  ndviValues.push(val);
                  console.log(`  Entry ${i}: value = ${val}`);
                }
              }
            }
            
            if (ndviValues.length > 0) {
              ndviMean = ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length;
              const sorted = [...ndviValues].sort((a, b) => a - b);
              ndviMedian = sorted.length % 2 === 0
                ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                : sorted[Math.floor(sorted.length / 2)];
              ndviMin = Math.min(...ndviValues);
              ndviMax = Math.max(...ndviValues);
              
              if (ndviValues.length > 1) {
                const variance = ndviValues.reduce((acc, val) => acc + Math.pow(val - ndviMean, 2), 0) / ndviValues.length;
                ndviStd = Math.sqrt(variance);
              } else {
                ndviStd = 0;
              }
              
              console.log(`✅ Calculated statistics from ${ndviValues.length} value entries`);
            }
          }
        }
        
        // Try Format 3: Direct value property (no data object)
        if (ndviMean === null && firstEntry.value !== undefined && typeof firstEntry.value === 'number' && !isNaN(firstEntry.value)) {
          console.log("✅ Found NDVI 'value' directly in entry (using as mean)");
          
          const ndviValues = ndviArray
            .map(item => item.value)
            .filter(val => val !== undefined && typeof val === 'number' && !isNaN(val) && val >= -1 && val <= 1);
          
          if (ndviValues.length > 0) {
            ndviMean = ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length;
            const sorted = [...ndviValues].sort((a, b) => a - b);
            ndviMedian = sorted.length % 2 === 0
              ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
              : sorted[Math.floor(sorted.length / 2)];
            ndviMin = Math.min(...ndviValues);
            ndviMax = Math.max(...ndviValues);
            
            if (ndviValues.length > 1) {
              const variance = ndviValues.reduce((acc, val) => acc + Math.pow(val - ndviMean, 2), 0) / ndviValues.length;
              ndviStd = Math.sqrt(variance);
            } else {
              ndviStd = 0;
            }
            
            console.log(`✅ Calculated statistics from ${ndviValues.length} direct value entries`);
          }
        }
      }
      
      // Final check - if we still don't have NDVI data
      if (ndviMean !== null) {
        console.log("✅ NDVI statistics extracted successfully:");
        console.log(`   Mean: ${ndviMean.toFixed(4)}`);
        console.log(`   Median: ${ndviMedian !== null ? ndviMedian.toFixed(4) : 'N/A'}`);
        console.log(`   Min: ${ndviMin !== null ? ndviMin.toFixed(4) : 'N/A'}`);
        console.log(`   Max: ${ndviMax !== null ? ndviMax.toFixed(4) : 'N/A'}`);
        console.log(`   Std: ${ndviStd !== null ? ndviStd.toFixed(4) : 'N/A'}`);
      } else {
        console.error("❌ Failed to extract NDVI statistics from any structure");
        console.error("Sample entry structure:", JSON.stringify(firstEntry));
        console.error("Available keys in first entry:", firstEntry ? Object.keys(firstEntry) : "N/A");
        if (firstEntry && firstEntry.data) {
          console.error("Available keys in firstEntry.data:", Object.keys(firstEntry.data));
        }
      }
    } else {
      console.error("❌ No NDVI array to process - ndviArray is null or empty");
      console.error("This usually means:");
      console.error("  1. Polygon is too new (wait 3-5 days for NDVI data)");
      console.error("  2. Polygon is too small (< 1 hectare)");
      console.error("  3. No satellite coverage for this area");
      console.error("  4. Time range doesn't include any NDVI captures");
    }
    
    const currentNDVI = ndviMean !== null && !isNaN(ndviMean) ? ndviMean : null;
    console.log("Final currentNDVI value:", currentNDVI);
    console.log("=".repeat(60));
    
    // Fetch polygon information for Gemini prompt (optional, can work without it)
    let polygonInfo = null;
    
    // Check if polygon info was provided in request body (optional)
    if (req.body && req.body.polygonInfo && typeof req.body.polygonInfo === 'object') {
      console.log("Using polygonInfo from request body");
      polygonInfo = req.body.polygonInfo;
    }
    
    // Fetch polygon info from API if not provided and API_KEY is available
    if (!polygonInfo && API_KEY) {
      try {
        console.log(`Fetching polygon info from API for polyid: ${polyid}`);
        const polygonRes = await fetch(
          `https://api.agromonitoring.com/agro/1.0/polygons/${polyid}?appid=${API_KEY}`
        );
        if (polygonRes.ok) {
          const polygonData = await polygonRes.json();
          console.log("Polygon data fetched:", Object.keys(polygonData));
          
          if (polygonData.geo_json && polygonData.geo_json.geometry && polygonData.geo_json.geometry.coordinates) {
            const coords = polygonData.geo_json.geometry.coordinates[0];
            if (Array.isArray(coords) && coords.length > 0) {
              // Convert from [lon, lat] to [lat, lon] for display
              const latLonCoords = coords.map(([lon, lat]) => [lat, lon]);
              
              polygonInfo = {
                shapeType: polygonData.geo_json.geometry.type === "Polygon" ? "Polygon" : "Rectangle",
                area: polygonData.area ? (polygonData.area / 10000).toFixed(2) : null,
                center: polygonData.center || null,
                coordinates: latLonCoords
              };
              
              // Calculate width and height if it's a rectangle (4-5 points)
              if (latLonCoords.length === 4 || latLonCoords.length === 5) {
                const lats = latLonCoords.map(c => c[0]).filter(c => typeof c === 'number');
                const lngs = latLonCoords.map(c => c[1]).filter(c => typeof c === 'number');
                
                if (lats.length > 0 && lngs.length > 0) {
                  const minLat = Math.min(...lats);
                  const maxLat = Math.max(...lats);
                  const minLng = Math.min(...lngs);
                  const maxLng = Math.max(...lngs);
                  
                  const R = 6371000; // Earth radius in meters
                  const latDiff = (maxLat - minLat) * Math.PI / 180;
                  const lngDiff = (maxLng - minLng) * Math.PI / 180;
                  const avgLat = ((minLat + maxLat) / 2) * Math.PI / 180;
                  
                  polygonInfo.width = (lngDiff * R * Math.cos(avgLat)).toFixed(2);
                  polygonInfo.height = (latDiff * R).toFixed(2);
                }
              }
              
              console.log("Polygon info extracted:", {
                shapeType: polygonInfo.shapeType,
                area: polygonInfo.area,
                hasCenter: !!polygonInfo.center,
                coordinatesCount: polygonInfo.coordinates.length
              });
            }
          }
        } else {
          const errorData = await polygonRes.json().catch(() => ({}));
          console.warn("Could not fetch polygon info:", errorData);
          // Continue without polygon info - it's optional
        }
      } catch (polyError) {
        console.error("Error fetching polygon info:", polyError);
        // Continue without polygon info - it's optional for analysis
      }
    }
    
    // If still no polygon info, create a minimal one
    if (!polygonInfo) {
      polygonInfo = {
        shapeType: "Rectangle",
        area: null,
        center: null,
        coordinates: []
      };
      console.log("Using minimal polygon info (no polygon data available)");
    }
    
    // Call Gemini AI - this is the ONLY analysis method
    console.log("Calling Gemini AI with data from API...");
    
    const geminiData = {
      polyid: polyid || "N/A",
      polygonInfo: polygonInfo || {},
      soilData: soilData,
      temp0cm: temp0cm,
      temp10cm: temp10cm,
      moisture: moisture,
      ndviMean: ndviMean,
      ndviMedian: ndviMedian,
      ndviMin: ndviMin,
      ndviMax: ndviMax,
      ndviStd: ndviStd
    };
    
    const geminiAnalysis = await callGeminiAI(geminiData);
    
    if (!geminiAnalysis) {
      return res.status(500).json({ 
        error: "Gemini analysis failed", 
        message: "Failed to get analysis from Gemini AI. Please check your API key and try again." 
      });
    }
    
    console.log("Gemini analysis received successfully");
    
    // Build response using ONLY Gemini's analysis
    // Calculate confidence based on data completeness (fallback)
    let dataCompleteness = 0;
    if (temp0cm !== null) dataCompleteness += 0.15;
    if (temp10cm !== null) dataCompleteness += 0.15;
    if (moisture !== null) dataCompleteness += 0.25;
    if (ndviMean !== null) dataCompleteness += 0.25;
    if (polygonInfo && polygonInfo.area) dataCompleteness += 0.20;
    
    // Parse confidence - can be percentage string ("90%") or decimal (0.9)
    let confidenceValue = dataCompleteness;
    if (geminiAnalysis.Confidence !== undefined) {
      if (typeof geminiAnalysis.Confidence === 'string') {
        // Try to parse percentage string like "90%" or "0.9"
        const confStr = geminiAnalysis.Confidence.replace('%', '').trim();
        const confNum = parseFloat(confStr);
        if (!isNaN(confNum)) {
          confidenceValue = confNum > 1 ? confNum / 100 : confNum; // Convert percentage to decimal if needed
        }
      } else {
        confidenceValue = parseFloat(geminiAnalysis.Confidence);
      }
    }
    
    // Map Soil_Quality_Level to Fertility_Level for backward compatibility
    const soilQualityLevel = geminiAnalysis.Soil_Quality_Level || geminiAnalysis.Fertility_Level || "Unknown";
    
    const analysisResult = {
      Soil_Quality_Index: geminiAnalysis.Soil_Quality_Index !== undefined
        ? parseFloat(geminiAnalysis.Soil_Quality_Index)
        : (soilQualityLevel === "High" ? 80 : soilQualityLevel === "Moderate" ? 60 : 30), // Estimate SQI from level
      Fertility_Level: soilQualityLevel,
      Soil_Quality_Level: soilQualityLevel, // New field
      Summary: geminiAnalysis.Field_Summary || geminiAnalysis.Summary || "Analysis complete",
      Field_Summary: geminiAnalysis.Field_Summary || geminiAnalysis.Summary || "Analysis complete",
      Confidence: confidenceValue,
      Current_Conditions: {
        temperature: {
          surface: temp0cm !== null && !isNaN(temp0cm) ? `${temp0cm.toFixed(2)}°C` : "N/A",
          depth_10cm: temp10cm !== null && !isNaN(temp10cm) ? `${temp10cm.toFixed(2)}°C` : "N/A",
          status: temp0cm !== null ? (temp0cm < 5 ? "cold" : temp0cm > 25 ? "warm" : "optimal") : "unknown"
        },
        moisture: {
          value: moisture !== null && !isNaN(moisture) ? `${moisture.toFixed(1)}%` : "N/A",
          status: moisture !== null 
            ? (moisture < 20 ? "low" : moisture > 70 ? "excessive" : moisture < 30 ? "moderate" : "sufficient")
            : "unknown"
        },
        vegetation: {
          ndvi_mean: currentNDVI !== null && !isNaN(currentNDVI) ? currentNDVI.toFixed(4) : "N/A",
          ndvi_median: ndviMedian !== null && !isNaN(ndviMedian) ? ndviMedian.toFixed(4) : "N/A",
          ndvi_min: ndviMin !== null && !isNaN(ndviMin) ? ndviMin.toFixed(4) : "N/A",
          ndvi_max: ndviMax !== null && !isNaN(ndviMax) ? ndviMax.toFixed(4) : "N/A",
          ndvi_std: ndviStd !== null && !isNaN(ndviStd) ? ndviStd.toFixed(4) : "N/A",
          status: currentNDVI !== null 
            ? (currentNDVI < 0.1 ? "very_poor" : currentNDVI < 0.3 ? "poor" : currentNDVI < 0.5 ? "moderate" : currentNDVI < 0.7 ? "good" : "excellent")
            : "unknown"
        }
      },
      Predicted_Yield_Quality: geminiAnalysis.Predicted_Yield || geminiAnalysis.Predicted_Yield_Quality || "Unknown",
      Predicted_Yield: geminiAnalysis.Predicted_Yield || geminiAnalysis.Predicted_Yield_Quality || "Unknown",
      Predicted_Crops: Array.isArray(geminiAnalysis.Predicted_Crops) && geminiAnalysis.Predicted_Crops.length > 0
        ? geminiAnalysis.Predicted_Crops
        : ["No crop recommendations available"],
      Recommendations: Array.isArray(geminiAnalysis.Recommendations) && geminiAnalysis.Recommendations.length > 0
        ? geminiAnalysis.Recommendations
        : ["No recommendations available"],
      AI_Confidence_Score: confidenceValue, // Use parsed confidence value
      Predictions: {
        ndvi_with_moisture_increase_10pct: "N/A",
        current_ndvi: currentNDVI !== null && !isNaN(currentNDVI) ? currentNDVI.toFixed(4) : "N/A"
      },
      Data_Timestamp: soilData && soilData.dt 
        ? new Date(soilData.dt * 1000).toISOString() 
        : "N/A",
      Analysis_Source: "Gemini AI"
    };
    
    return res.json(analysisResult);
    
  } catch (error) {
    console.error("Error in AI analysis:", error);
    return res.status(500).json({ 
      error: "AI analysis failed", 
      message: error.message 
    });
  }
};
