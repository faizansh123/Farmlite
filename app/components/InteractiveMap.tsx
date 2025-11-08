'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import type { LatLngExpression } from 'leaflet'
import LocationSearch from './LocationSearch'

// Fix for default marker icons in Next.js
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface CoordinatesDisplayProps {
  coordinates: string | null
}

function CoordinatesDisplay({ coordinates }: CoordinatesDisplayProps) {
  if (!coordinates) {
    return (
      <div className="bg-gradient-to-br from-[#f5e6d3] to-[#ede4d3] rounded-xl p-6 shadow-lg border-2 border-amber-200/50">
        <p className="text-muted-foreground italic font-medium">Draw a polygon or rectangle on the map to see coordinates</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-6 shadow-lg border-2 border-success/30">
      <h3 className="text-xl font-bold text-success mb-4">
        Selected Area Coordinates:
      </h3>
      <pre className="bg-white/90 backdrop-blur-sm border-2 border-success/20 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed text-foreground font-mono whitespace-pre-wrap break-words shadow-inner">
        {coordinates}
      </pre>
    </div>
  )
}

// Component to handle map centering when location is obtained
function MapCenter({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])
  return null
}

interface DrawControlProps {
  onDrawComplete: (coordinates: string, rawCoords: LatLngExpression[]) => void
}

function DrawControl({ onDrawComplete }: DrawControlProps) {
  const map = useMap()
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)

  useEffect(() => {
    if (!map) return

    // Create a feature group to store drawn layers
    const featureGroup = new L.FeatureGroup()
    featureGroupRef.current = featureGroup
    map.addLayer(featureGroup)

    // Initialize the draw control with polygon and rectangle tools
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        rectangle: {
          showArea: true,
        },
        circle: false,
        circlemarker: false,
        polyline: false,
        marker: false,
      },
      edit: {
        featureGroup: featureGroup,
        remove: true,
      },
    })

    map.addControl(drawControl)

    // Calculate area in square meters using spherical geometry
    const calculateArea = (layer: L.Rectangle | L.Polygon): number => {
      if (layer instanceof L.Rectangle) {
        const bounds = layer.getBounds()
        const lat1 = bounds.getNorth()
        const lat2 = bounds.getSouth()
        const lng1 = bounds.getWest()
        const lng2 = bounds.getEast()
        
        // Calculate width and height in meters
        const width = L.latLng(lat1, lng1).distanceTo(L.latLng(lat1, lng2))
        const height = L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng1))
        
        return width * height
      } else if (layer instanceof L.Polygon) {
        // Calculate area using spherical geometry (more accurate for large areas)
        const latlngs = (layer as any).getLatLngs()[0] as L.LatLng[]
        if (latlngs.length < 3) return 0
        
        // Earth's radius in meters
        const R = 6378137
        
        // Convert to radians and calculate area using spherical excess
        const points = latlngs.map(p => ({
          lat: (p.lat * Math.PI) / 180,
          lng: (p.lng * Math.PI) / 180
        }))
        
        // Triangulate from first point
        const p0 = points[0]
        let totalArea = 0
        
        for (let i = 1; i < points.length - 1; i++) {
          const p1 = points[i]
          const p2 = points[i + 1]
          
          // Calculate distances (angles) between points
          const a = Math.acos(
            Math.sin(p1.lat) * Math.sin(p2.lat) +
            Math.cos(p1.lat) * Math.cos(p2.lat) * Math.cos(p2.lng - p1.lng)
          )
          const b = Math.acos(
            Math.sin(p2.lat) * Math.sin(p0.lat) +
            Math.cos(p2.lat) * Math.cos(p0.lat) * Math.cos(p0.lng - p2.lng)
          )
          const c = Math.acos(
            Math.sin(p0.lat) * Math.sin(p1.lat) +
            Math.cos(p0.lat) * Math.cos(p1.lat) * Math.cos(p1.lng - p0.lng)
          )
          
          // Spherical excess using L'Huilier's formula
          const s = (a + b + c) / 2
          const tanHalfS = Math.tan(s / 2)
          const tanHalfSA = Math.tan((s - a) / 2)
          const tanHalfSB = Math.tan((s - b) / 2)
          const tanHalfSC = Math.tan((s - c) / 2)
          
          const excess = 4 * Math.atan(
            Math.sqrt(
              Math.max(0, tanHalfS * tanHalfSA * tanHalfSB * tanHalfSC)
            )
          )
          
          totalArea += excess
        }
        
        // Convert from steradians to square meters
        return Math.abs(totalArea * R * R)
      }
      return 0
    }

    // Format area for display
    const formatArea = (areaInSquareMeters: number): string => {
      if (areaInSquareMeters < 1000000) {
        // Less than 1 km², show in m²
        return `${areaInSquareMeters.toLocaleString('en-US', { maximumFractionDigits: 2 })} m²`
      } else {
        // 1 km² or more, show in km²
        const areaInSquareKm = areaInSquareMeters / 1000000
        return `${areaInSquareKm.toLocaleString('en-US', { maximumFractionDigits: 2 })} km²`
      }
    }

    // Handle when drawing is created
    const handleDrawCreated = (e: any) => {
      const { layer } = e as L.DrawEvents.Created
      const type = layer instanceof L.Rectangle ? 'Rectangle' : 'Polygon'

      // Get coordinates based on shape type
      let coords: LatLngExpression[] = []
      if (layer instanceof L.Rectangle) {
        const bounds = layer.getBounds()
        coords = [
          bounds.getSouthWest(),
          bounds.getNorthWest(),
          bounds.getNorthEast(),
          bounds.getSouthEast(),
        ]
      } else if (layer instanceof L.Polygon) {
        coords = layer.getLatLngs()[0] as LatLngExpression[]
      }

      // Calculate area
      const areaInSquareMeters = calculateArea(layer as L.Rectangle | L.Polygon)
      const areaString = formatArea(areaInSquareMeters)

      // Format coordinates for display
      const formattedCoords = coords
        .map((coord) => {
          if (Array.isArray(coord)) {
            return `[${coord[0]}, ${coord[1]}]`
          }
          return `[${(coord as L.LatLng).lat}, ${(coord as L.LatLng).lng}]`
        })
        .join(',\n  ')

      const coordinatesString = `${type} Coordinates:\n  ${formattedCoords}\n\nArea: ${areaString}`

      // Log to console
      console.log(coordinatesString)
      console.log('Raw coordinates:', coords)
      console.log('Area:', areaString)

      // Add layer to feature group
      featureGroup.addLayer(layer)

      // Call the callback to update parent state
      onDrawComplete(coordinatesString, coords)
    }

    map.on(L.Draw.Event.CREATED as any, handleDrawCreated)

    // Cleanup
    return () => {
      map.removeControl(drawControl)
      map.off(L.Draw.Event.CREATED as any, handleDrawCreated)
      if (featureGroupRef.current) {
        map.removeLayer(featureGroupRef.current)
      }
    }
  }, [map, onDrawComplete])

  return null
}

