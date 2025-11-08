"use client";

import { useCallback, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import type { LatLngExpression } from "leaflet";
import LocationSearch from "./LocationSearch";
import { useState } from "react";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface CoordinatesDisplayProps {
  coordinates: string | null;
}

interface InteractiveMapProps {
  coordinates: string | null;
  setCoordinates: (coords: string) => void;
  setRawCoordinates: (coords: LatLngExpression[]) => void;
}

function CoordinatesDisplay({ coordinates }: CoordinatesDisplayProps) {
  if (!coordinates) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 shadow-lg border-2 border-blue-200">
        <p className="text-purple-700 italic font-medium">
          Draw a polygon or rectangle on the map to see coordinates
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 shadow-lg border-2 border-emerald-300">
      <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
        Selected Area Coordinates:
      </h3>
      <pre className="bg-white/80 backdrop-blur-sm border-2 border-emerald-200 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed text-gray-800 font-mono whitespace-pre-wrap break-words shadow-inner">
        {coordinates}
      </pre>
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
}

function DrawControl({ onDrawComplete }: DrawControlProps) {
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

      // Send to parent
      onDrawComplete(coordinatesString, coords);
    };

    map.on(L.Draw.Event.CREATED as any, handleDrawCreated);

    return () => {
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED as any, handleDrawCreated);
      if (featureGroupRef.current) map.removeLayer(featureGroupRef.current);
    };
  }, [map, onDrawComplete]);

  return null;
}

// Single exported component
export default function InteractiveMap({
  coordinates,
  setCoordinates,
  setRawCoordinates,
}: InteractiveMapProps) {
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(
    null
  );
  const [searchedLocation, setSearchedLocation] =
    useState<LatLngExpression | null>(null);
  const [searchedLocationName, setSearchedLocationName] = useState<
    string | null
  >(null);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([
    43.6532, -79.3832,
  ]);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const defaultCenter = mapCenter || userLocation || [43.6532, -79.3832];
  const defaultZoom = mapZoom;

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

  return (
    <div className="flex flex-col gap-6">
      {isLoadingLocation && !searchedLocation && (
        <div className="bg-gradient-to-r from-blue-400 to-purple-400 text-white rounded-lg p-3 text-sm font-semibold shadow-lg animate-pulse">
          ✨ Getting your location...
        </div>
      )}
      {locationError && !searchedLocation && (
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-lg p-3 text-sm font-semibold shadow-lg">
          ⚠️ {locationError}
        </div>
      )}
      <div className="relative rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-white to-blue-50 p-2 border-2 border-blue-200">
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
          <DrawControl onDrawComplete={handleDrawComplete} />
        </MapContainer>
      </div>
      <CoordinatesDisplay coordinates={coordinates} />
    </div>
  );
}
