'use client'

import React, { useState } from 'react'
import type { MessageBubbleProps } from '../../types/chat'

export function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const [showCopyTooltip, setShowCopyTooltip] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    await onCopy(message.id)
    setShowCopyTooltip(true)
    setTimeout(() => setShowCopyTooltip(false), 2000)
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date))
  }

  return (
    <div
      className={`flex w-full mb-6 ${
        isUser ? 'justify-end' : 'justify-start'
      } animate-fade-in-up`}
    >
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-lg ${
              isUser
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
            }`}
          >
            {isUser ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className={`group relative ${isUser ? 'text-right' : 'text-left'}`}>
          <div
            className={`inline-block p-4 rounded-2xl shadow-lg backdrop-blur-sm border ${
              isUser
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-500/30'
                : 'bg-slate-800/80 text-gray-100 border-slate-600/50'
            } ${
              message.isStreaming
                ? 'animate-pulse'
                : 'hover:shadow-xl transition-shadow duration-300'
            }`}
          >
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content || (message.isStreaming ? '...' : '')}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse"></span>
              )}
            </div>
          </div>

          {/* Message Actions */}
          <div
            className={`flex items-center mt-1 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
              isUser ? 'justify-end' : 'justify-start'
            }`}
          >
            <span className="text-xs text-gray-400">
              {formatTimestamp(message.timestamp)}
            </span>
            <div className="relative">
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-slate-700/50 transition-colors duration-200"
                title="Copy message"
                aria-label="Copy message"
              >
                <svg
                  className="w-3 h-3 text-gray-400 hover:text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              {showCopyTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-900/90 backdrop-blur-sm rounded shadow-xl whitespace-nowrap border border-slate-700">
                  Copied!
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-slate-900"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}