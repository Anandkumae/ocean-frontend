import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { FiSend, FiUser, FiMessageSquare, FiLoader, FiSun, FiMoon, FiMic, FiMicOff, FiMap } from 'react-icons/fi';
import ArgoFloatsMap from './components/ArgoFloatsMap';
import './App.css';
import './components/SuggestedQuestions.css';

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Sample initial bot message
const initialBotMessage = {
  id: 1,
  text: 'Hello! I\'m your Ocean Data Assistant. Ask me anything about ocean temperature, salinity, and other parameters.',
  sender: 'bot',
  timestamp: new Date().toISOString(),
};

const SUGGESTED_QUESTIONS = [
  'What is the average temperature in the Indian Ocean?',
  'Show me salinity trends in the last 5 years',
  'What are the highest recorded temperatures?',
  'Compare temperature data between different regions',
];

// Clean and format text for display
const cleanText = (text) => {
  if (!text) return '';
  
  try {
    const textStr = typeof text === 'string' ? text : JSON.stringify(text);
    const temp = document.createElement('div');
    temp.innerHTML = textStr;
    
    let clean = temp.textContent || temp.innerText || '';
    
    clean = clean
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s*#+\s*/g, '')
      .replace(/\s*\*\s*/g, '')
      .replace(/\s*\-\s*/g, '')
      .replace(/\s*\d+\.\s*/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*[\-\*_]{2,}\s*/g, '')
      .replace(/\s*`{3,}.*?`{3,}\s*/gs, '')
      .replace(/\s*`([^`]+)`\s*/g, '$1')
      .replace(/\s*\[([^\]]+)\]\([^)]+\)\s*/g, '$1')
      .replace(/\s*!\[[^\]]*\]\([^)]+\)\s*/g, '')
      .trim();
    
    return clean;
  } catch (e) {
    console.error('Error cleaning text:', e);
    return typeof text === 'string' ? text : '';
  }
};

// Format message text to improve readability with proper structure
const formatMessageText = (text) => {
  if (!text) return '';
  
  // Initial cleaning
  let cleanText = text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '  ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Preserve code blocks first
  const codeBlocks = [];
  cleanText = cleanText.replace(/```([\s\S]*?)```/g, (match, code) => {
    codeBlocks.push(code);
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
  });

  // Handle URLs
  const urlRegex = /(https?:\/\/[^\s\n]+)/g;
  cleanText = cleanText.replace(urlRegex, (url) => ` [${url}](${url}) `);
  
  // Split into paragraphs
  let paragraphs = cleanText.split('\n\n');
  
  // Process each paragraph
  let processedParagraphs = paragraphs.map((paragraph, index) => {
    paragraph = paragraph.trim();
    if (!paragraph) return '';
    
    // Check for list items
    const isNumberedList = /^\s*\d+\.\s+/.test(paragraph);
    const isBulletList = /^\s*[-•*]\s+/.test(paragraph);
    
    if (isNumberedList || isBulletList) {
      const listType = isNumberedList ? 'ol' : 'ul';
      const items = paragraph
        .split('\n')
        .filter(item => item.trim())
        .map(item => {
          // Remove list markers and trim
          const content = item.replace(/^\s*[\d.\-•*]+\s*/, '').trim();
          return `<li class="list-item">${content}</li>`;
        })
        .join('');
      
      return `<${listType} class="message-list">${items}</${listType}>`;
    }
    
    // Handle section headers (lines ending with :)
    if (paragraph.endsWith(':') && !paragraph.includes('http')) {
      return `<h3 class="section-header">${paragraph}</h3>`;
    }
    
    // Handle key-value pairs (Key: value)
    const keyValueMatch = paragraph.match(/^([^:\n]+):\s*([\s\S]+)$/);
    if (keyValueMatch) {
      return `
        <div class="key-value">
          <span class="key">${keyValueMatch[1]}:</span>
          <span class="value">${keyValueMatch[2].trim()}</span>
        </div>`;
    }
    
    // Regular paragraph with proper spacing
    return `<p class="message-paragraph">${paragraph}</p>`;
  });
  
  let formattedText = processedParagraphs.join('\n');

  // Process markdown links [text](url)
  formattedText = formattedText.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g, 
    (match, text, url) => {
      let cleanUrl = url.replace(/[\s<>"]+/g, '').trim();
      if (!cleanUrl.match(/^https?:\/\//)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="message-link">${text}</a>`;
    }
  );
  
  // Handle naked URLs
  formattedText = formattedText.replace(
    /(https?:\/\/[^\s\n<]+)/g, 
    (url) => {
      if (url.includes('<a ')) return url;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
    }
  );
  
  // Restore code blocks
  codeBlocks.forEach((code, index) => {
    formattedText = formattedText.replace(
      `___CODE_BLOCK_${index}___`,
      `<pre class="code-block"><code>${code}</code></pre>`
    );
  });

  // Format markdown headers
  formattedText = formattedText.replace(
    /^#\s+(.+?)(\n|$)/gm,
    '<h2 class="message-header">$1</h2>'
  );
  
  formattedText = formattedText.replace(
    /^##\s+(.+?)(\n|$)/gm,
    '<h3 class="message-subheader">$1</h3>'
  );

  // Format bold and italic text
  formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formattedText = formattedText.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  formattedText = formattedText.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Add proper spacing between elements
  formattedText = formattedText
    .replace(/<\/(p|h2|h3|div|pre|ul|ol)>\s*<(p|h2|h3|div|pre|ul|ol)/g, '</$1>\n<$2')
    .replace(/<\/(li)>\s*<(li)/g, '</$1><$2')
    .replace(/<\/(h2|h3)>/g, '</$1>\n')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (match) => match.replace(/\n/g, '<br>'));
  
  return formattedText;
};

