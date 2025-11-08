"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import type { LatLngExpression } from "leaflet";
import LocationSearch from "./LocationSearch";
import { useRouter } from 'next/navigation';

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface InteractiveMapProps {
  coordinates: string | null;
  setCoordinates: (coords: string) => void;
  setRawCoordinates: (coords: LatLngExpression[]) => void;
}

interface ShapeData {
  type: string;
  coordinates: LatLngExpression[];
  area: string;
  areaInSquareMeters: number;
}

interface ViewAnalysisButtonProps {
  shapeData: ShapeData | null;
}

// Helper function to calculate area in square meters
function calculateArea(layer: L.Rectangle | L.Polygon): number {
  if (layer instanceof L.Rectangle) {
    const bounds = layer.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    // Calculate area using Haversine formula approximation for rectangle
    const latDiff = ne.lat - sw.lat;
    const lngDiff = ne.lng - sw.lng;
    const avgLat = (ne.lat + sw.lat) / 2;
    const latMeters = latDiff * 111320; // 1 degree latitude ≈ 111,320 meters
    const lngMeters = lngDiff * 111320 * Math.cos((avgLat * Math.PI) / 180);
    return Math.abs(latMeters * lngMeters);
  } else if (layer instanceof L.Polygon) {
    const latlngs = layer.getLatLngs()[0] as L.LatLng[];
    if (latlngs.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < latlngs.length; i++) {
      const j = (i + 1) % latlngs.length;
      area += latlngs[i].lng * latlngs[j].lat;
      area -= latlngs[j].lng * latlngs[i].lat;
    }
    area = Math.abs(area / 2);
    
    // Convert to square meters (approximate)
    const R = 6371000; // Earth's radius in meters
    return area * R * R;
  }
  return 0;
}

// Helper function to format area
function formatArea(areaInSquareMeters: number): string {
  if (areaInSquareMeters < 10000) {
    return `${areaInSquareMeters.toFixed(2)} m²`;
  } else if (areaInSquareMeters < 1000000) {
    return `${(areaInSquareMeters / 10000).toFixed(2)} hectares`;
  } else {
    return `${(areaInSquareMeters / 1000000).toFixed(2)} km²`;
  }
}

function ViewAnalysisButton({ shapeData }: ViewAnalysisButtonProps) {
  const router = useRouter();

  if (!shapeData) {
    return (
      <div className="bg-gradient-to-br from-[#f5e6d3] to-[#ede4d3] rounded-xl p-6 shadow-lg border-2 border-amber-200/50">
        <p className="text-muted-foreground italic font-medium text-center">
          Draw a polygon or rectangle on the map to analyze the area
        </p>
      </div>
    );
  }

  const handleViewAnalysis = () => {
    try {
      // Clear old polygon ID when a new shape is drawn
      // This ensures we create a new polygon instead of reusing the old one
      localStorage.removeItem('polyid');
      localStorage.setItem('shapeData', JSON.stringify(shapeData));
      router.push('/analysis');
    } catch (error) {
      console.error('Error storing shape data:', error);
    }
  };

  return (
    <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-6 shadow-lg border-2 border-success/30">
      <div className="text-center space-y-4">
        <div>
          <h3 className="text-xl font-bold text-success mb-2">
            Area Selected Successfully!
          </h3>
          <p className="text-muted-foreground">
            Shape: {shapeData.type} • Area: {shapeData.area}
          </p>
        </div>
        <button
          onClick={handleViewAnalysis}
          className="w-full bg-success hover:bg-success/90 text-white font-semibold py-3 px-6 rounded-lg shadow-md border-2 border-success/30 transition-all duration-200 hover:shadow-lg hover:scale-105"
        >
          View Detailed Analysis
        </button>
      </div>
    </div>
  );
}

