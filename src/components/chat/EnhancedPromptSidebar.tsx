'use client'

import { useState, useEffect } from 'react'
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
  Edit3,
  Save,
  RotateCcw,
  Bookmark,
  Share
} from 'lucide-react'

interface PromptVersion {
  id: string
  content: string
  timestamp: Date
  version: number
}

interface EnhancedPromptSidebarProps {
  conversationId?: string
  generatedPrompt?: string
  onGeneratePrompt: () => void
  canGeneratePrompt: boolean
  isGenerating: boolean
  className?: string
  onTemplateSelect?: (template: string) => void
}

export default function EnhancedPromptSidebar({
  conversationId,
  generatedPrompt,
  onGeneratePrompt,
  canGeneratePrompt,
  isGenerating,
  className = '',
  onTemplateSelect
}: EnhancedPromptSidebarProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState('')
  const [savedPrompts, setSavedPrompts] = useState<PromptVersion[]>([])
  const [expandedSections, setExpandedSections] = useState({
    output: true,
    versions: false,
    requirements: true,
    tips: false,
    templates: false
  })

  // Initialize edited prompt when generated prompt changes
  useEffect(() => {
    if (generatedPrompt) {
      setEditedPrompt(generatedPrompt)
    }
  }, [generatedPrompt])

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

  const savePromptVersion = () => {
    if (!editedPrompt.trim()) return
    
    const newVersion: PromptVersion = {
      id: crypto.randomUUID(),
      content: editedPrompt,
      timestamp: new Date(),
      version: savedPrompts.length + 1
    }
    
    setSavedPrompts(prev => [newVersion, ...prev])
    setIsEditing(false)
  }

  const loadPromptVersion = (version: PromptVersion) => {
    setEditedPrompt(version.content)
    setIsEditing(false)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleTemplateSelect = (template: any) => {
    if (onTemplateSelect) {
      onTemplateSelect(template.template)
    }
  }

  const promptTemplates = [
    {
      id: 'social-media',
      title: 'Social Media Content',
      description: 'Create engaging posts for social platforms',
      icon: MessageSquare,
      color: 'from-pink-500 to-rose-500',
      template: `I need to create engaging social media content for my brand. Please help me craft posts that will resonate with my audience and drive engagement.

My brand: [Describe your brand/business]
Target audience: [Who are you trying to reach?]
Platform: [Instagram/LinkedIn/Twitter/etc.]
Content goal: [Brand awareness/sales/engagement/etc.]
Tone: [Professional/casual/playful/etc.]

Please create compelling social media content that includes hooks, value, and clear calls-to-action.`
    },
    {
      id: 'email-marketing', 
      title: 'Email Marketing',
      description: 'Write compelling email campaigns',
      icon: FileText,
      color: 'from-blue-500 to-indigo-500',
      template: `I want to create an effective email marketing campaign that converts subscribers into customers.

Campaign type: [Welcome series/product launch/newsletter/promotional/etc.]
Target audience: [Describe your email subscribers]
Product/service: [What are you promoting?]
Main goal: [Increase sales/build relationships/share news/etc.]
Brand voice: [Professional/friendly/authoritative/etc.]

Please create email content with compelling subject lines, engaging body copy, and strong calls-to-action that drive results.`
    },
    {
      id: 'blog-content',
      title: 'Blog Content',
      description: 'Generate SEO-optimized blog posts',
      icon: Lightbulb,
      color: 'from-emerald-500 to-teal-500',
      template: `I need to create valuable blog content that ranks well in search engines and provides real value to my readers.

Topic/keyword: [Main topic or target keyword]
Target audience: [Who will read this content?]
Content goal: [Educate/inspire/solve problems/etc.]
Word count: [How long should it be?]
Tone: [Expert/conversational/beginner-friendly/etc.]

Please create comprehensive blog content with SEO optimization, clear structure, and actionable insights that readers will find valuable.`
    },
    {
      id: 'creative-writing',
      title: 'Creative Writing',
      description: 'Stories, poems, and creative content',
      icon: Palette,
      color: 'from-purple-500 to-indigo-500',
      template: `I want to create compelling creative content that engages readers and tells a powerful story.

Content type: [Short story/poem/creative copy/script/etc.]
Theme/message: [What's the main theme or message?]
Audience: [Who is this for?]
Style: [Dramatic/humorous/inspirational/etc.]
Length: [Word count or duration]

Please create engaging creative content that captures attention and evokes emotion while delivering the intended message.`
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
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Prompt Studio</h2>
            <p className="text-xs text-gray-300">
              AI-powered prompt optimization
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          Generate, edit, and manage your optimized prompts with version control and enhanced features
        </p>
      </div>

      {/* Generate Prompt Section */}
      <div className="p-4 border-b border-slate-700/50">
        {generatedPrompt || editedPrompt ? (
          <div className="space-y-4">
            {/* Prompt Output Section */}
            <div>
              <button
                onClick={() => toggleSection('output')}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-700/30 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-green-300">Generated Prompt</span>
                </div>
                {expandedSections.output ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              {expandedSections.output && (
                <div className="mt-3 space-y-3">
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center px-3 py-1.5 bg-blue-600/20 text-blue-300 rounded-lg text-xs hover:bg-blue-600/30 transition-colors"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                      {isEditing && (
                        <>
                          <button
                            onClick={savePromptVersion}
                            className="flex items-center px-3 py-1.5 bg-green-600/20 text-green-300 rounded-lg text-xs hover:bg-green-600/30 transition-colors"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditedPrompt(generatedPrompt || '')
                              setIsEditing(false)
                            }}
                            className="flex items-center px-3 py-1.5 bg-gray-600/20 text-gray-300 rounded-lg text-xs hover:bg-gray-600/30 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => copyToClipboard(isEditing ? editedPrompt : (generatedPrompt || ''))}
                        className="p-2 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Copy prompt"
                      >
                        {copiedPrompt ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => downloadPrompt(isEditing ? editedPrompt : (generatedPrompt || ''))}
                        className="p-2 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Download prompt"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={savePromptVersion}
                        className="p-2 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Save version"
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Prompt Content */}
                  <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg border border-slate-600/50 max-h-80 overflow-hidden">
                    <div className="sticky top-0 bg-slate-800/90 px-3 py-2 border-b border-slate-600/50 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                        {isEditing ? 'Editing Prompt' : 'Optimized Prompt'}
                      </span>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${isEditing ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`}></div>
                        <span className={`text-xs ${isEditing ? 'text-blue-300' : 'text-green-400'}`}>
                          {isEditing ? 'Editing' : 'Ready'}
                        </span>
                      </div>
                    </div>
                    
                    {isEditing ? (
                      <textarea
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        className="w-full h-64 p-4 bg-transparent text-gray-200 text-sm font-mono leading-relaxed resize-none focus:outline-none border-none"
                        placeholder="Edit your prompt here..."
                      />
                    ) : (
                      <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed p-4 overflow-y-auto max-h-64">
                        {generatedPrompt}
                      </pre>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(isEditing ? editedPrompt : (generatedPrompt || ''))}
                      className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        copiedPrompt 
                          ? 'bg-green-600/20 text-green-300' 
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
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
                      className="px-4 py-2 bg-slate-700/50 text-gray-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
                      title="Generate new version"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Versions Section */}
            {savedPrompts.length > 0 && (
              <div className="border-t border-slate-700/50 pt-4">
                <button
                  onClick={() => toggleSection('versions')}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-700/30 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-white">Version History</span>
                    <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded-full">
                      {savedPrompts.length}
                    </span>
                  </div>
                  {expandedSections.versions ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.versions && (
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {savedPrompts.map((version) => (
                      <button
                        key={version.id}
                        onClick={() => loadPromptVersion(version)}
                        className="w-full text-left p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">
                            Version {version.version}
                          </span>
                          <span className="text-xs text-gray-400">
                            {version.timestamp.toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 truncate">
                          {version.content.slice(0, 100)}...
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={onGeneratePrompt}
              disabled={!canGeneratePrompt || isGenerating}
              className={`w-full px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                !canGeneratePrompt || isGenerating 
                  ? 'bg-slate-700/50 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-600'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-3"></div>
                  Generating Perfect Prompt...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 inline-block mr-3" />
                  Generate Perfect Prompt
                </>
              )}
            </button>
            
            {!canGeneratePrompt && (
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                Continue the conversation to gather more details for your optimized prompt
              </p>
            )}
          </div>
        )}
      </div>

      {/* Content Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Requirements Section */}
        <div className="border-b border-slate-700/50">
          <button
            onClick={() => toggleSection('requirements')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="font-medium text-white">Requirements Checklist</span>
            </div>
            {expandedSections.requirements ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
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
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                    requirement.completed
                      ? 'bg-green-500/20 border-green-400'
                      : 'bg-slate-700/50 border-slate-600'
                  }`}>
                    {requirement.completed && (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    requirement.completed ? 'text-green-300' : 'text-gray-400'
                  }`}>
                    {requirement.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pro Tips Section */}
        <div className="border-b border-slate-700/50">
          <button
            onClick={() => toggleSection('tips')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="font-medium text-white">Pro Tips</span>
            </div>
            {expandedSections.tips ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.tips && (
            <div className="px-4 pb-4 space-y-4">
              {promptTips.map((tip, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <tip.icon className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm mb-1">
                      {tip.title}
                    </h4>
                    <p className="text-xs text-gray-300">
                      {tip.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Templates Section */}
        <div className="border-b border-slate-700/50">
          <button
            onClick={() => toggleSection('templates')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-white">Quick Templates</span>
            </div>
            {expandedSections.templates ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.templates && (
            <div className="px-4 pb-4 space-y-3">
              {promptTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg border border-slate-600/50 hover:border-purple-500/50 hover:bg-purple-900/10 transition-all text-left group"
                >
                  <div className={`w-10 h-10 bg-gradient-to-r ${template.color} rounded-lg flex items-center justify-center flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity`}>
                    <template.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white text-sm truncate">
                      {template.title}
                    </h4>
                    <p className="text-xs text-gray-400 truncate">
                      {template.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-t border-slate-700/50">
        <div className="flex items-center space-x-2 mb-2">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white">Pro Tip</span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          The more specific you are about your goals, audience, and requirements, 
          the better your generated prompt will be! Use the editing feature to fine-tune results.
        </p>
      </div>
    </div>
  )
}