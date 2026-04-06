import { useState } from 'react'
import { useAuth } from './AuthContext'

/**
 * Login — full-screen entry gate.
 *
 * Magic-link flow (Supabase default template):
 *   1. user enters email → "Send sign-in link"
 *   2. Supabase emails them a sign-in link
 *   3. user clicks the "Log In" button in the email
 *   4. Supabase authenticates them; AuthContext's onAuthStateChange fires
 *      and this component unmounts automatically
 *
 * We intentionally do NOT render a code-entry step because the default
 * Supabase email template embeds a link, not a 6-digit code.
 *
 * Third option: "Continue as guest" — sets the guest flag so the user can
 * chat without signing in. Guest chats are not saved.
 */
export default function Login() {
  const { sendOtp, continueAsGuest } = useAuth()

  const [step, setStep] = useState('email') // 'email' | 'sent'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSendLink = async (e) => {
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
      setStep('sent')
    } catch (err) {
      setError(err?.message || 'Failed to send sign-in link. Please try again.')
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
      setMessage('Sign-in link sent again. Check your inbox.')
    } catch (err) {
      setError(err?.message || 'Failed to resend link.')
    } finally {
      setLoading(false)
    }
  }

  const backToEmail = () => {
    setStep('email')
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
              : 'Check your email to finish signing in.'}
          </p>
        </div>

        {error && <div className="modal-error">{error}</div>}
        {message && <div className="modal-success">{message}</div>}

        {step === 'email' ? (
          <form onSubmit={handleSendLink}>
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
              {loading ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        ) : (
          <div className="sent-screen">
            <p className="sent-body">
              We sent a sign-in email to <strong>{email}</strong>.<br />
              Open it and click the <strong>Log In</strong> button to finish
              signing in. You can close this tab — you'll come right back here.
            </p>

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
          </div>
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
