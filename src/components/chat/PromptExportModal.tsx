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
    <div className=\"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4\">
      <div className=\"bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col\">
        {/* Header */}
        <div className=\"flex items-center justify-between p-6 border-b\">
          <div>
            <h2 className=\"text-xl font-semibold text-gray-900\">Export Generated Content</h2>
            <p className=\"text-sm text-gray-600 mt-1\">
              Save, copy, or share your generated prompt and conversation
            </p>
          </div>
          <button
            onClick={onClose}
            className=\"p-2 text-gray-400 hover:text-gray-600 transition-colors\"
          >
            <X className=\"w-5 h-5\" />
          </button>
        </div>

        {/* Tabs */}
        <div className=\"flex border-b px-6\">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'prompt'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Generated Prompt
          </button>
          <button
            onClick={() => setActiveTab('conversation')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'conversation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Full Conversation
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            JSON Export
          </button>
        </div>

        {/* Content */}
        <div className=\"flex-1 p-6 overflow-hidden\">
          {activeTab === 'prompt' && (
            <div className=\"h-full flex flex-col\">
              <div className=\"flex items-center justify-between mb-4\">
                <h3 className=\"text-lg font-medium text-gray-900\">Generated Prompt</h3>
                <div className=\"flex space-x-2\">
                  <button
                    onClick={() => copyToClipboard(prompt, 'prompt')}
                    className=\"flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm\"
                  >
                    <Copy className=\"w-4 h-4\" />
                    <span>{copySuccess === 'prompt' ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile(prompt, 'generated-prompt.txt', 'text/plain')}
                    className=\"flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm\"
                  >
                    <Download className=\"w-4 h-4\" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={sharePrompt}
                    className=\"flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm\"
                  >
                    <Share2 className=\"w-4 h-4\" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
              <div className=\"flex-1 overflow-y-auto\">
                <pre className=\"whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded border text-gray-800 h-full\">
                  {prompt}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'conversation' && (
            <div className=\"h-full flex flex-col\">
              <div className=\"flex items-center justify-between mb-4\">
                <h3 className=\"text-lg font-medium text-gray-900\">Conversation History</h3>
                <div className=\"flex space-x-2\">
                  <button
                    onClick={() => copyToClipboard(getConversationText(), 'conversation')}
                    className=\"flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm\"
                  >
                    <Copy className=\"w-4 h-4\" />
                    <span>{copySuccess === 'conversation' ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile(getConversationText(), 'conversation-history.txt', 'text/plain')}
                    className=\"flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm\"
                  >
                    <Download className=\"w-4 h-4\" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <div className=\"flex-1 overflow-y-auto\">
                <pre className=\"whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border text-gray-800 h-full\">
                  {getConversationText()}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className=\"h-full flex flex-col\">
              <div className=\"flex items-center justify-between mb-4\">
                <h3 className=\"text-lg font-medium text-gray-900\">JSON Export</h3>
                <div className=\"flex space-x-2\">
                  <button
                    onClick={() => copyToClipboard(getConversationJSON(), 'json')}
                    className=\"flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm\"
                  >
                    <Copy className=\"w-4 h-4\" />
                    <span>{copySuccess === 'json' ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile(getConversationJSON(), 'prompt-session.json', 'application/json')}
                    className=\"flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm\"
                  >
                    <Download className=\"w-4 h-4\" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <div className=\"flex-1 overflow-y-auto\">
                <pre className=\"text-sm font-mono bg-gray-50 p-4 rounded border text-gray-800 h-full\">
                  {getConversationJSON()}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className=\"flex justify-end px-6 py-4 border-t bg-gray-50\">
          <button
            onClick={onClose}
            className=\"px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors\"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}