"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../src/components/navigation/Navbar";
import ConversationSidebar from "../../src/components/chat/ConversationSidebar";
import ConversationChatInterface from "../../src/components/chat/ConversationChatInterface";
import EnhancedPromptSidebar from "../../src/components/chat/EnhancedPromptSidebar";
import { useAuth } from "../../src/contexts/AuthContext";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";

function ChatPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >(undefined);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [sidebarKey, setSidebarKey] = useState(0); // Force sidebar refresh
  const [templateText, setTemplateText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isMobileConversationOpen, setIsMobileConversationOpen] = useState<boolean>(false);
  const [isMobilePromptOpen, setIsMobilePromptOpen] = useState<boolean>(false);

  // All hooks must be called before any conditional returns
  const handleNewConversation = useCallback(() => {
    // Start a new conversation
    setCurrentConversationId(undefined);
    setGeneratedPrompt("");
    // Refresh sidebar to show updated conversation list
    setSidebarKey((prev) => prev + 1);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    // Load selected conversation
    setCurrentConversationId(id);
    setGeneratedPrompt(""); // Clear any existing generated prompt
  }, []);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      // Handle conversation deletion
      console.log("Deleting conversation:", id);
      // If this was the current conversation, reset
      if (currentConversationId === id) {
        setCurrentConversationId(undefined);
        setGeneratedPrompt("");
      }
      // Refresh sidebar
      setSidebarKey((prev) => prev + 1);
    },
    [currentConversationId]
  );

  const handleToggleFavorite = useCallback((id: string) => {
    // Handle favorite toggle - just refresh sidebar
    console.log("Toggling favorite for conversation:", id);
    setSidebarKey((prev) => prev + 1);
  }, []);

  const handleConversationCreate = useCallback((conversationId: string) => {
    // When a new conversation is created, switch to it and refresh sidebar
    setCurrentConversationId(conversationId);
    setSidebarKey((prev) => prev + 1);
  }, []);

  const handleConversationUpdate = useCallback(() => {
    // When conversation is updated (new messages), refresh sidebar
    setSidebarKey((prev) => prev + 1);
  }, []);

  const handleGeneratePrompt = useCallback(async () => {
    if (!currentConversationId) {
      console.error(
        "🚨 [chat] No conversation ID available for prompt generation"
      );
      return;
    }

    try {
      setIsGenerating(true); // Start loading
      console.log(
        "🔍 [chat] Generating prompt for conversation:",
        currentConversationId
      );

      // Generate prompt via API
      const response = await fetch("/api/ai/generate-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: currentConversationId,
        }),
      });

      console.log("🔍 [chat] Generate prompt response:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("🚨 [chat] Generate prompt error:", errorData);
        throw new Error(
          errorData.error || `Failed to generate prompt (${response.status})`
        );
      }

      const result = await response.json();
      console.log("✅ [chat] Prompt generated successfully");
      setGeneratedPrompt(result.prompt);

      // Refresh sidebar to show updated conversation status
      setSidebarKey((prev) => prev + 1);
    } catch (error: any) {
      console.error("🚨 [chat] Failed to generate prompt:", {
        error: error.message,
        conversationId: currentConversationId,
        stack: error.stack,
      });
      // Handle error appropriately
    } finally {
      setIsGenerating(false); // Stop loading
    }
  }, [currentConversationId]);

  const handleTemplateSelect = useCallback((template: string) => {
    setTemplateText(template);
  }, []);

  const toggleMobileConversation = useCallback(() => {
    setIsMobileConversationOpen(!isMobileConversationOpen);
    setIsMobilePromptOpen(false); // Close prompt sidebar when opening conversation
  }, [isMobileConversationOpen]);

  const toggleMobilePrompt = useCallback(() => {
    setIsMobilePromptOpen(!isMobilePromptOpen);
    setIsMobileConversationOpen(false); // Close conversation sidebar when opening prompt
  }, [isMobilePromptOpen]);

  // Now handle conditional rendering after all hooks are called
  // Show authentication prompt if not authenticated
  if (!loading && !user) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Welcome to Prompt Studio
            </h2>
            <p className="text-gray-300 mb-8">
              Sign in to start creating optimized AI prompts and manage your
              conversations.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => router.push("/login")}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
              >
                Sign In
              </button>

              <button
                onClick={() => router.push("/signup")}
                className="w-full px-6 py-3 bg-slate-700/50 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all duration-300 border border-slate-600"
              >
                Create Account
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-gray-400">or</span>
                </div>
              </div>

              <button
                onClick={() => router.push("/")}
                className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors duration-300 text-sm"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Prompt Studio...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <ErrorBoundary>
          <Navbar variant="app" showUserMenu={true} />
        </ErrorBoundary>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Mobile Navigation Bar */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700/50 px-4 py-2 flex items-center justify-between md:hidden">
            <button
              onClick={toggleMobileConversation}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isMobileConversationOpen 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chats
            </button>
            <button
              onClick={toggleMobilePrompt}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isMobilePromptOpen 
                  ? 'bg-green-600 text-white' 
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Prompt
            </button>
          </div>

          {/* Left Sidebar - Conversations */}
          <div className={`${
            // Desktop: always visible, Mobile: overlay when open
            'md:block md:relative md:w-80' +
            (isMobileConversationOpen 
              ? ' fixed inset-0 z-30 bg-slate-900/95 backdrop-blur-sm' 
              : ' hidden'
            )
          }`}>
            <ErrorBoundary>
              <ConversationSidebar
                key={sidebarKey}
                currentConversationId={currentConversationId}
                onNewConversation={handleNewConversation}
                onSelectConversation={handleSelectConversation}
                onDeleteConversation={handleDeleteConversation}
                onToggleFavorite={handleToggleFavorite}
              />
            </ErrorBoundary>
            {/* Mobile overlay close button */}
            {isMobileConversationOpen && (
              <button
                onClick={() => setIsMobileConversationOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-700/50 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-700 transition-colors md:hidden"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 mt-14 md:mt-0">
            <ErrorBoundary>
              <ConversationChatInterface
                conversationId={currentConversationId}
                onConversationCreate={handleConversationCreate}
                onConversationUpdate={handleConversationUpdate}
                templateText={templateText}
                onTemplateUsed={() => setTemplateText("")}
              />
            </ErrorBoundary>
          </div>

          {/* Right Sidebar - Prompt Generation */}
          <div className={`${
            // Desktop: always visible, Mobile: overlay when open
            'md:block md:relative md:w-80' +
            (isMobilePromptOpen 
              ? ' fixed inset-0 z-30 bg-slate-900/95 backdrop-blur-sm' 
              : ' hidden'
            )
          }`}>
            <ErrorBoundary>
              <EnhancedPromptSidebar
                conversationId={currentConversationId}
                generatedPrompt={generatedPrompt}
                onGeneratePrompt={handleGeneratePrompt}
                canGeneratePrompt={!!currentConversationId}
                isGenerating={isGenerating}
                onTemplateSelect={handleTemplateSelect}
              />
            </ErrorBoundary>
            {/* Mobile overlay close button */}
            {isMobilePromptOpen && (
              <button
                onClick={() => setIsMobilePromptOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-700/50 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-700 transition-colors md:hidden"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function ChatPage() {
  return <ChatPageContent />;
}
