import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FarmLite - Interactive Farm Map',
  description: 'Select areas on the map using polygon or rectangle tools for smart soil analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

