import { createContext, useContext, useEffect, useState } from 'react'
import { fetchCurrentUser } from '../utils/authApi'

const UserContext = createContext(undefined)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [isRestoringUser, setIsRestoringUser] = useState(() => Boolean(localStorage.getItem('token')))

  const updateToken = (newToken) => {
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
    setToken(newToken)
  }

  const logout = () => {
    setUser(null)
    updateToken(null)
  }

  // Only the token itself survives a page reload (localStorage) — `user`
  // resets to null on every fresh load/refresh since it's plain React
  // state. Login/Register set both together, but anything that reads
  // `user._id` (post ownership checks, "내가 쓴 글" filters) silently came
  // up empty after any reload because of this gap. Resolve the full
  // profile from the token via GET /auth/me whenever we have a token but
  // no user yet.
  useEffect(() => {
    if (!token || user) {
      setIsRestoringUser(false)
      return undefined
    }

    let cancelled = false
    fetchCurrentUser({ token })
      .then((data) => {
        if (!cancelled) setUser(data.user)
      })
      .catch(() => {
        if (!cancelled) {
          // stale/invalid token — drop it rather than keep retrying forever
          setUser(null)
          updateToken(null)
        }
      })
      .finally(() => {
        if (!cancelled) setIsRestoringUser(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, user])

  const value = {
    user,
    setUser,
    token,
    setToken: updateToken,
    isRestoringUser,
    logout,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
