# Prompt Studio Chat Page - Comprehensive Manual Testing Guide

## Overview
This document provides a comprehensive manual testing checklist for the Prompt Studio chat page functionality, focusing on validating the database fixes and ensuring all features work correctly.

## Pre-Test Setup
1. Ensure development server is running: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Login with test credentials or create a test account
4. Navigate to `/chat` page

## Test Categories

### 1. Authentication & Page Loading ✅
**Objective**: Verify page loads correctly for authenticated users without database errors

**Steps**:
- [ ] Load `/chat` page while authenticated
- [ ] Check browser console for any database errors (specifically "last_activity_at does not exist")
- [ ] Verify all three main sections load:
  - [ ] Left sidebar (conversations)
  - [ ] Center chat interface
  - [ ] Right sidebar (prompt generation)
- [ ] Confirm no authentication prompts appear
- [ ] Test page refresh maintains authentication state

**Expected Results**:
- Page loads within 5 seconds
- No database column errors in console
- All UI sections visible
- User remains authenticated

### 2. Conversation Sidebar Functionality ✅
**Objective**: Test conversation management without database errors

**Steps**:
- [ ] Click "New Conversation" button (should be visible in sidebar)
- [ ] Verify conversation list loads without errors
- [ ] Test search functionality (if available)
- [ ] Test conversation filtering options
- [ ] Create multiple conversations and verify they appear in sidebar
- [ ] Test conversation selection (clicking on different conversations)
- [ ] Test conversation deletion (if delete option available)
- [ ] Test favorite/unfavorite functionality
- [ ] Check that last_activity_at, message_count, and other new columns work

**Expected Results**:
- New conversations created successfully
- Conversation list displays without errors
- Search and filter work properly
- No database column missing errors
- Favorite functionality works

### 3. New Conversation Creation ✅
**Objective**: Validate conversation creation works with updated database schema

**Test Steps**:
- [ ] Click new conversation button multiple times
- [ ] Send messages in new conversations
- [ ] Verify conversations persist after page refresh
- [ ] Check conversation metadata (created_at, updated_at, etc.)
- [ ] Ensure conversation IDs are properly generated

**Expected Results**:
- Conversations created without errors
- Proper metadata storage
- Conversations persist across sessions

### 4. Template Selection & Text Injection ✅
**Objective**: Test all 4 templates inject text correctly into chat input

**Templates to Test**:

#### 4.1 Social Media Template
- [ ] Locate Social Media template button in right sidebar
- [ ] Click template button
- [ ] Verify template text appears in chat input field
- [ ] Verify template content is appropriate for social media
- [ ] Send message and confirm it works

#### 4.2 Email Marketing Template  
- [ ] Locate Email Marketing template button
- [ ] Click template button
- [ ] Verify template text injection
- [ ] Confirm content is email marketing focused
- [ ] Test sending template message

#### 4.3 Blog Content Template
- [ ] Find Blog Content template option
- [ ] Test template injection
- [ ] Verify blog-appropriate content
- [ ] Send and confirm functionality

#### 4.4 Creative Writing Template
- [ ] Locate Creative Writing template
- [ ] Test template selection
- [ ] Verify creative writing content injection
- [ ] Confirm template message sending works

**Expected Results**:
- All 4 templates inject appropriate content
- Template text appears in chat input
- Templates can be sent as messages
- No errors during template selection

### 5. Generate Prompt API Integration ✅
**Objective**: Test prompt generation with both sessionId and conversationId support

**Steps**:
- [ ] Create conversation with multiple messages
- [ ] Locate "Generate Prompt" button in right sidebar
- [ ] Click generate prompt button
- [ ] Monitor network requests for `/api/ai/generate-prompt` calls
- [ ] Verify API request includes appropriate IDs (conversationId/sessionId)
- [ ] Wait for prompt generation to complete
- [ ] Verify generated prompt appears in right sidebar
- [ ] Test prompt generation with different conversation contexts
- [ ] Test error handling (mock API errors if needed)

**API Validation**:
- [ ] Check request payload contains `conversationId` or `sessionId`
- [ ] Verify API response format
- [ ] Confirm generated prompt is substantial (>50 characters)
- [ ] Test with conversations of varying lengths

