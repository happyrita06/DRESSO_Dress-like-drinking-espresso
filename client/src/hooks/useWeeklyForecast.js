import { useCallback, useEffect, useState } from 'react'
import { fetchWeeklyForecast } from '../utils/WeatherService'

/**
 * Loads the multi-day forecast summary for a LocationContext location.
 * Open-Meteo genuinely returns 7 real days (up to 16), unlike the earlier
 * KMA integration which topped out around 2-3.
 */
export function useWeeklyForecast(location) {
  const [days, setDays] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!location) {
      setDays([])
      setError('')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const data = await fetchWeeklyForecast({ lat: location.lat, lon: location.lon })
      setDays(data)
    } catch (err) {
      setError(err.message)
      setDays([])
    } finally {
      setIsLoading(false)
    }
  }, [location?.lat, location?.lon])

  useEffect(() => {
    load()
  }, [load])

  return { days, isLoading, error, refetch: load }
}

export default useWeeklyForecast
