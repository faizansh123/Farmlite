'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sprout, ArrowLeft, MapPin, Ruler } from 'lucide-react'
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

export default function AnalysisPage() {
  const router = useRouter()
  const [shapeData, setShapeData] = useState<ShapeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Retrieve shape data from localStorage
    try {
      const storedData = localStorage.getItem('shapeData')
      if (storedData) {
        const parsedData: ShapeData = JSON.parse(storedData)
        setShapeData(parsedData)
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
  }, [router])

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

