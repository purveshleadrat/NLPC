import { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin, signup as apiSignup, getToken, setToken, setUnauthorizedHandler } from '../api/client'

const AuthContext = createContext(null)

const TENANT_KEY = 'nplc_tenant'

function readTenant() {
  try { return JSON.parse(localStorage.getItem(TENANT_KEY) || 'null') } catch { return null }
}
function writeTenant(t) {
  try {
    if (t) localStorage.setItem(TENANT_KEY, JSON.stringify(t))
    else localStorage.removeItem(TENANT_KEY)
  } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [token, setTok] = useState(() => getToken())
  const [tenant, setTenant] = useState(() => readTenant())

  // When any API call 401s, the client clears the token; reflect that here so the app
  // drops back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => { setTok(null); setTenant(null); writeTenant(null) })
  }, [])

  function persist(res) {
    const { accessToken, tenantId, tenantSlug } = res.data
    setToken(accessToken)
    const t = { tenantId, tenantSlug }
    writeTenant(t)
    setTok(accessToken)
    setTenant(t)
  }

  async function login(tenantSlug, password) {
    persist(await apiLogin(tenantSlug, password))
  }

  async function signup(tenantName, tenantSlug, password) {
    persist(await apiSignup(tenantName, tenantSlug, password))
  }

  function logout() {
    setToken(null)
    writeTenant(null)
    setTok(null)
    setTenant(null)
  }

  return (
    <AuthContext.Provider value={{ token, tenant, isAuthed: !!token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
