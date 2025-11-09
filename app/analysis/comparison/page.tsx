'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, TrendingUp, Loader2 } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import dynamic from 'next/dynamic'
import type { LatLngExpression } from 'leaflet'

// Dynamically import map component
const MapDisplay = dynamic(() => import('../../components/AnalysisMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gradient-to-br from-[#f5e6d3] to-[#ede4d3] rounded-xl">
      <p className="text-success font-semibold">Loading map...</p>
    </div>
  ),
})

interface ComparisonArea {
  polyid: string | null
  center: [number, number]
  coordinates: LatLngExpression[]
  score: number
  fertilityLevel: string
  area: string // e.g., "3 hectares"
  distance: number // km from original area
  summary?: string
}

interface CurrentAnalysis {
  polyid: string
  score: number
  coordinates: LatLngExpression[]
  center: [number, number]
}

export default function ComparisonPage() {
  const router = useRouter()
  const [currentAnalysis, setCurrentAnalysis] = useState<CurrentAnalysis | null>(null)
  const [comparisonAreas, setComparisonAreas] = useState<ComparisonArea[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedCount, setLoadedCount] = useState(0)
  const [radiusKm, setRadiusKm] = useState<number>(100) // Default 100 km

  // Generate random point within radius (in km)
  // center is [lat, lng] format
  const generateRandomPoint = useCallback((center: [number, number], radiusKm: number): [number, number] => {
    const [centerLat, centerLng] = center
    
    // Validate center coordinates
    if (isNaN(centerLat) || isNaN(centerLng) || centerLat < -90 || centerLat > 90 || centerLng < -180 || centerLng > 180) {
      console.error('Invalid center coordinates:', center)
      return center
    }
    
    // Convert km to degrees
    // 1 degree of latitude ≈ 111 km
    // 1 degree of longitude ≈ 111 km * cos(latitude)
    const latRadiusDeg = radiusKm / 111.0
    const lngRadiusDeg = radiusKm / (111.0 * Math.cos((centerLat * Math.PI) / 180))
    
    // Generate random angle (0 to 2π)
    const angle = Math.random() * 2 * Math.PI
    
    // Generate random distance from center (0 to radius)
    // Use square root for uniform distribution in area
    const distanceRatio = Math.sqrt(Math.random())
    
    // Calculate offset in degrees
    const latOffset = distanceRatio * latRadiusDeg * Math.cos(angle)
    const lngOffset = distanceRatio * lngRadiusDeg * Math.sin(angle)
    
    // Calculate new point
    const newLat = centerLat + latOffset
    const newLng = centerLng + lngOffset
    
    // Validate resulting coordinates
    if (newLat < -90 || newLat > 90 || newLng < -180 || newLng > 180) {
      console.warn('Generated point outside valid range, clamping:', [newLat, newLng])
      return [
        Math.max(-90, Math.min(90, newLat)),
        Math.max(-180, Math.min(180, newLng))
      ]
    }
    
    return [newLat, newLng]
  }, [])

  // Create 3-hectare rectangle coordinates (3 hectares ≈ 173m x 173m)
  const create3HectareRectangle = useCallback((center: [number, number]): LatLngExpression[] => {
    // 3 hectares = 30,000 m²
    // Square: √30000 ≈ 173.2 meters
    // Convert to degrees: 173.2m / 111,000m per degree ≈ 0.00156 degrees
    const sizeDeg = 173.2 / 111000
    
    const latOffset = sizeDeg / 2
    const lngOffset = sizeDeg / (2 * Math.cos((center[0] * Math.PI) / 180))
    
    return [
      [center[0] - latOffset, center[1] - lngOffset],
      [center[0] + latOffset, center[1] - lngOffset],
      [center[0] + latOffset, center[1] + lngOffset],
      [center[0] - latOffset, center[1] + lngOffset],
      [center[0] - latOffset, center[1] - lngOffset], // Close the polygon
    ]
  }, [])

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = useCallback((point1: [number, number], point2: [number, number]): number => {
    const R = 6371 // Earth's radius in km
    const dLat = ((point2[0] - point1[0]) * Math.PI) / 180
    const dLon = ((point2[1] - point1[1]) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1[0] * Math.PI) / 180) *
        Math.cos((point2[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  // Load comparison areas
  const loadComparisonAreas = useCallback(async () => {
    if (!currentAnalysis) {
      setError('No analysis data available')
      return
    }

    setIsLoading(true)
    setError(null)
    setComparisonAreas([])
    setLoadedCount(0)

    try {
      // Validate center coordinates
      const center = currentAnalysis.center
      console.log('Generating comparison areas near center:', center)
      console.log('Center coordinates format: [lat, lng] =', center)
      
      if (!center || center.length !== 2 || isNaN(center[0]) || isNaN(center[1])) {
        throw new Error('Invalid center coordinates')
      }
      
      // Generate 4 random locations within selected radius
      const numLocations = 4
      const randomPoints: [number, number][] = []

      // Generate unique random points
      for (let i = 0; i < numLocations; i++) {
        let attempts = 0
        let point: [number, number]
        do {
          point = generateRandomPoint(center, radiusKm)
          const distance = calculateDistance(center, point)
          console.log(`Generated point ${i + 1}:`, point, `Distance: ${distance.toFixed(2)} km`)
          
          attempts++
          // Ensure minimum distance between points (at least 5km apart, or 10% of radius, whichever is smaller)
          const minDistance = Math.min(5, radiusKm * 0.1)
          const tooClose = randomPoints.some(p => calculateDistance(p, point) < minDistance)
          if (!tooClose || attempts > 50) break
        } while (attempts < 50)
        randomPoints.push(point)
        
        // Verify distance
        const distance = calculateDistance(center, point)
        if (distance > radiusKm * 1.1) {
          console.warn(`Point ${i + 1} is ${distance.toFixed(2)}km away (expected < ${radiusKm}km)`)
        }
      }

      console.log(`Generated ${randomPoints.length} random locations within ${radiusKm}km radius`)
      console.log('All points:', randomPoints)

      // Create and analyze each location
      const areaPromises = randomPoints.map(async (center, index) => {
        try {
          const coordinates = create3HectareRectangle(center)
          
          // Try to create polygon
          const createRes = await fetch('http://localhost:5000/api/soil/polygon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinates }),
          })

          let polyid: string | null = null
          
          if (!createRes.ok) {
            const errorData = await createRes.json().catch(() => ({}))
            
            // Check if polygon creation limit reached
            if (errorData.message && errorData.message.includes('can not create polygons')) {
              console.warn(`⚠️  Polygon creation limit reached for location ${index + 1}`)
              return null // Skip this location
            }
            
            // If existing polygon, use it
            if (errorData.existingPolyid) {
              polyid = errorData.existingPolyid
            } else {
              console.warn(`Failed to create polygon for location ${index + 1}:`, errorData.message || errorData.error)
              return null
            }
          } else {
            const polygonData = await createRes.json()
            polyid = polygonData.polyid
          }

          if (!polyid) return null

          // Analyze the polygon
          const analysisRes = await fetch(`http://localhost:5000/api/ai-analysis/${polyid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })

          if (!analysisRes.ok) {
            console.warn(`Failed to analyze polygon ${polyid}`)
            return null
          }

          const analysis = await analysisRes.json()
          const distance = calculateDistance(currentAnalysis.center, center)
          const score = typeof analysis.Soil_Quality_Index === 'number' ? analysis.Soil_Quality_Index : 0

          setLoadedCount(prev => prev + 1)

          return {
            polyid,
            center,
            coordinates,
            score,
            fertilityLevel: analysis.Fertility_Level || analysis.Soil_Quality_Level || 'Unknown',
            area: '3 hectares',
            distance,
            summary: analysis.Field_Summary || analysis.Summary,
          } as ComparisonArea
        } catch (err: any) {
          console.error(`Error processing location ${index + 1}:`, err.message || err)
          return null
        }
      })

      const areas = (await Promise.all(areaPromises)).filter(Boolean) as ComparisonArea[]
      
      if (areas.length === 0) {
        setError('Unable to create or analyze comparison areas. Your AgroMonitoring API key may have reached its polygon creation limit. Please check your account limits or try again later.')
      } else {
        // Sort by score (highest first)
        areas.sort((a, b) => b.score - a.score)
        setComparisonAreas(areas)
        console.log(`Loaded ${areas.length} comparison areas`)
      }
    } catch (err: any) {
      console.error('Error loading comparison areas:', err)
      setError(err.message || 'Failed to load comparison areas')
    } finally {
      setIsLoading(false)
    }
  }, [currentAnalysis, radiusKm, generateRandomPoint, create3HectareRectangle, calculateDistance])

  // Load current analysis on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentAnalysis')
      const shapeData = localStorage.getItem('shapeData')
      const storedPolyid = localStorage.getItem('polyid')
      const aiAnalysisData = localStorage.getItem('aiAnalysisData')

      if (stored) {
        const analysis: CurrentAnalysis = JSON.parse(stored)
        console.log('Loaded currentAnalysis from localStorage:', analysis)
        console.log('Center coordinates:', analysis.center)
        // Verify center is in [lat, lng] format
        if (analysis.center && Array.isArray(analysis.center) && analysis.center.length === 2) {
          const [lat, lng] = analysis.center
          // Validate: lat should be between -90 and 90, lng between -180 and 180
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            setCurrentAnalysis(analysis)
          } else {
            console.warn('Center coordinates seem to be in wrong format, attempting to fix:', analysis.center)
            // Try swapping if lat > 90 or lat < -90 (might be lon, lat format)
            if ((lat > 90 || lat < -90) && (lng >= -90 && lng <= 90)) {
              console.log('Swapping coordinates to [lat, lng] format')
              setCurrentAnalysis({
                ...analysis,
                center: [lng, lat] as [number, number]
              })
            } else {
              setCurrentAnalysis(analysis) // Use as-is and let validation catch it
            }
          }
        } else {
          setCurrentAnalysis(analysis)
        }
      } else if (shapeData && storedPolyid) {
        const shape = JSON.parse(shapeData)
        const coords = shape.coordinates as [number, number][]
        const center: [number, number] = [
          coords.reduce((sum, c) => sum + (Array.isArray(c) ? c[0] : (c as any).lat), 0) / coords.length,
          coords.reduce((sum, c) => sum + (Array.isArray(c) ? c[1] : (c as any).lng), 0) / coords.length,
        ]
        
        let score = 0
        if (aiAnalysisData) {
          try {
            const analysis = JSON.parse(aiAnalysisData)
            score = analysis.Soil_Quality_Index || 0
          } catch (e) {
            // Ignore
          }
        }

        setCurrentAnalysis({
          polyid: storedPolyid,
          score,
          coordinates: shape.coordinates,
          center,
        })
      } else {
        setError('No analysis data found. Please analyze an area first.')
      }
    } catch (err) {
      console.error('Error loading analysis data:', err)
      setError('Failed to load analysis data')
    }
  }, [])

  // Don't auto-load - wait for user to select radius and click search

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-700 bg-green-100 border-green-300'
    if (score >= 50) return 'text-yellow-700 bg-yellow-100 border-yellow-300'
    return 'text-red-700 bg-red-100 border-red-300'
  }

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'from-green-500 to-green-600'
    if (score >= 50) return 'from-yellow-500 to-yellow-600'
    return 'from-red-500 to-red-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5e6d3] to-[#ede4d3] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/analysis"
            className="inline-flex items-center gap-2 text-foreground hover:text-success font-medium transition-colors mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Analysis
          </Link>
          <h1 className="text-3xl font-bold text-success mb-2">Nearby Area Comparison</h1>
          <p className="text-muted-foreground mb-4">
            Compare your area with 3-4 randomly selected nearby locations (3 hectares each)
          </p>
          
          {/* Radius Selector */}
          {currentAnalysis && (
            <Card className="border-2 border-blue-400/50 bg-gradient-to-br from-blue-50 to-blue-100/50 mb-6">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="radius" className="block text-sm font-medium text-foreground mb-2">
                      Search Radius: <span className="font-bold text-blue-700">{radiusKm} km</span>
                    </label>
                    <input
                      type="range"
                      id="radius"
                      min="10"
                      max="100"
                      step="10"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>10 km</span>
                      <span>100 km</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setComparisonAreas([])
                      setError(null)
                      loadComparisonAreas()
                    }}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg shadow-md border-2 border-blue-400/50 transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="size-5" />
                        Search Nearby Areas
                      </>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="border-2 border-blue-400/50 bg-gradient-to-br from-blue-50 to-blue-100/50 mb-6">
            <CardContent className="p-6">
              <div className="text-center space-y-3">
                <Loader2 className="size-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-blue-700 font-semibold">
                  Loading comparison areas... ({loadedCount}/4)
                </p>
                <p className="text-sm text-muted-foreground">
                  Searching within {radiusKm}km radius. Creating and analyzing polygons. This may take a moment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="border-2 border-red-400/50 bg-gradient-to-br from-red-50 to-red-100/50 mb-6">
            <CardContent className="p-6">
              <p className="text-red-700 font-semibold text-lg">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Current Area Card */}
        {currentAnalysis && (
          <Card className="border-2 border-purple-400/50 bg-gradient-to-br from-purple-50 to-purple-100/50 mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-purple-700 mb-4">Your Selected Area</h2>
              <div className="flex items-center gap-4">
                <div className={`px-6 py-4 rounded-xl font-bold text-3xl bg-gradient-to-br ${getScoreBgColor(currentAnalysis.score)} text-white border-4`}>
                  {currentAnalysis.score.toFixed(1)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Score: {currentAnalysis.score.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Original analyzed area</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison Areas */}
        {comparisonAreas.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Nearby Comparison Areas ({comparisonAreas.length} found)
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {comparisonAreas.map((area, index) => (
                <Card
                  key={index}
                  className="border-2 border-blue-400/50 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Area #{index + 1}</span>
                        <span className="text-xs text-muted-foreground">{area.distance.toFixed(1)} km away</span>
                      </div>
                      
                      <div className="text-center">
                        <div className={`inline-block px-4 py-3 rounded-lg font-bold text-2xl bg-gradient-to-br ${getScoreBgColor(area.score)} text-white mb-2`}>
                          {area.score.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">Soil Quality Score</p>
                        <p className={`text-sm font-semibold px-2 py-1 rounded border-2 ${getScoreColor(area.score)}`}>
                          {area.fertilityLevel}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-blue-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Area:</span>
                          <span className="font-semibold text-foreground">{area.area}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Distance:</span>
                          <span className="font-semibold text-foreground">{area.distance.toFixed(1)} km</span>
                        </div>
                      </div>

                      {area.summary && (
                        <p className="text-xs text-muted-foreground italic line-clamp-2">{area.summary}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Map Display */}
        {currentAnalysis && (
          <Card className="border-2 border-amber-400/50 bg-gradient-to-br from-amber-50 to-amber-100/50 mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-amber-700 mb-4">Map View</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Your selected area is shown in green. Comparison areas are color-coded by score (green=80+, yellow=50-79, red=&lt;50).
              </p>
              <MapDisplay
                coordinates={currentAnalysis.coordinates}
                center={currentAnalysis.center}
                shapeType="Polygon"
                comparisonAreas={comparisonAreas.map((area, index) => ({
                  center: area.center,
                  coordinates: area.coordinates,
                  score: area.score,
                  label: `Area #${index + 1} (Score: ${area.score.toFixed(1)})`
                }))}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

