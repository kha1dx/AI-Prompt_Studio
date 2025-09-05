'use client'

import React from 'react'
import { Brain, Sparkles } from 'lucide-react'
import type { TypingIndicatorProps } from '../../types/chat'

export function TypingIndicator({ isVisible }: TypingIndicatorProps) {
  if (!isVisible) return null

  return (
    <div className="flex items-center space-x-3 p-4 glass-morphism rounded-2xl animate-fade-in-up border border-white/10">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 gradient-neural rounded-full flex items-center justify-center loading-pulse-ring">
          <Brain className="w-5 h-5 text-white animate-pulse" />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <p className="text-sm text-white font-medium">AI is crafting your response...</p>
        </div>
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  )
}