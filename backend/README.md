# Backend API Server

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` directory with your API key:

```env
API_KEY=your_agromonitoring_api_key_here
```

You can get an API key from [AgroMonitoring API](https://agromonitoring.com/).

### 3. Install node-fetch (if needed)

If you're using Node.js version less than 18, you'll need to install `node-fetch`:

```bash
npm install node-fetch@2
```

For Node.js 18+, the built-in `fetch` API is available.

### 4. Start the Server

```bash
npm run dev
```

The server will run on `http://localhost:5000`

## API Endpoints

- `POST /api/soil/polygon` - Create a polygon
  - Body: `{ coordinates: [[lat, lon], ...] }`
  - Returns: `{ polyid, center, area }`

- `GET /api/soil/:polyid` - Get soil data for a polygon
  - Returns: Soil data object

- `GET /api/soil/polygon/:polyid` - Get NDVI history for a polygon
  - Returns: NDVI history data array

## Troubleshooting

### Server won't start
- Make sure port 5000 is not already in use
- Check that all dependencies are installed: `npm install`
- Verify your `.env` file exists and has the `API_KEY` set

### API calls failing
- Make sure the backend server is running
- Check that `API_KEY` is set correctly in `.env`
- Verify the API key is valid at agromonitoring.com
- Check the server console for error messages

### CORS errors
- The server has CORS enabled for all origins
- If you still see CORS errors, check that the server is running

### Connection refused errors
- Make sure the backend server is running on port 5000
- Check that there are no firewall issues blocking localhost:5000

