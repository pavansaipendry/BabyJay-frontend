import { useState, useRef, useEffect } from 'react'
import { useAuth } from './AuthContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function Chat({ 
  conversationId, 
  onNewConversation, 
  onConversationUpdate,
  initialMessages = [] 
}) {
  const { session } = useAuth()
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(conversationId)
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Update messages when conversation changes
  useEffect(() => {
    setMessages(initialMessages)
    setCurrentConversationId(conversationId)
  }, [conversationId, initialMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setLoading(false)
    }
  }

  const sendFeedback = async (messageIndex, isPositive) => {
    // Update local state to show feedback was given
    setMessages(prev => prev.map((msg, idx) => 
      idx === messageIndex 
        ? { ...msg, feedback: isPositive ? 'positive' : 'negative' }
        : msg
    ))
  
    // Find the user's question (the message before this assistant response)
    const userQuery = messages[messageIndex - 1]?.content || 'Unknown query'
    const botResponse = messages[messageIndex]?.content || ''
  
    // Send to NEW feedback API
    try {
      await axios.post(`${API_URL}/api/feedback/`, {
        session_id: currentConversationId || `anon-${Date.now()}`,
        message_id: `msg-${messageIndex}-${Date.now()}`,
        query: userQuery,
        response: botResponse,
        rating: isPositive ? 'up' : 'down',  // Changed from 'positive'/'negative'
        feedback_text: null,
        metadata: {
          conversation_id: currentConversationId,
          message_index: messageIndex
        }
      })
      console.log('✅ Feedback saved!')
    } catch (error) {
      console.log('Feedback error:', error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const endpoint = session 
        ? `${API_URL}/api/chat`
        : `${API_URL}/api/chat/anonymous`

      const headers = {
        'Content-Type': 'application/json',
      }

      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await axios.post(
        endpoint,
        {
          message: userMessage,
          conversation_id: currentConversationId || undefined,
        },
        { 
          headers,
          signal: abortControllerRef.current.signal
        }
      )

      const { response: botResponse, conversation_id, title } = response.data

      // Add bot response
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }])

      // Update conversation ID if new
      if (conversation_id && !currentConversationId) {
        setCurrentConversationId(conversation_id)
        if (onNewConversation) {
          onNewConversation({ id: conversation_id, title })
        }
      }

      // Notify parent of update
      if (onConversationUpdate) {
        onConversationUpdate()
      }

    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Response stopped by user.' 
        }])
      } else {
        console.error('Chat error:', error)
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.' 
        }])
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  return (
    <div className="chat-container">
      {/* Messages */}
      <div className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <div className="welcome-icon">🐦</div>
            <h2>Welcome to BabyJay!</h2>
            <p>I'm your KU campus assistant. Ask me about:</p>
            <div className="suggestions">
              <button onClick={() => setInput('What are the prerequisites for EECS 168?')}>
                Course prerequisites
              </button>
              <button onClick={() => setInput('Who teaches machine learning?')}>
                Faculty & research
              </button>
              <button onClick={() => setInput('Where can I eat on campus?')}>
                Dining options
              </button>
              <button onClick={() => setInput('How much is tuition?')}>
                Tuition & fees
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🐦'}
            </div>
            <div className="message-wrapper">
              <div className="message-content">
                {msg.content}
              </div>
              
              {/* Feedback buttons for assistant messages */}
              {msg.role === 'assistant' && !msg.feedback && (
                <div className="message-feedback">
                  <button 
                    className="feedback-btn positive"
                    onClick={() => sendFeedback(idx, true)}
                    title="Good response"
                  >
                    👍
                  </button>
                  <button 
                    className="feedback-btn negative"
                    onClick={() => sendFeedback(idx, false)}
                    title="Poor response"
                  >
                    👎
                  </button>
                </div>
              )}
              
              {/* Show feedback was given */}
              {msg.feedback && (
                <div className={`feedback-given ${msg.feedback}`}>
                  {msg.feedback === 'positive' ? '👍 Thanks!' : '👎 Thanks for feedback'}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="message-avatar">🐦</div>
            <div className="message-content loading">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-input" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about KU..."
          disabled={loading}
        />
        {loading ? (
          <button type="button" className="stop-btn" onClick={stopGeneration}>
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()}>
            Send
          </button>
        )}
      </form>
    </div>
  )
}
