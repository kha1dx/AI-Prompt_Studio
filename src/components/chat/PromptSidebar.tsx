'use client'

import { useState } from 'react'
import { 
  Download, 
  Copy, 
  Sparkles, 
  CheckCircle, 
  Clock,
  FileText,
  Settings,
  Lightbulb,
  Target,
  Users,
  MessageSquare,
  Palette,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Star,
  Zap
} from 'lucide-react'

interface PromptSidebarProps {
  conversationId?: string
  generatedPrompt?: string
  onGeneratePrompt: () => void
  canGeneratePrompt: boolean
  isGenerating: boolean
  className?: string
}

export default function PromptSidebar({
  conversationId,
  generatedPrompt,
  onGeneratePrompt,
  canGeneratePrompt,
  isGenerating,
  className = ''
}: PromptSidebarProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    requirements: true,
    tips: false,
    templates: false
  })

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const downloadPrompt = (prompt: string) => {
    const blob = new Blob([prompt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const promptTemplates = [
    {
      id: 'social-media',
      title: 'Social Media Content',
      description: 'Create engaging posts for social platforms',
      icon: MessageSquare,
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'email-marketing',
      title: 'Email Marketing',
      description: 'Write compelling email campaigns',
      icon: FileText,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'blog-content',
      title: 'Blog Content',
      description: 'Generate SEO-optimized blog posts',
      icon: Lightbulb,
      color: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'creative-writing',
      title: 'Creative Writing',
      description: 'Stories, poems, and creative content',
      icon: Palette,
      color: 'from-purple-500 to-indigo-500'
    }
  ]

  const promptTips = [
    {
      icon: Target,
      title: 'Be Specific',
      description: 'Include clear objectives and desired outcomes'
    },
    {
      icon: Users,
      title: 'Define Audience',
      description: 'Specify who the content is for'
    },
    {
      icon: Palette,
      title: 'Set Tone & Style',
      description: 'Describe the voice and writing style needed'
    },
    {
      icon: Settings,
      title: 'Add Constraints',
      description: 'Include word limits, format requirements, etc.'
    }
  ]

  return (
    <div className={`w-80 bg-slate-800/80 backdrop-blur-sm border-l border-slate-700/50 flex flex-col h-full ${className}`}>
      {/* Header with enhanced styling */}
      <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Prompt Generator</h2>
            <p className="text-xs text-gray-300">
              AI-powered prompt optimization
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          Generate your optimized prompt once we've gathered enough information through our conversation
        </p>
      </div>

      {/* Generate Prompt Section - Enhanced */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
        {generatedPrompt ? (
          <div className="space-y-4">
            {/* Success Header */}
            <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-xl border border-green-800/50 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-green-300">Prompt Generated Successfully</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => copyToClipboard(generatedPrompt)}
                  className="p-2 text-green-400 hover:text-green-200 hover:bg-green-900/30 rounded-lg transition-all duration-300 hover:scale-110"
                  title="Copy prompt"
                >
                  {copiedPrompt ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => downloadPrompt(generatedPrompt)}
                  className="p-2 text-green-400 hover:text-green-200 hover:bg-green-900/30 rounded-lg transition-all duration-300 hover:scale-110"
                  title="Download prompt"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Enhanced Prompt Output Display */}
            <div className="prompt-output max-h-80 overflow-y-auto">
              <div className="sticky top-0 bg-slate-800/90 backdrop-blur-sm px-3 py-2 border-b border-slate-600/50 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                  Optimized Prompt
                </span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Ready</span>
                </div>
              </div>
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed p-4 bg-slate-900/50 rounded-lg">
                {generatedPrompt}
              </pre>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(generatedPrompt)}
                className={`flex-1 btn-primary text-sm transition-all duration-300 ${
                  copiedPrompt ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
              >
                {copiedPrompt ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Prompt
                  </>
                )}
              </button>
              <button
                onClick={onGeneratePrompt}
                disabled={isGenerating}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                title="Generate new version"
              >
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={onGeneratePrompt}
              disabled={!canGeneratePrompt || isGenerating}
              className={`w-full btn-primary transition-all duration-300 ${
                !canGeneratePrompt || isGenerating ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105 shadow-lg hover:shadow-xl'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="loading-spinner mr-2" />
                  Generating Perfect Prompt...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Perfect Prompt
                </>
              )}
            </button>
            
            {!canGeneratePrompt && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    Continue the conversation to gather more details
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Sections - Enhanced */}
      <div className="flex-1 overflow-y-auto">
        {/* Requirements Section */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection('requirements')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Requirements Checklist</span>
            </div>
            {expandedSections.requirements ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.requirements && (
            <div className="px-4 pb-4 space-y-3">
              {[
                { label: 'Objective defined', completed: canGeneratePrompt },
                { label: 'Context provided', completed: canGeneratePrompt },
                { label: 'Audience specified', completed: false },
                { label: 'Tone & style set', completed: false },
                { label: 'Output format defined', completed: false }
              ].map((requirement, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                    requirement.completed
                      ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-500'
                      : 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600'
                  }`}>
                    {requirement.completed && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    requirement.completed 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {requirement.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pro Tips Section */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection('tips')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Pro Tips</span>
            </div>
            {expandedSections.tips ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.tips && (
            <div className="px-4 pb-4 space-y-4">
              {promptTips.map((tip, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700/50 dark:hover:to-gray-600/50 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <tip.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                      {tip.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {tip.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Templates Section */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection('templates')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Quick Templates</span>
            </div>
            {expandedSections.templates ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.templates && (
            <div className="px-4 pb-4 space-y-3">
              {promptTemplates.map((template) => (
                <button
                  key={template.id}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-200 dark:hover:border-purple-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 dark:hover:from-purple-900/20 dark:hover:to-blue-900/20 transition-all duration-300 text-left group transform hover:scale-[1.02]"
                >
                  <div className={`w-10 h-10 bg-gradient-to-r ${template.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow`}>
                    <template.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                      {template.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {template.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className="p-4 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
            <Star className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Pro Tip</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              The more specific you are about your goals, audience, and requirements, 
              the better your generated prompt will be!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}