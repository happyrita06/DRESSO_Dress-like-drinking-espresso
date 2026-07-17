import { useCallback, useEffect, useState } from 'react'
import { fetchWeather } from '../utils/WeatherService'

/**
 * Loads today's weather snapshot for a LocationContext location and keeps
 * it in sync whenever the location changes. Shared by Home and
 * OutfitRecommend so both fetch/parse the exact same way.
 */
export function useWeather(location) {
  const [weather, setWeather] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!location) {
      setWeather(null)
      setError('')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const data = await fetchWeather({ lat: location.lat, lon: location.lon })
      setWeather(data)
    } catch (err) {
      setError(err.message)
      setWeather(null)
    } finally {
      setIsLoading(false)
    }
  }, [location?.lat, location?.lon])

  useEffect(() => {
    load()
  }, [load])

  return { weather, isLoading, error, refetch: load }
}

export default useWeather
