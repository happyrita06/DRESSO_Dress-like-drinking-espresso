/**
 * Fetches weather from Open-Meteo (https://open-meteo.com) — free, no API
 * key, called directly from the browser (no server proxy needed since
 * there's no secret to protect). Replaced the earlier KMA (기상청)
 * integration, which only ever covered Korea and ~3 days of forecast;
 * Open-Meteo covers anywhere in the world and up to 16 days.
 */

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'

/**
 * Maps an Open-Meteo/WMO weather code to a label + the icon keys WeatherIcon
 * already knows about (sunny/cloudy/overcast/rain/sleet/snow). Codes >= 51
 * always mean some form of precipitation is happening — recommendEngine
 * relies on that threshold too.
 */
export function getWeatherInfoFromCode(code) {
  if (code === 0) return { label: '맑음', icon: 'sunny' }
  if (code === 1) return { label: '대체로 맑음', icon: 'sunny' }
  if (code === 2) return { label: '구름 조금', icon: 'cloudy' }
  if (code === 3) return { label: '흐림', icon: 'overcast' }
  if (code === 45 || code === 48) return { label: '안개', icon: 'overcast' }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) return { label: '비', icon: 'rain' }
  if (code === 66 || code === 67) return { label: '진눈깨비', icon: 'sleet' }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '눈', icon: 'snow' }
  if ([95, 96, 99].includes(code)) return { label: '뇌우', icon: 'rain' }
  return { label: '흐림', icon: 'overcast' }
}

/**
 * Fetches today's current weather snapshot.
 * Returns { tmp, reh, pop, weatherCode, label, icon }.
 */
export async function fetchWeather({ lat, lon }) {
  if (lat === undefined || lon === undefined) {
    throw new Error('위치 정보가 없어요. 먼저 지역을 선택해주세요.')
  }

  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&hourly=precipitation_probability&timezone=auto`

  const response = await fetch(url)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.reason || '날씨 정보를 불러오지 못했어요.')
  }

  const current = data.current
  if (!current) {
    throw new Error('날씨 데이터를 찾을 수 없어요.')
  }

  const hourlyIndex = data.hourly?.time?.indexOf(current.time) ?? -1
  const pop = hourlyIndex >= 0 ? data.hourly.precipitation_probability[hourlyIndex] : 0

  return {
    tmp: current.temperature_2m,
    reh: current.relative_humidity_2m,
    pop,
    weatherCode: current.weather_code,
    ...getWeatherInfoFromCode(current.weather_code),
  }
}

/**
 * Fetches a real multi-day forecast summary (up to 16 days; we ask for 7).
 * Returns [{ date (YYYYMMDD), tmpMin, tmpMax, pop, weatherCode, label, icon }].
 */
export async function fetchWeeklyForecast({ lat, lon }) {
  if (lat === undefined || lon === undefined) {
    throw new Error('위치 정보가 없어요. 먼저 지역을 선택해주세요.')
  }

  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=7`

  const response = await fetch(url)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.reason || '날씨 정보를 불러오지 못했어요.')
  }

  const daily = data.daily
  if (!daily?.time) {
    throw new Error('날씨 데이터를 찾을 수 없어요.')
  }

  return daily.time.map((isoDate, index) => {
    const weatherCode = daily.weather_code[index]
    return {
      date: isoDate.replace(/-/g, ''),
      tmpMin: daily.temperature_2m_min[index],
      tmpMax: daily.temperature_2m_max[index],
      pop: daily.precipitation_probability_max[index] ?? 0,
      weatherCode,
      ...getWeatherInfoFromCode(weatherCode),
    }
  })
}
