import { useUser } from '../contexts/UserContext'

/**
 * Convenience wrapper around UserContext for authentication concerns.
 * Exposes the current user, token, auth status, and login/logout helpers.
 */
export function useAuth() {
  const { user, setUser, token, setToken, isRestoringUser, logout } = useUser()

  const isAuthenticated = Boolean(token)

  const login = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
  }

  return {
    user,
    setUser,
    token,
    isAuthenticated,
    isRestoringUser,
    login,
    logout,
  }
}

export default useAuth
