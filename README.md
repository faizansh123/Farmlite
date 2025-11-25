# Earth from Space - Agricultural Analysis Platform

**Smart Farming Assistant for Real-Time Field Analysis Using Satellite Data & AI**

Earth from Space is a comprehensive web platform that combines satellite imagery, soil sensor data, and artificial intelligence to provide farmers and agronomists with real-time, actionable insights about their fields. The platform analyzes soil conditions, vegetation health, and provides data-driven recommendations to optimize agricultural practices.

## 🎯 Problem Statement

Traditional agricultural field analysis requires:
- Time-consuming physical site visits
- Expensive soil sampling and laboratory testing
- Manual data collection and analysis
- Limited scalability for multiple fields
- Difficulty comparing field conditions across locations

**Earth from Space solves these challenges** by providing instant, satellite-based analysis that's accessible, cost-effective, and scalable.

## ✨ Key Features

### 🌍 Interactive Field Selection
- Draw polygons or rectangles on an interactive map to select fields
- Automatic area calculation and dimension measurement
- Location name resolution (city, region, country)
- Visual map display with drawing tools

### 📡 Satellite Data Integration
- **Soil Data**: Real-time soil moisture and temperature measurements
- **Vegetation Health**: NDVI (Normalized Difference Vegetation Index) tracking
- **Historical Data**: NDVI trend analysis over time
- **Multi-depth Analysis**: Soil conditions at 0cm, 10cm, and 100cm depths

### 🤖 AI-Powered Analysis
- **Soil Quality Assessment**: Automatic rating (High, Moderate, Low)
- **Crop Recommendations**: AI-suggested crops based on field conditions
- **Fertility Prediction**: Soil fertility level assessment
- **Actionable Recommendations**: 3-4 specific improvement steps
- **Confidence Scoring**: AI confidence levels for each analysis

### 📊 Comprehensive Reporting
- **Score Display**: Prominent soil quality index with color coding
  - 🟢 Green (80-100): Excellent conditions
  - 🟡 Yellow (50-79): Moderate conditions
  - 🔴 Red (<50): Poor conditions
- **Field Summary**: One-sentence overview of field health
- **Current Conditions**: Detailed breakdown of soil and vegetation data
- **Recommendations**: Specific improvement actions

### 🔍 Area Comparison
- **Nearby Area Search**: Find and compare 3-4 nearby locations
- **Configurable Radius**: Adjustable search radius (10-100 km)
- **Score Comparison**: Compare soil quality scores across areas
- **Distance Measurement**: See how far comparison areas are from your field
- **Map Visualization**: Visual representation of all areas on an interactive map
- **Best Areas Highlighting**: Identify areas with better soil conditions

### 🗺️ Visual Analysis
- Interactive maps with Leaflet
- Color-coded areas by soil quality score
- Markers and popups with detailed information
- Coordinate display and location names

## 🏗️ Architecture

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Maps**: Leaflet & react-leaflet
- **Drawing Tools**: leaflet-draw
- **Type Safety**: TypeScript

### Backend (Node.js/Express)
- **Runtime**: Node.js
- **Framework**: Express.js
- **APIs Integrated**:
  - AgroMonitoring API (satellite data)
  - Google Gemini AI (analysis)
  - Nominatim (reverse geocoding)

