/**
 * ⚡ QUICK FIX GENERATOR
 * Generates immediate fixes based on common chat app issues
 */

const fs = require('fs');
const path = require('path');

class QuickFixGenerator {
    constructor() {
        this.fixes = [];
        this.createdFiles = [];
    }

    async generateQuickFixes() {
        console.log('⚡ Quick Fix Generator: Creating immediate solutions...');
        
        // Check if basic chat structure exists
        const hasApiRoute = this.checkAPIRoute();
        const hasChatComponent = this.checkChatComponent();
        const hasMainPage = this.checkMainPage();

        if (!hasApiRoute) {
            await this.createAPIRoute();
        }

        if (!hasChatComponent) {
            await this.createChatComponent();
        }

        if (!hasMainPage) {
            await this.createMainPage();
        }

        return {
            fixes: this.fixes,
            createdFiles: this.createdFiles,
            status: 'QUICK_FIXES_APPLIED'
        };
    }

    checkAPIRoute() {
        const possiblePaths = [
            'src/app/api/chat/route.js',
            'src/pages/api/chat.js',
            'pages/api/chat.js'
        ];

        for (const apiPath of possiblePaths) {
            if (fs.existsSync(apiPath)) {
                console.log(`✅ Found existing API route: ${apiPath}`);
                return true;
            }
        }
        console.log('❌ No API route found');
        return false;
    }

    checkChatComponent() {
        const possiblePaths = [
            'src/components/ChatInterface.js',
            'components/ChatInterface.js'
        ];

        for (const componentPath of possiblePaths) {
            if (fs.existsSync(componentPath)) {
                console.log(`✅ Found existing chat component: ${componentPath}`);
                return true;
            }
        }
        console.log('❌ No chat component found');
        return false;
    }

    checkMainPage() {
        const possiblePaths = [
            'src/app/page.js',
            'src/pages/index.js',
            'pages/index.js'
        ];

        for (const pagePath of possiblePaths) {
            if (fs.existsSync(pagePath)) {
                console.log(`✅ Found existing main page: ${pagePath}`);
                return true;
            }
        }
        console.log('❌ No main page found');
        return false;
    }

    async createAPIRoute() {
        console.log('🔧 Creating API route...');
        
        // Determine which architecture to use
        const useAppRouter = fs.existsSync('src/app') || fs.existsSync('app');
        
        if (useAppRouter) {
            // Create App Router API route
            const routeDir = 'src/app/api/chat';
            const routeFile = path.join(routeDir, 'route.js');
            
            if (!fs.existsSync(routeDir)) {
                fs.mkdirSync(routeDir, { recursive: true });
            }

            const routeContent = `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      model: 'gpt-3.5-turbo',
      max_tokens: 1000,
    });

    return Response.json({
      message: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return Response.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}`;

            fs.writeFileSync(routeFile, routeContent);
            this.createdFiles.push(routeFile);
            this.fixes.push('✅ Created App Router API route at src/app/api/chat/route.js');
        } else {
            // Create Pages Router API route
            const routeDir = 'pages/api';
            const routeFile = path.join(routeDir, 'chat.js');
            
            if (!fs.existsSync(routeDir)) {
                fs.mkdirSync(routeDir, { recursive: true });
            }

            const routeContent = `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      model: 'gpt-3.5-turbo',
      max_tokens: 1000,
    });

    res.status(200).json({
      message: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
}`;

            fs.writeFileSync(routeFile, routeContent);
            this.createdFiles.push(routeFile);
            this.fixes.push('✅ Created Pages Router API route at pages/api/chat.js');
        }
    }

    async createChatComponent() {
        console.log('🔧 Creating chat component...');
        
        const componentDir = 'src/components';
        const componentFile = path.join(componentDir, 'ChatInterface.js');
        
        if (!fs.existsSync(componentDir)) {
            fs.mkdirSync(componentDir, { recursive: true });
        }

        const componentContent = `'use client';

import { useState } from 'react';

export default function ChatInterface() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    setError('');
    
    // Add user message to chat
    const userMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const data = await response.json();
      
      // Add AI response to chat
      const aiMessage = { role: 'assistant', content: data.message };
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Chat error:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">AI Chat Assistant</h1>
        </div>
        
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500">
              Start a conversation with the AI assistant!
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}
              >
                <div
                  className={\`max-w-xs lg:max-w-md px-4 py-2 rounded-lg \${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }\`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse animation-delay-200">●</div>
                  <div className="animate-pulse animation-delay-400">●</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {error && (
          <div className="px-6 py-2 bg-red-50 border-t border-red-200">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 border-t">
          <div className="flex space-x-4">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}`;

        fs.writeFileSync(componentFile, componentContent);
        this.createdFiles.push(componentFile);
        this.fixes.push('✅ Created ChatInterface component at src/components/ChatInterface.js');
    }

    async createMainPage() {
        console.log('🔧 Creating main page...');
        
        // Determine which architecture to use
        const useAppRouter = fs.existsSync('src/app') || fs.existsSync('app');
        
        if (useAppRouter) {
            // Create App Router page
            const pageDir = 'src/app';
            const pageFile = path.join(pageDir, 'page.js');
            
            if (!fs.existsSync(pageDir)) {
                fs.mkdirSync(pageDir, { recursive: true });
            }

            const pageContent = `import ChatInterface from '../components/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <ChatInterface />
    </main>
  );
}`;

            fs.writeFileSync(pageFile, pageContent);
            this.createdFiles.push(pageFile);
            this.fixes.push('✅ Created App Router main page at src/app/page.js');
        } else {
            // Create Pages Router page
            const pageDir = 'pages';
            const pageFile = path.join(pageDir, 'index.js');
            
            if (!fs.existsSync(pageDir)) {
                fs.mkdirSync(pageDir, { recursive: true });
            }

            const pageContent = `import ChatInterface from '../src/components/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <ChatInterface />
    </main>
  );
}`;

            fs.writeFileSync(pageFile, pageContent);
            this.createdFiles.push(pageFile);
            this.fixes.push('✅ Created Pages Router main page at pages/index.js');
        }
    }
}

module.exports = QuickFixGenerator;

// Auto-run if called directly
if (require.main === module) {
    const generator = new QuickFixGenerator();
    generator.generateQuickFixes().then(result => {
        console.log('\n⚡ QUICK FIX GENERATOR RESULTS:');
        console.log('==============================');
        result.fixes.forEach(fix => console.log(fix));
        console.log(\`\nCreated \${result.createdFiles.length} files\`);
        console.log('Status:', result.status);
    }).catch(error => {
        console.error('❌ Quick fix generation failed:', error);
    });
}