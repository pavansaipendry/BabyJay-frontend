import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function Sidebar({ 
  currentConversationId, 
  onSelectConversation, 
  onNewChat,
  refreshTrigger 
}) {
  const { session, signOut, user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null) // conversation id with open menu
  const [renaming, setRenaming] = useState(null) // conversation id being renamed
  const [renameValue, setRenameValue] = useState('')

  // Get user's first name
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

  useEffect(() => {
    if (session) {
      loadConversations()
    } else {
      setConversations([])
    }
  }, [session, refreshTrigger])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setMenuOpen(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const loadConversations = async () => {
    if (!session) return
    setLoading(true)
    
    try {
      const response = await axios.get(`${API_URL}/api/conversations`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      setConversations(response.data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMenuClick = (e, convId) => {
    e.stopPropagation()
    setMenuOpen(menuOpen === convId ? null : convId)
  }

  const handleRename = (e, conv) => {
    e.stopPropagation()
    setRenaming(conv.id)
    setRenameValue(conv.title || 'New Chat')
    setMenuOpen(null)
  }

  const submitRename = async (e, convId) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!renameValue.trim()) return

    try {
      await axios.put(
        `${API_URL}/api/conversations/${convId}`,
        { title: renameValue.trim() },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )
      
      setConversations(prev => 
        prev.map(c => c.id === convId ? { ...c, title: renameValue.trim() } : c)
      )
    } catch (error) {
      console.error('Failed to rename:', error)
    } finally {
      setRenaming(null)
      setRenameValue('')
    }
  }

  const handleDelete = async (e, convId) => {
    e.stopPropagation()
    setMenuOpen(null)
    
    if (!confirm('Delete this conversation?')) return

    try {
      await axios.delete(`${API_URL}/api/conversations/${convId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      
      setConversations(prev => prev.filter(c => c.id !== convId))
      
      if (currentConversationId === convId) {
        onNewChat()
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const userName = getUserFirstName()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🐦</span>
          <span>BabyJay</span>
        </div>
        <button className="new-chat-btn" onClick={onNewChat}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Chat
        </button>
      </div>

      <div className="conversations-list">
        {session ? (
          <>
            <div className="conversations-title">Recent Chats</div>
            {loading ? (
              <div className="conversations-loading">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="conversations-empty">No conversations yet</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''}`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  {renaming === conv.id ? (
                    <form 
                      className="rename-form" 
                      onSubmit={(e) => submitRename(e, conv.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => setRenaming(null)}
                        autoFocus
                      />
                    </form>
                  ) : (
                    <>
                      <span className="conversation-title">{conv.title || 'New Chat'}</span>
                      <button 
                        className="conversation-menu-btn"
                        onClick={(e) => handleMenuClick(e, conv.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2"/>
                          <circle cx="12" cy="12" r="2"/>
                          <circle cx="12" cy="19" r="2"/>
                        </svg>
                      </button>
                      
                      {menuOpen === conv.id && (
                        <div className="conversation-menu" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => handleRename(e, conv)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Rename
                          </button>
                          <button className="delete-btn" onClick={(e) => handleDelete(e, conv.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </>
        ) : (
          <div className="guest-label">
            Sign in to save your chat history
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        {session ? (
          <>
            {userName && (
              <div className="user-info">
                <span className="user-avatar">👤</span>
                <span className="user-name">{userName}</span>
              </div>
            )}
            <button className="sign-out-btn" onClick={signOut}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </>
        ) : (
          <div className="guest-footer">
            <span>Guest Mode</span>
          </div>
        )}
      </div>
    </aside>
  )
}
