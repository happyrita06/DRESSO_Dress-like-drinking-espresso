import { createContext, useContext, useState } from 'react'

const LocationContext = createContext(undefined)
const STORAGE_KEY = 'dresso.location'

function readStoredLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function LocationProvider({ children }) {
  // location shape: { label, countryCode, regionCode, lat, lon, source } | null
  // source: 'manual' (dropdown) | 'geolocation' (auto-detected)
  // Persisted to localStorage so a chosen location survives a page reload —
  // weather changes minute to minute, but the user's location rarely does.
  const [location, setLocationState] = useState(readStoredLocation)

  const setLocation = (next) => {
    setLocationState(next)
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const value = { location, setLocation }

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
