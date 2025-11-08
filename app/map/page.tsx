"use client";
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Sprout, ArrowLeft } from 'lucide-react'

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LatLngExpression } from "leaflet";
import { useRouter } from "next/navigation";

const InteractiveMap = dynamic(() => import("../components/InteractiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8 text-center">
      <div className="animate-pulse">
        <p className="text-success font-semibold">Loading map...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const router = useRouter();
  const [coordinates, setCoordinates] = useState<string | null>(null);
  const [rawCoordinates, setRawCoordinates] = useState<LatLngExpression[]>([]);
  const [polygon, setPolygon] = useState({
    polyid: "",
    center: [0, 0] as [number, number],
    area: 0,
  });

  console.log(rawCoordinates);

  useEffect(() => {
    if (!coordinates) return;
    console.log(rawCoordinates);

    const coordsArray = rawCoordinates.map((coord) => {
      if (Array.isArray(coord)) {
        return coord;
      } else {
        return [coord.lat, coord.lng];
      }
    });

    const createPoly = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/soil/polygon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates: coordsArray }),
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const data = await res.json();
        setPolygon(data);
        console.log("Polygon:", data);
      } catch (err) {
        console.error("Error fetching polygon:", err);
      }
    };

    createPoly();
  }, [rawCoordinates]);

  const goToPolygonResult = () => {
    router.push(`/results/${polygon.polyid}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4 py-8 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Interactive Map - Area Selector
        </h1>
        <p className="text-lg text-purple-700 font-medium">
          Draw a polygon or rectangle to get coordinates
        </p>
      </div>
      <InteractiveMap
        coordinates={coordinates}
        setCoordinates={setCoordinates}
        setRawCoordinates={setRawCoordinates}
      />

      <button
        onClick={goToPolygonResult}
        className="px-4 py-2 bg-purple-600 text-white rounded"
      >
        Go to Result Page
      </button>
    </main>
  );
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
              href="/" 
              className="inline-flex items-center gap-2 text-foreground hover:text-success font-medium transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:p-8 max-w-7xl">
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Interactive Farm Map
            </h1>
            <p className="text-lg text-muted-foreground">
              Draw a polygon or rectangle to analyze soil quality and get coordinates
            </p>
          </div>
        </div>
        <InteractiveMap />
      </main>
    </div>
  )
}
