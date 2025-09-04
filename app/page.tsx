'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, Users, Zap, CheckCircle, Star, TrendingUp } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Prompt Studio</span>
          </div>
          
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
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-32">
        <div className="max-w-7xl mx-auto text-center">
          {/* Floating elements */}
          <div className="absolute top-20 left-20 w-20 h-20 bg-purple-500/20 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-32 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
              <Star className="w-4 h-4 text-yellow-400 mr-2" />
              <span className="text-sm text-gray-300">Trusted by 10,000+ creators</span>
            </div>
            
            <h1 className="heading-xl text-white mb-6 fade-in">
              Transform Your Ideas Into
              <span className="text-gradient block mt-2">
                Perfect LLM Prompts
              </span>
            </h1>
            
            <p className="body-lg text-gray-300 max-w-3xl mx-auto mb-12 slide-up">
              Stop struggling with generic AI responses. Our conversational AI guides you through 
              crafting detailed, powerful prompts that get you exactly what you need from ChatGPT, 
              Claude, and other language models.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 scale-in">
              <Link 
                href="/signup"
                className="btn-primary text-lg px-8 py-4 group"
              >
                Start Creating Prompts
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="#demo"
                className="btn-secondary text-lg px-8 py-4"
              >
                See How It Works
              </Link>
            </div>
            
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">85%</div>
                <div className="text-sm text-gray-400">Better Results</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">3 Min</div>
                <div className="text-sm text-gray-400">Average Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">10K+</div>
                <div className="text-sm text-gray-400">Happy Users</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="demo" className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="heading-lg text-white mb-4">How Prompt Studio Works</h2>
            <p className="body-lg text-gray-300 max-w-2xl mx-auto">
              Three simple steps to transform your vague ideas into powerful, detailed prompts
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Share Your Goal</h3>
              <p className="text-gray-300">
                Tell us what you want to accomplish. No need for perfect details - just your basic idea.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Guided Questions</h3>
              <p className="text-gray-300">
                Our AI asks you friendly questions to understand your context, audience, and requirements.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Perfect Prompt</h3>
              <p className="text-gray-300">
                Get a comprehensive, well-structured prompt that delivers amazing results every time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="heading-lg text-white mb-4">Everything You Need</h2>
            <p className="body-lg text-gray-300 max-w-2xl mx-auto">
              Built for creators, marketers, and professionals who need consistent AI results
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card-gradient p-8">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Conversational AI Guide</h3>
              <p className="text-gray-300">
                No more guessing. Our AI asks the right questions to extract all the details needed for perfect prompts.
              </p>
            </div>
            
            <div className="card-gradient p-8">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Template Library</h3>
              <p className="text-gray-300">
                Start with proven templates for social media, email marketing, content creation, and more.
              </p>
            </div>
            
            <div className="card-gradient p-8">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Prompt History</h3>
              <p className="text-gray-300">
                Save, organize, and reuse your best prompts. Never lose a winning formula again.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="heading-lg text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="body-lg text-gray-300 max-w-2xl mx-auto">
              Start free, upgrade when you need more. No hidden fees, cancel anytime.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="card bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <div className="text-3xl font-bold mb-1">$0</div>
                <div className="text-gray-400">Perfect to get started</div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>5 prompts per month</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>Basic conversation interface</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>Community support</span>
                </div>
              </div>
              
              <Link 
                href="/signup"
                className="w-full btn-secondary text-center"
              >
                Get Started Free
              </Link>
            </div>
            
            {/* Pro Plan */}
            <div className="card-gradient p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-3 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <div className="text-3xl font-bold mb-1">$19</div>
                <div className="text-gray-300">per month</div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>100 prompts per month</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>Full conversation history</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>Template library access</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>Export functionality</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>Priority support</span>
                </div>
              </div>
              
              <Link 
                href="/signup"
                className="w-full btn-primary text-center"
              >
                Start 14-Day Trial
              </Link>
            </div>
            
            {/* Enterprise Plan */}
            <div className="card bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <div className="text-3xl font-bold mb-1">$99</div>
                <div className="text-gray-400">per month</div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>Unlimited prompts</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>Team collaboration</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>API access</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>Custom templates</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span>Dedicated support</span>
                </div>
              </div>
              
              <Link 
                href="/contact"
                className="w-full btn-secondary text-center"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="heading-lg text-white mb-6">
            Ready to Create Better Prompts?
          </h2>
          <p className="body-lg text-gray-300 mb-12">
            Join thousands of creators who are getting better AI results with Prompt Studio
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/signup"
              className="btn-primary text-lg px-8 py-4 group"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="text-sm text-gray-400">
              No credit card required • 5 free prompts • Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Prompt Studio</span>
            </div>
            
            <div className="flex items-center space-x-8">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 Prompt Studio. All rights reserved. Transform your ideas into perfect prompts.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}