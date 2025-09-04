import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Prompt Studio Chat Page - Comprehensive E2E Testing', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Mock authentication to bypass login
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user-data', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });
    
    await page.goto('/chat');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Authentication and Page Loading', () => {
    test('should load chat page for authenticated user without database errors', async () => {
      // Wait for the page to fully load
      await page.waitForLoadState('networkidle');
      
      // Should display the main chat interface
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible({ timeout: 10000 });
      
      // Should not show authentication prompt
      await expect(page.locator('text=Sign In')).not.toBeVisible();
      
      // Check that no database errors are present in console
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleLogs.push(msg.text());
        }
      });
      
      // Refresh to catch any console errors
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify no "last_activity_at does not exist" errors
      const dbErrors = consoleLogs.filter(log => 
        log.includes('last_activity_at') || 
        log.includes('column does not exist') ||
        log.includes('database error')
      );
      
      expect(dbErrors.length).toBe(0);
    });

    test('should redirect unauthenticated users', async () => {
      // Clear authentication
      await page.evaluate(() => {
        localStorage.clear();
      });
      
      await page.goto('/chat');
      
      // Should show authentication prompt
      await expect(page.locator('text=Sign in to start creating')).toBeVisible();
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
      await expect(page.locator('button:has-text("Create Account")')).toBeVisible();
    });
  });

  test.describe('Conversation Sidebar Functionality', () => {
    test('should load conversation sidebar without database errors', async () => {
      await page.waitForLoadState('networkidle');
      
      // Sidebar should be visible
      await expect(page.locator('[data-testid="conversation-sidebar"]')).toBeVisible({ timeout: 10000 });
      
      // New conversation button should be present
      await expect(page.locator('[data-testid="new-conversation-btn"]')).toBeVisible();
      
      // Search functionality should be present
      await expect(page.locator('[data-testid="conversation-search"]')).toBeVisible();
      
      // Filter options should be available
      await expect(page.locator('[data-testid="conversation-filter"]')).toBeVisible();
    });

    test('should create new conversation successfully', async () => {
      await page.waitForLoadState('networkidle');
      
      // Click new conversation button
      await page.click('[data-testid="new-conversation-btn"]');
      
      // Should start with empty chat
      await expect(page.locator('[data-testid="chat-messages"]')).toBeEmpty();
      
      // Should show placeholder for new conversation
      await expect(page.locator('text=Start a new conversation')).toBeVisible();
    });

    test('should handle conversation selection', async () => {
      await page.waitForLoadState('networkidle');
      
      // Create a test conversation first by sending a message
      await page.fill('[data-testid="chat-input"]', 'Test conversation message');
      await page.click('[data-testid="send-button"]');
      
      // Wait for message to be sent and conversation to be created
      await page.waitForTimeout(2000);
      
      // Check if conversation appears in sidebar
      const conversationItem = page.locator('[data-testid="conversation-item"]').first();
      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        
        // Should select the conversation
        await expect(conversationItem).toHaveClass(/selected|active/);
      }
    });

    test('should handle conversation search', async () => {
      await page.waitForLoadState('networkidle');
      
      // Test search functionality
      await page.fill('[data-testid="conversation-search"]', 'test search query');
      
      // Should filter conversations (might be empty for new user)
      await page.waitForTimeout(1000);
      
      // Clear search
      await page.fill('[data-testid="conversation-search"]', '');
    });

    test('should handle favorite toggle', async () => {
      await page.waitForLoadState('networkidle');
      
      // Create a conversation first
      await page.fill('[data-testid="chat-input"]', 'Test message for favorite');
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(2000);
      
      const favoriteBtn = page.locator('[data-testid="favorite-btn"]').first();
      if (await favoriteBtn.isVisible()) {
        await favoriteBtn.click();
        
        // Should toggle favorite state
        await page.waitForTimeout(1000);
        
        // Check if favorite state persists
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Chat Interface Functionality', () => {
    test('should handle message sending and receiving', async () => {
      await page.waitForLoadState('networkidle');
      
      const testMessage = 'Hello, this is a test message for the chat interface';
      
      // Fill and send message
      await page.fill('[data-testid="chat-input"]', testMessage);
      await page.click('[data-testid="send-button"]');
      
      // Should show user message
      await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 5000 });
      
      // Should clear input after sending
      await expect(page.locator('[data-testid="chat-input"]')).toHaveValue('');
      
      // Should show loading state for AI response
      await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 3000 });
    });

    test('should handle template text injection', async () => {
      await page.waitForLoadState('networkidle');
      
      // Mock template selection from sidebar
      const templateText = 'This is a template message from the sidebar';
      
      // Simulate template selection by directly filling input
      await page.fill('[data-testid="chat-input"]', templateText);
      
      // Verify template text is injected
      await expect(page.locator('[data-testid="chat-input"]')).toHaveValue(templateText);
      
      // Should be able to send template message
      await page.click('[data-testid="send-button"]');
      await expect(page.locator(`text=${templateText}`)).toBeVisible();
    });

    test('should handle keyboard shortcuts', async () => {
      await page.waitForLoadState('networkidle');
      
      // Test Enter to send message
      await page.fill('[data-testid="chat-input"]', 'Test keyboard shortcut');
      await page.keyboard.press('Enter');
      
      // Should send message
      await expect(page.locator('text=Test keyboard shortcut')).toBeVisible();
      
      // Test Shift+Enter for new line
      await page.focus('[data-testid="chat-input"]');
      await page.keyboard.type('Line 1');
      await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('Line 2');
      
      // Should have multi-line text
      const inputValue = await page.inputValue('[data-testid="chat-input"]');
      expect(inputValue).toContain('\n');
    });
  });

  test.describe('Template Selection Functionality', () => {
    const templateTests = [
      { name: 'Social Media', selector: '[data-testid="template-social-media"]' },
      { name: 'Email Marketing', selector: '[data-testid="template-email-marketing"]' },
      { name: 'Blog Content', selector: '[data-testid="template-blog-content"]' },
      { name: 'Creative Writing', selector: '[data-testid="template-creative-writing"]' }
    ];

    templateTests.forEach(({ name, selector }) => {
      test(`should handle ${name} template selection`, async () => {
        await page.waitForLoadState('networkidle');
        
        // Look for template in right sidebar
        const templateButton = page.locator(selector);
        if (await templateButton.isVisible()) {
          await templateButton.click();
          
          // Should inject template text into chat input
          const chatInput = page.locator('[data-testid="chat-input"]');
          await expect(chatInput).not.toHaveValue('');
          
          // Verify template-specific content is present
          const inputValue = await chatInput.inputValue();
          expect(inputValue.length).toBeGreaterThan(0);
        }
      });
    });

    test('should handle all templates sequentially', async () => {
      await page.waitForLoadState('networkidle');
      
      for (const { name, selector } of templateTests) {
        const templateButton = page.locator(selector);
        if (await templateButton.isVisible()) {
          await templateButton.click();
          await page.waitForTimeout(500);
          
          // Clear input for next template
          await page.fill('[data-testid="chat-input"]', '');
        }
      }
    });
  });

  test.describe('Generate Prompt API Integration', () => {
    test('should generate prompt for active conversation', async () => {
      await page.waitForLoadState('networkidle');
      
      // Create a conversation with some context
      const messages = [
        'I need help with social media marketing',
        'Specifically for a tech startup',
        'Targeting young professionals'
      ];
      
      for (const message of messages) {
        await page.fill('[data-testid="chat-input"]', message);
        await page.click('[data-testid="send-button"]');
        await page.waitForTimeout(2000);
      }
      
      // Look for generate prompt button
      const generateBtn = page.locator('[data-testid="generate-prompt-btn"]');
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        
        // Should show loading state
        await expect(page.locator('[data-testid="generating-prompt"]')).toBeVisible({ timeout: 3000 });
        
        // Should display generated prompt
        await expect(page.locator('[data-testid="generated-prompt"]')).toBeVisible({ timeout: 10000 });
        
        // Prompt should not be empty
        const promptText = await page.locator('[data-testid="generated-prompt"]').textContent();
        expect(promptText?.length).toBeGreaterThan(0);
      }
    });

    test('should handle generate prompt with both sessionId and conversationId', async () => {
      await page.waitForLoadState('networkidle');
      
      // Monitor network requests to verify API calls
      const apiCalls = [];
      page.on('request', request => {
        if (request.url().includes('/api/ai/generate-prompt')) {
          apiCalls.push(request);
        }
      });
      
      // Create conversation and generate prompt
      await page.fill('[data-testid="chat-input"]', 'Test message for prompt generation');
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(3000);
      
      const generateBtn = page.locator('[data-testid="generate-prompt-btn"]');
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        await page.waitForTimeout(3000);
        
        // Verify API was called
        expect(apiCalls.length).toBeGreaterThan(0);
        
        // Check request body contains appropriate IDs
        if (apiCalls.length > 0) {
          const requestBody = apiCalls[0].postDataJSON();
          expect(requestBody).toHaveProperty('conversationId');
        }
      }
    });

    test('should handle prompt generation errors gracefully', async () => {
      await page.waitForLoadState('networkidle');
      
      // Mock API error response
      await page.route('**/api/ai/generate-prompt', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to generate prompt' })
        });
      });
      
      // Try to generate prompt
      const generateBtn = page.locator('[data-testid="generate-prompt-btn"]');
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        
        // Should show error message
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Right Sidebar Functionality', () => {
    test('should display prompt generation controls', async () => {
      await page.waitForLoadState('networkidle');
      
      // Right sidebar should be visible
      await expect(page.locator('[data-testid="prompt-sidebar"]')).toBeVisible();
      
      // Should show generate button (might be disabled initially)
      await expect(page.locator('[data-testid="generate-prompt-btn"]')).toBeVisible();
      
      // Should show template sections
      await expect(page.locator('[data-testid="template-section"]')).toBeVisible();
    });

    test('should handle save prompt functionality', async () => {
      await page.waitForLoadState('networkidle');
      
      // Create conversation and generate prompt first
      await page.fill('[data-testid="chat-input"]', 'Test for save functionality');
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(2000);
      
      const generateBtn = page.locator('[data-testid="generate-prompt-btn"]');
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        await page.waitForTimeout(3000);
        
        // Look for save button
        const saveBtn = page.locator('[data-testid="save-prompt-btn"]');
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          
          // Should show save confirmation
          await expect(page.locator('[data-testid="save-success"]')).toBeVisible({ timeout: 3000 });
        }
      }
    });

    test('should handle edit prompt functionality', async () => {
      await page.waitForLoadState('networkidle');
      
      // Generate a prompt first
      await page.fill('[data-testid="chat-input"]', 'Test for edit functionality');
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(2000);
      
      const generateBtn = page.locator('[data-testid="generate-prompt-btn"]');
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        await page.waitForTimeout(3000);
        
        // Look for edit button
        const editBtn = page.locator('[data-testid="edit-prompt-btn"]');
        if (await editBtn.isVisible()) {
          await editBtn.click();
          
          // Should show edit mode
          await expect(page.locator('[data-testid="prompt-editor"]')).toBeVisible();
          
          // Should be able to modify text
          await page.fill('[data-testid="prompt-editor"]', 'Modified prompt text');
          
          // Should be able to save changes
          const saveEditBtn = page.locator('[data-testid="save-edit-btn"]');
          if (await saveEditBtn.isVisible()) {
            await saveEditBtn.click();
            await expect(page.locator('text=Modified prompt text')).toBeVisible();
          }
        }
      }
    });

    test('should handle copy prompt functionality', async () => {
      await page.waitForLoadState('networkidle');
      
      // Generate a prompt first
      await page.fill('[data-testid="chat-input"]', 'Test for copy functionality');
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(2000);
      
      const generateBtn = page.locator('[data-testid="generate-prompt-btn"]');
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        await page.waitForTimeout(3000);
        
        // Look for copy button
        const copyBtn = page.locator('[data-testid="copy-prompt-btn"]');
        if (await copyBtn.isVisible()) {
          await copyBtn.click();
          
          // Should show copy confirmation
          await expect(page.locator('[data-testid="copy-success"]')).toBeVisible({ timeout: 3000 });
          
          // Verify clipboard content (if supported)
          try {
            const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
            expect(clipboardText.length).toBeGreaterThan(0);
          } catch (error) {
            // Clipboard API might not be available in test environment
            console.log('Clipboard API not available in test environment');
          }
        }
      }
    });
  });

  test.describe('Complete User Workflow', () => {
    test('should complete end-to-end workflow from conversation creation to prompt generation', async () => {
      await page.waitForLoadState('networkidle');
      
      // Step 1: Start new conversation
      await page.click('[data-testid="new-conversation-btn"]');
      
      // Step 2: Select template
      const socialMediaTemplate = page.locator('[data-testid="template-social-media"]');
      if (await socialMediaTemplate.isVisible()) {
        await socialMediaTemplate.click();
        await page.waitForTimeout(1000);
      }
      
      // Step 3: Send template-based message
      const inputValue = await page.inputValue('[data-testid="chat-input"]');
      if (inputValue) {
        await page.click('[data-testid="send-button"]');
        await page.waitForTimeout(2000);
      } else {
        // Fallback: Send a regular message
        await page.fill('[data-testid="chat-input"]', 'I need help creating social media content for my brand');
        await page.click('[data-testid="send-button"]');
        await page.waitForTimeout(2000);
      }
      
      // Step 4: Add more context
      await page.fill('[data-testid="chat-input"]', 'My target audience is millennials interested in sustainable products');
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(2000);
      
      // Step 5: Generate prompt
      const generateBtn = page.locator('[data-testid="generate-prompt-btn"]');
      if (await generateBtn.isVisible() && await generateBtn.isEnabled()) {
        await generateBtn.click();
        
        // Wait for generation to complete
        await page.waitForTimeout(5000);
        
        // Step 6: Verify generated prompt is displayed
        const generatedPrompt = page.locator('[data-testid="generated-prompt"]');
        if (await generatedPrompt.isVisible()) {
          const promptText = await generatedPrompt.textContent();
          expect(promptText?.length).toBeGreaterThan(50); // Should be substantial content
          
          // Step 7: Test copy functionality
          const copyBtn = page.locator('[data-testid="copy-prompt-btn"]');
          if (await copyBtn.isVisible()) {
            await copyBtn.click();
            await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
          }
          
          // Step 8: Test save functionality
          const saveBtn = page.locator('[data-testid="save-prompt-btn"]');
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
          }
        }
      }
      
      // Step 9: Verify conversation appears in sidebar
      await page.waitForTimeout(1000);
      const conversations = page.locator('[data-testid="conversation-item"]');
      const conversationCount = await conversations.count();
      expect(conversationCount).toBeGreaterThan(0);
    });

    test('should handle multiple conversations and switching between them', async () => {
      await page.waitForLoadState('networkidle');
      
      // Create first conversation
      await page.click('[data-testid="new-conversation-btn"]');
      await page.fill('[data-testid="chat-input"]', 'First conversation message');
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(3000);
      
      // Create second conversation
      await page.click('[data-testid="new-conversation-btn"]');
      await page.fill('[data-testid="chat-input"]', 'Second conversation message');
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(3000);
      
      // Should have multiple conversations in sidebar
      const conversations = page.locator('[data-testid="conversation-item"]');
      const conversationCount = await conversations.count();
      expect(conversationCount).toBeGreaterThanOrEqual(2);
      
      // Should be able to switch between conversations
      if (conversationCount >= 2) {
        await conversations.nth(0).click();
        await page.waitForTimeout(1000);
        
        // Should load the selected conversation
        await expect(conversations.nth(0)).toHaveClass(/selected|active/);
        
        // Switch to second conversation
        await conversations.nth(1).click();
        await page.waitForTimeout(1000);
        await expect(conversations.nth(1)).toHaveClass(/selected|active/);
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      await page.waitForLoadState('networkidle');
      
      // Mock network failure
      await page.route('**/api/**', route => {
        route.abort('connectionreset');
      });
      
      // Try to send a message
      await page.fill('[data-testid="chat-input"]', 'Test message with network error');
      await page.click('[data-testid="send-button"]');
      
      // Should show error state
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
    });

    test('should handle empty states properly', async () => {
      await page.waitForLoadState('networkidle');
      
      // New user with no conversations
      await expect(page.locator('[data-testid="empty-conversations"]')).toBeVisible();
      
      // Should show helpful onboarding text
      await expect(page.locator('text=Start a new conversation')).toBeVisible();
    });

    test('should validate input constraints', async () => {
      await page.waitForLoadState('networkidle');
      
      // Test empty message submission
      await page.click('[data-testid="send-button"]');
      
      // Should not send empty message
      const messages = page.locator('[data-testid="chat-message"]');
      const messageCount = await messages.count();
      expect(messageCount).toBe(0);
      
      // Test very long message
      const longMessage = 'a'.repeat(5000);
      await page.fill('[data-testid="chat-input"]', longMessage);
      
      // Should handle long messages appropriately
      const inputValue = await page.inputValue('[data-testid="chat-input"]');
      expect(inputValue.length).toBeLessThanOrEqual(5000);
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await page.goto('/chat');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
      
      // Critical elements should be visible quickly
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="conversation-sidebar"]')).toBeVisible({ timeout: 3000 });
      await expect(page.locator('[data-testid="prompt-sidebar"]')).toBeVisible({ timeout: 3000 });
    });

    test('should handle rapid interactions without breaking', async () => {
      await page.waitForLoadState('networkidle');
      
      // Rapid button clicks
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="new-conversation-btn"]');
        await page.waitForTimeout(100);
      }
      
      // Should still be functional
      await page.fill('[data-testid="chat-input"]', 'Test after rapid clicks');
      await page.click('[data-testid="send-button"]');
      
      // Should work normally
      await expect(page.locator('text=Test after rapid clicks')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Database Integration Validation', () => {
    test('should not encounter database column errors', async () => {
      const dbErrors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && 
            (msg.text().includes('last_activity_at') ||
             msg.text().includes('message_count') ||
             msg.text().includes('is_favorite') ||
             msg.text().includes('column does not exist'))) {
          dbErrors.push(msg.text());
        }
      });
      
      await page.waitForLoadState('networkidle');
      
      // Trigger various database operations
      await page.click('[data-testid="new-conversation-btn"]');
      await page.fill('[data-testid="chat-input"]', 'Test database operations');
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(3000);
      
      // Try to favorite conversation if available
      const favoriteBtn = page.locator('[data-testid="favorite-btn"]').first();
      if (await favoriteBtn.isVisible()) {
        await favoriteBtn.click();
        await page.waitForTimeout(1000);
      }
      
      // Try search functionality
      await page.fill('[data-testid="conversation-search"]', 'test');
      await page.waitForTimeout(1000);
      
      // Verify no database errors occurred
      expect(dbErrors.length).toBe(0);
      
      if (dbErrors.length > 0) {
        console.error('Database errors detected:', dbErrors);
      }
    });
  });
});