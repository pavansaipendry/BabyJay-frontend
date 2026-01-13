import { useState, useRef, useEffect } from 'react'
import { useAuth } from './AuthContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// Dynamic suggested questions
const SUGGESTED_QUESTIONS = [
  { icon: '📚', text: 'Are there any seats in EECS 700?' },
  { icon: '🎓', text: 'Who teaches Machine Learning?' },
  { icon: '📝', text: 'What are the prerequisites for EECS 168?' },
  { icon: '🔬', text: 'What research does Prof. Kulkarni do?' },
  { icon: '🍕', text: 'Best places to eat on campus?' },
  { icon: '📍', text: 'Where is the ISS office?' },
  { icon: '🏛️', text: 'What time does the library close?' },
  { icon: '💼', text: 'How do I apply for OPT?' },
  { icon: '📅', text: 'When is the enrollment deadline?' },
  { icon: '💻', text: 'Best professors for programming?' },
]

const getRandomQuestions = () => {
  const shuffled = [...SUGGESTED_QUESTIONS].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 4)
}

export default function Chat({ 
  conversationId, 
  onNewConversation, 
  onConversationUpdate,
  initialMessages = [] 
}) {
  const { session, user } = useAuth()
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(conversationId)
  const [suggestedQuestions, setSuggestedQuestions] = useState(getRandomQuestions())
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const abortControllerRef = useRef(null)

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
    return 'there'
  }

  // Update messages when conversation changes
  useEffect(() => {
    setMessages(initialMessages)
    setCurrentConversationId(conversationId)
    if (initialMessages.length === 0) {
      setSuggestedQuestions(getRandomQuestions())
    }
  }, [conversationId, initialMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingText])

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setLoading(false)
      setIsStreaming(false)
      if (streamingText) {
        setMessages(prev => [...prev, { role: 'assistant', content: streamingText }])
        setStreamingText('')
      }
    }
  }

  const sendFeedback = async (messageIndex, isPositive) => {
    setMessages(prev => prev.map((msg, idx) => 
      idx === messageIndex 
        ? { ...msg, feedback: isPositive ? 'positive' : 'negative' }
        : msg
    ))

    const userQuery = messages[messageIndex - 1]?.content || 'Unknown query'
    const botResponse = messages[messageIndex]?.content || ''

    try {
      await axios.post(`${API_URL}/api/feedback/`, {
        session_id: currentConversationId || `anon-${Date.now()}`,
        message_id: `msg-${messageIndex}-${Date.now()}`,
        query: userQuery,
        response: botResponse,
        rating: isPositive ? 'up' : 'down',
        feedback_text: null,
        metadata: {
          conversation_id: currentConversationId,
          message_index: messageIndex
        }
      })
    } catch (error) {
      console.log('Feedback error:', error)
    }
  }

  // Simulate streaming effect
  const streamResponse = async (fullText) => {
    setIsStreaming(true)
    setStreamingText('')
    
    const words = fullText.split(' ')
    let currentText = ''
    
    for (let i = 0; i < words.length; i++) {
      if (abortControllerRef.current?.signal?.aborted) {
        break
      }
      currentText += (i === 0 ? '' : ' ') + words[i]
      setStreamingText(currentText)
      // Random delay between 20-50ms per word for natural feel
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30))
    }
    
    setIsStreaming(false)
    setStreamingText('')
    return currentText
  }

  const sendMessage = async (e, customMessage = null) => {
    if (e) e.preventDefault()
    
    const userMessage = customMessage || input.trim()
    if (!userMessage || loading) return

    setInput('')
    setLoading(true)
    setStreamingText('')

    abortControllerRef.current = new AbortController()

    // Add user message
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

      // Stream the response word by word
      await streamResponse(botResponse)
      
      // Add completed message
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }])

      // Update conversation ID if new
      if (conversation_id && !currentConversationId) {
        setCurrentConversationId(conversation_id)
        if (onNewConversation) {
          onNewConversation({ id: conversation_id, title })
        }
      }

      if (onConversationUpdate) {
        onConversationUpdate()
      }

    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        // Already handled in stopGeneration
      } else {
        console.error('Chat error:', error)
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.' 
        }])
      }
    } finally {
      setLoading(false)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const handleSuggestionClick = (question) => {
    sendMessage(null, question)
  }

  return (
    <div className="chat-container">
      {/* Messages */}
      <div className="messages" ref={messagesContainerRef}>
        {messages.length === 0 && !loading && (
          <div className="welcome">
            <div className="welcome-icon">
              <span className="jayhawk-emoji"></span>
            </div>
            <h2>Hey {getUserFirstName()}! How can I help you today?</h2>
            <p className="welcome-subtitle">I'm BabyJay, your KU campus assistant</p>
            <div className="suggestions">
              {suggestedQuestions.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSuggestionClick(item.text)}
                  className="suggestion-btn"
                >
                  <span className="suggestion-icon">{item.icon}</span>
                  <span className="suggestion-text">{item.text}</span>
                </button>
              ))}
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
              
              {/* Feedback buttons - only show on hover */}
              {msg.role === 'assistant' && (
                <div className={`message-feedback ${msg.feedback ? 'has-feedback' : ''}`}>
                  {!msg.feedback ? (
                    <>
                      <button 
                        className="feedback-btn"
                        onClick={() => sendFeedback(idx, true)}
                        title="Good response"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                        </svg>
                      </button>
                      <button 
                        className="feedback-btn"
                        onClick={() => sendFeedback(idx, false)}
                        title="Poor response"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                        </svg>
                      </button>
                    </>
                  ) : (
                    <span className={`feedback-given ${msg.feedback}`}>
                      {msg.feedback === 'positive' ? '👍 Thanks!' : '👎 Thanks for feedback'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingText && (
          <div className="message assistant">
            <div className="message-avatar">🐦</div>
            <div className="message-wrapper">
              <div className="message-content">
                {streamingText}
                <span className="cursor-blink">|</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && !isStreaming && (
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
          <button type="button" className="stop-btn" onClick={stopGeneration} title="Stop">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()} title="Send">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        )}
      </form>
    </div>
  )
}
