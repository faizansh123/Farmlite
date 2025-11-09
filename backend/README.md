# Backend API Server - Earth from Space

Express.js backend server that integrates with AgroMonitoring API and Google Gemini AI to provide agricultural analysis services.

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```env
API_KEY=your_agromonitoring_api_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
```

**Where to get API keys:**
- **AgroMonitoring API**: [https://agromonitoring.com/](https://agromonitoring.com/)
- **Google Gemini API**: [https://ai.google.dev/](https://ai.google.dev/)

### 3. Start the Server

```bash
npm run dev
```

The server will run on `http://localhost:5000`

You should see:
```
Server running on port 5000
API Key configured: Yes ✓
Gemini API Key configured: Yes ✓
```

## 📡 API Endpoints

### Polygon Management

#### Create Polygon
- **POST** `/api/soil/polygon`
- **Description**: Create a new polygon in AgroMonitoring system
- **Body**:
  ```json
  {
    "coordinates": [[lat, lon], [lat, lon], ...]
  }
  ```
- **Response**:
  ```json
  {
    "polyid": "polygon_id",
    "center": [lon, lat],
    "area": 31252.73
  }
  ```
- **Notes**: 
  - Coordinates should be in [lat, lon] format
  - Polygon must have at least 3 points
  - Returns existing polygon ID if duplicate coordinates detected

#### Get Polygon Data
- **GET** `/api/soil/polygon/:polyid`
- **Description**: Get polygon information and NDVI history
- **Response**: Array of NDVI history data
- **Notes**: Returns historical NDVI data for the polygon

### Soil Data

#### Get Soil Data
- **GET** `/api/soil/:polyid`
- **Description**: Get current soil conditions for a polygon
- **Response**:
  ```json
  {
    "dt": 1762646400,
    "t0": 277.127,
    "t10": 279.545,
    "moisture": 0.189
  }
  ```
- **Notes**:
  - `dt`: Unix timestamp
  - `t0`: Temperature at 0cm (Kelvin)
  - `t10`: Temperature at 10cm (Kelvin)
  - `moisture`: Soil moisture (m³/m³)

### AI Analysis

#### Get AI Analysis
- **POST** `/api/ai-analysis/:polyid`
- **Description**: Get AI-powered agricultural analysis using Gemini
- **Body** (optional):
  ```json
  {
    "soilData": { ... },
    "ndviHistory": [ ... ]
  }
  ```
- **Response**:
  ```json
  {
    "Soil_Quality_Index": 75.5,
    "Soil_Quality_Level": "Moderate",
    "Fertility_Level": "Moderate",
    "Confidence": "85%",
    "Field_Summary": "The field shows moderate soil quality...",
    "Predicted_Crops": ["wheat", "barley", "rye"],
    "Recommendations": [
      "Add organic compost to improve nutrient content",
      "Schedule light irrigation cycles",
      "Monitor NDVI again next week"
    ],
    "Current_Conditions": {
      "soil": {
        "moisture": 18.9,
        "temperature_0cm": 3.98,
        "temperature_10cm": 6.40
      },
      "vegetation": {
        "ndvi_mean": 0.094,
        "ndvi_median": 0.093,
        "ndvi_min": 0.071,
        "ndvi_max": 0.122,
        "ndvi_std": 0.009
      }
    },
    "AI_Confidence_Score": 0.85,
    "Analysis_Source": "Gemini AI"
  }
  ```
- **Notes**:
  - If `soilData` and `ndviHistory` are provided in body, they will be used directly
  - Otherwise, the backend fetches data from AgroMonitoring API
  - Uses Gemini AI model (default: gemini-2.5-flash)
  - Falls back to alternative models if primary model unavailable

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `API_KEY` | AgroMonitoring API key | Yes | - |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `GEMINI_MODEL` | Gemini model name | No | gemini-2.5-flash |
| `PORT` | Server port | No | 5000 |

### Gemini Model Fallback

The system automatically tries multiple Gemini models in order:
1. `gemini-2.5-flash` (default)
2. `gemini-2.0-flash-exp`
3. `gemini-1.5-flash`
4. `gemini-1.5-pro`
5. `gemini-1.5-flash-latest`
6. `gemini-1.5-pro-latest`
7. `gemini-pro`

## 📊 Data Processing

### Soil Data Processing
- Temperature conversion: Kelvin → Celsius
- Moisture conversion: m³/m³ → percentage
- Timestamp conversion: Unix timestamp → readable date

### NDVI Data Processing
- Extracts statistics from API response:
  - Mean, median, min, max
  - Standard deviation
  - Percentiles (p25, p75)
- Handles multiple time ranges for data retrieval
- Graceful degradation if NDVI data unavailable

### AI Analysis Processing
- Constructs detailed prompt with field data
- Sends data to Gemini AI
- Parses JSON response
- Handles markdown-wrapped JSON
- Maps response to standardized format
- Calculates confidence scores

## 🐛 Troubleshooting

### Server Issues

**Server won't start**:
- Check that port 5000 is not already in use
- Verify all dependencies are installed: `npm install`
- Check that `.env` file exists in `backend/` directory
- Verify Node.js version is 18 or higher

**API Key errors**:
- Verify `API_KEY` is set correctly in `.env`
- Check that AgroMonitoring API key is valid
- Verify `GEMINI_API_KEY` is set correctly
- Ensure Gemini API key has proper permissions
- Check server console for detailed error messages

### API Integration Issues

**AgroMonitoring API errors**:
- **"You can not create polygons anymore"**: API limit reached
  - Check your AgroMonitoring account limits
  - Wait for daily/monthly limit to reset
  - Consider upgrading your plan
  - System automatically reuses existing polygons when possible

**Gemini API errors**:
- **"Model not found"**: Model name may be outdated
  - System automatically tries fallback models
  - Check server logs for which model succeeded
  - Update `GEMINI_MODEL` in `.env` if needed

**NDVI data not available**:
- NDVI data may not be available for new polygons
- Data processing can take time
- System handles missing NDVI data gracefully
- Analysis will proceed with soil data only

### Data Fetching Issues

**Soil data not loading**:
- Verify polygon was created successfully
- Check that polygon ID is valid
- Ensure AgroMonitoring API key has access
- Check server console for API errors

**NDVI history not loading**:
- NDVI data may not be available immediately
- System tries multiple time ranges
- Check server logs for fetch attempts
- Some locations may have limited satellite coverage

### CORS Issues

- CORS is enabled for all origins in `server.js`
- If you still see CORS errors:
  - Verify server is running on port 5000
  - Check that frontend is making requests to correct URL
  - Review browser console for specific CORS errors

## 📝 Code Structure

### Controllers

#### `soilController.js`
- `createPolygon`: Creates polygon in AgroMonitoring
- `getSoilData`: Fetches soil data for polygon
- `getPolygonData`: Fetches NDVI history for polygon

#### `aiAnalysisController.js`
- `analyzeAgriculture`: Main analysis function
- `callGeminiAI`: Calls Gemini API with prompt
- Handles data fetching, processing, and response mapping

### Routes

#### `soilRoutes.js`
- Defines API endpoints
- Routes requests to appropriate controllers
- Handles both GET and POST requests

### Server

#### `server.js`
- Express server setup
- CORS configuration
- Route mounting
- Error handling
- Server startup logging

## 🔍 Logging

The server provides detailed logging:
- API key configuration status
- Polygon creation attempts
- Data fetching operations
- Gemini API calls
- Error messages with context

Check the server console for detailed logs during development and debugging.

## 📚 Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **@google/generative-ai**: Google Gemini AI integration
- **dotenv**: Environment variable management

## 🔒 Security Notes

- API keys are stored in `.env` file (never commit to git)
- CORS is enabled for development (restrict in production)
- Input validation should be added for production
- Rate limiting should be implemented for production use

## 🚀 Production Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Use environment-specific API keys
3. Implement rate limiting
4. Add input validation
5. Restrict CORS to specific origins
6. Use HTTPS
7. Implement logging and monitoring
8. Set up error tracking

---

**Backend Server for Earth from Space Agricultural Analysis Platform**