// Map centering component
function MapCenter({
  center,
  zoom,
}: {
  center: LatLngExpression;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

// DrawControl component
interface DrawControlProps {
  onDrawComplete: (coordinates: string, rawCoords: LatLngExpression[]) => void;
  onShapeDataComplete: (shapeData: ShapeData) => void;
}

function DrawControl({ onDrawComplete, onShapeDataComplete }: DrawControlProps) {
  const map = useMap();
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!map) return;
    const featureGroup = new L.FeatureGroup();
    featureGroupRef.current = featureGroup;
    map.addLayer(featureGroup);

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: { allowIntersection: false, showArea: true },
        rectangle: { showArea: true },
        circle: false,
        circlemarker: false,
        polyline: false,
        marker: false,
      },
      edit: { featureGroup },
    });

    map.addControl(drawControl);

    const handleDrawCreated = (e: any) => {
      const { layer } = e as L.DrawEvents.Created;
      let coords: LatLngExpression[] = [];
      let type = "";

      if (layer instanceof L.Rectangle) {
        const bounds = layer.getBounds();
        coords = [
          bounds.getSouthWest(),
          bounds.getNorthWest(),
          bounds.getNorthEast(),
          bounds.getSouthEast(),
        ];
        type = "Rectangle";
      } else if (layer instanceof L.Polygon) {
        coords = layer.getLatLngs()[0] as LatLngExpression[];
        type = "Polygon";
      }

      // Calculate area
      const areaInSquareMeters = calculateArea(layer as L.Rectangle | L.Polygon);
      const areaString = formatArea(areaInSquareMeters);

      // Create shape data object
      const shapeData: ShapeData = {
        type,
        coordinates: coords,
        area: areaString,
        areaInSquareMeters: areaInSquareMeters,
      };

      // Format coordinates
      const formattedCoords = coords
        .map((coord) =>
          Array.isArray(coord)
            ? `[${coord[0]}, ${coord[1]}]`
            : `[${(coord as L.LatLng).lat}, ${(coord as L.LatLng).lng}]`
        )
        .join(",\n  ");

      const coordinatesString = `${type} Coordinates:\n  ${formattedCoords}`;
      featureGroup.addLayer(layer);

      // Send to parent - both for coordinates and shape data
      onDrawComplete(coordinatesString, coords);
      onShapeDataComplete(shapeData);
    };

    map.on(L.Draw.Event.CREATED as any, handleDrawCreated);

    // Cleanup
    return () => {
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED as any, handleDrawCreated);
      if (featureGroupRef.current) map.removeLayer(featureGroupRef.current);
    };
  }, [map, onDrawComplete, onShapeDataComplete]);

  return null;
}

// Single exported component
export default function InteractiveMap({
  coordinates,
  setCoordinates,
  setRawCoordinates,
}: InteractiveMapProps) {
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<LatLngExpression | null>(null);
  const [searchedLocationName, setSearchedLocationName] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([43.6532, -79.3832]);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [shapeData, setShapeData] = useState<ShapeData | null>(null);

  const defaultCenter = mapCenter || userLocation || [43.6532, -79.3832];
  const defaultZoom = mapZoom;

  useEffect(() => {
    if ('geolocation' in navigator) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location: LatLngExpression = [latitude, longitude];
          setUserLocation(location);
          if (!searchedLocation) {
            setMapCenter(location);
            setMapZoom(16);
          }
          setIsLoadingLocation(false);
          setLocationError(null);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Unable to get your location. Using default location.');
          setIsLoadingLocation(false);
          setUserLocation(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLoadingLocation(false);
    }
  }, [searchedLocation]);

  const handleLocationSearch = useCallback(
    (coordinates: LatLngExpression, name: string) => {
      setSearchedLocation(coordinates);
      setSearchedLocationName(name);
      setMapCenter(coordinates);
      setMapZoom(15);
    },
    []
  );

  const handleDrawComplete = useCallback(
    (coords: string, rawCoords: LatLngExpression[]) => {
      setCoordinates(coords);
      setRawCoordinates(rawCoords);
    },
    [setCoordinates, setRawCoordinates]
  );

  const handleShapeDataComplete = useCallback((data: ShapeData) => {
    setShapeData(data);
  }, []);

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
          style={{ height: "80vh", width: "100%" }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mapCenter && <MapCenter center={mapCenter} zoom={mapZoom} />}
          {userLocation && (
            <Marker position={userLocation} icon={DefaultIcon}>
              <Popup>Your Current Location</Popup>
            </Marker>
          )}
          {searchedLocation && (
            <Marker position={searchedLocation} icon={DefaultIcon}>
              <Popup>{searchedLocationName || "Searched Location"}</Popup>
            </Marker>
          )}
          <DrawControl 
            onDrawComplete={handleDrawComplete} 
            onShapeDataComplete={handleShapeDataComplete}
          />
        </MapContainer>
      </div>
      <ViewAnalysisButton shapeData={shapeData} />
    </div>
  );
}
