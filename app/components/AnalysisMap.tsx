'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap, Polygon, Rectangle } from 'react-leaflet'
import L from 'leaflet'
import type { LatLngExpression } from 'leaflet'

interface AnalysisMapProps {
  coordinates: LatLngExpression[]
  center: LatLngExpression
  shapeType: string
}

// Component to handle map view
function MapView({ center, coordinates }: { center: LatLngExpression; coordinates: LatLngExpression[] }) {
  const map = useMap()

  useEffect(() => {
    // Fit map to show all coordinates
    if (coordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(
          coordinates.map(coord => {
            if (Array.isArray(coord)) {
              return L.latLng(coord[0], coord[1])
            }
            return coord as L.LatLng
          })
        )
        map.fitBounds(bounds, { padding: [50, 50] })
      } catch (error) {
        // Fallback to center view
        map.setView(center, 13)
      }
    } else {
      map.setView(center, 13)
    }
  }, [map, center, coordinates])

  return null
}

export default function AnalysisMap({ coordinates, center, shapeType }: AnalysisMapProps) {
  // Convert coordinates to proper format
  const latlngs = coordinates.map(coord => {
    if (Array.isArray(coord)) {
      return L.latLng(coord[0], coord[1])
    }
    return coord as L.LatLng
  })

  // For rectangle, get bounds from coordinates
  const getRectangleBounds = (): L.LatLngBounds | null => {
    if (shapeType !== 'Rectangle' || coordinates.length < 4) return null
    
    // Extract lat/lng values
    const points = coordinates.map(coord => {
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

  const rectangleBounds = getRectangleBounds()

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-white to-[#faf5e6] border-2 border-amber-200/50">
      <MapContainer
        center={center}
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
        
        <MapView center={center} coordinates={coordinates} />

        {/* Render shape based on type */}
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
        ) : (
          <Polygon
            positions={latlngs}
            pathOptions={{
              color: '#166534',
              fillColor: '#166534',
              fillOpacity: 0.3,
              weight: 3,
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}

