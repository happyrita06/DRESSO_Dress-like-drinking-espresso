import Card from './Card'
import WeatherIcon from './WeatherIcon'
import styles from './WeatherCard.module.css'

function WeatherCard({ weather, isLoading, error, locationLabel, className = '' }) {
  return (
    <Card accent="sky" className={`${styles.card} ${className}`}>
      {isLoading && <p className={styles.status}>오늘 날씨를 불러오는 중...</p>}

      {!isLoading && error && (
        <p className={`${styles.status} ${styles.statusError}`} role="alert">
          {error}
        </p>
      )}

      {!isLoading && !error && !weather && (
        <p className={styles.status}>위치를 선택하면 오늘의 날씨를 보여드려요.</p>
      )}

      {!isLoading && !error && weather && (
        <div className={styles.content}>
          <div className={styles.headline}>
            <WeatherIcon icon={weather.icon} size={56} className={styles.icon} />
            <div>
              {locationLabel && <p className={styles.location}>{locationLabel}</p>}
              <p className={styles.temp}>{Math.round(weather.tmp)}°C</p>
              <p className={styles.label}>{weather.label}</p>
            </div>
          </div>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span>습도</span>
              <strong>{weather.reh ?? '-'}%</strong>
            </div>
            <div className={styles.metric}>
              <span>강수확률</span>
              <strong>{weather.pop ?? '-'}%</strong>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default WeatherCard
