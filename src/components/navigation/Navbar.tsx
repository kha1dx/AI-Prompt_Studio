'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, Menu, X, Settings, LogOut, User, History } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface NavbarProps {
  variant?: 'default' | 'app'
  showUserMenu?: boolean
}

export default function Navbar({ variant = 'default', showUserMenu = false }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const router = useRouter()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (variant === 'app') {
    return (
      <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Prompt Studio</span>
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/dashboard" 
              className="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
            >
              Dashboard
            </Link>
            <Link 
              href="/chat" 
              className="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
            >
              Chat
            </Link>
            <Link 
              href="/history" 
              className="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10 flex items-center"
            >
              <History className="w-4 h-4 mr-2" />
              History
            </Link>
          </div>

          {/* User Menu */}
          {showUserMenu && user && (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-300 hidden md:block">
                  {user.email?.split('@')[0]}
                </span>
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-700">
                    <p className="text-sm font-medium text-white">{user.email}</p>
                    <p className="text-xs text-gray-400">Free Plan</p>
                  </div>
                  
                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-slate-700"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </Link>
                  
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-slate-700"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-gray-300" />
            ) : (
              <Menu className="w-5 h-5 text-gray-300" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-slate-700">
            <div className="space-y-2 pt-4">
              <Link 
                href="/dashboard" 
                className="block px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/chat" 
                className="block px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                Chat
              </Link>
              <Link 
                href="/history" 
                className="block px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                History
              </Link>
              
              {user && (
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <Link 
                    href="/settings" 
                    className="block px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button 
                    onClick={() => {
                      handleSignOut()
                      setIsMenuOpen(false)
                    }}
                    className="block w-full text-left px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    )
  }

  // Default landing page navbar
  return (
    <nav className="relative z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Prompt Studio</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link href="#features" className="text-gray-300 hover:text-white transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="#testimonials" className="text-gray-300 hover:text-white transition-colors">
            Testimonials
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link 
            href="/login" 
            className="text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/signup"
            className="btn-primary"
          >
            Try for Free
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/10">
          <div className="px-6 py-4 space-y-4">
            <Link 
              href="#features" 
              className="block text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link 
              href="#pricing" 
              className="block text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              href="/login" 
              className="block text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Sign In
            </Link>
            <Link 
              href="/signup"
              className="block btn-primary text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              Try for Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}