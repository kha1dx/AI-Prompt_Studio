/**
 * Browser-based Chat Functionality Test Script
 * 
 * INSTRUCTIONS:
 * 1. Navigate to http://localhost:3000/chat in your browser
 * 2. Login or ensure you're authenticated
 * 3. Open browser developer tools (F12)
 * 4. Paste this entire script into the console
 * 5. Press Enter to run the tests
 * 
 * The script will automatically test various chat features and report results.
 */

class ChatTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.originalConsoleError = console.error;
    this.capturedErrors = [];
    
    // Capture console errors to detect database issues
    console.error = (...args) => {
      this.capturedErrors.push(args.join(' '));
      this.originalConsoleError.apply(console, args);
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: 'color: #3498db',
      success: 'color: #27ae60',
      error: 'color: #e74c3c',
      warning: 'color: #f39c12'
    };
    console.log(`%c${message}`, colors[type]);
  }

  async test(name, testFn) {
    this.log(`\n🧪 Testing: ${name}`, 'info');
    try {
      await testFn();
      this.log(`✅ PASSED: ${name}`, 'success');
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
    } catch (error) {
      this.log(`❌ FAILED: ${name}`, 'error');
      this.log(`   Error: ${error.message}`, 'error');
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  querySelector(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    return element;
  }

  querySelectorOptional(selector) {
    return document.querySelector(selector);
  }

  async clickElement(selector) {
    const element = this.querySelector(selector);
    element.click();
    await this.wait(500); // Wait for any state updates
  }

  async typeText(selector, text) {
    const element = this.querySelector(selector);
    element.focus();
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await this.wait(200);
  }

  async runTests() {
    this.log('🚀 Starting Prompt Studio Chat Page Tests', 'info');
    this.log('📍 Current URL: ' + window.location.href, 'info');

    // Test 1: Page Load and Basic Elements
    await this.test('Page Load - Basic Elements Present', async () => {
      this.assert(window.location.pathname === '/chat', 'Not on chat page');
      
      // Check for main containers (using flexible selectors)
      const possibleSelectors = [
        // Try common container patterns
        '[data-testid*="sidebar"]', '.sidebar', '[class*="sidebar"]',
        '[data-testid*="chat"]', '.chat', '[class*="chat"]',
        'nav', 'aside', 'main'
      ];
      
      let foundElements = 0;
      possibleSelectors.forEach(selector => {
        if (document.querySelector(selector)) {
          foundElements++;
        }
      });
      
      this.assert(foundElements >= 2, `Expected at least 2 main UI elements, found ${foundElements}`);
    });

    // Test 2: Console Errors Check
    await this.test('Database Errors - Console Check', async () => {
      const dbErrors = this.capturedErrors.filter(error => 
        error.includes('last_activity_at') || 
        error.includes('message_count') ||
        error.includes('is_favorite') ||
        error.includes('column does not exist') ||
        error.includes('database error')
      );
      
      this.assert(dbErrors.length === 0, `Database errors found: ${dbErrors.join(', ')}`);
    });

    // Test 3: Try to find and test conversation sidebar
    await this.test('Conversation Sidebar - Basic Functionality', async () => {
      // Look for new conversation button patterns
      const newConvSelectors = [
        'button:contains("New")', 'button:contains("Start")', 'button:contains("+")',
        '[data-testid*="new"]', '[class*="new"]', '.btn', 'button'
      ];
      
      let newConvButton = null;
      for (const selector of newConvSelectors) {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.toLowerCase().includes('new') || 
              btn.textContent.toLowerCase().includes('start') ||
              btn.textContent === '+') {
            newConvButton = btn;
            break;
          }
        }
        if (newConvButton) break;
      }
      
      if (newConvButton) {
        this.log('Found new conversation button, testing click...', 'info');
        newConvButton.click();
        await this.wait(1000);
      } else {
        this.log('New conversation button not found (may be okay for new users)', 'warning');
      }
    });

    // Test 4: Chat Input Testing
    await this.test('Chat Input - Text Input and Sending', async () => {
      // Look for input elements
      const inputSelectors = [
        'input[type="text"]', 'textarea', '[contenteditable="true"]',
        '[placeholder*="message"]', '[placeholder*="chat"]', '[placeholder*="type"]'
      ];
      
      let chatInput = null;
      for (const selector of inputSelectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) { // visible element
          chatInput = element;
          break;
        }
      }
      
      this.assert(chatInput, 'Chat input field not found');
      
      const testMessage = 'Test message from automated testing';
      
      if (chatInput.tagName.toLowerCase() === 'input' || chatInput.tagName.toLowerCase() === 'textarea') {
        chatInput.value = testMessage;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (chatInput.contentEditable === 'true') {
        chatInput.textContent = testMessage;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      await this.wait(500);
      
      // Look for send button
      const sendSelectors = [
        'button:contains("Send")', '[data-testid*="send"]', '.send-btn',
        'button[type="submit"]', 'button svg[*="send"]'
      ];
      
      let sendButton = null;
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.toLowerCase().includes('send') || 
            btn.querySelector('svg') || 
            btn.type === 'submit') {
          sendButton = btn;
          break;
        }
      }
      
      if (sendButton) {
        this.log('Found send button, attempting to send test message...', 'info');
        sendButton.click();
        await this.wait(2000); // Wait for message to be processed
      } else {
        this.log('Send button not found, trying Enter key...', 'warning');
        chatInput.focus();
        chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        await this.wait(2000);
      }
    });

    // Test 5: Template Selection Testing
    await this.test('Template Selection - Find and Test Templates', async () => {
      const templateKeywords = ['social', 'email', 'blog', 'creative', 'template'];
      const buttons = document.querySelectorAll('button, [role="button"], .template, .card');
      
      let foundTemplates = 0;
      const templateButtons = [];
      
      buttons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        templateKeywords.forEach(keyword => {
          if (text.includes(keyword)) {
            foundTemplates++;
            templateButtons.push(btn);
          }
        });
      });
      
      this.log(`Found ${foundTemplates} potential template elements`, 'info');
      
      // Try clicking the first template found
      if (templateButtons.length > 0) {
        this.log('Testing template selection...', 'info');
        templateButtons[0].click();
        await this.wait(1000);
        
        // Check if input was filled
        const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
        let inputFilled = false;
        inputs.forEach(input => {
          if (input.value?.length > 10 || input.textContent?.length > 10) {
            inputFilled = true;
          }
        });
        
        if (inputFilled) {
          this.log('Template successfully injected text into input', 'success');
        } else {
          this.log('Template clicked but no text injection detected', 'warning');
        }
      }
    });

    // Test 6: Generate Prompt Functionality
    await this.test('Generate Prompt - Find and Test Prompt Generation', async () => {
      const generateKeywords = ['generate', 'prompt', 'create', 'build'];
      const buttons = document.querySelectorAll('button');
      
      let generateButton = null;
      buttons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        generateKeywords.forEach(keyword => {
          if (text.includes(keyword) && text.includes('prompt')) {
            generateButton = btn;
          }
        });
      });
      
      if (generateButton) {
        this.log('Found generate prompt button, testing...', 'info');
        
        // Check if button is enabled
        if (!generateButton.disabled) {
          generateButton.click();
          await this.wait(3000); // Wait for generation
          
          // Look for generated content
          const contentAreas = document.querySelectorAll('div, p, span, [role="textbox"]');
          let foundGeneratedContent = false;
          
          contentAreas.forEach(area => {
            if (area.textContent?.length > 100 && 
                (area.textContent.includes('prompt') || area.textContent.length > 200)) {
              foundGeneratedContent = true;
            }
          });
          
          if (foundGeneratedContent) {
            this.log('Generated prompt content detected', 'success');
          } else {
            this.log('Generate button clicked but no content detected', 'warning');
          }
        } else {
          this.log('Generate button found but disabled (may need conversation first)', 'warning');
        }
      } else {
        this.log('Generate prompt button not found', 'warning');
      }
    });

    // Test 7: Copy/Save/Edit Functionality
    await this.test('Prompt Actions - Copy, Save, Edit Features', async () => {
      const actionKeywords = ['copy', 'save', 'edit', 'download'];
      const buttons = document.querySelectorAll('button');
      
      let foundActions = [];
      buttons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        actionKeywords.forEach(keyword => {
          if (text.includes(keyword)) {
            foundActions.push({ keyword, button: btn });
          }
        });
      });
      
      this.log(`Found ${foundActions.length} action buttons: ${foundActions.map(a => a.keyword).join(', ')}`, 'info');
      
      // Test copy functionality
      const copyButton = foundActions.find(a => a.keyword === 'copy');
      if (copyButton) {
        this.log('Testing copy functionality...', 'info');
        copyButton.button.click();
        await this.wait(1000);
        
        // Check for success indicator
        const successIndicators = document.querySelectorAll('[class*="success"], [class*="copied"], .notification, .toast');
        if (successIndicators.length > 0) {
          this.log('Copy success indicator found', 'success');
        }
      }
    });

    // Test 8: Network Requests Monitoring
    await this.test('Network Activity - API Calls Monitor', async () => {
      // Monitor for any new network activity
      const startTime = Date.now();
      const originalFetch = window.fetch;
      const networkCalls = [];
      
      window.fetch = async (...args) => {
        networkCalls.push({
          url: args[0],
          options: args[1],
          timestamp: Date.now()
        });
        return originalFetch.apply(window, args);
      };
      
      // Trigger some activity if possible
      const buttons = document.querySelectorAll('button');
      if (buttons.length > 0) {
        buttons[0].click();
        await this.wait(2000);
      }
      
      // Restore original fetch
      window.fetch = originalFetch;
      
      const recentCalls = networkCalls.filter(call => call.timestamp > startTime);
      this.log(`Detected ${recentCalls.length} network calls during test`, 'info');
      
      // Check for API calls
      const apiCalls = recentCalls.filter(call => 
        call.url.includes('/api/') || 
        (typeof call.url === 'string' && call.url.startsWith('/api/'))
      );
      
      this.log(`API calls detected: ${apiCalls.length}`, 'info');
    });

    // Test 9: Local Storage and Session Management
    await this.test('Authentication - Session Management', async () => {
      const authTokens = [
        localStorage.getItem('auth-token'),
        localStorage.getItem('user-data'),
        sessionStorage.getItem('auth-token'),
        document.cookie
      ].filter(Boolean);
      
      this.assert(authTokens.length > 0, 'No authentication tokens found');
      this.log('Authentication tokens detected', 'success');
    });

    // Test 10: Responsive Design Check
    await this.test('UI Responsiveness - Layout Check', async () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      this.log(`Screen size: ${windowWidth}x${windowHeight}`, 'info');
      
      // Check if major elements are visible
      const visibleElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0;
      });
      
      this.assert(visibleElements.length > 10, `Only ${visibleElements.length} visible elements found`);
      
      // Check for mobile responsiveness indicators
      const hasResponsiveClasses = document.documentElement.className.includes('mobile') ||
                                 document.documentElement.className.includes('responsive') ||
                                 Array.from(document.querySelectorAll('*')).some(el => 
                                   el.className.includes('mobile') || 
                                   el.className.includes('sm:') ||
                                   el.className.includes('md:') ||
                                   el.className.includes('lg:')
                                 );
      
      if (hasResponsiveClasses) {
        this.log('Responsive design classes detected', 'success');
      }
    });

    this.printSummary();
  }

  printSummary() {
    // Restore original console.error
    console.error = this.originalConsoleError;
    
    this.log('\n' + '='.repeat(50), 'info');
    this.log('🏁 CHAT FUNCTIONALITY TEST SUMMARY', 'info');
    this.log('='.repeat(50), 'info');
    this.log(`✅ Passed: ${this.results.passed}`, 'success');
    this.log(`❌ Failed: ${this.results.failed}`, 'error');
    this.log(`📊 Total:  ${this.results.passed + this.results.failed}`, 'info');
    
    if (this.results.failed > 0) {
      this.log('\n❌ FAILED TESTS:', 'error');
      this.results.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => this.log(`   - ${t.name}: ${t.error}`, 'error'));
    }

    const successRate = (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1);
    this.log(`\n🎯 Success Rate: ${successRate}%`, 'info');
    
    if (this.results.failed === 0) {
      this.log('\n🎉 All chat functionality tests passed!', 'success');
    } else if (successRate >= 70) {
      this.log('\n✨ Most features are working correctly!', 'success');
    } else {
      this.log('\n⚠️  Several issues detected - manual investigation recommended.', 'warning');
    }

    // Database error summary
    if (this.capturedErrors.length > 0) {
      this.log('\n📋 Console Errors Captured:', 'warning');
      this.capturedErrors.forEach(error => {
        if (error.includes('last_activity_at') || error.includes('column does not exist')) {
          this.log(`   🚨 DATABASE ERROR: ${error}`, 'error');
        } else {
          this.log(`   ⚠️  ${error}`, 'warning');
        }
      });
    } else {
      this.log('\n✅ No console errors detected during testing', 'success');
    }

    // Recommendations
    this.log('\n💡 RECOMMENDATIONS:', 'info');
    this.log('1. Manually test template selection and prompt generation', 'info');
    this.log('2. Verify conversation creation and management', 'info');
    this.log('3. Test save/copy functionality with actual generated prompts', 'info');
    this.log('4. Validate mobile responsiveness', 'info');
  }
}

// Auto-run the tests
console.log('%c🚀 Starting Prompt Studio Chat Tests...', 'color: #3498db; font-size: 16px; font-weight: bold;');
console.log('%cThis may take 20-30 seconds to complete.', 'color: #7f8c8d;');

const tester = new ChatTester();
tester.runTests().catch(error => {
  console.error('❌ Test runner error:', error);
});

// Make tester available globally for manual testing
window.chatTester = tester;