import { createContext, useContext, useState } from 'react'

const StyleContext = createContext(undefined)

export function StyleProvider({ children }) {
  const [gender, setGender] = useState(null)
  const [preferredStyles, setPreferredStyles] = useState([])

  const value = {
    gender,
    setGender,
    preferredStyles,
    setPreferredStyles,
  }

  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>
}

export function useStyle() {
  const context = useContext(StyleContext)
  if (context === undefined) {
    throw new Error('useStyle must be used within a StyleProvider')
  }
  return context
}
