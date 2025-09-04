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
    <div className={`flex flex-col h-full chat-container ${className}`}>
      {/* Header with consistent theming */}
      <div className="flex-shrink-0 chat-header px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Prompt Engineering Assistant
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isLoading ? 'Crafting your perfect prompt...' : 'Ready to transform your ideas into powerful prompts'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {canGeneratePrompt && (
              <button
                onClick={generateFinalPrompt}
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl font-semibold transform hover:scale-105"
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
                  className="p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-300 hover:scale-110"
                  title="Export chat"
                  aria-label="Export chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  onClick={handleClearChat}
                  className="p-2.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300 hover:scale-110"
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

      {/* Error Display with enhanced styling */}
      {error && (
        <div className="flex-shrink-0 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Progress Indicator with professional styling */}
      {messages.length > 0 && !canGeneratePrompt && (
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-blue-700 dark:text-blue-300 font-semibold">
                  Building your perfect prompt...
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {Math.min(messages.filter(m => m.role === 'user').length, 3)}/3 questions
                </span>
              </div>
              <div className="relative">
                <div className="bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out relative"
                    style={{ width: `${Math.min((messages.filter(m => m.role === 'user').length / 3) * 100, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container with consistent theming */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gradient-to-b from-slate-800/20 to-slate-700/30"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/10">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Transform Your Ideas into Perfect Prompts
            </h3>
            <p className="text-gray-300 max-w-md mb-8 leading-relaxed">
              I'll guide you through a friendly conversation to understand exactly what you want to accomplish, 
              then create a powerful, detailed prompt that gets you amazing results.
            </p>
            
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 mb-8 max-w-md border border-slate-700/50 shadow-xl">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm text-white">
                  <p className="font-semibold mb-2 text-white">How it works:</p>
                  <ul className="list-none space-y-1 text-gray-300">
                    <li>• I'll ask you questions about your goal</li>
                    <li>• We'll explore context and requirements</li>
                    <li>• I'll create your optimized prompt</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <button
                onClick={() => sendMessage('I want to create content for social media')}
                className="group flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="text-lg">📱</span>
                <span className="font-medium">Social Media Content</span>
              </button>
              <button
                onClick={() => sendMessage('Help me write better emails')}
                className="group flex items-center space-x-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <span className="text-lg">✉️</span>
                <span className="font-medium">Email Writing</span>
              </button>
              <button
                onClick={() => sendMessage('I need to analyze data and create insights')}
                className="group flex items-center space-x-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <span className="text-lg">📊</span>
                <span className="font-medium">Data Analysis</span>
              </button>
              <button
                onClick={() => sendMessage('Help me with creative writing')}
                className="group flex items-center space-x-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <span className="text-lg">✍️</span>
                <span className="font-medium">Creative Writing</span>
              </button>
              <button
                onClick={() => sendMessage('I want to create educational content')}
                className="group flex items-center space-x-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <span className="text-lg">🎓</span>
                <span className="font-medium">Education</span>
              </button>
              <button
                onClick={() => sendMessage('Something else - let me explain my goal')}
                className="group flex items-center space-x-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <span className="text-lg">💭</span>
                <span className="font-medium">Custom Goal</span>
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

      {/* Input Area with consistent theming */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <MessageInput
          onSendMessage={sendMessage}
          disabled={isLoading}
          placeholder="Type your message..."
        />
      </div>
    </div>
  )
}