import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

// Persist the guest flag across refreshes so a guest user doesn't get bounced
// back to the login screen every time they reload the page.
const GUEST_STORAGE_KEY = 'babyjay_guest_mode'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(() => {
    try {
      return localStorage.getItem(GUEST_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        // Any real sign-in clears guest mode
        if (session) {
          setIsGuest(false)
          try { localStorage.removeItem(GUEST_STORAGE_KEY) } catch {}
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Send a 6-digit OTP to the given email via Supabase Auth.
   * Uses shouldCreateUser=true so brand-new users get auto-registered on
   * first sign-in (no separate signup step).
   */
  const sendOtp = async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    return { data, error }
  }

  /**
   * Verify the 6-digit OTP the user typed. On success the onAuthStateChange
   * listener above will pick up the new session automatically.
   */
  const verifyOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    return { data, error }
  }

  /**
   * Enter guest mode — no chats are saved, no sidebar, no Supabase row.
   * The flag is persisted in localStorage so a refresh doesn't bounce the
   * user back to the login gate.
   */
  const continueAsGuest = () => {
    setIsGuest(true)
    try { localStorage.setItem(GUEST_STORAGE_KEY, '1') } catch {}
  }

  /**
   * Exit guest mode (e.g. when the user clicks "Sign in" from the top bar).
   * Does NOT clear any Supabase session — that's what signOut is for.
   */
  const exitGuestMode = () => {
    setIsGuest(false)
    try { localStorage.removeItem(GUEST_STORAGE_KEY) } catch {}
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    // Also drop guest flag on sign-out so the user lands back on Login.
    setIsGuest(false)
    try { localStorage.removeItem(GUEST_STORAGE_KEY) } catch {}
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    isGuest,
    sendOtp,
    verifyOtp,
    continueAsGuest,
    exitGuestMode,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
