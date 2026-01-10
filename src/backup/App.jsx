import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { allStyles } from "./FeedbackComponents";
import Sidebar from './Sidebar'
import Chat from './Chat'
import Login from './Login'
import axios from 'axios'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function AppContent() {
  const { session, loading: authLoading } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [currentMessages, setCurrentMessages] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // const styleSheet = document.createElement('style');
  // styleSheet.textContent = allStyles;
  // document.head.appendChild(styleSheet);

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

  // Handle conversation selection
  const handleSelectConversation = async (conversationId) => {
    setCurrentConversationId(conversationId)
    await loadConversation(conversationId)
  }

  // Handle new chat
  const handleNewChat = () => {
    setCurrentConversationId(null)
    setCurrentMessages([])
  }

  // Handle new conversation created
  const handleNewConversation = (conv) => {
    setCurrentConversationId(conv.id)
    setRefreshTrigger((prev) => prev + 1)
  }

  // Handle conversation update
  const handleConversationUpdate = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

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
      {/* Mobile menu toggle */}
      <button 
        className="menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <Sidebar
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        refreshTrigger={refreshTrigger}
      />

      {/* Main chat area */}
      <main className="main-content">
        {/* Auth prompt for guests */}
        {!session && (
          <div className="auth-banner">
            <span>Sign in to save your chat history</span>
            <button onClick={() => setShowLogin(true)}>Sign In</button>
          </div>
        )}

        <Chat
          conversationId={currentConversationId}
          onNewConversation={handleNewConversation}
          onConversationUpdate={handleConversationUpdate}
          initialMessages={currentMessages}
        />
      </main>

      {/* Login modal */}
      {showLogin && <Login onClose={() => setShowLogin(false)} />}
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
