// Core Message Interface (used by ChatContext)
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
  metadata?: {
    extractedInfo?: string[]
    missingInfo?: string[]
    confidence?: number
  }
}

// Legacy ConversationMessage interface (for backward compatibility)
export interface ConversationMessage extends Message {}

// Chat State Management
export interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
}

export interface ChatContextType {
  messages: Message[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  generateFinalPrompt: () => Promise<void>
  clearChat: () => void
  exportChat: () => void
  copyMessage: (messageId: string) => Promise<void>
  canGeneratePrompt: boolean
}

export interface ChatExportData {
  messages: Message[]
  exportDate: string
  totalMessages: number
}

// Component Props Interfaces
export interface MessageBubbleProps {
  message: Message
  onCopy: (messageId: string) => Promise<void>
}

export interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export interface TypingIndicatorProps {
  isVisible: boolean
}

// Session Management
export interface PromptSession {
  id: string
  userId: string
  title: string
  messages: ConversationMessage[]
  extractedRequirements: {
    objective: string
    context: string[]
    constraints: string[]
    outputFormat: string
    audience: string
    tone: string
  }
  finalPrompt: string
  status: 'in_progress' | 'completed' | 'abandoned'
  createdAt: Date
  updatedAt: Date
}

export interface UsageLimit {
  userId: string
  monthlyPromptsUsed: number
  lastResetDate: Date
  tier: 'free' | 'pro' | 'enterprise'
}

// Streaming and API Interfaces
export interface StreamResponse {
  content?: string
  sessionId?: string
  timestamp?: string
  error?: string
  done?: boolean
}

export interface ChatAPIRequest {
  messages: Pick<ConversationMessage, 'role' | 'content'>[]
  sessionId: string
  generateFinalPrompt?: boolean
}

export interface ChatAPIResponse {
  success: boolean
  sessionId: string
  message: string
  conversationHistory?: ConversationMessage[]
  error?: string
  limit?: number
  currentUsage?: number
}