**Expected Results**:
- Generate prompt button works when conversation exists
- API calls succeed with proper IDs
- Generated prompts appear in sidebar
- Error handling works gracefully

### 6. Right Sidebar Features (Save/Edit/Copy) ✅
**Objective**: Test prompt management features in right sidebar

**Save Functionality**:
- [ ] Generate a prompt first
- [ ] Locate "Save" button
- [ ] Click save button
- [ ] Verify save confirmation appears
- [ ] Check if saved prompt persists

**Edit Functionality**:
- [ ] Generate a prompt
- [ ] Click "Edit" button (if available)
- [ ] Modify prompt text
- [ ] Save changes
- [ ] Verify changes persist

**Copy Functionality**:
- [ ] Generate a prompt
- [ ] Click "Copy" button
- [ ] Verify copy confirmation appears
- [ ] Test pasting clipboard content to verify copy worked

**Additional Features**:
- [ ] Test prompt download functionality (if available)
- [ ] Test prompt sharing features
- [ ] Test prompt versioning (if implemented)

**Expected Results**:
- Save functionality stores prompts properly
- Edit mode allows prompt modification
- Copy to clipboard works correctly
- All features work without errors

### 7. Complete User Workflow ✅
**Objective**: Test end-to-end user journey

**Full Workflow Steps**:
1. [ ] Navigate to chat page
2. [ ] Create new conversation
3. [ ] Select a template (any of the 4)
4. [ ] Send template message
5. [ ] Add 2-3 follow-up messages with context
6. [ ] Generate prompt using conversation
7. [ ] Save generated prompt
8. [ ] Copy prompt to clipboard
9. [ ] Edit prompt (if feature available)
10. [ ] Create second conversation
11. [ ] Switch between conversations
12. [ ] Test search/filter functionality
13. [ ] Mark conversation as favorite

**Workflow Validation**:
- [ ] Each step completes without errors
- [ ] Database operations succeed
- [ ] UI state updates correctly
- [ ] Data persists across page refreshes

### 8. Database Integration Validation ✅
**Objective**: Ensure no database errors occur during testing

**Database Tests**:
- [ ] Monitor browser console throughout all tests
- [ ] Look specifically for these error patterns:
  - "last_activity_at does not exist"
  - "message_count does not exist" 
  - "is_favorite does not exist"
  - "tags does not exist"
  - "status does not exist"
  - Any column missing errors
- [ ] Test database operations:
  - Conversation creation
  - Message storage
  - Favorite toggle
  - Search functionality
  - Prompt generation and storage

**Expected Results**:
- Zero database column errors
- All CRUD operations work properly
- New schema columns function correctly

### 9. Performance & Error Handling ✅
**Objective**: Validate system performance and error resilience

**Performance Tests**:
- [ ] Page loads within 5 seconds
- [ ] Template injection is instant (<1 second)
- [ ] Prompt generation completes within 30 seconds
- [ ] Conversation switching is smooth (<2 seconds)

**Error Handling**:
- [ ] Test with network disconnection
- [ ] Test API failures (if mockable)
- [ ] Test invalid input handling
- [ ] Test rapid clicking/interaction

**Expected Results**:
- Good performance under normal conditions
- Graceful error handling
- No crashes or broken states

## Test Results Documentation

### Critical Issues Found
- [ ] List any database errors encountered
- [ ] Note any template functionality failures
- [ ] Document API integration problems
- [ ] Record any workflow breaking issues

### Features Working Correctly
- [ ] Authentication and page loading
- [ ] Conversation sidebar functionality
- [ ] Template selection and injection
- [ ] Prompt generation API
- [ ] Save/edit/copy features
- [ ] Complete user workflow

### Recommendations
- [ ] Areas needing improvement
- [ ] Missing features or functionality
- [ ] Performance optimizations needed
- [ ] Additional testing required

## Test Completion Checklist
- [ ] All conversation functionality tested
- [ ] All 4 templates validated
- [ ] Prompt generation working end-to-end
- [ ] No database errors present
- [ ] Save/edit/copy features operational
- [ ] Complete workflow successful
- [ ] Performance acceptable
- [ ] Error handling adequate

## Sign-off
**Tester**: _________________
**Date**: _________________
**Overall Status**: ❌ FAIL / ✅ PASS
**Notes**: 
_________________________________________________________________
_________________________________________________________________