import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onClose }) {
  const [mode, setMode] = useState('signin') // 'signin', 'signup', 'verify'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        setError('An account with this email already exists.')
      } else {
        setMessage('Check your email for the verification code!')
        setMode('verify')
      }
    } catch (err) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      onClose()
    } catch (err) {
      if (err.message.includes('Email not confirmed')) {
        setError('Please verify your email first. Check your inbox!')
        setMode('verify')
      } else {
        setError(err.message || 'Failed to sign in')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      })

      if (error) throw error
      
      setMessage('Email verified successfully!')
      setTimeout(() => onClose(), 1000)
    } catch (err) {
      setError(err.message || 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) throw error
      setMessage('Verification code sent! Check your email.')
    } catch (err) {
      setError(err.message || 'Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })

      if (error) throw error
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google')
      setLoading(false)
    }
  }

  // Verification Screen
  if (mode === 'verify') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>×</button>
          
          <div className="verify-icon">📧</div>
          <h2>Check Your Email</h2>
          <p className="modal-subtitle">
            We sent a verification code to<br />
            <strong>{email}</strong>
          </p>

          {error && <div className="modal-error">{error}</div>}
          {message && <div className="modal-success">{message}</div>}

          <form onSubmit={handleVerifyOTP}>
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="otp-input"
                maxLength={6}
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              className="modal-submit-btn"
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="resend-section">
            <span>Didn't receive the code? </span>
            <button 
              className="resend-btn"
              onClick={handleResendOTP}
              disabled={loading}
            >
              Resend
            </button>
          </div>

          <div className="modal-switch">
            <a onClick={() => setMode('signin')}>← Back to Sign In</a>
          </div>
        </div>
      </div>
    )
  }

  // Sign In / Sign Up Screen
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2>{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="modal-subtitle">
          {mode === 'signin' 
            ? 'Sign in to continue your conversations' 
            : 'Sign up to save your chat history'}
        </p>

        {error && <div className="modal-error">{error}</div>}
        {message && <div className="modal-success">{message}</div>}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <button 
            type="submit" 
            className="modal-submit-btn"
            disabled={loading}
          >
            {loading ? 'Loading...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="modal-divider">or</div>

        <button 
          className="google-btn" 
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="modal-switch">
          {mode === 'signin' ? (
            <>Don't have an account? <a onClick={() => setMode('signup')}>Sign Up</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode('signin')}>Sign In</a></>
          )}
        </div>
      </div>
    </div>
  )
}
