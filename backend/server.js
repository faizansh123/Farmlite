// server.js
import express from "express";
import soilRoutes from "./routes/soilRoutes.js"; // note file name
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env file in backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

// add json body parsing if you want to accept POSTs later
app.use(express.json());
app.use(cors());

// Health check endpoint to verify API key is loaded
app.get("/", (req, res) => {
  const apiKeyLoaded = !!process.env.API_KEY;
  res.json({
    status: "API running",
    apiKeyConfigured: apiKeyLoaded,
    message: apiKeyLoaded 
      ? "API key is configured and ready to use" 
      : "Warning: API key not found in .env file"
  });
});

// mount API
app.use("/api", soilRoutes);

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Key configured: ${!!process.env.API_KEY ? "Yes ✓" : "No ✗"}`);
  console.log(`Gemini API Key configured: ${!!process.env.GEMINI_API_KEY ? "Yes ✓" : "No ✗"}`);
  if (!process.env.API_KEY) {
    console.warn("⚠️  WARNING: API_KEY not found in .env file. Please add it to backend/.env");
  }
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️  WARNING: GEMINI_API_KEY not found in .env file. AI analysis will use rule-based fallback.");
  }
});
