# Verify Your API Setup

## Quick Verification Steps

### 1. Check that your .env file exists and is in the correct location

Your `.env` file should be located at:
```
backend/.env
```

The file should contain:
```env
API_KEY=your_actual_api_key_here
```

### 2. Start the Backend Server

```bash
cd backend
npm install  # Make sure all dependencies are installed
npm run dev
```

### 3. Check the Console Output

When you start the server, you should see:
```
Server running on port 5000
✓ API_KEY loaded successfully
API Key configured: Yes ✓
```

If you see:
```
⚠️  WARNING: API_KEY not found. Make sure .env file exists in backend/ directory
API Key configured: No ✗
```

Then your `.env` file is not being loaded correctly.

### 4. Test the Health Check Endpoint

Open your browser or use curl to check:
```
http://localhost:5000/
```

You should see a JSON response:
```json
{
  "status": "API running",
  "apiKeyConfigured": true,
  "message": "API key is configured and ready to use"
}
```

If `apiKeyConfigured` is `false`, check your `.env` file.

### 5. Test Creating a Polygon

You can test the API with a simple curl command:

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

You should get a response like:
```json
{
  "polyid": "some_polygon_id",
  "center": [43.6537, -79.3837],
  "area": 12345.67
}
```

If you get an error about API_KEY, check your `.env` file.

## Troubleshooting

### Problem: API_KEY not loading

**Solution:**
1. Make sure `.env` file is in the `backend/` directory (not the root)
2. Check that the file is named exactly `.env` (not `.env.txt` or `.env.local`)
3. Make sure there are no spaces around the `=` sign: `API_KEY=your_key` (not `API_KEY = your_key`)
4. Make sure there are no quotes around the key unless they're part of the key itself
5. Restart the server after creating/updating the `.env` file

### Problem: Server starts but API calls fail

**Solution:**
1. Check that your API key is valid at https://agromonitoring.com/
2. Check the server console for detailed error messages
3. Verify the API key format in your `.env` file

### Problem: Port 5000 already in use

**Solution:**
1. Stop any other process using port 5000
2. Or change the port in `server.js` and update frontend API calls accordingly

## Next Steps

Once your API key is verified and working:
1. Start the backend server: `cd backend && npm run dev`
2. Start the frontend: `npm run dev`
3. Open http://localhost:3000
4. Go to the map page and draw a polygon
5. Click "View Detailed Analysis" to see API data

