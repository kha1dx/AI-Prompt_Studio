'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  MessageCircle, 
  History, 
  TrendingUp, 
  Plus, 
  Sparkles, 
  Clock,
  Archive,
  Star,
  Search,
  Filter,
  Calendar,
  BarChart3,
  CreditCard,
  ArrowUpCircle
} from 'lucide-react'
import Navbar from '../../src/components/navigation/Navbar'
import { useAuth } from '../../src/contexts/AuthContext'
import UsageIndicator from '../../components/UsageIndicator'
import { useSubscription } from '../../hooks/useSubscription'

interface ConversationPreview {
  id: string
  title: string
  preview: string
  created_at: string
  message_count: number
  has_prompt: boolean
  is_favorite: boolean
}

export default function Dashboard() {
  const { user } = useAuth()
  const { subscriptionData, getUsagePercentage, getRemainingPrompts } = useSubscription()
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState('all') // all, favorites, completed

  // Mock data for now - will be replaced with API calls
  useEffect(() => {
    const mockConversations: ConversationPreview[] = [
      {
        id: '1',
        title: 'Social Media Campaign for SaaS Product',
        preview: 'I want to create engaging social media content for my new productivity app...',
        created_at: '2024-01-15T10:30:00Z',
        message_count: 8,
        has_prompt: true,
        is_favorite: true
      },
      {
        id: '2',
        title: 'Email Newsletter Template',
        preview: 'Help me write a compelling email newsletter for my subscribers...',
        created_at: '2024-01-14T16:45:00Z',
        message_count: 5,
        has_prompt: false,
        is_favorite: false
      },
      {
        id: '3',
        title: 'Blog Post About AI Trends',
        preview: 'I need to write a comprehensive blog post about the latest AI trends...',
        created_at: '2024-01-12T09:15:00Z',
        message_count: 12,
        has_prompt: true,
        is_favorite: true
      }
    ]
    
    setTimeout(() => {
      setConversations(mockConversations)
      setIsLoading(false)
    }, 1000)
  }, [])

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = 
      filterBy === 'all' ? true :
      filterBy === 'favorites' ? conv.is_favorite :
      filterBy === 'completed' ? conv.has_prompt : true
    
    return matchesSearch && matchesFilter
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="app" showUserMenu={true} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 animate-fade-in-down">
            <div>
              <h1 className="heading-lg text-gray-900">
                Welcome back{user?.email && `, ${user.email.split('@')[0]}`}!
              </h1>
              <p className="body-md text-gray-600 mt-2">
                Ready to create some amazing prompts today?
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link
                href="/billing"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Billing
              </Link>
              
              <Link
                href="/chat"
                className="btn-primary group"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Conversation
              </Link>
            </div>
          </div>
          
          {/* Usage Indicator */}
          <div className="mb-6 animate-fade-in-down animate-delay-100">
            <UsageIndicator />
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 stagger-children animate animate-delay-200">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">24</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Prompts Generated</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">18</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {subscriptionData ? `${subscriptionData.monthly_prompts_used}/${subscriptionData.monthly_limit === 999999 ? '∞' : subscriptionData.monthly_limit}` : '0/5'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {subscriptionData?.subscription_tier || 'Free'} Plan
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              {subscriptionData && subscriptionData.subscription_tier === 'free' && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href="/billing"
                    className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    <ArrowUpCircle className="w-4 h-4 mr-1" />
                    Upgrade Plan
                  </Link>
                </div>
              )}
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">94%</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8 stagger-children animate animate-delay-500">
          <Link href="/chat" className="card hover-lift hover-glow group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Start New Chat</h3>
                <p className="text-sm text-gray-600">Begin creating your next perfect prompt</p>
              </div>
            </div>
          </Link>
          
          <Link href="/chat?template=social" className="card hover-lift hover-glow group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Use Template</h3>
                <p className="text-sm text-gray-600">Start with proven prompt templates</p>
              </div>
            </div>
          </Link>
          
          <Link href="/history" className="card hover-lift hover-glow group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Browse History</h3>
                <p className="text-sm text-gray-600">View and reuse past conversations</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Conversations */}
        <div className="card animate-fade-in-up animate-delay-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Conversations</h2>
            <Link href="/history" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
              View All
            </Link>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-primary pl-10"
              />
            </div>
            
            <div className="relative">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="input-primary pr-8 appearance-none cursor-pointer"
              >
                <option value="all">All Conversations</option>
                <option value="favorites">Favorites</option>
                <option value="completed">With Prompts</option>
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Conversations List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="w-20 h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length > 0 ? (
            <div className="space-y-3">
              {filteredConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/chat/${conversation.id}`}
                  className="block p-4 rounded-lg border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg flex items-center justify-center group-hover:from-purple-200 group-hover:to-blue-200 transition-colors">
                      {conversation.has_prompt ? (
                        <Sparkles className="w-6 h-6 text-purple-600" />
                      ) : (
                        <MessageCircle className="w-6 h-6 text-purple-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.title}
                        </h3>
                        {conversation.is_favorite && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                        {conversation.has_prompt && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Complete
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.preview}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(conversation.created_at)}</span>
                      </div>
                      <span>{conversation.message_count} messages</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterBy !== 'all' ? 'No conversations found' : 'No conversations yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterBy !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Start your first conversation to begin creating amazing prompts'}
              </p>
              <Link href="/chat" className="btn-primary">
                <Plus className="w-5 h-5 mr-2" />
                Start First Conversation
              </Link>
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="mt-8 card-gradient p-6">
          <h3 className="text-lg font-semibold text-white mb-4">💡 Pro Tips</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-white">
              <h4 className="font-medium mb-2">Be Specific About Your Goals</h4>
              <p className="text-sm text-gray-200">
                The more details you provide about your objective, the better your final prompt will be.
              </p>
            </div>
            <div className="text-white">
              <h4 className="font-medium mb-2">Save Your Best Prompts</h4>
              <p className="text-sm text-gray-200">
                Mark conversations as favorites to quickly find your most successful prompts later.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}