import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import Sidebar from './Sidebar'
import Chat from './Chat'
import Login from './Login'
import axios from 'axios'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function AppContent() {
  const { session, user, loading: authLoading } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [currentMessages, setCurrentMessages] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)

  // Settings state
  const [settings, setSettings] = useState({
    darkMode: true,
    showSuggestions: true,
    saveHistory: true,
  })

  // Get user's first name for welcome message
  const getUserFirstName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0]
    }
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.split(' ')[0]
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return null
  }

  // Load conversation messages
  const loadConversation = async (conversationId) => {
    if (!session || !conversationId) {
      setCurrentMessages([])
      return
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/conversations/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )
      setCurrentMessages(
        response.data.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      )
    } catch (error) {
      console.error('Failed to load conversation:', error)
      setCurrentMessages([])
    }
  }

  // Handle conversation selection from sidebar
  const handleSelectConversation = async (conversationId) => {
    setCurrentConversationId(conversationId)
    await loadConversation(conversationId)
    // Close sidebar on mobile after selecting
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }

  // Handle new chat / back to home
  const handleNewChat = () => {
    setCurrentConversationId(null)
    setCurrentMessages([])
  }

  // Handle when a new conversation is created (after first message)
  const handleNewConversation = (conv) => {
    console.log('New conversation created:', conv)
    setCurrentConversationId(conv.id)
    setRefreshTrigger((prev) => prev + 1)
  }

  // Handle conversation update
  const handleConversationUpdate = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const userName = getUserFirstName()

  // Check if we're in a conversation (to show back button)
  const isInConversation = currentConversationId !== null || currentMessages.length > 0

  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="loader"></div>
        <p>Loading BabyJay...</p>
      </div>
    )
  }

  return (
    <div className={`app ${sidebarOpen ? '' : 'sidebar-closed'}`}>
    {/* Menu toggle - only show when sidebar is closed */}
      {!sidebarOpen && (
        <button 
          className="menu-toggle"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
    )}

      {/* Sidebar */}
      <Sidebar
      currentConversationId={currentConversationId}
      onSelectConversation={handleSelectConversation}
      onNewChat={handleNewChat}
      refreshTrigger={refreshTrigger}
      onClose={() => setSidebarOpen(false)}
    />

      {/* Main chat area */}
      <main className="main-content">
        {/* Top bar */}
        <div className="top-bar">
          <div className="top-bar-left">
            {/* Back/Home button - only show when in a conversation */}
            {isInConversation && (
              <button 
                className="home-btn"
                onClick={handleNewChat}
                title="New Chat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </button>
            )}
            
            {!session && (
              <>
                <span className="auth-prompt">Sign in to save your chat history</span>
                <button className="sign-in-btn" onClick={() => setShowLogin(true)}>
                  Sign In
                </button>
              </>
            )}
            {session && userName && (
              <span className="welcome-text">Welcome back, {userName}! 👋</span>
            )}
            {session && !userName && (
              <span className="welcome-text">Welcome back! 👋</span>
            )}
          </div>
          <div className="top-bar-right">
            <button 
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Chat component */}
        <Chat
          // key={currentConversationId || 'new'}
          key = "chat"
          conversationId={currentConversationId}
          onNewConversation={handleNewConversation}
          onConversationUpdate={handleConversationUpdate}
          initialMessages={currentMessages}
        />
      </main>

      {/* Login modal */}
      {showLogin && <Login onClose={() => setShowLogin(false)} />}

      {/* Settings modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSettings(false)}>
              ×
            </button>
            <h2>Settings</h2>
            
            <div className="settings-section">
              <h3>Appearance</h3>
              <div className="settings-item">
                <div>
                  <div className="settings-label">Dark Mode</div>
                  <div className="settings-desc">Use dark theme</div>
                </div>
                <div 
                  className={`toggle ${settings.darkMode ? 'active' : ''}`}
                  onClick={() => setSettings({...settings, darkMode: !settings.darkMode})}
                />
              </div>
            </div>

            <div className="settings-section">
              <h3>Chat</h3>
              <div className="settings-item">
                <div>
                  <div className="settings-label">Show Suggestions</div>
                  <div className="settings-desc">Show suggested questions on new chat</div>
                </div>
                <div 
                  className={`toggle ${settings.showSuggestions ? 'active' : ''}`}
                  onClick={() => setSettings({...settings, showSuggestions: !settings.showSuggestions})}
                />
              </div>
              <div className="settings-item">
                <div>
                  <div className="settings-label">Save Chat History</div>
                  <div className="settings-desc">Save conversations when signed in</div>
                </div>
                <div 
                  className={`toggle ${settings.saveHistory ? 'active' : ''}`}
                  onClick={() => setSettings({...settings, saveHistory: !settings.saveHistory})}
                />
              </div>
            </div>

            <div className="settings-section">
              <h3>About</h3>
              <div className="settings-item">
                <div>
                  <div className="settings-label">BabyJay v2.0</div>
                  <div className="settings-desc">KU Campus Assistant powered by AI</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
