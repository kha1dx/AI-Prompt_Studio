'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Sparkles, Zap, Star, Heart, Coffee, Rocket, Crown, Gem } from 'lucide-react'

interface ConfettiPiece {
  id: number
  x: number
  y: number
  color: string
  size: number
  speedX: number
  speedY: number
  rotation: number
  rotationSpeed: number
}

interface WhimsicalEffectsProps {
  trigger?: 'success' | 'error' | 'celebration' | 'achievement' | null
  onComplete?: () => void
}

export const WhimsicalEffects: React.FC<WhimsicalEffectsProps> = ({ 
  trigger, 
  onComplete 
}) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [isActive, setIsActive] = useState(false)

  const colors = [
    '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'
  ]

  const createConfettiPiece = useCallback((index: number): ConfettiPiece => ({
    id: index,
    x: Math.random() * window.innerWidth,
    y: -20,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 4,
    speedX: (Math.random() - 0.5) * 4,
    speedY: Math.random() * 3 + 2,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10
  }), [colors])

  const triggerConfetti = useCallback(() => {
    if (trigger === 'celebration' || trigger === 'success' || trigger === 'achievement') {
      const pieces = Array.from({ length: 50 }, (_, i) => createConfettiPiece(i))
      setConfetti(pieces)
      setIsActive(true)

      setTimeout(() => {
        setIsActive(false)
        setConfetti([])
        onComplete?.()
      }, 4000)
    }
  }, [trigger, createConfettiPiece, onComplete])

  useEffect(() => {
    if (trigger) {
      triggerConfetti()
    }
  }, [trigger, triggerConfetti])

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setConfetti(pieces => 
        pieces.map(piece => ({
          ...piece,
          x: piece.x + piece.speedX,
          y: piece.y + piece.speedY,
          rotation: piece.rotation + piece.rotationSpeed,
          speedY: piece.speedY + 0.1 // gravity
        })).filter(piece => piece.y < window.innerHeight + 100)
      )
    }, 16)

    return () => clearInterval(interval)
  }, [isActive])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="absolute w-2 h-2 opacity-90"
          style={{
            left: piece.x,
            top: piece.y,
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%'
          }}
        />
      ))}
    </div>
  )
}

// Floating Action Bubble Component
interface FloatingBubbleProps {
  children: React.ReactNode
  delay?: number
  className?: string
  onClick?: () => void
}

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({ 
  children, 
  delay = 0, 
  className = '',
  onClick 
}) => {
  return (
    <div 
      className={`
        relative cursor-pointer group
        transform transition-all duration-300 ease-out
        hover:scale-110 hover:-translate-y-2
        ${className}
      `}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <div className="
        absolute inset-0 
        bg-gradient-to-r from-purple-600/20 to-blue-600/20 
        rounded-full blur-xl 
        group-hover:blur-2xl
        transition-all duration-300
        animate-pulse
      " />
      <div className="
        relative
        glass-morphism
        rounded-full p-4
        border border-white/20
        group-hover:border-white/40
        transition-all duration-300
        hover:shadow-xl
      ">
        {children}
      </div>
    </div>
  )
}

// Thinking Animation Component
export const ThinkingAnimation: React.FC = () => {
  const [currentIcon, setCurrentIcon] = useState(0)
  const icons = [Brain, Lightbulb, Zap, Sparkles, Target]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIcon(prev => (prev + 1) % icons.length)
    }, 800)

    return () => clearInterval(interval)
  }, [icons.length])

  const CurrentIcon = icons[currentIcon]

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <CurrentIcon className="w-5 h-5 text-purple-400 animate-pulse" />
        <div className="absolute inset-0 animate-ping">
          <CurrentIcon className="w-5 h-5 text-purple-400 opacity-30" />
        </div>
      </div>
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  )
}

// Success Checkmark Animation
export const SuccessCheckmark: React.FC = () => {
  return (
    <div className="relative w-12 h-12">
      <svg 
        className="w-full h-full" 
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle 
          cx="26" 
          cy="26" 
          r="25" 
          fill="none" 
          stroke="#10b981" 
          strokeWidth="2"
          className="animate-scale-in-bounce"
        />
        <path 
          fill="none" 
          stroke="#10b981" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="m15 26 6 6 16-16"
          className="success-checkmark"
          strokeDasharray="100"
          strokeDashoffset="100"
        />
      </svg>
    </div>
  )
}

