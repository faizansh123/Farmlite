'use client'

import { Sprout, MapPin, TrendingUp, Droplets, ArrowRight } from 'lucide-react'
import { Card, CardContent } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import Link from 'next/link'

export default function FarmLiteDashboard() {
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

            <nav className="hidden items-center gap-6 md:flex">
              <a href="#" className="text-sm font-medium text-foreground hover:text-success transition-colors">
                Dashboard
              </a>
              <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Reports
              </a>
              <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Analysis
              </a>
              <Link href="/map">
                <Button size="sm" className="bg-success hover:bg-success/90 text-white shadow-md border border-success/30">
                  Get Started
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-br from-[#f5e6d3] via-[#faf9f6] to-[#ede4d3]">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-success/15 text-success border-success/40 border">AI-Powered Analysis</Badge>
            <h2 className="mb-4 text-4xl font-bold leading-tight text-balance text-foreground md:text-5xl">
              Interactive Farm Map
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-muted-foreground text-pretty">
              Select any land area and instantly view its Soil Quality Index (SQI), vegetation health, and irrigation
              insights powered by satellite imagery and AI analysis.
            </p>

            {/* SQI Legend */}
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-4 py-2 border border-amber-200/50 shadow-sm">
                <div className="size-3 rounded-full bg-success" />
                <span className="text-sm font-medium text-foreground">80-100: Excellent</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-4 py-2 border border-amber-200/50 shadow-sm">
                <div className="size-3 rounded-full bg-[#f4a460]" />
                <span className="text-sm font-medium text-foreground">50-79: Moderate</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-4 py-2 border border-amber-200/50 shadow-sm">
                <div className="size-3 rounded-full bg-destructive" />
                <span className="text-sm font-medium text-foreground">0-49: Poor</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="container mx-auto px-4 py-8">
        <Card className="overflow-hidden border-2 border-border shadow-lg">
          <CardContent className="p-0">
            {/* Map Container with Button */}
            <div className="relative bg-gradient-to-br from-[#f5e6d3] via-[#ede4d3] to-[#daa520]/20 p-16">
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="size-24 rounded-full bg-success/25 flex items-center justify-center shadow-lg border-2 border-success/30">
                  <MapPin className="size-12 text-success" />
                </div>
                <div className="space-y-4 max-w-md">
                  <h3 className="text-2xl font-bold text-foreground">Ready to Analyze Your Farm?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Open the interactive map to draw polygons or rectangles and get instant soil quality analysis, vegetation health data, and irrigation insights.
                  </p>
                  <Link href="/map">
                    <Button size="lg" className="bg-success hover:bg-success/90 text-white mt-4 shadow-lg border-2 border-success/30">
                      Open Interactive Map
                      <ArrowRight className="ml-2 size-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="border-t border-border bg-gradient-to-r from-white to-[#fef9e7] p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-success/15 p-3 border border-success/20">
                  <MapPin className="size-6 text-success" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">Draw a polygon or rectangle on the map</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Use the drawing tools on the left to select your land area. The system will analyze soil quality,
                    vegetation health (NDVI), and provide irrigation recommendations.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-12 bg-gradient-to-b from-background to-[#faf5e6]">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-2 border-success hover:border-success shadow-lg transition-colors bg-gradient-to-br from-success/20 to-success/10">
            <CardContent className="p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-success border-2 border-success/50 shadow-md">
                <TrendingUp className="size-6 text-white" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-success">Soil Quality Index</h3>
              <p className="text-muted-foreground leading-relaxed">
                Real-time SQI analysis from ESA Copernicus and NASA satellite data to identify the most fertile regions
                for planting.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-500 hover:border-amber-600 shadow-lg transition-colors bg-gradient-to-br from-amber-50 to-amber-100/50">
            <CardContent className="p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-amber-500 border-2 border-amber-600/50 shadow-md">
                <Sprout className="size-6 text-white" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-amber-700">Vegetation Health</h3>
              <p className="text-muted-foreground leading-relaxed">
                NDVI analysis to monitor crop health and identify areas requiring attention or intervention.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500 hover:border-blue-600 shadow-lg transition-colors bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-500 border-2 border-blue-600/50 shadow-md">
                <Droplets className="size-6 text-white" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-blue-700">Irrigation Insights</h3>
              <p className="text-muted-foreground leading-relaxed">
                NASA Soil Moisture data combined with AI to provide actionable irrigation and soil improvement
                recommendations.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-gradient-to-br from-[#f5e6d3] via-[#ede4d3] to-[#daa520]/25">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-3xl font-bold text-foreground text-balance">Start Analyzing Your Farm Today</h2>
            <p className="mb-8 text-lg text-muted-foreground text-pretty">
              Join farmers worldwide who are making data-driven decisions to improve crop yields and soil health.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/map">
                <Button size="lg" className="bg-success hover:bg-success/90 text-white shadow-lg border-2 border-success/30">
                  Get Started Free
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-2 border-amber-300/60 hover:bg-[#fef3c7] text-foreground">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Sprout className="size-5 text-success" />
              <span className="font-semibold text-foreground">FarmLite</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 FarmLite. Powered by satellite imagery and AI analysis.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
