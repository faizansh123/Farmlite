import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Sprout, ArrowLeft } from 'lucide-react'

// Dynamically import the map component to avoid SSR issues with Leaflet
const InteractiveMap = dynamic(() => import('../components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8 text-center">
      <div className="animate-pulse">
        <p className="text-success font-semibold">Loading map...</p>
      </div>
    </div>
  ),
})

export default function MapPage() {
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

