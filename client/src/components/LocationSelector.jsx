import { useState } from 'react'
import { COUNTRIES, findRegion, findNearestRegion } from '../data/regions'
import { useLocation } from '../contexts/LocationContext'
import { reverseGeocode } from '../utils/reverseGeocode'
import Button from './Button'
import styles from './LocationSelector.module.css'

function LocationSelector({ className = '' }) {
  const { location, setLocation } = useLocation()
  const [countryCode, setCountryCode] = useState(location?.countryCode || COUNTRIES[0].code)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectError, setDetectError] = useState('')

  const country = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0]

  const regionValue =
    (location?.source === 'manual' || location?.source === 'geolocation') &&
    location.countryCode === countryCode
      ? location.regionCode || ''
      : ''

  const handleCountryChange = (event) => {
    setCountryCode(event.target.value)
  }

  const handleRegionChange = (event) => {
    const regionCode = event.target.value
    if (!regionCode) return
    const region = findRegion(countryCode, regionCode)
    if (!region) return

    setDetectError('')
    setLocation({
      label: `${country.label} ${region.label}`,
      countryCode,
      regionCode,
      lat: region.lat,
      lon: region.lon,
      source: 'manual',
    })
  }

  const handleDetect = () => {
    if (!navigator.geolocation) {
      setDetectError('이 브라우저는 위치 감지를 지원하지 않아요.')
      return
    }

    setIsDetecting(true)
    setDetectError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Fall back to raw coordinates if the reverse-geocode lookup fails
        // (e.g. offline, or a spot the service can't name) — still usable.
        let label = `현재 위치 (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`
        try {
          label = await reverseGeocode({ lat: latitude, lon: longitude })
        } catch {
          // keep the coordinate fallback
        }

        const nearestRegion = findNearestRegion('KR', latitude, longitude)

        setCountryCode('KR')
        setLocation({
          label,
          countryCode: 'KR',
          regionCode: nearestRegion?.code || null,
          lat: latitude,
          lon: longitude,
          source: 'geolocation',
        })
        setIsDetecting(false)
      },
      (error) => {
        setIsDetecting(false)
        if (error.code === error.PERMISSION_DENIED) {
          setDetectError('위치 권한이 거부됐어요. 브라우저 설정에서 허용해주세요.')
        } else {
          setDetectError('위치를 가져오지 못했어요. 잠시 후 다시 시도해주세요.')
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    )
  }

  return (
    <div className={`${styles.wrapper} ${className}`}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="location-country">
            나라
          </label>
          <select
            id="location-country"
            className={styles.select}
            value={countryCode}
            onChange={handleCountryChange}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="location-region">
            지역
          </label>
          <select
            id="location-region"
            className={styles.select}
            value={regionValue}
            onChange={handleRegionChange}
          >
            <option value="">지역을 선택해주세요</option>
            {country.regions.map((region) => (
              <option key={region.code} value={region.code}>
                {region.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={handleDetect}
          isLoading={isDetecting}
          className={styles.detectButton}
        >
          내 위치로 자동 감지
        </Button>
      </div>

      {detectError && (
        <p className={styles.error} role="alert">
          {detectError}
        </p>
      )}

      {location && (
        <p className={styles.summary}>
          현재 위치: <strong>{location.label}</strong>
          {location.source === 'geolocation' && ' (자동 감지됨)'}
        </p>
      )}
    </div>
  )
}

export default LocationSelector
