// Debug utility for chat interface debugging

export const chatDebug = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗨️ [CHAT] ${message}`, data || '')
    }
  },
  
  error: (message: string, error?: any) => {
    console.error(`❌ [CHAT] ${message}`, error || '')
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ [CHAT] ${message}`, data || '')
  },
  
  api: (endpoint: string, method: string, status: number, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      const emoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅'
      console.log(`${emoji} [API] ${method} ${endpoint} ${status}`, data || '')
    }
  },
  
  stream: (message: string, chunk?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📡 [STREAM] ${message}`, chunk || '')
    }
  },
  
  auth: (message: string, user?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 [AUTH] ${message}`, user ? { id: user.id, email: user.email } : '')
    }
  }
}

export const debugChatState = (context: string, state: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔍 [CHAT STATE] ${context}`)
    console.log('Messages:', state.messages?.length || 0)
    console.log('Loading:', state.isLoading)
    console.log('Error:', state.error)
    console.log('Current user:', state.user ? { id: state.user.id, email: state.user.email } : 'none')
    console.groupEnd()
  }
}