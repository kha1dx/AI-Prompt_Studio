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
  Star
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
    <div className={`w-80 bg-white border-l border-gray-200 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Prompt Generator</h2>
        </div>
        <p className="text-sm text-gray-600">
          Generate your optimized prompt once we've gathered enough information
        </p>
      </div>

      {/* Generate Prompt Section */}
      <div className="p-4 border-b border-gray-200">
        {generatedPrompt ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-700">Prompt Generated</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => copyToClipboard(generatedPrompt)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy prompt"
                >
                  {copiedPrompt ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => downloadPrompt(generatedPrompt)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Download prompt"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {generatedPrompt}
              </pre>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(generatedPrompt)}
                className={`flex-1 btn-primary text-sm ${copiedPrompt ? 'bg-green-600' : ''}`}
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
                className="btn-secondary text-sm"
                title="Generate new version"
              >
                Regenerate
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={onGeneratePrompt}
              disabled={!canGeneratePrompt || isGenerating}
              className={`w-full btn-primary ${
                !canGeneratePrompt || isGenerating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="loading-spinner mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Perfect Prompt
                </>
              )}
            </button>
            
            {!canGeneratePrompt && (
              <p className="text-xs text-gray-500 mt-2">
                Continue the conversation to gather more details
              </p>
            )}
          </div>
        )}
      </div>

      {/* Content Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Requirements Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('requirements')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-gray-900">Requirements Checklist</span>
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
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    requirement.completed
                      ? 'bg-green-100 border-green-500'
                      : 'bg-gray-100 border-gray-300'
                  } border-2`}>
                    {requirement.completed && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    requirement.completed ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {requirement.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pro Tips Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('tips')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-gray-900">Pro Tips</span>
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
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <tip.icon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm mb-1">
                      {tip.title}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {tip.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Templates Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('templates')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900">Quick Templates</span>
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
                  className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-colors text-left group"
                >
                  <div className={`w-8 h-8 bg-gradient-to-r ${template.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <template.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {template.title}
                    </h4>
                    <p className="text-xs text-gray-600 truncate">
                      {template.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-800">Pro Tip</span>
        </div>
        <p className="text-xs text-gray-600">
          The more specific you are about your goals, audience, and requirements, 
          the better your generated prompt will be!
        </p>
      </div>
    </div>
  )
}