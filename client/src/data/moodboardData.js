import { getTempBand } from '../utils/recommendEngine'

/**
 * Weather -> moodboard styling. One base profile per temperature band (the
 * same TEMP_BANDS the recommend engine already uses, so "cold" means the
 * same thing here as it does on the recommendation card), lightly tinted by
 * the day's sky condition (sunny/cloudy/rain/snow).
 *
 * `palette` and `beauty` are hex swatches pulled from the app's own design
 * tokens (see variables.css) so the moodboard never introduces off-brand
 * colors. `textures` reference CSS-generated fabric-swatch classes in
 * TodayMoodboard.module.css (no photos needed for this part).
 */

const BAND_PROFILES = {
  freezing: {
    title: 'DEEP WINTER',
    palette: ['#4A1030', '#8C4A6E', '#B36FE8', '#D6EEFF', '#FFFFFF'],
    textures: ['wool', 'fleece', 'knit'],
    emphasize: ['outer', 'top', 'bottom'],
  },
  cold: {
    title: 'CRISP COLD',
    palette: ['#8C4A6E', '#B36FE8', '#E8D9FF', '#D6EEFF', '#FFFFFF'],
    textures: ['knit', 'wool', 'corduroy'],
    emphasize: ['outer', 'top', 'bottom'],
  },
  cool: {
    title: 'SOFT COOL',
    palette: ['#9450C9', '#D9F5EA', '#D6EEFF', '#E8D9FF', '#3DD9A8'],
    textures: ['corduroy', 'knit', 'cotton'],
    emphasize: ['outer', 'top', 'bottom'],
  },
  mild: {
    title: 'MILD & EASY',
    palette: ['#FF4F9E', '#FFD8EC', '#FFF3D6', '#D9F5EA', '#8C4A6E'],
    textures: ['cotton', 'denim', 'linen'],
    emphasize: ['top', 'outer', 'bottom'],
  },
  warm: {
    title: 'WARM GLOW',
    palette: ['#FFB84D', '#FF74B8', '#FFF3D6', '#FFD8EC', '#4A1030'],
    textures: ['linen', 'cotton', 'mesh'],
    emphasize: ['top', 'bottom'],
  },
  hot: {
    title: 'HIGH SUMMER',
    palette: ['#FFB84D', '#FF4F9E', '#3DD9A8', '#FFF3D6', '#FFFFFF'],
    textures: ['linen', 'mesh', 'cotton'],
    emphasize: ['top', 'bottom'],
  },
}

const CONDITION_SUFFIX = {
  sunny: 'SUNSHINE',
  cloudy: 'CLOUDY DAY',
  rain: 'RAINY MOOD',
  snow: 'SNOW DAY',
}

// weather.icon (from getWeatherInfoFromCode) collapsed into 4 mood buckets.
function conditionGroup(icon) {
  if (icon === 'sunny') return 'sunny'
  if (icon === 'rain') return 'rain'
  if (icon === 'snow' || icon === 'sleet') return 'snow'
  return 'cloudy'
}

export function getMoodProfile(weather) {
  const band = getTempBand(weather?.tmp ?? 15)
  const base = BAND_PROFILES[band.id] || BAND_PROFILES.mild
  const condition = conditionGroup(weather?.icon)

  return {
    bandId: band.id,
    bandLabel: band.label,
    condition,
    title: `${base.title} · ${CONDITION_SUFFIX[condition]}`,
    palette: base.palette,
    textures: base.textures,
    emphasize: base.emphasize,
  }
}
