'use client'

import { useState } from 'react'
import { X, Copy, Download, Share2 } from 'lucide-react'

interface PromptExportModalProps {
  isOpen: boolean
  onClose: () => void
  prompt: string
  sessionId: string
  conversationHistory: any[]
}

export default function PromptExportModal({
  isOpen,
  onClose,
  prompt,
  sessionId,
  conversationHistory
}: PromptExportModalProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'conversation' | 'json'>('prompt')
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  if (!isOpen) return null

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(type)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getConversationText = () => {
    return conversationHistory
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n')
  }

  const getConversationJSON = () => {
    return JSON.stringify({
      sessionId,
      generatedAt: new Date().toISOString(),
      prompt,
      conversation: conversationHistory,
      metadata: {
        messageCount: conversationHistory.length,
        createdAt: conversationHistory[0]?.timestamp || new Date().toISOString()
      }
    }, null, 2)
  }

  const sharePrompt = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Generated AI Prompt',
          text: prompt,
        })
      } catch (err) {
        console.error('Error sharing:', err)
        copyToClipboard(prompt, 'share')
      }
    } else {
      copyToClipboard(prompt, 'share')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Export Generated Content</h2>
            <p className="text-sm text-gray-600 mt-1">
              Save, copy, or share your generated prompt and conversation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'prompt', label: 'Generated Prompt' },
            { id: 'conversation', label: 'Full Conversation' },
            { id: 'json', label: 'JSON Export' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {activeTab === 'prompt' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Generated Prompt</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(prompt, 'prompt')}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copySuccess === 'prompt' ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => downloadFile(prompt, 'prompt.txt', 'text/plain')}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </button>
                  <button
                    onClick={sharePrompt}
                    className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center"
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">{prompt}</pre>
              </div>
            </div>
          )}

          {activeTab === 'conversation' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Full Conversation</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(getConversationText(), 'conversation')}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copySuccess === 'conversation' ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => downloadFile(getConversationText(), 'conversation.txt', 'text/plain')}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">{getConversationText()}</pre>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">JSON Export</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(getConversationJSON(), 'json')}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copySuccess === 'json' ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => downloadFile(getConversationJSON(), 'export.json', 'application/json')}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto">
                <pre className="text-xs text-gray-800">{getConversationJSON()}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Session ID: <code className="bg-gray-200 px-2 py-1 rounded text-xs">{sessionId}</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}