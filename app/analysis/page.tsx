'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sprout, ArrowLeft, MapPin, Ruler, Droplets, TrendingUp, Brain, CheckCircle, Info } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import dynamic from 'next/dynamic'
import type { LatLngExpression } from 'leaflet'
import L from 'leaflet'

// Dynamically import map component to avoid SSR issues
const MapDisplay = dynamic(() => import('../components/AnalysisMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gradient-to-br from-[#f5e6d3] to-[#ede4d3] rounded-xl">
      <p className="text-success font-semibold">Loading map...</p>
    </div>
  ),
})

interface ShapeData {
  type: string
  coordinates: LatLngExpression[]
  area: string
  areaInSquareMeters: number
}

interface PolygonData {
  polyid: string
  center: [number, number]
  area: number
}

interface SoilData {
  // API returns flat structure: { dt: number, t0: number, t10: number, moisture: number }
  dt?: number
  t0?: number | {
    depth?: number
    value?: number
  }
  t10?: number | {
    depth?: number
    value?: number
  }
  t100?: number | {
    depth?: number
    value?: number
  }
  moisture?: number | {
    surface?: number
    depth10?: number
    depth100?: number
    moisture?: number
  }
  [key: string]: any
}

interface PolygonHistoryData {
  dt?: number
  data?: {
    value?: number
    [key: string]: any
  }
  [key: string]: any
}

interface AIAnalysisData {
  Soil_Quality_Index: number
  Fertility_Level: string
  Summary: string
  Field_Summary?: string
  Current_Conditions: {
    temperature: {
      surface: string
      depth_10cm: string
      status: string
    }
    moisture: {
      value: string
      status: string
    }
    vegetation: {
      ndvi_mean: string
      ndvi_median: string
      ndvi_min: string
      ndvi_max: string
      ndvi_std: string
      status: string
    }
  }
  Predicted_Yield_Quality: string
  Predicted_Yield?: string
  Predicted_Crops: string[]
  Recommendations: string[]
  AI_Confidence_Score: number
  Predictions: {
    ndvi_with_moisture_increase_10pct: string
    current_ndvi: string
  }
  Data_Timestamp: string
  Analysis_Source?: string
}

