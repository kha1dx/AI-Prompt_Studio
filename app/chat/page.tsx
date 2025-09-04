'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../src/components/navigation/Navbar'
import ConversationSidebar from '../../src/components/chat/ConversationSidebar'
import { ChatInterface } from '../../src/components/chat/ChatInterface'
import PromptSidebar from '../../src/components/chat/PromptSidebar'
import { ChatProvider, useChat } from '../../src/contexts/ChatContext'

function ChatPageContent() {
  const router = useRouter()
  const { generateFinalPrompt, canGeneratePrompt, isLoading, messages } = useChat()
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined)
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('')

  const handleNewConversation = useCallback(() => {
    // Clear current conversation and start fresh
    setCurrentConversationId(undefined)
    setGeneratedPrompt('')
    // Clear messages would be handled by ChatContext
    router.push('/chat')
  }, [router])

  const handleSelectConversation = useCallback((id: string) => {
    // Load conversation by ID
    setCurrentConversationId(id)
    setGeneratedPrompt('') // Clear any existing generated prompt
    router.push(`/chat/${id}`)
  }, [router])

  const handleDeleteConversation = useCallback((id: string) => {
    // Handle conversation deletion
    console.log('Deleting conversation:', id)
    // If this was the current conversation, reset
    if (currentConversationId === id) {
      setCurrentConversationId(undefined)
      setGeneratedPrompt('')
      router.push('/chat')
    }
  }, [currentConversationId, router])

  const handleToggleFavorite = useCallback((id: string) => {
    // Handle favorite toggle
    console.log('Toggling favorite for conversation:', id)
  }, [])

  const handleGeneratePrompt = useCallback(async () => {
    try {
      await generateFinalPrompt()
      // The generated prompt will come through the messages
      // We'll extract it from the last assistant message
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        setGeneratedPrompt(lastMessage.content)
      }
    } catch (error) {
      console.error('Failed to generate prompt:', error)
    }
  }, [generateFinalPrompt, messages])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Navbar variant="app" showUserMenu={true} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Conversations */}
        <ConversationSidebar
          currentConversationId={currentConversationId}
          onNewConversation={handleNewConversation}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onToggleFavorite={handleToggleFavorite}
        />
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatInterface className="flex-1" />
        </div>
        
        {/* Right Sidebar - Prompt Generation */}
        <PromptSidebar
          conversationId={currentConversationId}
          generatedPrompt={generatedPrompt}
          onGeneratePrompt={handleGeneratePrompt}
          canGeneratePrompt={canGeneratePrompt}
          isGenerating={isLoading}
        />
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <ChatProvider>
      <ChatPageContent />
    </ChatProvider>
  )
}