### Data Flow
1. User draws area on interactive map
2. Coordinates sent to backend
3. Polygon created in AgroMonitoring system
4. Satellite data fetched (soil moisture, temperature, NDVI)
5. Data sent to Gemini AI for analysis
6. Analysis results returned to frontend
7. Results displayed with visualizations

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **AgroMonitoring API Key** ([Get one here](https://agromonitoring.com/))
- **Google Gemini API Key** ([Get one here](https://ai.google.dev/))

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd bramahcks
```

2. **Install frontend dependencies**:
```bash
npm install
```

3. **Install backend dependencies**:
```bash
cd backend
npm install
cd ..
```

4. **Set up environment variables**:

Create a `backend/.env` file:
```env
API_KEY=your_agromonitoring_api_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
```

5. **Start the backend server**:
```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:5000`

6. **Start the frontend development server** (in a new terminal):
```bash
npm run dev
```

7. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Step 1: Select a Field
1. Navigate to the Map page
2. Use the drawing tools (polygon or rectangle) in the top-right corner
3. Draw your field area on the map
4. Click "View Detailed Analysis"

### Step 2: View Analysis
1. The analysis page automatically loads
2. View your area details (location, size, coordinates)
3. See the AI analysis results:
   - Soil Quality Score
   - Fertility Level
   - Field Summary
   - Predicted Crops
   - Recommendations
4. Review current conditions (soil moisture, temperature, NDVI)

### Step 3: Compare with Nearby Areas
1. Click "Compare with Nearby Areas" button
2. Select a search radius (10-100 km)
3. Click "Search Nearby Areas"
4. View comparison areas with scores and distances
5. Explore the map to see all areas visually

## 🛠️ API Endpoints

### Backend Endpoints

#### Polygon Management
- **POST** `/api/soil/polygon`
  - Create a new polygon for analysis
  - Body: `{ coordinates: [[lat, lon], ...] }`
  - Returns: `{ polyid, center, area }`

- **GET** `/api/soil/polygon/:polyid`
  - Get polygon information and NDVI history
  - Returns: Polygon data and NDVI history array

#### Soil Data
- **GET** `/api/soil/:polyid`
  - Get soil data for a polygon
  - Returns: Soil data object (moisture, temperature, etc.)

#### AI Analysis
- **POST** `/api/ai-analysis/:polyid`
  - Get AI-powered agricultural analysis
  - Body (optional): `{ soilData: {...}, ndviHistory: [...] }`
  - Returns: Complete analysis with scores, recommendations, and predictions

## 📁 Project Structure

```
bramahcks/
├── app/                          # Next.js frontend application
│   ├── analysis/                 # Analysis pages
│   │   ├── page.tsx             # Main analysis page
│   │   └── comparison/          # Comparison page
│   │       └── page.tsx         # Nearby areas comparison
│   ├── components/              # React components
│   │   ├── InteractiveMap.tsx   # Main map with drawing tools
│   │   ├── AnalysisMap.tsx      # Map display for analysis
│   │   └── ui/                  # UI components (Card, Button, etc.)
│   ├── map/                     # Map page
│   │   └── page.tsx
│   ├── page.tsx                 # Home/dashboard page
│   └── globals.css              # Global styles
├── backend/                     # Express.js backend server
│   ├── controllers/             # Request handlers
│   │   ├── aiAnalysisController.js  # AI analysis logic
│   │   └── soilController.js        # Soil data logic
│   ├── routes/                  # API routes
│   │   └── soilRoutes.js
│   ├── server.js                # Server entry point
│   └── .env                     # Environment variables (create this)
├── package.json                 # Frontend dependencies
└── README.md                    # This file
```

## 🧪 Technologies Used

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Leaflet** - Interactive maps library
- **react-leaflet** - React bindings for Leaflet
- **leaflet-draw** - Drawing tools for Leaflet
- **Lucide React** - Icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **@google/generative-ai** - Google Gemini AI integration
- **CORS** - Cross-origin resource sharing

### External APIs
- **AgroMonitoring API** - Satellite and soil data
- **Google Gemini AI** - Agricultural analysis
- **Nominatim (OpenStreetMap)** - Reverse geocoding

## 🎨 Features in Detail

### Soil Quality Analysis
- Calculates Soil Quality Index based on:
  - NDVI (vegetation health)
  - Soil moisture levels
  - Soil temperature
- Provides fertility rating (High, Moderate, Low)
- Includes AI confidence scores

### Vegetation Health Tracking
- NDVI mean, median, min, max values
- Standard deviation analysis
- Historical trend tracking
- Interpretation guides for NDVI values

### Location Intelligence
- Automatic location name resolution
- Coordinate display and validation
- Support for [lat, lng] and [lon, lat] formats
- City, state/region, and country information

### Comparison Analytics
- Random area generation within specified radius
- Distance calculation using Haversine formula
- Score-based sorting (highest first)
- Visual map representation with color coding

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
```env
API_KEY=your_agromonitoring_api_key
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
```

### Customization Options

- **Default Map Location**: Edit coordinates in map components
- **Search Radius Range**: Modify min/max in comparison page (currently 10-100 km)
- **Number of Comparison Areas**: Change `numLocations` in comparison logic (currently 4)
- **Area Size**: Modify `create3HectareRectangle` function (currently 3 hectares)
- **Color Thresholds**: Adjust score ranges in `getScoreColor` functions

## 🐛 Troubleshooting

### Backend Issues

**Server won't start**:
- Check that port 5000 is not already in use
- Verify all dependencies are installed: `npm install`
- Ensure `.env` file exists with correct API keys

**API calls failing**:
- Verify API keys are set correctly in `.env`
- Check that AgroMonitoring API key is valid
- Ensure Gemini API key has proper permissions
- Check server console for detailed error messages

**Polygon creation limits**:
- AgroMonitoring API has daily/monthly limits
- System automatically reuses existing polygons when possible
- Consider upgrading your AgroMonitoring plan for higher limits

### Frontend Issues

**Map not loading**:
- Check browser console for errors
- Verify Leaflet CSS is imported in `globals.css`
- Ensure internet connection for tile layers

**Analysis not displaying**:
- Verify backend server is running on port 5000
- Check browser console for API errors
- Ensure polygon was created successfully

**Comparison areas not showing**:
- Verify radius selector is set correctly
- Check that search button was clicked
- Review browser console for polygon creation errors
- Ensure AgroMonitoring API key has not reached limits

## 📊 Data Sources

### AgroMonitoring API
- Soil moisture data (m³/m³)
- Soil temperature (Kelvin, converted to Celsius)
- NDVI historical data
- Polygon management

### Google Gemini AI
- Agricultural analysis
- Soil quality assessment
- Crop recommendations
- Improvement suggestions

### OpenStreetMap (Nominatim)
- Reverse geocoding
- Location name resolution
- Address information

## 🎯 Use Cases

1. **Field Selection**: Compare multiple fields to choose the best location
2. **Soil Assessment**: Evaluate soil quality and fertility
3. **Crop Planning**: Select appropriate crops based on field conditions
4. **Improvement Planning**: Prioritize soil improvement actions
5. **Monitoring**: Track vegetation health over time
6. **Expansion**: Find nearby areas with better conditions

## 🔮 Future Enhancements

- Historical trend analysis and forecasting
- Multi-field dashboard
- Export reports (PDF, CSV)
- Mobile app support
- Integration with farm management systems
- Weather data integration
- Irrigation recommendations
- Pest and disease risk assessment

## 📝 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues, questions, or feature requests, please open an issue on the repository.

---

**Built with ❤️ for farmers and agronomists worldwide**

*Earth from Space - Transforming satellite data into agricultural insights*
#   F a r m l i t e  
 