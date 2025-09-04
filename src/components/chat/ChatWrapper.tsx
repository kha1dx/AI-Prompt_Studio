'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ChatInterface } from './ChatInterface'

interface ChatWrapperProps {
  className?: string
}

export function ChatWrapper({ className }: ChatWrapperProps) {
  const { user, loading } = useAuth()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Add a small delay to ensure authentication is properly initialized
    if (!loading && user) {
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 100)
      
      return () => clearTimeout(timer)
    } else if (!loading && !user) {
      setIsReady(false)
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Authentication Required</h2>
          <p className="text-gray-600 mt-2">Please log in to use the chat interface.</p>
        </div>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-pulse rounded-full h-8 w-8 bg-blue-200"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    )
  }

  return <ChatInterface className={className} />
}