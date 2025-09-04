'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, Users, Zap, CheckCircle, Star, TrendingUp, Brain, Target, Lightbulb, Shield, Globe } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-3000"></div>
      </div>

      {/* Navigation - Enhanced */}
      <nav className="relative z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card rounded-2xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-white">Prompt Studio</span>
                  <div className="text-xs text-gray-300">AI-Powered Prompt Engineering</div>
                </div>
              </div>
              
              <div className="hidden md:flex items-center space-x-8">
                <Link href="#features" className="text-gray-300 hover:text-white transition-colors duration-300 font-medium">
                  Features
                </Link>
                <Link href="#solutions" className="text-gray-300 hover:text-white transition-colors duration-300 font-medium">
                  Solutions
                </Link>
                <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors duration-300 font-medium">
                  Pricing
                </Link>
                <Link href="#testimonials" className="text-gray-300 hover:text-white transition-colors duration-300 font-medium">
                  Success Stories
                </Link>
              </div>
              
              <div className="flex items-center space-x-4">
                <Link 
                  href="/login" 
                  className="text-gray-300 hover:text-white transition-colors duration-300 font-medium"
                >
                  Sign In
                </Link>
                <Link 
                  href="/signup"
                  className="btn-primary shadow-xl"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Modernized for Jessica Chen */}
      <section className="relative px-6 pt-16 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 text-center">
            {/* Trust Badge */}
            <div className="inline-flex items-center px-6 py-3 glass-card rounded-full mb-8 group hover:scale-105 transition-transform duration-300">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white"></div>
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full border-2 border-white"></div>
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full border-2 border-white"></div>
                </div>
                <Star className="w-4 h-4 text-yellow-400 ml-3" />
                <span className="text-sm text-gray-300 font-medium">Trusted by 50,000+ marketing professionals</span>
              </div>
            </div>
            
            <h1 className="heading-xl text-white mb-8 max-w-5xl mx-auto fade-in">
              Transform Marketing Ideas Into
              <span className="text-gradient block mt-3">
                AI Prompts That Convert
              </span>
            </h1>
            
            <p className="body-lg text-gray-300 max-w-4xl mx-auto mb-12 slide-up leading-relaxed">
              Stop wasting hours crafting prompts that deliver mediocre results. Our intelligent conversation engine 
              guides marketing professionals through building high-converting AI prompts for campaigns, content, 
              and customer engagement that drive real business impact.
            </p>
            
            {/* CTA Section - Enhanced */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 scale-in mb-16">
              <Link 
                href="/signup"
                className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-bold rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-xl"
              >
                <span className="relative z-10 flex items-center">
                  Start Building High-Converting Prompts
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
              </Link>
              <Link 
                href="#demo"
                className="group inline-flex items-center px-8 py-4 glass-card text-white font-semibold rounded-2xl text-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
              >
                <Brain className="w-6 h-6 mr-3 text-purple-400" />
                See AI in Action
              </Link>
            </div>
            
            {/* Social Proof Stats - Enhanced */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text mb-2">
                  94%
                </div>
                <div className="text-sm text-gray-400 font-medium">Higher Conversion Rates</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text mb-2">
                  2.5x
                </div>
                <div className="text-sm text-gray-400 font-medium">Faster Campaign Creation</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text mb-2">
                  50K+
                </div>
                <div className="text-sm text-gray-400 font-medium">Marketing Professionals</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text mb-2">
                  98%
                </div>
                <div className="text-sm text-gray-400 font-medium">Client Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Reimagined for Marketing Professionals */}
      <section id="demo" className="py-24 relative">
        <div className="glass-card mx-6 rounded-3xl">
          <div className="max-w-7xl mx-auto px-8 py-16">
            <div className="text-center mb-20">
              <h2 className="heading-lg text-white mb-6">
                From Marketing Brief to
                <span className="text-gradient block mt-2">High-Converting Prompts in Minutes</span>
              </h2>
              <p className="body-lg text-gray-300 max-w-3xl mx-auto">
                Our AI conversation engine understands marketing context, audience psychology, and conversion optimization
              </p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Target className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">1</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Define Your Campaign Goals</h3>
                <p className="text-gray-300 leading-relaxed">
                  Tell our AI about your marketing objectives, target audience, and desired outcomes. 
                  No technical jargon required.
                </p>
              </div>
              
              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">2</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">AI-Guided Optimization</h3>
                <p className="text-gray-300 leading-relaxed">
                  Our intelligent system asks strategic questions to understand your brand voice, 
                  customer pain points, and conversion triggers.
                </p>
              </div>
              
              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">3</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Launch-Ready Prompts</h3>
                <p className="text-gray-300 leading-relaxed">
                  Get professionally crafted prompts optimized for ChatGPT, Claude, and other AI tools 
                  that drive measurable results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions for Marketing Professionals */}
      <section id="solutions" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="heading-lg text-white mb-6">
              Built for Marketing Excellence
            </h2>
            <p className="body-lg text-gray-300 max-w-3xl mx-auto">
              Everything marketing professionals need to leverage AI for campaign success
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card-gradient group hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Social Media Campaigns</h3>
              <p className="text-gray-300 leading-relaxed">
                Generate viral-worthy content prompts for Facebook, Instagram, LinkedIn, and TikTok that align with your brand and audience.
              </p>
            </div>
            
            <div className="card-gradient group hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Email Marketing</h3>
              <p className="text-gray-300 leading-relaxed">
                Craft high-converting email sequences, subject lines, and personalization prompts that boost open rates and sales.
              </p>
            </div>
            
            <div className="card-gradient group hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Content Marketing</h3>
              <p className="text-gray-300 leading-relaxed">
                Create SEO-optimized blog posts, whitepapers, and thought leadership content that establishes authority and drives leads.
              </p>
            </div>

            <div className="card-gradient group hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Ad Copy Optimization</h3>
              <p className="text-gray-300 leading-relaxed">
                Generate high-performing ad copy for Google Ads, Facebook Ads, and other platforms with built-in A/B testing variations.
              </p>
            </div>

            <div className="card-gradient group hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Brand Messaging</h3>
              <p className="text-gray-300 leading-relaxed">
                Develop consistent brand voice guidelines and messaging frameworks that resonate across all customer touchpoints.
              </p>
            </div>

            <div className="card-gradient group hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Crisis Communication</h3>
              <p className="text-gray-300 leading-relaxed">
                Prepare comprehensive crisis communication strategies and response templates that protect and restore brand reputation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Tailored for Marketing Teams */}
      <section id="pricing" className="py-24">
        <div className="glass-card mx-6 rounded-3xl">
          <div className="max-w-7xl mx-auto px-8 py-16">
            <div className="text-center mb-16">
              <h2 className="heading-lg text-white mb-4">Choose Your Marketing Power Level</h2>
              <p className="body-lg text-gray-300 max-w-2xl mx-auto">
                Flexible plans designed for marketing professionals and growing teams
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Starter Plan */}
              <div className="card bg-white/5 backdrop-blur-sm border-white/10 text-white hover:scale-105 transition-all duration-300">
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2">Marketing Starter</h3>
                  <div className="text-4xl font-bold mb-1">$29</div>
                  <div className="text-gray-400">per month</div>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>50 AI prompts per month</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Social media templates</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Email marketing prompts</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Basic analytics</span>
                  </div>
                </div>
                
                <Link 
                  href="/signup"
                  className="w-full btn-secondary text-center block"
                >
                  Start Free Trial
                </Link>
              </div>
              
              {/* Professional Plan */}
              <div className="card-gradient relative transform hover:scale-105 transition-all duration-300">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </span>
                </div>
                
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2">Marketing Professional</h3>
                  <div className="text-4xl font-bold mb-1">$89</div>
                  <div className="text-gray-300">per month</div>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>500 AI prompts per month</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>All marketing templates</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Advanced campaign analytics</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>A/B testing recommendations</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Priority support</span>
                  </div>
                </div>
                
                <Link 
                  href="/signup"
                  className="w-full btn-primary text-center block"
                >
                  Start 14-Day Trial
                </Link>
              </div>
              
              {/* Enterprise Plan */}
              <div className="card bg-white/5 backdrop-blur-sm border-white/10 text-white hover:scale-105 transition-all duration-300">
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2">Marketing Enterprise</h3>
                  <div className="text-4xl font-bold mb-1">$299</div>
                  <div className="text-gray-400">per month</div>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Unlimited prompts</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Team collaboration tools</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Custom brand templates</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>API access</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Dedicated account manager</span>
                  </div>
                </div>
                
                <Link 
                  href="/contact"
                  className="w-full btn-secondary text-center block"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Enhanced for Conversion */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto text-center px-6">
          <h2 className="heading-lg text-white mb-8">
            Ready to Transform Your Marketing with AI?
          </h2>
          <p className="body-lg text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join thousands of marketing professionals who are achieving better results, 
            faster campaign creation, and higher ROI with AI-powered prompt engineering
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <Link 
              href="/signup"
              className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-bold rounded-2xl text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-xl"
            >
              <span className="relative z-10 flex items-center">
                Start Your 14-Day Free Trial
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
            </Link>
          </div>
          
          <div className="glass-card rounded-2xl p-6 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-300">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                <span>50 prompts included</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Professional */}
      <footer className="border-t border-white/10 py-16 mt-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white">Prompt Studio</span>
                <div className="text-xs text-gray-400">AI-Powered Marketing Excellence</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-8">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors font-medium">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors font-medium">
                Terms of Service
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition-colors font-medium">
                Contact Support
              </Link>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-gray-400 leading-relaxed">
              © 2024 Prompt Studio. All rights reserved. Empowering marketing professionals with AI-driven prompt engineering for measurable business growth.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}