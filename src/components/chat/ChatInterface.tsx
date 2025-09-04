'use client'

import React, { useEffect, useRef } from 'react'
import { useChat } from '../../contexts/ChatContext'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'

interface ChatInterfaceProps {
  className?: string
}

export function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const { messages, isLoading, error, sendMessage, generateFinalPrompt, clearChat, exportChat, copyMessage, canGeneratePrompt } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleClearChat = () => {
    if (messages.length > 0 && confirm('Are you sure you want to clear the chat history?')) {
      clearChat()
    }
  }

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Prompt Engineering Assistant
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isLoading ? 'Crafting your perfect prompt...' : 'Ready to transform your ideas'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {canGeneratePrompt && (
              <button
                onClick={generateFinalPrompt}
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                title="Generate your optimized prompt"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Generate Prompt</span>
                </span>
              </button>
            )}
            {messages.length > 0 && (
              <>
                <button
                  onClick={exportChat}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
                  title="Export chat"
                  aria-label="Export chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  onClick={handleClearChat}
                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
                  title="Clear chat"
                  aria-label="Clear chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex-shrink-0 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {messages.length > 0 && !canGeneratePrompt && (
        <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  Building your perfect prompt...
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  {Math.min(messages.filter(m => m.role === 'user').length, 3)}/3 questions
                </span>
              </div>
              <div className="mt-2">
                <div className="bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((messages.filter(m => m.role === 'user').length / 3) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Transform Your Ideas into Perfect Prompts
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
              I'll guide you through a friendly conversation to understand exactly what you want to accomplish, 
              then create a powerful, detailed prompt that gets you amazing results.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 max-w-md">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">How it works:</p>
                  <ul className="list-none space-y-1">
                    <li>• I'll ask you questions about your goal</li>
                    <li>• We'll explore context and requirements</li>
                    <li>• I'll create your optimized prompt</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => sendMessage('I want to create content for social media')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                📱 Social Media Content
              </button>
              <button
                onClick={() => sendMessage('Help me write better emails')}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                ✉️ Email Writing
              </button>
              <button
                onClick={() => sendMessage('I need to analyze data and create insights')}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                📊 Data Analysis
              </button>
              <button
                onClick={() => sendMessage('Help me with creative writing')}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                ✍️ Creative Writing
              </button>
              <button
                onClick={() => sendMessage('I want to create educational content')}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                🎓 Education
              </button>
              <button
                onClick={() => sendMessage('Something else - let me explain my goal')}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                💭 Custom Goal
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCopy={copyMessage}
              />
            ))}
            <TypingIndicator isVisible={isLoading} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={sendMessage}
          disabled={isLoading}
          placeholder="Type your message..."
        />
      </div>
    </div>
  )
}