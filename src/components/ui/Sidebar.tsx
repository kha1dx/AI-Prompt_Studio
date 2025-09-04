'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { Button } from '../common/Button'
import { 
  PlusIcon, 
  ChatBubbleLeftIcon, 
  PencilSquareIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Conversation {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  messageCount: number
}

interface SidebarProps {
  conversations: Conversation[]
  currentConversationId?: string
  onConversationSelect: (id: string) => void
  onNewConversation: () => void
  onEditConversation: (id: string, title: string) => void
  onDeleteConversation: (id: string) => void
  className?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({
  conversations,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onEditConversation,
  onDeleteConversation,
  className,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEditStart = (conversation: Conversation) => {
    setEditingId(conversation.id)
    setEditTitle(conversation.title)
  }

  const handleEditSave = () => {
    if (editingId && editTitle.trim()) {
      onEditConversation(editingId, editTitle.trim())
      setEditingId(null)
      setEditTitle('')
    }
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInDays < 7) return `${diffInDays}d`
    return date.toLocaleDateString()
  }

  return (
    <motion.div
      animate={{ width: collapsed ? 64 : 320 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'bg-white border-r border-gray-200 flex flex-col h-full',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewConversation}
              className="h-8 w-8 p-0"
              title="New conversation"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 p-0"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <Bars3Icon className="h-4 w-4" />
                ) : (
                  <XMarkIcon className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="mt-3 relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {collapsed ? (
          /* Collapsed view - just icons */
          <div className="p-2 space-y-2">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={cn(
                  'w-full h-10 rounded-lg flex items-center justify-center transition-colors',
                  currentConversationId === conversation.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-100 text-gray-600'
                )}
                title={conversation.title}
              >
                <ChatBubbleLeftIcon className="h-5 w-5" />
              </button>
            ))}
          </div>
        ) : (
          /* Expanded view */
          <div className="p-2 space-y-1">
            <AnimatePresence>
              {filteredConversations.map((conversation, index) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <div
                    className={cn(
                      'group relative p-3 rounded-lg border transition-colors cursor-pointer',
                      currentConversationId === conversation.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                    )}
                    onClick={() => onConversationSelect(conversation.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {editingId === conversation.id ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleEditSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave()
                              if (e.key === 'Escape') handleEditCancel()
                            }}
                            className="w-full px-2 py-1 text-sm font-medium border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {conversation.title}
                          </h3>
                        )}
                        <p className="mt-1 text-xs text-gray-500 truncate">
                          {conversation.lastMessage}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(conversation.timestamp)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {conversation.messageCount} messages
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditStart(conversation)
                            }}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                            title="Edit title"
                          >
                            <PencilSquareIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Delete this conversation?')) {
                                onDeleteConversation(conversation.id)
                              }
                            }}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                            title="Delete conversation"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredConversations.length === 0 && (
              <div className="text-center py-8">
                <ChatBubbleLeftIcon className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
                {!searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNewConversation}
                    className="mt-3"
                  >
                    Start your first conversation
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}