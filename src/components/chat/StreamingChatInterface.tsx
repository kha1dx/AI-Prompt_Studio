'use client'

import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Send, Copy, Download, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    extractedInfo?: string[]
    missingInfo?: string[]
    confidence?: number
  }
}

interface StreamingChatInterfaceProps {
  onPromptGenerated?: (prompt: string) => void
  initialMessages?: Message[]
  sessionId?: string
}

export default function StreamingChatInterface({ 
  onPromptGenerated, 
  initialMessages = [],
  sessionId: initialSessionId 
}: StreamingChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState(initialSessionId || uuidv4())
  const [error, setError] = useState<string | null>(null)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isGeneratingFinalPrompt, setIsGeneratingFinalPrompt] = useState(false)
  const [finalPrompt, setFinalPrompt] = useState<string | null>(null)
  const [usageStatus, setUsageStatus] = useState<{ used: number; limit: number } | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  const sendMessage = async (messageContent?: string, generateFinal = false) => {
    const content = messageContent || input.trim()
    if (!content || isStreaming) return

    setError(null)
    setInput('')
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingMessage('')
    
    if (generateFinal) {
      setIsGeneratingFinalPrompt(true)
    }

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          sessionId,
          generateFinalPrompt: generateFinal
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 429) {
          setError(`Usage limit exceeded: ${errorData.currentUsage}/${errorData.limit} prompts this month`)
          setUsageStatus({ used: errorData.currentUsage, limit: errorData.limit })
        } else {
          setError(errorData.error || 'Failed to get response')
        }
        setIsStreaming(false)
        setIsGeneratingFinalPrompt(false)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      let assistantMessage = ''
      const assistantMessageId = uuidv4()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              // Stream complete
              const finalMessage: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: assistantMessage,
                timestamp: new Date()
              }
              
              setMessages(prev => [...prev, finalMessage])
              setStreamingMessage('')
              
              if (generateFinal && assistantMessage) {
                setFinalPrompt(assistantMessage)
                onPromptGenerated?.(assistantMessage)
              }
              
              setIsStreaming(false)
              setIsGeneratingFinalPrompt(false)
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantMessage += parsed.content
                setStreamingMessage(assistantMessage)
              }
            } catch (e) {
              // Ignore parsing errors for malformed chunks
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted')
      } else {
        console.error('Chat error:', error)
        setError('Failed to get response. Please try again.')
      }
      setIsStreaming(false)
      setIsGeneratingFinalPrompt(false)
      setStreamingMessage('')
    }
  }

  const generateFinalPrompt = () => {
    sendMessage('Please generate the final, optimized prompt based on our conversation.', true)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const exportConversation = () => {
    const conversationText = messages.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\\n\\n')
    
    const blob = new Blob([conversationText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt-conversation-${sessionId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const resetConversation = () => {
    setMessages([])
    setStreamingMessage('')
    setFinalPrompt(null)
    setSessionId(uuidv4())
    setError(null)
    inputRef.current?.focus()
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsStreaming(false)
    setIsGeneratingFinalPrompt(false)
    setStreamingMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className=\"flex flex-col h-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg\">
      {/* Header */}
      <div className=\"flex items-center justify-between p-4 border-b\">
        <div>
          <h2 className=\"text-xl font-semibold text-gray-800\">AI Prompt Assistant</h2>
          <p className=\"text-sm text-gray-600\">Let's create the perfect prompt together</p>
        </div>
        
        <div className=\"flex items-center space-x-2\">
          {usageStatus && (
            <div className=\"text-sm px-3 py-1 bg-gray-100 rounded-full\">
              {usageStatus.used}/{usageStatus.limit === -1 ? '∞' : usageStatus.limit}
            </div>
          )}
          
          <button
            onClick={exportConversation}
            disabled={messages.length === 0}
            className=\"p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50\"
            title=\"Export conversation\"
          >
            <Download className=\"w-4 h-4\" />
          </button>
          
          <button
            onClick={resetConversation}
            className=\"p-2 text-gray-500 hover:text-gray-700\"
            title=\"Reset conversation\"
          >
            <RotateCcw className=\"w-4 h-4\" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className=\"flex-1 overflow-y-auto p-4 space-y-4\">
        {messages.length === 0 && (
          <div className=\"text-center py-12\">
            <div className=\"text-gray-500 text-lg mb-2\">👋 Hi! I'm your prompt engineering assistant.</div>
            <div className=\"text-gray-400\">Tell me what you'd like to create a prompt for, and I'll help you make it perfect!</div>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className=\"whitespace-pre-wrap\">{message.content}</div>
              {message.role === 'assistant' && (
                <div className=\"mt-2 flex items-center space-x-2\">
                  <button
                    onClick={() => copyToClipboard(message.content)}
                    className=\"p-1 text-gray-500 hover:text-gray-700\"
                    title=\"Copy message\"
                  >
                    <Copy className=\"w-3 h-3\" />
                  </button>
                  <span className=\"text-xs text-gray-500\">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streamingMessage && (
          <div className=\"flex justify-start\">
            <div className=\"max-w-[80%] px-4 py-2 rounded-lg bg-gray-100 text-gray-800\">
              <div className=\"whitespace-pre-wrap\">{streamingMessage}</div>
              <div className=\"mt-2\">
                <div className=\"inline-flex items-center space-x-1 text-xs text-gray-500\">
                  <div className=\"animate-pulse\">●</div>
                  <span>{isGeneratingFinalPrompt ? 'Generating final prompt...' : 'Typing...'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className=\"flex justify-center\">
            <div className=\"flex items-center space-x-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-800\">
              <AlertCircle className=\"w-4 h-4\" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Final prompt display */}
        {finalPrompt && (
          <div className=\"border-2 border-green-200 rounded-lg p-4 bg-green-50\">
            <div className=\"flex items-center justify-between mb-2\">
              <div className=\"flex items-center space-x-2 text-green-800 font-medium\">
                <CheckCircle className=\"w-4 h-4\" />
                <span>Generated Prompt</span>
              </div>
              <button
                onClick={() => copyToClipboard(finalPrompt)}
                className=\"px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm\"
              >
                Copy Prompt
              </button>
            </div>
            <pre className=\"whitespace-pre-wrap text-sm font-mono bg-white p-3 rounded border text-gray-800\">
              {finalPrompt}
            </pre>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className=\"border-t p-4\">
        <div className=\"flex flex-col space-y-3\">
          {/* Generate final prompt button */}
          {messages.length > 2 && !finalPrompt && (
            <div className=\"flex justify-center\">
              <button
                onClick={generateFinalPrompt}
                disabled={isStreaming}
                className=\"px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium\"
              >
                {isGeneratingFinalPrompt ? 'Generating...' : 'Generate Final Prompt'}
              </button>
            </div>
          )}
          
          <div className=\"flex space-x-2\">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder=\"Describe what you want to create a prompt for...\"
              className=\"flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none\"
              rows={2}
              disabled={isStreaming}
            />
            
            <div className=\"flex flex-col space-y-2\">
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                className=\"p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50\"
                title=\"Send message\"
              >
                <Send className=\"w-4 h-4\" />
              </button>
              
              {isStreaming && (
                <button
                  onClick={stopGeneration}
                  className=\"p-2 bg-red-600 text-white rounded-lg hover:bg-red-700\"
                  title=\"Stop generation\"
                >
                  ⏹
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}