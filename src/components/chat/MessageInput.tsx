'use client'

import React, { useState, useRef, useEffect } from 'react'
import type { MessageInputProps } from '../../types/chat'

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      await onSendMessage(message.trim())
      setMessage('')
      setIsExpanded(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 120 // Max height in pixels
      
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.height = `${maxHeight}px`
        textareaRef.current.style.overflowY = 'scroll'
      } else {
        textareaRef.current.style.height = `${scrollHeight}px`
        textareaRef.current.style.overflowY = 'hidden'
      }
      
      setIsExpanded(scrollHeight > 40)
    }
  }

  useEffect(() => {
    if (textareaRef.current && !message) {
      textareaRef.current.style.height = 'auto'
      setIsExpanded(false)
    }
  }, [message])

  return (
    <div className="border-t border-slate-700/50 bg-slate-800/80 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => !message && setIsExpanded(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full resize-none rounded-lg border border-slate-600/50 shadow-lg
              bg-slate-700/50 backdrop-blur-sm px-4 py-3 pr-12
              text-gray-100 placeholder-gray-400
              focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 ease-in-out hover:bg-slate-700/70
              ${isExpanded ? 'rounded-lg' : 'rounded-full'}
            `}
            style={{
              minHeight: '44px',
              maxHeight: '120px',
            }}
            rows={1}
          />
          
          {/* Character counter for long messages */}
          {message.length > 500 && (
            <div className="absolute bottom-2 right-12 text-xs text-gray-300">
              {message.length}/2000
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className={`
            flex-shrink-0 p-3 rounded-full transition-all duration-200
            ${
              message.trim() && !disabled
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-slate-600/50 text-gray-400 cursor-not-allowed'
            }
          `}
          aria-label="Send message"
        >
          {disabled ? (
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </form>

      {/* Input hints */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
        <span>Press Enter to send, Shift + Enter for new line</span>
        {message.length > 0 && (
          <span className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>{message.length} characters</span>
          </span>
        )}
      </div>
    </div>
  )
}