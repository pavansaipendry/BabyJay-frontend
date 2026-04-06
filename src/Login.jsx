import { useState } from 'react'
import { useAuth } from './AuthContext'

/**
 * Login — full-screen entry gate.
 *
 * Two-step email OTP:
 *   1. enter email → "Send code"   (calls sendOtp from AuthContext)
 *   2. enter 6-digit code → "Verify"   (calls verifyOtp)
 *
 * Third option: "Continue as guest" — sets the guest flag so the user can
 * chat without signing in. Guest chats are not saved.
 *
 * Note: this is a plain JSX component using existing classes from App.css.
 * Visual polish is deferred per user request.
 */
export default function Login() {
  const { sendOtp, verifyOtp, continueAsGuest } = useAuth()

  const [step, setStep] = useState('email') // 'email' | 'code'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    setLoading(true)
    try {
      const { error } = await sendOtp(email.trim())
      if (error) throw error
      setMessage(`We sent a 6-digit code to ${email}. Check your inbox.`)
      setStep('code')
    } catch (err) {
      setError(err?.message || 'Failed to send code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.')
      return
    }
    setLoading(true)
    try {
      const { error } = await verifyOtp(email.trim(), code)
      if (error) throw error
      // AuthContext's onAuthStateChange will flip session and unmount this
      // component; no further work needed here.
    } catch (err) {
      setError(err?.message || 'Invalid or expired code. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const { error } = await sendOtp(email.trim())
      if (error) throw error
      setMessage('New code sent. Check your email.')
    } catch (err) {
      setError(err?.message || 'Failed to resend code.')
    } finally {
      setLoading(false)
    }
  }

  const backToEmail = () => {
    setStep('email')
    setCode('')
    setError('')
    setMessage('')
  }

  return (
    <div className="login-gate">
      <div className="login-card">
        <div className="login-header">
          <h1>BabyJay</h1>
          <p className="login-subtitle">
            {step === 'email'
              ? 'Sign in with your email to save your chat history.'
              : 'Enter the 6-digit code we sent you.'}
          </p>
        </div>

        {error && <div className="modal-error">{error}</div>}
        {message && <div className="modal-success">{message}</div>}

        {step === 'email' ? (
          <form onSubmit={handleSendCode}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="modal-submit-btn"
              disabled={loading || !email.trim()}
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <div className="form-group">
              <label>6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="••••••"
                className="otp-input"
                maxLength={6}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="modal-submit-btn"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>

            <div className="resend-section">
              <span>Didn't get it? </span>
              <button
                type="button"
                className="resend-btn"
                onClick={handleResend}
                disabled={loading}
              >
                Resend
              </button>
              <span> · </span>
              <button
                type="button"
                className="resend-btn"
                onClick={backToEmail}
                disabled={loading}
              >
                Use a different email
              </button>
            </div>
          </form>
        )}

        <div className="login-divider">or</div>

        <button
          type="button"
          className="guest-btn"
          onClick={continueAsGuest}
          disabled={loading}
        >
          Continue as guest
        </button>
        <p className="guest-note">
          Guest chats are not saved and there's no chat history.
        </p>
      </div>
    </div>
  )
}
