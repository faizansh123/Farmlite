# API Setup Guide

## Quick Fix Checklist

If your API isn't working, check these steps:

### 1. Backend Server Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies (including node-fetch)
npm install

# Create .env file with your API key
echo "API_KEY=your_api_key_here" > .env

# Start the backend server
npm run dev
```

**Important:** The backend server must be running on `http://localhost:5000` for the frontend to work.

### 2. Environment Variables

Create a `.env` file in the `backend` directory:

```env
API_KEY=your_agromonitoring_api_key_here
```

Get your API key from: https://agromonitoring.com/

### 3. Common Issues

#### "Cannot connect to backend server"
- **Solution:** Make sure the backend server is running
  ```bash
  cd backend
  npm run dev
  ```
- Check that port 5000 is not already in use
- Verify the server console shows: "Server running on port 5000"

#### "API_KEY not found" error
- **Solution:** Create a `.env` file in the `backend` directory
- Add your API key: `API_KEY=your_key_here`
- Restart the backend server

#### "Failed to create polygon" error
- **Solution:** Check that your API key is valid
- Verify the coordinates are valid (at least 3 points)
- Check the backend server console for detailed error messages

#### CORS errors
- **Solution:** The backend has CORS enabled, but make sure:
  - Backend server is running
  - Frontend is making requests to `http://localhost:5000`
  - No firewall is blocking localhost connections

### 4. Testing the API

Test if the backend is working:

```bash
# In a new terminal, test the server
curl http://localhost:5000/api/soil/polygon -X POST \
  -H "Content-Type: application/json" \
  -d '{"coordinates": [[43.6532, -79.3832], [43.6542, -79.3832], [43.6532, -79.3842]]}'
```

### 5. Frontend Development

Make sure the frontend is running:

```bash
# In the root directory
npm run dev
```

The frontend should be running on `http://localhost:3000`

### 6. Full Setup Sequence

1. **Start Backend:**
   ```bash
   cd backend
   npm install
   # Create .env file with API_KEY
   npm run dev
   ```

2. **Start Frontend (in a new terminal):**
   ```bash
   npm install
   npm run dev
   ```

3. **Test:**
   - Open http://localhost:3000
   - Go to the map page
   - Draw a polygon
   - Click "View Detailed Analysis"
   - Check that API data loads

### 7. Debugging

Check the browser console (F12) for:
- Network errors (failed to fetch)
- API response errors
- CORS errors

Check the backend console for:
- Server startup messages
- API request logs
- Error messages from AgroMonitoring API

