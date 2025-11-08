# Troubleshooting "Failed to create polygon" Error

## Step-by-Step Debugging Guide

### 1. Check Backend Server Status

**First, verify the backend is running:**

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
✓ API_KEY loaded successfully
API Key configured: Yes ✓
```

**Test the health endpoint:**
Open in browser: `http://localhost:5000/`

You should see:
```json
{
  "status": "API running",
  "apiKeyConfigured": true,
  "message": "API key is configured and ready to use"
}
```

### 2. Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Look for errors when you click "View Detailed Analysis"
4. Check for:
   - Connection errors (backend not running)
   - API response errors
   - Coordinate format errors

### 3. Check Backend Server Console

When you try to create a polygon, check the backend console for:
- "Creating polygon with payload:" - shows what's being sent to AgroMonitoring API
- "Polygon creation failed - Status:" - HTTP status code from API
- "Polygon creation failed - Response:" - error details from AgroMonitoring API

### 4. Common Error Causes

#### A. Backend Server Not Running
**Symptoms:**
- Error: "Cannot connect to backend server"
- Network error in browser console

**Solution:**
```bash
cd backend
npm run dev
```

#### B. API Key Not Configured
**Symptoms:**
- Backend console shows: "API Key configured: No ✗"
- Error: "Server configuration error: API_KEY not found"

**Solution:**
1. Create `backend/.env` file
2. Add: `API_KEY=your_api_key_here`
3. Restart backend server

#### C. Invalid API Key
**Symptoms:**
- Backend shows error from AgroMonitoring API
- Status code 401 (Unauthorized) or 403 (Forbidden)

**Solution:**
1. Verify your API key at https://agromonitoring.com/
2. Check that the key is correct in `backend/.env`
3. Make sure there are no extra spaces or quotes

#### D. Invalid Coordinates
**Symptoms:**
- Error about coordinate format
- Coordinates outside valid ranges

**Solution:**
- Make sure you draw a valid polygon (at least 3 points)
- Check that coordinates are within valid ranges:
  - Latitude: -90 to 90
  - Longitude: -180 to 180

#### E. AgroMonitoring API Error
**Symptoms:**
- Backend receives error from AgroMonitoring API
- Specific error message in backend console

**Common API Errors:**
- **400 Bad Request**: Invalid polygon format
- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: API key doesn't have permissions
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: AgroMonitoring API issue

### 5. Manual API Test

Test the API directly using curl:

```bash
curl -X POST http://localhost:5000/api/soil/polygon \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": [
      [43.6532, -79.3832],
      [43.6542, -79.3832],
      [43.6532, -79.3842],
      [43.6542, -79.3842]
    ]
  }'
```

**Expected Success Response:**
```json
{
  "polyid": "some_polygon_id",
  "center": [43.6537, -79.3837],
  "area": 12345.67
}
```

**Error Response:**
```json
{
  "error": "Failed to create polygon",
  "details": { ... },
  "status": 400,
  "message": "Error message from API"
}
```

### 6. Check Coordinate Format

The coordinates should be in `[lat, lon]` format:
- First value: Latitude (-90 to 90)
- Second value: Longitude (-180 to 180)

Example:
```javascript
[
  [43.6532, -79.3832],  // [lat, lon]
  [43.6542, -79.3832],
  [43.6532, -79.3842]
]
```

### 7. Debugging Steps

1. **Check if backend is receiving the request:**
   - Look for "Creating polygon with payload" in backend console
   - If not visible, frontend isn't reaching backend

2. **Check the payload being sent:**
   - Backend console shows the full payload
   - Verify coordinates are in correct format

3. **Check AgroMonitoring API response:**
   - Backend console shows the API response
   - Look for specific error messages

4. **Check browser network tab:**
   - Open Developer Tools → Network tab
   - Look for the POST request to `/api/soil/polygon`
   - Check the request payload and response

### 8. Quick Fixes

**If backend isn't running:**
```bash
cd backend
npm install
npm run dev
```

**If API key is missing:**
```bash
# Create backend/.env
echo "API_KEY=your_key_here" > backend/.env
# Restart backend
```

**If coordinates are invalid:**
- Draw a larger polygon
- Make sure it's a valid shape
- Try drawing in a different location

### 9. Get More Information

The improved error handling now shows:
- Detailed error messages from the API
- Coordinate validation errors
- Connection errors
- API key configuration errors

Check both:
- **Browser Console** (F12) - for frontend errors
- **Backend Console** - for API errors and request/response details

### 10. Still Having Issues?

If the error persists:
1. Copy the exact error message from the browser
2. Copy the backend console output
3. Check the Network tab in browser DevTools
4. Verify your API key is valid and active
5. Try with a simple test polygon (small area, 4 corners)