export default function InteractiveMap() {
  const [coordinates, setCoordinates] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null)
  // Toronto, Canada coordinates (fallback)
  const torontoCoords: LatLngExpression = [43.6532, -79.3832]
  
  const [searchedLocation, setSearchedLocation] = useState<LatLngExpression | null>(null)
  const [searchedLocationName, setSearchedLocationName] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<LatLngExpression | null>(torontoCoords)
  const [mapZoom, setMapZoom] = useState<number>(13)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)
  
  // Default center and zoom - prioritize searched location, then user location, then Toronto
  const defaultCenter = mapCenter || userLocation || torontoCoords
  const defaultZoom = mapZoom

  useEffect(() => {
    // Get user's current location on initial load
    if ('geolocation' in navigator) {
      setIsLoadingLocation(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const location: LatLngExpression = [latitude, longitude]
          setUserLocation(location)
          // Only update map center if no location has been searched
          if (!searchedLocation) {
            setMapCenter(location)
            setMapZoom(16)
          }
          setIsLoadingLocation(false)
          setLocationError(null)
        },
        (error) => {
          console.error('Error getting location:', error)
          setLocationError('Unable to get your location. Using default location.')
          setIsLoadingLocation(false)
          setUserLocation(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    } else {
      setLocationError('Geolocation is not supported by your browser.')
      setIsLoadingLocation(false)
    }
  }, [])

  const handleDrawComplete = useCallback((coords: string, rawCoords: LatLngExpression[]) => {
    setCoordinates(coords)
  }, [])

  const handleLocationSearch = useCallback((coordinates: LatLngExpression, name: string) => {
    setSearchedLocation(coordinates)
    setSearchedLocationName(name)
    setMapCenter(coordinates)
    setMapZoom(15)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {isLoadingLocation && !searchedLocation && (
        <div className="bg-gradient-to-r from-success to-success/80 text-white rounded-lg p-3 text-sm font-semibold shadow-lg animate-pulse border border-success/30">
          ✨ Getting your location...
        </div>
      )}
      {locationError && !searchedLocation && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg p-3 text-sm font-semibold shadow-lg border border-amber-600/30">
          ⚠️ {locationError}
        </div>
      )}
      <div className="relative rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-white to-[#faf5e6] p-2 border-2 border-amber-200/50">
        {/* Location Search Bar - Positioned over map with high z-index */}
        <div className="absolute top-4 left-4 right-4 z-[1000]">
          <LocationSearch onLocationSelect={handleLocationSearch} />
        </div>
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '80vh', width: '100%' }}
          zoomControl={true}
          className="rounded-lg"
          scrollWheelZoom={true}
        >
          {/* OpenStreetMap tiles with English labels - more colorful and detailed */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            minZoom={1}
          />
          {/* Center map on searched location or user location */}
          {mapCenter && (
            <MapCenter center={mapCenter} zoom={mapZoom} />
          )}
          
          {/* User location marker */}
          {userLocation && (
            <Marker position={userLocation} icon={DefaultIcon}>
              <Popup>Your Current Location</Popup>
            </Marker>
          )}
          
          {/* Searched location marker */}
          {searchedLocation && (
            <Marker position={searchedLocation} icon={DefaultIcon}>
              <Popup>{searchedLocationName || 'Searched Location'}</Popup>
            </Marker>
          )}
          
          <DrawControl onDrawComplete={handleDrawComplete} />
        </MapContainer>
      </div>
      <CoordinatesDisplay coordinates={coordinates} />
    </div>
  )
}

