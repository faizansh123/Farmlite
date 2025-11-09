'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap, Polygon, Rectangle, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { LatLngExpression } from 'leaflet'

interface ComparisonArea {
  center: [number, number]
  coordinates: LatLngExpression[]
  score: number
  label?: string
}

interface AnalysisMapProps {
  coordinates: LatLngExpression[]
  center: LatLngExpression
  shapeType?: string
  comparisonAreas?: ComparisonArea[]
}

// Component to handle map view
function MapView({ 
  center, 
  coordinates,
  comparisonAreas
}: { 
  center: LatLngExpression
  coordinates: LatLngExpression[]
  comparisonAreas?: ComparisonArea[]
}) {
  const map = useMap()

  useEffect(() => {
    // Fit map to show all coordinates including comparison areas
    const allPoints: L.LatLng[] = []
    
    // Add current area coordinates
    coordinates.forEach(coord => {
      if (Array.isArray(coord)) {
        allPoints.push(L.latLng(coord[0], coord[1]))
      } else {
        allPoints.push(coord as L.LatLng)
      }
    })
    
    // Add comparison area centers
    if (comparisonAreas) {
      comparisonAreas.forEach(area => {
        allPoints.push(L.latLng(area.center[0], area.center[1]))
        // Also add comparison area coordinates for better bounds
        area.coordinates.forEach(coord => {
          if (Array.isArray(coord)) {
            allPoints.push(L.latLng(coord[0], coord[1]))
          }
        })
      })
    }
    
    if (allPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(allPoints)
        map.fitBounds(bounds, { padding: [50, 50] })
      } catch (error) {
        // Fallback to center view
        if (Array.isArray(center)) {
          map.setView(L.latLng(center[0], center[1]), 13)
        } else {
          map.setView(center, 13)
        }
      }
    } else {
      if (Array.isArray(center)) {
        map.setView(L.latLng(center[0], center[1]), 13)
      } else {
        map.setView(center, 13)
      }
    }
  }, [map, center, coordinates, comparisonAreas])

  return null
}

export default function AnalysisMap({ coordinates, center, shapeType = 'Polygon', comparisonAreas }: AnalysisMapProps) {
  // Convert coordinates to proper format
  const latlngs = coordinates.map(coord => {
    if (Array.isArray(coord)) {
      return L.latLng(coord[0], coord[1])
    }
    return coord as L.LatLng
  })

  // Get center as LatLng
  const centerLatLng = Array.isArray(center) ? L.latLng(center[0], center[1]) : center as L.LatLng

  // For rectangle, get bounds from coordinates
  const getRectangleBounds = (coords: LatLngExpression[]): L.LatLngBounds | null => {
    if (shapeType !== 'Rectangle' || coords.length < 4) return null
    
    // Extract lat/lng values
    const points = coords.map(coord => {
      if (Array.isArray(coord)) {
        return { lat: coord[0], lng: coord[1] }
      }
      const latLng = coord as L.LatLng
      return { lat: latLng.lat, lng: latLng.lng }
    })
    
    const lats = points.map(p => p.lat)
    const lngs = points.map(p => p.lng)
    
    const southwest = L.latLng(Math.min(...lats), Math.min(...lngs))
    const northeast = L.latLng(Math.max(...lats), Math.max(...lngs))
    
    return L.latLngBounds(southwest, northeast)
  }

  const rectangleBounds = getRectangleBounds(coordinates)

  // Get color based on score for comparison areas
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22c55e' // green
    if (score >= 50) return '#eab308' // yellow
    return '#ef4444' // red
  }

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-white to-[#faf5e6] border-2 border-amber-200/50">
      <MapContainer
        center={centerLatLng}
        zoom={13}
        style={{ height: '500px', width: '100%' }}
        zoomControl={true}
        className="rounded-lg"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          minZoom={1}
        />
        
        <MapView center={centerLatLng} coordinates={coordinates} comparisonAreas={comparisonAreas} />

        {/* Render current area shape */}
        {shapeType === 'Rectangle' && rectangleBounds ? (
          <Rectangle
            bounds={rectangleBounds}
            pathOptions={{
              color: '#166534',
              fillColor: '#166534',
              fillOpacity: 0.3,
              weight: 3,
            }}
          />
        ) : coordinates.length > 0 ? (
          <Polygon
            positions={latlngs}
            pathOptions={{
              color: '#166534',
              fillColor: '#166534',
              fillOpacity: 0.3,
              weight: 3,
            }}
          />
        ) : null}

        {/* Render comparison areas */}
        {comparisonAreas && comparisonAreas.map((area, index) => {
          const areaLatlngs = area.coordinates.map(coord => {
            if (Array.isArray(coord)) {
              return L.latLng(coord[0], coord[1])
            }
            return coord as L.LatLng
          })
          
          // Check if it's a rectangle by trying to get bounds
          const areaBounds = (() => {
            if (area.coordinates.length < 4) return null
            const points = area.coordinates.map(coord => {
              if (Array.isArray(coord)) {
                return { lat: coord[0], lng: coord[1] }
              }
              const latLng = coord as L.LatLng
              return { lat: latLng.lat, lng: latLng.lng }
            })
            const lats = points.map(p => p.lat)
            const lngs = points.map(p => p.lng)
            const southwest = L.latLng(Math.min(...lats), Math.min(...lngs))
            const northeast = L.latLng(Math.max(...lats), Math.max(...lngs))
            return L.latLngBounds(southwest, northeast)
          })()
          
          const color = getScoreColor(area.score)
          const areaCenter = L.latLng(area.center[0], area.center[1])
          const label = area.label || `Area ${index + 1}`
          
          return (
            <>
              {areaBounds ? (
                <Rectangle
                  key={`rect-${index}`}
                  bounds={areaBounds}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.4,
                    weight: 3,
                  }}
                />
              ) : areaLatlngs.length > 0 ? (
                <Polygon
                  key={`poly-${index}`}
                  positions={areaLatlngs}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.4,
                    weight: 3,
                  }}
                />
              ) : null}
              <Marker key={`marker-${index}`} position={areaCenter}>
                <Popup>
                  <div style={{ padding: '8px', minWidth: '150px' }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: color }}>
                      {label}
                    </h3>
                    <p style={{ fontSize: '12px', margin: '4px 0' }}>
                      <strong>Score:</strong> {area.score.toFixed(1)}
                    </p>
                    <p style={{ fontSize: '12px', margin: '4px 0' }}>
                      <strong>Location:</strong> {area.center[0].toFixed(4)}, {area.center[1].toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </>
          )
        })}
      </MapContainer>
    </div>
  )
}