export default function AnalysisPage() {
  const router = useRouter()
  const [shapeData, setShapeData] = useState<ShapeData | null>(null)
  const [polygonData, setPolygonData] = useState<PolygonData | null>(null)
  const [soilData, setSoilData] = useState<SoilData | null>(null)
  const [polygonHistoryData, setPolygonHistoryData] = useState<PolygonHistoryData[] | null>(null)
  const [aiAnalysisData, setAiAnalysisData] = useState<AIAnalysisData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingApi, setIsLoadingApi] = useState(false)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isCreatingPolygon, setIsCreatingPolygon] = useState(false)
  const hasInitializedRef = useRef(false)
  const currentPolyidRef = useRef<string | null>(null)

  // Helper function to fetch soil and history data
  const fetchSoilAndHistoryData = useCallback(async (polyid: string) => {
    // Fetch soil data
    try {
      const soilRes = await fetch(`http://localhost:5000/api/soil/${polyid}`)
      if (soilRes.ok) {
        const soilResult: SoilData = await soilRes.json()
        console.log('Soil data received:', soilResult)
        console.log('Soil data keys:', Object.keys(soilResult))
        setSoilData(soilResult)
      } else {
        const errorData = await soilRes.json().catch(() => ({}))
        console.error('Error fetching soil data:', errorData)
        // Still set error data so user can see what went wrong
        if (errorData.message) {
          setApiError(prev => prev ? `${prev}; Soil: ${errorData.message}` : `Soil: ${errorData.message}`)
        }
      }
    } catch (err: any) {
      console.error('Error fetching soil data:', err)
      setApiError(prev => prev ? `${prev}; Soil data: ${err.message}` : `Soil data: ${err.message}`)
    }

    // Fetch polygon history data (NDVI)
    try {
      const historyRes = await fetch(`http://localhost:5000/api/soil/polygon/${polyid}`)
      if (historyRes.ok) {
        const historyResult: PolygonHistoryData[] = await historyRes.json()
        setPolygonHistoryData(Array.isArray(historyResult) ? historyResult : [historyResult])
      } else {
        const errorData = await historyRes.json().catch(() => ({}))
        console.error('Error fetching NDVI history data:', errorData)
      }
    } catch (err: any) {
      console.error('Error fetching polygon history data:', err)
      setApiError(prev => prev ? `${prev}; NDVI data: ${err.message}` : `NDVI data: ${err.message}`)
    }

    // Fetch AI Analysis
    try {
      setIsLoadingAI(true)
      const aiRes = await fetch(`http://localhost:5000/api/ai-analysis/${polyid}`)
      if (aiRes.ok) {
        const aiResult: AIAnalysisData = await aiRes.json()
        console.log('AI Analysis received:', aiResult)
        setAiAnalysisData(aiResult)
      } else {
        const errorData = await aiRes.json().catch(() => ({}))
        console.error('Error fetching AI analysis:', errorData)
      }
    } catch (err: any) {
      console.error('Error fetching AI analysis:', err)
      // Don't set as critical error, just log it
    } finally {
      setIsLoadingAI(false)
    }
  }, [])

  // Create polygon and fetch API data
  const createPolygonAndFetchData = useCallback(async (coords: LatLngExpression[]) => {
    // Prevent duplicate calls
    if (isCreatingPolygon) {
      console.log('Polygon creation already in progress, skipping duplicate request')
      return
    }
    
    setIsCreatingPolygon(true)
    setIsLoadingApi(true)
    setApiError(null)

    try {
      // Convert coordinates to format expected by API
      const coordsArray = coords.map((coord) => {
        if (Array.isArray(coord)) {
          // Ensure it's [lat, lon] format
          return [coord[0], coord[1]]
        } else if (coord && typeof coord === 'object' && 'lat' in coord && 'lng' in coord) {
          // LatLng object
          return [(coord as L.LatLng).lat, (coord as L.LatLng).lng]
        } else {
          throw new Error('Invalid coordinate format')
        }
      })
      
      console.log('Sending coordinates to API:', coordsArray)
      
      // Validate coordinates
      if (coordsArray.length < 3) {
        throw new Error('Polygon must have at least 3 points')
      }

      // Create polygon
      const createRes = await fetch('http://localhost:5000/api/soil/polygon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: coordsArray }),
      })

      let polygonId: string | null = null

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Polygon creation error:', errorData)
        
        // Check if we have an existing polygon ID we can reuse
        if (errorData.existingPolyid) {
          console.log('Using existing polygon ID:', errorData.existingPolyid)
          polygonId = errorData.existingPolyid
          const polygonResult: PolygonData = {
            polyid: errorData.existingPolyid,
            center: [0, 0],
            area: 0
          }
          setPolygonData(polygonResult)
          localStorage.setItem('polyid', errorData.existingPolyid)
          // Store coordinates hash for this polygon
          const coordsHash = JSON.stringify(coordsArray.map(([lat, lon]) => 
            [Math.round(lat * 1000000) / 1000000, Math.round(lon * 1000000) / 1000000]
          ))
          localStorage.setItem('coordsHash', coordsHash)
        } else {
          // Show more detailed error message
          const errorMessage = errorData.details 
            ? `${errorData.error || 'Failed to create polygon'}: ${errorData.message || JSON.stringify(errorData.details)}`
            : errorData.error || errorData.message || `Failed to create polygon: ${createRes.status}`
          throw new Error(errorMessage)
        }
      } else {
        // Success - get the new polygon ID
        const polygonResult: PolygonData = await createRes.json()
        polygonId = polygonResult.polyid
        setPolygonData(polygonResult)
        currentPolyidRef.current = polygonResult.polyid
        // Store the new polyid for this polygon
        localStorage.setItem('polyid', polygonResult.polyid)
        // Store coordinates hash to detect if polygon changes in future
        const coordsHash = JSON.stringify(coordsArray.map(([lat, lon]) => 
          [Math.round(lat * 1000000) / 1000000, Math.round(lon * 1000000) / 1000000]
        ))
        localStorage.setItem('coordsHash', coordsHash)
        console.log('New polygon created:', polygonResult.polyid, 'for coordinates:', coordsHash.substring(0, 50) + '...')
      }

      // Fetch soil and history data if we have a polygon ID
      if (polygonId) {
        await fetchSoilAndHistoryData(polygonId)
      }
    } catch (error: any) {
      console.error('Error creating polygon or fetching data:', error)
      
      // Check if it's a connection error
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
        setApiError('Cannot connect to backend server. Make sure the backend is running on http://localhost:5000')
      } else {
        setApiError(error.message || 'Failed to fetch API data')
      }
    } finally {
      setIsLoadingApi(false)
      setIsCreatingPolygon(false)
    }
  }, [fetchSoilAndHistoryData, isCreatingPolygon])

  useEffect(() => {
    // Prevent duplicate calls in React StrictMode
    if (hasInitializedRef.current) {
      console.log('Skipping duplicate initialization (React StrictMode)')
      return
    }
    
    // Retrieve shape data from localStorage
    try {
      const storedData = localStorage.getItem('shapeData')
      const storedPolyid = localStorage.getItem('polyid')
      
      console.log('Initializing analysis page - stored polyid:', storedPolyid)

      if (storedData) {
        const parsedData: ShapeData = JSON.parse(storedData)
        setShapeData(parsedData)

        // Generate a hash/fingerprint of the coordinates to detect if polygon changed
        const coordsHash = JSON.stringify(parsedData.coordinates.map(coord => {
          if (Array.isArray(coord)) {
            return [Math.round(coord[0] * 1000000) / 1000000, Math.round(coord[1] * 1000000) / 1000000]
          } else if (coord && typeof coord === 'object' && 'lat' in coord && 'lng' in coord) {
            return [Math.round((coord as L.LatLng).lat * 1000000) / 1000000, Math.round((coord as L.LatLng).lng * 1000000) / 1000000]
          }
          return coord
        }))
        
        const storedCoordsHash = localStorage.getItem('coordsHash')
        
        // Only reuse polyid if coordinates haven't changed
        if (storedPolyid && storedCoordsHash === coordsHash) {
          console.log('Reusing existing polygon ID:', storedPolyid, 'for coordinates:', coordsHash.substring(0, 50) + '...')
          setIsLoadingApi(true)
          setApiError(null)
          
          // Clear any old data to show we're loading new data
          setSoilData(null)
          setPolygonHistoryData(null)

          // Fetch soil data
          fetch(`http://localhost:5000/api/soil/${storedPolyid}`)
            .then((res) => {
              if (res.ok) {
                return res.json()
              } else {
                return res.json().then(err => {
                  console.error('Error fetching soil data:', err)
                  setApiError(prev => prev ? `${prev}; Soil: ${err.error || 'Failed'}` : `Soil: ${err.error || 'Failed'}`)
                  return null
                })
              }
            })
            .then((data) => {
              if (data) {
                console.log('Soil data received for polygon', storedPolyid, ':', data)
                setSoilData(data)
              }
            })
            .catch((err) => {
              console.error('Error fetching soil data:', err)
              if (err.message?.includes('fetch') || err.message?.includes('network')) {
                setApiError('Cannot connect to backend server. Make sure the backend is running on http://localhost:5000')
              }
            })

          // Fetch polygon history data
          fetch(`http://localhost:5000/api/soil/polygon/${storedPolyid}`)
            .then((res) => {
              if (res.ok) {
                return res.json()
              } else {
                return res.json().then(err => {
                  console.error('Error fetching NDVI history data:', err)
                  return null
                })
              }
            })
            .then((data) => {
              if (data) {
                console.log('NDVI history data received for polygon', storedPolyid, ':', Array.isArray(data) ? data.length : 1, 'entries')
                setPolygonHistoryData(Array.isArray(data) ? data : [data])
              }
            })
            .catch((err) => {
              console.error('Error fetching polygon history data:', err)
              if (err.message?.includes('fetch') || err.message?.includes('network')) {
                setApiError(prev => prev || 'Cannot connect to backend server. Make sure the backend is running on http://localhost:5000')
              }
            })
            .finally(() => setIsLoadingApi(false))

          // Fetch AI Analysis
          setIsLoadingAI(true)
          fetch(`http://localhost:5000/api/ai-analysis/${storedPolyid}`)
            .then((res) => {
              if (res.ok) {
                return res.json()
              } else {
                return res.json().then(err => {
                  console.error('Error fetching AI analysis:', err)
                  return null
                })
              }
            })
            .then((data) => {
              if (data) {
                console.log('AI Analysis received for polygon', storedPolyid, ':', data)
                setAiAnalysisData(data)
              }
            })
            .catch((err) => {
              console.error('Error fetching AI analysis:', err)
            })
            .finally(() => setIsLoadingAI(false))

          // Set polygon data from stored info if available
          setPolygonData({ polyid: storedPolyid, center: [0, 0], area: 0 })
          currentPolyidRef.current = storedPolyid
          // Update coordinates hash to match current coordinates (in case it wasn't set before)
          localStorage.setItem('coordsHash', coordsHash)
          hasInitializedRef.current = true
        } else {
          // Coordinates changed or no polyid - create new polygon
          console.log('Creating new polygon - coordinates changed or no existing polyid')
          console.log('Current coordinates hash:', coordsHash.substring(0, 50) + '...')
          console.log('Stored coordinates hash:', storedCoordsHash ? storedCoordsHash.substring(0, 50) + '...' : 'none')
          
          // Clear old data and polyid to ensure we create a new one
          setSoilData(null)
          setPolygonHistoryData(null)
          currentPolyidRef.current = null
          localStorage.removeItem('polyid')
          // Store new coordinates hash for future comparison
          localStorage.setItem('coordsHash', coordsHash)
          // Create polygon and fetch data
          hasInitializedRef.current = true
          createPolygonAndFetchData(parsedData.coordinates)
        }
      } else {
        // No data found, redirect back to map
        router.push('/map')
      }
    } catch (error) {
      console.error('Error loading shape data:', error)
      router.push('/map')
    } finally {
      setIsLoading(false)
    }
  }, [router, createPolygonAndFetchData])

  // Calculate dimensions for rectangle
  const calculateDimensions = () => {
    if (!shapeData || shapeData.type !== 'Rectangle') return null

    const coords = shapeData.coordinates as L.LatLng[]
    if (coords.length < 4) return null

    // Get bounds
    const lats = coords.map(c => (c as L.LatLng).lat)
    const lngs = coords.map(c => (c as L.LatLng).lng)

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Calculate width and height in meters
    const start = L.latLng(minLat, minLng)
    const widthPoint = L.latLng(minLat, maxLng)
    const heightPoint = L.latLng(maxLat, minLng)

    const width = start.distanceTo(widthPoint)
    const height = start.distanceTo(heightPoint)

    return {
      width: formatDistance(width),
      height: formatDistance(height),
      widthMeters: width,
      heightMeters: height,
    }
  }

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters.toFixed(2)} m`
    }
    return `${(meters / 1000).toFixed(2)} km`
  }

  // Calculate center point for map
  const getCenterPoint = (): LatLngExpression | null => {
    if (!shapeData || shapeData.coordinates.length === 0) return null

    const coords = shapeData.coordinates as L.LatLng[]
    const lats = coords.map(c => (c as L.LatLng).lat)
    const lngs = coords.map(c => (c as L.LatLng).lng)

    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2

    return [centerLat, centerLng]
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading analysis...</p>
      </div>
    )
  }

  if (!shapeData) {
    return null
  }

  const dimensions = calculateDimensions()
  const centerPoint = getCenterPoint()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-success shadow-md border border-success/30">
                <Sprout className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">FarmLite</h1>
                <p className="text-xs text-muted-foreground">Smart Soil Analysis</p>
              </div>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 text-foreground hover:text-success font-medium transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to Map
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Area Analysis
          </h1>
          <p className="text-lg text-muted-foreground">
            Detailed information about your selected area
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Area Information Card */}
          <Card className="border-2 border-success/30 bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-success border-2 border-success/50 shadow-md">
                  <MapPin className="size-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-success">Area Details</h2>
                  <p className="text-sm text-muted-foreground">Selected area information</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Shape Type</p>
                  <p className="text-lg font-semibold text-foreground">{shapeData.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Area</p>
                  <p className="text-2xl font-bold text-success">{shapeData.area}</p>
                </div>
                {dimensions && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Width</p>
                      <p className="text-lg font-semibold text-foreground">{dimensions.width}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Height</p>
                      <p className="text-lg font-semibold text-foreground">{dimensions.height}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Coordinates Card */}
          <Card className="border-2 border-amber-300/50 bg-gradient-to-br from-amber-50 to-amber-100/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500 border-2 border-amber-600/50 shadow-md">
                  <Ruler className="size-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-amber-700">Coordinates</h2>
                  <p className="text-sm text-muted-foreground">Location points</p>
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm border-2 border-amber-200/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-foreground font-mono whitespace-pre-wrap break-words">
                  {shapeData.coordinates
                    .map((coord, idx) => {
                      if (Array.isArray(coord)) {
                        return `Point ${idx + 1}: [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`
                      }
                      const latLng = coord as L.LatLng
                      return `Point ${idx + 1}: [${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}]`
                    })
                    .join('\n')}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Data Cards */}
        {isLoadingApi && (
          <Card className="border-2 border-blue-400/50 bg-gradient-to-br from-blue-50 to-blue-100/50 mb-6">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-blue-700 font-semibold">Loading API data...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {apiError && (
          <Card className="border-2 border-red-400/50 bg-gradient-to-br from-red-50 to-red-100/50 mb-6">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-red-700 font-semibold text-lg mb-2">Error: {apiError}</p>
                </div>
                <div className="bg-white/60 rounded-lg p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Troubleshooting:</p>
                  <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                    <li>Make sure the backend server is running on port 5000</li>
                    <li>Check that your API_KEY is set in backend/.env</li>
                    <li>Verify your API key is valid at agromonitoring.com</li>
                    <li>Check the browser console (F12) for more details</li>
                    <li>Check the backend server console for error logs</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {polygonData && (
          <Card className="border-2 border-purple-400/50 bg-gradient-to-br from-purple-50 to-purple-100/50 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-purple-500 border-2 border-purple-600/50 shadow-md">
                  <MapPin className="size-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-purple-700">Polygon Information</h2>
                  <p className="text-sm text-muted-foreground">API Polygon Data</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Polygon ID</p>
                  <p className="text-lg font-semibold text-foreground font-mono">{polygonData.polyid}</p>
                </div>
                {polygonData.center && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Center</p>
                    <p className="text-lg font-semibold text-foreground">
                      [{polygonData.center[0]?.toFixed(6)}, {polygonData.center[1]?.toFixed(6)}]
                    </p>
                  </div>
                )}
                {polygonData.area && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Area (m²)</p>
                    <p className="text-lg font-semibold text-foreground">{polygonData.area.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {soilData && (
          <Card className="border-2 border-green-400/50 bg-gradient-to-br from-green-50 to-green-100/50 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-green-500 border-2 border-green-600/50 shadow-md">
                  <Droplets className="size-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-green-700">Soil Data</h2>
                  <p className="text-sm text-muted-foreground">
                    API Soil Analysis {polygonData && `(Polygon: ${polygonData.polyid.substring(0, 8)}...)`}
                  </p>
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm border-2 border-green-200/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-foreground font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(soilData, null, 2)}
                </pre>
              </div>
              {/* Display structured soil data if available */}
              <div className="mt-4 space-y-3">
                {/* API returns: { dt: number, t0: number, t10: number, moisture: number } */}
                {/* Temperature at 0cm (t0) - in Kelvin, convert to Celsius */}
                {soilData.t0 !== undefined && (
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">Temperature at 0cm</p>
                    <p className="text-lg font-semibold text-foreground">
                      {(() => {
                        const tempValue = typeof soilData.t0 === 'number' 
                          ? soilData.t0 
                          : typeof soilData.t0 === 'object' && soilData.t0 !== null
                            ? (soilData.t0 as any).value 
                            : null
                        
                        if (tempValue === null) return 'N/A'
                        
                        // Convert from Kelvin to Celsius (API returns in Kelvin)
                        const tempCelsius = tempValue - 273.15
                        return `${tempCelsius.toFixed(2)}°C (${tempValue.toFixed(2)}K)`
                      })()}
                    </p>
                  </div>
                )}
                
                {/* Temperature at 10cm (t10) - in Kelvin, convert to Celsius */}
                {soilData.t10 !== undefined && (
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">Temperature at 10cm</p>
                    <p className="text-lg font-semibold text-foreground">
                      {(() => {
                        const tempValue = typeof soilData.t10 === 'number' 
                          ? soilData.t10 
                          : typeof soilData.t10 === 'object' && soilData.t10 !== null
                            ? (soilData.t10 as any).value 
                            : null
                        
                        if (tempValue === null) return 'N/A'
                        
                        // Convert from Kelvin to Celsius (API returns in Kelvin)
                        const tempCelsius = tempValue - 273.15
                        return `${tempCelsius.toFixed(2)}°C (${tempValue.toFixed(2)}K)`
                      })()}
                    </p>
                  </div>
                )}
                
                {/* Temperature at 100cm (t100) - in Kelvin, convert to Celsius */}
                {soilData.t100 !== undefined && (
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">Temperature at 100cm</p>
                    <p className="text-lg font-semibold text-foreground">
                      {(() => {
                        const tempValue = typeof soilData.t100 === 'number' 
                          ? soilData.t100 
                          : typeof soilData.t100 === 'object' && soilData.t100 !== null
                            ? (soilData.t100 as any).value 
                            : null
                        
                        if (tempValue === null) return 'N/A'
                        
                        // Convert from Kelvin to Celsius (API returns in Kelvin)
                        const tempCelsius = tempValue - 273.15
                        return `${tempCelsius.toFixed(2)}°C (${tempValue.toFixed(2)}K)`
                      })()}
                    </p>
                  </div>
                )}
                
                {/* Alternative structures - check for common field names */}
                {(soilData.t || soilData.temperature || soilData.temp) && (
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">Temperature</p>
                    <p className="text-lg font-semibold text-foreground">
                      {typeof (soilData.t || soilData.temperature || soilData.temp) === 'number'
                        ? `${(soilData.t || soilData.temperature || soilData.temp).toFixed(2)}°C`
                        : JSON.stringify(soilData.t || soilData.temperature || soilData.temp)}
                    </p>
                  </div>
                )}
                
                {/* Moisture data - API returns as a number (m³/m³) */}
                {soilData.moisture !== undefined && (
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">Soil Moisture</p>
                    <div className="space-y-1 mt-2">
                      {typeof soilData.moisture === 'number' ? (
                        <p className="text-lg font-semibold text-foreground">
                          {(soilData.moisture * 100).toFixed(2)}% ({(soilData.moisture).toFixed(4)} m³/m³)
                        </p>
                      ) : typeof soilData.moisture === 'object' && soilData.moisture !== null ? (
                        <>
                          {(soilData.moisture as any).surface !== undefined && (
                            <p className="text-sm text-foreground">
                              Surface: {typeof (soilData.moisture as any).surface === 'number' 
                                ? `${((soilData.moisture as any).surface * 100).toFixed(2)}%`
                                : String((soilData.moisture as any).surface)}
                            </p>
                          )}
                          {(soilData.moisture as any).depth10 !== undefined && (
                            <p className="text-sm text-foreground">
                              10cm: {typeof (soilData.moisture as any).depth10 === 'number' 
                                ? `${((soilData.moisture as any).depth10 * 100).toFixed(2)}%`
                                : String((soilData.moisture as any).depth10)}
                            </p>
                          )}
                          {(soilData.moisture as any).depth100 !== undefined && (
                            <p className="text-sm text-foreground">
                              100cm: {typeof (soilData.moisture as any).depth100 === 'number' 
                                ? `${((soilData.moisture as any).depth100 * 100).toFixed(2)}%`
                                : String((soilData.moisture as any).depth100)}
                            </p>
                          )}
                          {(soilData.moisture as any).moisture !== undefined && (
                            <p className="text-sm text-foreground">
                              Moisture: {typeof (soilData.moisture as any).moisture === 'number' 
                                ? `${((soilData.moisture as any).moisture * 100).toFixed(2)}%`
                                : String((soilData.moisture as any).moisture)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-foreground">
                          {String(soilData.moisture)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Display timestamp if available */}
                {soilData.dt && (
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">Data Timestamp</p>
                    <p className="text-sm text-foreground">
                      {new Date(soilData.dt * 1000).toLocaleString()}
                    </p>
                  </div>
                )}
                
                {/* Display any other numeric fields that might be soil data */}
                {Object.entries(soilData).filter(([key, value]) => 
                  !['t0', 't10', 't100', 'moisture', 't', 'temperature', 'temp'].includes(key) &&
                  typeof value === 'number' &&
                  (key.toLowerCase().includes('temp') || key.toLowerCase().includes('moisture'))
                ).map(([key, value]) => (
                  <div key={key} className="bg-white/60 rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">{key}</p>
                    <p className="text-lg font-semibold text-foreground">
                      {key.toLowerCase().includes('temp') ? `${value.toFixed(2)}°C` : value.toFixed(2)}
                    </p>
                  </div>
                ))}
                
                {/* Show a message if no structured data was found but we have soilData */}
                {!soilData.t0 && !soilData.t10 && !soilData.t100 && !soilData.moisture && 
                 !soilData.t && !soilData.temperature && !soilData.temp && (
                  <div className="bg-amber-50/60 rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-medium text-amber-700 mb-2">
                      ⚠️ No standard soil data fields found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The API returned data, but it doesn't match the expected structure. 
                      Check the JSON above to see the actual data format. 
                      Available fields: {Object.keys(soilData).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {polygonHistoryData && polygonHistoryData.length > 0 && (
          <Card className="border-2 border-orange-400/50 bg-gradient-to-br from-orange-50 to-orange-100/50 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-orange-500 border-2 border-orange-600/50 shadow-md">
                  <TrendingUp className="size-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-orange-700">NDVI History</h2>
                  <p className="text-sm text-muted-foreground">Historical Polygon Data</p>
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm border-2 border-orange-200/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-foreground font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(polygonHistoryData, null, 2)}
                </pre>
              </div>
              {/* Display structured history data */}
              <div className="mt-4 space-y-2">
                {polygonHistoryData.map((item, idx) => (
                  <div key={idx} className="bg-white/60 rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Date: {item.dt ? new Date(item.dt * 1000).toLocaleDateString() : 'N/A'}
                    </p>
                    {item.data?.value && (
                      <p className="text-lg font-semibold text-foreground">
                        NDVI Value: {item.data.value.toFixed(4)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis Card */}
        {isLoadingAI && (
          <Card className="border-2 border-purple-400/50 bg-gradient-to-br from-purple-50 to-purple-100/50 mb-6">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-purple-700 font-semibold">Loading AI Analysis...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {aiAnalysisData && (
          <>
            {/* Score Block - Soil Quality Index */}
            <Card className="border-2 border-purple-400/50 bg-gradient-to-br from-purple-50 to-purple-100/50 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-purple-500 border-2 border-purple-600/50 shadow-md">
                    <Brain className="size-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-purple-700">AI Agriculture Analysis</h2>
                    <p className="text-sm text-muted-foreground">
                      Smart Farming Assistant — Earth from Space
                      {aiAnalysisData.Analysis_Source && (
                        <span className="ml-2 text-xs text-purple-600">
                          ({aiAnalysisData.Analysis_Source})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Score Display - Large and Prominent */}
                <div className="bg-white/90 backdrop-blur-sm border-2 border-purple-200/50 rounded-xl p-6 mb-4">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Soil Quality Index</h3>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className={`px-8 py-6 rounded-2xl font-bold text-5xl shadow-lg ${
                        aiAnalysisData.Fertility_Level === 'Excellent' 
                          ? 'bg-gradient-to-br from-green-400 to-green-600 text-white border-4 border-green-300' 
                          : aiAnalysisData.Fertility_Level === 'Moderate'
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-4 border-yellow-300'
                          : 'bg-gradient-to-br from-red-400 to-red-600 text-white border-4 border-red-300'
                      }`}>
                        {typeof aiAnalysisData.Soil_Quality_Index === 'number' 
                          ? aiAnalysisData.Soil_Quality_Index.toFixed(1) 
                          : aiAnalysisData.Soil_Quality_Index}
                      </div>
                      <div className="text-left">
                        <div className={`text-2xl font-bold mb-1 ${
                          aiAnalysisData.Fertility_Level === 'Excellent' 
                            ? 'text-green-700' 
                            : aiAnalysisData.Fertility_Level === 'Moderate'
                            ? 'text-yellow-700'
                            : 'text-red-700'
                        }`}>
                          {aiAnalysisData.Fertility_Level === 'Excellent' ? '🟢' : aiAnalysisData.Fertility_Level === 'Moderate' ? '🟡' : '🔴'} {aiAnalysisData.Fertility_Level}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Confidence: {(aiAnalysisData.AI_Confidence_Score * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    {aiAnalysisData.Field_Summary && (
                      <p className="text-foreground text-base italic border-t border-purple-200 pt-4 mt-4">
                        "{aiAnalysisData.Field_Summary || aiAnalysisData.Summary}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary Info */}
                <div className="bg-white/90 backdrop-blur-sm border-2 border-purple-200/50 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Info className="size-5 text-purple-600 mt-0.5" />
                    <h3 className="text-lg font-semibold text-foreground">Field Condition Summary</h3>
                  </div>
                  <p className="text-foreground">{aiAnalysisData.Field_Summary || aiAnalysisData.Summary}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tips & Recommendations Block */}
            <Card className="border-2 border-green-400/50 bg-gradient-to-br from-green-50 to-green-100/50 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-green-500 border-2 border-green-600/50 shadow-md">
                    <CheckCircle className="size-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-green-700">AI Recommendations & Tips</h2>
                    <p className="text-sm text-muted-foreground">Improvement strategies from Gemini AI</p>
                  </div>
                </div>

                {/* Recommendations List */}
                <div className="bg-white/90 backdrop-blur-sm border-2 border-green-200/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Improvement Recommendations</h3>
                  <div className="space-y-4">
                    {aiAnalysisData.Recommendations && aiAnalysisData.Recommendations.length > 0 ? (
                      aiAnalysisData.Recommendations.map((recommendation, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-green-50/50 rounded-lg border border-green-200/50">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm mt-0.5">
                            {idx + 1}
                          </div>
                          <p className="text-foreground flex-1">{recommendation}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic">No recommendations available</p>
                    )}
                  </div>
                </div>

                {/* Recommended Crops */}
                {aiAnalysisData.Predicted_Crops && aiAnalysisData.Predicted_Crops.length > 0 && (
                  <div className="bg-white/90 backdrop-blur-sm border-2 border-green-200/50 rounded-lg p-6 mt-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Recommended Crops</h3>
                    <div className="flex flex-wrap gap-2">
                      {aiAnalysisData.Predicted_Crops.map((crop, idx) => (
                        <span
                          key={idx}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium border-2 border-green-300 shadow-sm hover:shadow-md transition-shadow"
                        >
                          {crop}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Yield Prediction */}
                {aiAnalysisData.Predicted_Yield && aiAnalysisData.Predicted_Yield !== 'Unknown' && (
                  <div className="bg-white/90 backdrop-blur-sm border-2 border-green-200/50 rounded-lg p-6 mt-4">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Predicted Yield Quality</h3>
                    <div className={`inline-block px-4 py-2 rounded-lg font-semibold text-lg ${
                      (aiAnalysisData.Predicted_Yield_Quality === 'High' || aiAnalysisData.Predicted_Yield === 'High')
                        ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                        : (aiAnalysisData.Predicted_Yield_Quality === 'Medium' || aiAnalysisData.Predicted_Yield === 'Medium')
                        ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                        : 'bg-red-100 text-red-700 border-2 border-red-300'
                    }`}>
                      {aiAnalysisData.Predicted_Yield || aiAnalysisData.Predicted_Yield_Quality}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Conditions Block (Optional - can be collapsed or moved) */}
            <Card className="border-2 border-blue-400/50 bg-gradient-to-br from-blue-50 to-blue-100/50 mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Current Conditions</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Temperature */}
                  <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-200/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Temperature</h4>
                    <p className="text-sm text-foreground">Surface: {aiAnalysisData.Current_Conditions.temperature.surface}</p>
                    <p className="text-sm text-foreground">10cm: {aiAnalysisData.Current_Conditions.temperature.depth_10cm}</p>
                    <p className={`text-xs font-medium mt-2 ${
                      aiAnalysisData.Current_Conditions.temperature.status === 'optimal' ? 'text-green-600' :
                      aiAnalysisData.Current_Conditions.temperature.status === 'cold' ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      Status: {aiAnalysisData.Current_Conditions.temperature.status}
                    </p>
                  </div>

                  {/* Moisture */}
                  <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-200/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Moisture</h4>
                    <p className="text-lg font-semibold text-foreground">{aiAnalysisData.Current_Conditions.moisture.value}</p>
                    <p className={`text-xs font-medium mt-2 ${
                      aiAnalysisData.Current_Conditions.moisture.status === 'sufficient' ? 'text-green-600' :
                      aiAnalysisData.Current_Conditions.moisture.status === 'low' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      Status: {aiAnalysisData.Current_Conditions.moisture.status}
                    </p>
                  </div>

                  {/* Vegetation */}
                  <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-200/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Vegetation (NDVI)</h4>
                    <p className="text-sm text-foreground">Mean: {aiAnalysisData.Current_Conditions.vegetation.ndvi_mean}</p>
                    <p className="text-sm text-foreground">Range: {aiAnalysisData.Current_Conditions.vegetation.ndvi_min} - {aiAnalysisData.Current_Conditions.vegetation.ndvi_max}</p>
                    <p className={`text-xs font-medium mt-2 ${
                      aiAnalysisData.Current_Conditions.vegetation.status.includes('excellent') || aiAnalysisData.Current_Conditions.vegetation.status.includes('good') ? 'text-green-600' :
                      aiAnalysisData.Current_Conditions.vegetation.status.includes('poor') ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      Status: {aiAnalysisData.Current_Conditions.vegetation.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Data Timestamp */}
                {aiAnalysisData.Data_Timestamp && aiAnalysisData.Data_Timestamp !== 'N/A' && (
                  <div className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t border-blue-200">
                    Analysis based on data from: {new Date(aiAnalysisData.Data_Timestamp).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Map Display Card */}
        <Card className="border-2 border-blue-400/50 bg-gradient-to-br from-blue-50 to-blue-100/50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500 border-2 border-blue-600/50 shadow-md">
                <MapPin className="size-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-700">Area Location</h2>
                <p className="text-sm text-muted-foreground">Visual representation of selected area</p>
              </div>
            </div>
            {centerPoint && (
              <MapDisplay
                coordinates={shapeData.coordinates}
                center={centerPoint}
                shapeType={shapeData.type}
              />
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Link href="/map">
            <button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md border-2 border-amber-600/30 transition-all duration-200 hover:shadow-lg">
              Select Different Area
            </button>
          </Link>
        </div>
      </main>
    </div>
  )
}