// Magical Cursor Trail Component
export const MagicalCursorTrail: React.FC = () => {
  const [trail, setTrail] = useState<Array<{ x: number; y: number; id: number }>>([])
  const [isMoving, setIsMoving] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleMouseMove = (e: MouseEvent) => {
      setIsMoving(true)
      clearTimeout(timeoutId)

      setTrail(prev => [
        ...prev.slice(-10), // Keep only last 10 points
        { x: e.clientX, y: e.clientY, id: Date.now() }
      ])

      timeoutId = setTimeout(() => {
        setIsMoving(false)
        setTrail([])
      }, 1000)
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(timeoutId)
    }
  }, [])

  if (!isMoving) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {trail.map((point, index) => (
        <div
          key={point.id}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{
            left: point.x - 4,
            top: point.y - 4,
            background: `hsl(${270 + index * 20}, 70%, 60%)`,
            opacity: 0.8 - (trail.length - index) * 0.08,
            transform: `scale(${0.5 + index * 0.05})`,
            animation: 'fadeOut 1s ease-out forwards'
          }}
        />
      ))}
    </div>
  )
}

// Loading Skeleton with Personality
interface LoadingSkeletonProps {
  variant?: 'message' | 'card' | 'button'
  className?: string
}

export const LoadingSkeletonWithPersonality: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'message',
  className = ''
}) => {
  const getSkeletonContent = () => {
    switch (variant) {
      case 'message':
        return (
          <div className="space-y-3">
            <div className="h-4 gradient-neural rounded animate-shimmer-rainbow w-3/4"></div>
            <div className="h-4 gradient-neural rounded animate-shimmer-rainbow w-1/2"></div>
            <div className="h-4 gradient-neural rounded animate-shimmer-rainbow w-2/3"></div>
          </div>
        )
      case 'card':
        return (
          <div className="space-y-4">
            <div className="h-8 gradient-neural rounded-lg animate-shimmer-rainbow w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 gradient-neural rounded animate-shimmer-rainbow"></div>
              <div className="h-4 gradient-neural rounded animate-shimmer-rainbow w-4/5"></div>
              <div className="h-4 gradient-neural rounded animate-shimmer-rainbow w-3/5"></div>
            </div>
            <div className="h-10 gradient-neural rounded-lg animate-shimmer-rainbow w-1/3"></div>
          </div>
        )
      case 'button':
        return (
          <div className="h-12 gradient-neural rounded-lg animate-shimmer-rainbow"></div>
        )
      default:
        return null
    }
  }

  return (
    <div className={`animate-breathe ${className}`}>
      {getSkeletonContent()}
    </div>
  )
}

// Achievement Badge Component
interface AchievementBadgeProps {
  icon: React.ReactNode
  title: string
  description: string
  isUnlocked: boolean
  onClick?: () => void
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({ 
  icon, 
  title, 
  description, 
  isUnlocked, 
  onClick 
}) => {
  return (
    <div 
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
        ${isUnlocked 
          ? 'border-gradient-animated bg-gradient-to-r from-purple-900/20 to-blue-900/20 hover:scale-105' 
          : 'border-gray-600 bg-gray-800/50 opacity-60'
        }
      `}
      onClick={onClick}
    >
      {isUnlocked && (
        <div className="absolute -top-2 -right-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center animate-bounce-gentle">
            <Crown className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
      
      <div className={`mb-2 ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
        {icon}
      </div>
      
      <h4 className={`font-semibold mb-1 ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
        {title}
      </h4>
      
      <p className={`text-sm ${isUnlocked ? 'text-gray-300' : 'text-gray-500'}`}>
        {description}
      </p>
    </div>
  )
}

// Interactive Tooltip Component
interface InteractiveTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export const InteractiveTooltip: React.FC<InteractiveTooltipProps> = ({ 
  children, 
  content, 
  position = 'top',
  delay = 500 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    const id = setTimeout(() => setIsVisible(true), delay)
    setTimeoutId(id)
  }

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(null)
    }
    setIsVisible(false)
  }

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && (
        <div className={`
          absolute z-50 ${positionClasses[position]}
          left-1/2 transform -translate-x-1/2
          animate-fade-in-up
        `}>
          <div className="
            glass-morphism px-3 py-2 rounded-lg text-sm text-white
            border border-white/20 shadow-xl max-w-xs
          ">
            {content}
          </div>
          <div className={`
            absolute w-2 h-2 bg-white/10 transform rotate-45
            ${position === 'top' ? 'top-full -translate-y-1' : ''}
            ${position === 'bottom' ? 'bottom-full translate-y-1' : ''}
            left-1/2 -translate-x-1/2
          `} />
        </div>
      )}
    </div>
  )
}