'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  MessageCircle, 
  Trash2, 
  Edit2, 
  Star, 
  Clock, 
  Filter,
  Archive,
  Sparkles,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'
import { useConversations } from '../../hooks/useConversations'
import { type Conversation } from '../../lib/database'

interface ConversationSidebarProps {
  currentConversationId?: string
  onNewConversation: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onToggleFavorite: (id: string) => void
}

export default function ConversationSidebar({
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onToggleFavorite
}: ConversationSidebarProps) {
  const {
    conversations,
    isLoading,
    error,
    updateConversation,
    deleteConversation,
    toggleFavorite,
    searchConversations
  } = useConversations()
  
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  // Filter conversations based on search and filter
  useEffect(() => {
    const filterConversations = async () => {
      if (searchQuery.trim()) {
        // Use search function for queries
        const filters: any = {}
        if (filterBy === 'favorites') filters.is_favorite = true
        if (filterBy === 'completed') filters.has_prompt = true
        
        const results = await searchConversations(searchQuery, filters)
        setFilteredConversations(results)
      } else {
        // Filter locally for no search query
        const filtered = conversations.filter(conv => {
          const matchesFilter = 
            filterBy === 'all' ? true :
            filterBy === 'favorites' ? conv.is_favorite :
            filterBy === 'completed' ? conv.has_prompt :
            filterBy === 'recent' ? new Date(conv.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : true
          
          return matchesFilter && conv.status === 'active'
        })
        setFilteredConversations(filtered)
      }
    }

    filterConversations()
  }, [conversations, searchQuery, filterBy, searchConversations])


  const handleEditTitle = async (id: string, newTitle: string) => {
    if (newTitle.trim()) {
      await updateConversation(id, { title: newTitle.trim() })
    }
    setEditingId(null)
    setEditTitle('')
  }

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await toggleFavorite(id)
    onToggleFavorite(id)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this conversation?')) {
      const success = await deleteConversation(id)
      if (success) {
        onDeleteConversation(id)
      }
    }
    setActiveDropdown(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <button
            onClick={onNewConversation}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="New conversation"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Filter */}
        <div className="flex space-x-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'recent', label: 'Recent' },
            { key: 'favorites', label: 'Favorites' },
            { key: 'completed', label: 'Complete' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterBy(key)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filterBy === key
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3 p-3 rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="p-2 space-y-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conversation.id
                    ? 'bg-purple-50 border border-purple-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    conversation.has_prompt
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200'
                  }`}>
                    {conversation.has_prompt ? (
                      <Sparkles className="w-5 h-5 text-green-600" />
                    ) : (
                      <MessageCircle className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {editingId === conversation.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleEditTitle(conversation.id, editTitle)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditTitle(conversation.id, editTitle)
                          } else if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditTitle('')
                          }
                        }}
                        className="w-full px-2 py-1 text-sm font-medium border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="font-medium text-gray-900 truncate text-sm mb-1">
                        {conversation.title}
                      </h3>
                    )}
                    
                    <p className="text-xs text-gray-600 truncate mb-2">
                      {conversation.preview}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(conversation.updated_at)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {conversation.has_prompt && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Complete
                          </span>
                        )}
                        <span>{conversation.message_count}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleToggleFavorite(conversation.id, e)}
                      className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                        conversation.is_favorite ? 'text-yellow-500' : 'text-gray-400'
                      }`}
                      title={conversation.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 ${conversation.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveDropdown(activeDropdown === conversation.id ? null : conversation.id)
                        }}
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {activeDropdown === conversation.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingId(conversation.id)
                              setEditTitle(conversation.title)
                              setActiveDropdown(null)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename
                          </button>
                          <button
                            onClick={(e) => handleDelete(conversation.id, e)}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
            <Archive className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">
              {searchQuery || filterBy !== 'all' ? 'No conversations found' : 'No conversations yet'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {searchQuery || filterBy !== 'all' 
                ? 'Try adjusting your search or filter' 
                : 'Start your first conversation to begin creating prompts'}
            </p>
            {!searchQuery && filterBy === 'all' && (
              <button 
                onClick={onNewConversation}
                className="btn-primary text-sm px-4 py-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer with usage info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 mb-2">
          <div className="flex items-center justify-between">
            <span>This month</span>
            <span>3/5 prompts used</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>
        <Link 
          href="/pricing" 
          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
        >
          Upgrade to Pro →
        </Link>
      </div>
    </div>
  )
}