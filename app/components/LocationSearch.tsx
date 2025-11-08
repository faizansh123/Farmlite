'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { LatLngExpression } from 'leaflet'

interface SearchResult {
  display_name: string
  lat: string
  lon: string
  place_id: number
}

interface LocationSearchProps {
  onLocationSelect: (coordinates: LatLngExpression, name: string) => void
}

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setResults([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=en`,
          {
            headers: {
              'User-Agent': 'InteractiveMap/1.0', // Nominatim requires a user agent
            },
          }
        )
        const data: SearchResult[] = await response.json()
        setResults(data)
        setShowDropdown(true)
      } catch (error) {
        console.error('Error searching location:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSearch(searchQuery)
  }, [searchQuery, debouncedSearch])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelect = (result: SearchResult) => {
    const coordinates: LatLngExpression = [parseFloat(result.lat), parseFloat(result.lon)]
    setSearchQuery(result.display_name)
    setShowDropdown(false)
    setResults([])
    onLocationSelect(coordinates, result.display_name)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setSelectedIndex(-1)
            if (e.target.value.length >= 3) {
              setShowDropdown(true)
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setShowDropdown(true)
            }
          }}
          placeholder="Search for a location..."
          className="w-full px-4 py-3 pl-10 pr-10 text-foreground bg-white/95 backdrop-blur-sm border-2 border-success/30 rounded-lg focus:ring-2 focus:ring-success focus:border-success outline-none shadow-lg transition-all duration-200 hover:shadow-xl"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className="animate-spin h-5 w-5 text-success"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
      </div>

      {/* Autocomplete Dropdown - High z-index to appear over map */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-[1000] w-full mt-1 bg-white/95 backdrop-blur-md border-2 border-success/20 rounded-lg shadow-xl max-h-60 overflow-auto">
          {results.map((result, index) => (
            <div
              key={result.place_id}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-3 cursor-pointer transition-all duration-150 ${
                index === selectedIndex
                  ? 'bg-gradient-to-r from-success/20 to-success/10 text-success font-semibold shadow-inner'
                  : 'text-foreground hover:bg-gradient-to-r hover:from-success/10 hover:to-amber-50/50'
              } ${index === 0 ? 'rounded-t-lg' : ''} ${
                index === results.length - 1 ? 'rounded-b-lg' : 'border-b border-success/10'
              }`}
            >
              <div className="flex items-start">
                <svg
                  className={`w-5 h-5 mt-0.5 mr-2 flex-shrink-0 ${
                    index === selectedIndex ? 'text-success' : 'text-success/60'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.display_name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && searchQuery.length >= 3 && !isLoading && results.length === 0 && (
        <div className="absolute z-[1000] w-full mt-1 bg-white/95 backdrop-blur-md border-2 border-success/20 rounded-lg shadow-xl p-4 text-center text-success font-medium">
          No locations found
        </div>
      )}
    </div>
  )
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