// Main App component with routing
function App() {
  return <AppContent />;
}

// Main content component that handles the actual UI
function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/' || location.pathname === '';
  const [messages, setMessages] = useState([initialBotMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setInputValue(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  // Toggle speech recognition
  const toggleSpeechRecognition = () => {
    if (!isSpeechSupported) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        alert('Error accessing microphone. Please ensure you have granted microphone permissions.');
      }
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Apply dark mode class to body
  useEffect(() => {
    document.body.classList.add('theme-transition');
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    // Clean up
    return () => {
      document.body.classList.remove('theme-transition');
    };
  }, [darkMode]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageText = inputValue.trim();
    if (!messageText) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the backend API with GET and query parameters
      const response = await fetch(`${API_BASE_URL}/ask?question=${encodeURIComponent(messageText)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add bot response
      const botMessage = {
        id: Date.now() + 1,
        text: data.answer || 'I received your message but couldn\'t process it at the moment.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        data: data.data // Include any additional data from the backend
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error processing your request. Please try again later.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    setInputValue(question);
    // Auto-focus the input after setting the value
    setTimeout(() => {
      document.querySelector('.chat-input')?.focus();
    }, 0);
  };

  return (
    <div className={`app theme-transition ${darkMode ? 'dark-mode' : ''}`}>
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Ocean Data Assistant</h1>
            <p>Ask me anything about ocean temperature, salinity, and more</p>
          </div>
          <button 
            className="theme-toggle"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <FiSun /> : <FiMoon />}
          </button>
        </div>
        
        <nav className="main-nav">
          <ul>
            <li className={isHomePage ? 'active' : ''}>
              <Link to="/">Chat</Link>
            </li>
            <li className={!isHomePage ? 'active' : ''}>
              <Link to="/argo-floats">
                <FiMap style={{ marginRight: '8px' }} />
                Argo Floats Map
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <Routes>
        <Route 
          path="/" 
          element={
            <>
              <main className="chat-container">
                <div className="chat-messages">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message ${message.sender} ${message.isError ? 'error' : ''}`}
                    >
                      <div className="message-avatar">
                        {message.sender === 'user' ? (
                          <FiUser className="user-avatar" />
                        ) : (
                          <FiMessageSquare className="bot-avatar" />
                        )}
                      </div>
                      <div className="message-content">
                        <div className="message-text">
                          {(() => {
                            try {
                              // Process message text with markdown-like formatting
                              const processText = (text) => {
                                if (!text) return [];
                                
                                // Split by double newlines first to handle paragraphs
                                return text.split('\n\n').map((paragraph, pIndex) => {
                                  // Then split by single newlines within each paragraph
                                  const lines = paragraph.split('\n').map((line, lIndex) => {
                                    // Simple markdown-style formatting
                                    if (line.startsWith('### ')) {
                                      return <h4 key={`h4-${lIndex}`} style={{ margin: '1em 0 0.5em 0', color: 'var(--primary-color)' }}>{line.substring(4)}</h4>;
                                    } else if (line.startsWith('## ')) {
                                      return <h3 key={`h3-${lIndex}`} style={{ margin: '1.2em 0 0.6em 0', color: 'var(--primary-dark)' }}>{line.substring(3)}</h3>;
                                    } else if (line.startsWith('# ')) {
                                      return <h2 key={`h2-${lIndex}`} style={{ margin: '1.5em 0 0.8em 0', color: 'var(--primary-darker)' }}>{line.substring(2)}</h2>;
                                    } else if (line.startsWith('- ')) {
                                      return <li key={`li-${lIndex}`} style={{ marginBottom: '0.3em' }}>{line.substring(2)}</li>;
                                    } else if (line.trim() === '') {
                                      return <br key={`br-${lIndex}`} />;
                                    } else {
                                      return <p key={`p-${lIndex}`} style={{ margin: '0.5em 0' }}>{line}</p>;
                                    }
                                  });
                                  
                                  return (
                                    <div key={`para-${pIndex}`} style={{ marginBottom: '1em' }}>
                                      {lines}
                                    </div>
                                  );
                                });
                              };
                              
                              // Only show structured data for relevant message types
                              const showStructuredData = message.data?.trend_data && message.data.type !== 'greeting';
                              
                              return (
                                <div>
                                  {processText(message.text)}
                                  
                                  {/* Show structured data if available and not a greeting */}
                                  {showStructuredData && (
                                    <div className="data-visualization" style={{ 
                                      marginTop: '1.5em', 
                                      padding: '1.25em',
                                      backgroundColor: 'rgba(240, 245, 255, 0.8)',
                                      borderRadius: '10px',
                                      borderLeft: '4px solid var(--primary-color)',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                    }}>
                                      <h4 style={{ 
                                        margin: '0 0 0.8em 0', 
                                        color: 'var(--primary-darker)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5em'
                                      }}>
                                        <span style={{ fontSize: '1.2em' }}>📊</span>
                                        Ocean Data Insights
                                      </h4>
                                      <ul style={{ 
                                        margin: 0, 
                                        paddingLeft: '1.2em',
                                        listStyleType: 'none'
                                      }}>
                                        {message.data.trend_data.years.map((year, i) => (
                                          <li key={i} style={{ 
                                            marginBottom: '0.5em',
                                            padding: '0.4em 0.6em',
                                            backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'transparent',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                          }}>
                                            <span style={{ fontWeight: 500 }}>{year}:</span>
                                            <span style={{ 
                                              backgroundColor: 'var(--primary-light)',
                                              color: 'var(--primary-darker)',
                                              padding: '0.2em 0.6em',
                                              borderRadius: '12px',
                                              fontSize: '0.9em',
                                              fontWeight: 500
                                            }}>
                                              {message.data.trend_data.salinity[i].toFixed(1)} {message.data.trend_data.unit}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                      <div style={{
                                        marginTop: '1em',
                                        fontSize: '0.9em',
                                        color: 'var(--text-secondary)',
                                        fontStyle: 'italic'
                                      }}>
                                        Data source: Indian Ocean Argo Float Program
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            } catch (e) {
                              console.error('Error formatting message:', e);
                              const fallbackText = typeof message.text === 'string' 
                                ? message.text.replace(/<[^>]*>?/gm, '') 
                                : 'I had trouble understanding that. Could you try rephrasing?';
                              return (
                                <div className="error-message" style={{
                                  padding: '0.8em',
                                  backgroundColor: 'var(--error-bg)',
                                  color: 'var(--error)',
                                  borderRadius: '6px',
                                  margin: '0.5em 0'
                                }}>
                                  {fallbackText}
                                </div>
                              );
                            }
                          })()}
                        </div>
                        {/* No raw data display in production */}
                        <span className="message-timestamp">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="message bot">
                      <div className="message-avatar">
                        <FiMessageSquare className="bot-avatar" />
                      </div>
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="suggested-questions">
                  {SUGGESTED_QUESTIONS.map((question, index) => (
                    <button
                      key={index}
                      className="suggestion-chip"
                      onClick={() => handleQuickQuestion(question)}
                      disabled={isLoading}
                    >
                      {question}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="message-form">
                  <div className="input-container">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        className="chat-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type your message..."
                        disabled={isLoading}
                      />
                      {isSpeechSupported && (
                        <button
                          type="button"
                          className={`icon-button ${isListening ? 'listening' : ''}`}
                          onClick={toggleSpeechRecognition}
                          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                          title={isListening ? 'Stop listening' : 'Start voice input'}
                        >
                          {isListening ? <FiMicOff /> : <FiMic />}
                          {isListening && <span className="pulse-ring"></span>}
                        </button>
                      )}
                      <button
                        type="submit"
                        className="send-button"
                        disabled={!inputValue.trim() || isLoading}
                      >
                        {isLoading ? <FiLoader className="loading" /> : <FiSend />}
                      </button>
                    </div>
                  </div>
                </form>
              </main>
            </>
          } 
        />
        <Route path="/argo-floats" element={<ArgoFloatsMap />} />
      </Routes>
    </div>
  );
}

export default App;
