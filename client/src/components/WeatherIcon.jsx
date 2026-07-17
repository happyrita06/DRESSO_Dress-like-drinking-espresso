import PixelIcon from './PixelIcon'
import styles from './WeatherIcon.module.css'

// Shared 10x10 cloud blob — every cloud-family icon (cloudy/overcast/rain/
// sleet/snow) reuses these top 6 rows and only varies color + the bottom 4
// rows (precipitation marks), so the whole set reads as one icon family.
const CLOUD_TOP = ['..........', '...CCCC...', '..CCCCCC..', '.CCCCCCCC.', 'CCCCCCCCCC', 'CCCCCCCCCC']

const EMPTY_ROW = '..........'
const RAIN_ROWS = ['..W..W..W.', '.W..W..W..', 'W..W..W...', EMPTY_ROW]
const SLEET_ROWS = ['..W..o..W.', '.W..o..W..', 'o..W..o...', EMPTY_ROW]
const SNOW_ROWS = ['..o..o..o.', 'o..o..o..o', '..o..o..o.', 'o..o..o..o']
const NO_PRECIP_ROWS = [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW]

const SUN_MATRIX = [
  '..R....R..',
  '....SS....',
  'R..SSSS..R',
  '..SSSSSS..',
  '..SSSSSS..',
  '..SSSSSS..',
  '..SSSSSS..',
  'R..SSSS..R',
  '....SS....',
  '..R....R..',
]

const SUN_PALETTE = { S: '#FFA53E', R: '#FFD27A' }
const CLOUD_LIGHT_PALETTE = { C: '#9FB3CC', W: '#4C7FE0', o: '#EAF2FF' }
const CLOUD_DARK_PALETTE = { C: '#5E7699', W: '#4C7FE0', o: '#EAF2FF' }

const ICONS = {
  sunny: { matrix: SUN_MATRIX, palette: SUN_PALETTE },
  cloudy: { matrix: [...CLOUD_TOP, ...NO_PRECIP_ROWS], palette: CLOUD_LIGHT_PALETTE },
  overcast: { matrix: [...CLOUD_TOP, ...NO_PRECIP_ROWS], palette: CLOUD_DARK_PALETTE },
  rain: { matrix: [...CLOUD_TOP, ...RAIN_ROWS], palette: CLOUD_DARK_PALETTE },
  sleet: { matrix: [...CLOUD_TOP, ...SLEET_ROWS], palette: CLOUD_DARK_PALETTE },
  snow: { matrix: [...CLOUD_TOP, ...SNOW_ROWS], palette: CLOUD_LIGHT_PALETTE },
}

function WeatherIcon({ icon = 'sunny', size = 40, className = '', ...rest }) {
  const { matrix, palette } = ICONS[icon] || ICONS.sunny
  return (
    <PixelIcon
      matrix={matrix}
      palette={palette}
      size={size}
      className={`${styles.icon} ${className}`}
      {...rest}
    />
  )
}

export default WeatherIcon
