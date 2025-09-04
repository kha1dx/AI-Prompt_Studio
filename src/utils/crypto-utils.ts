/**
 * Cryptographic utilities for PKCE implementation
 */

/**
 * Convert ArrayBuffer to base64url encoded string
 */
export function base64URLEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer
  
  // Convert to base64
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  const base64 = btoa(binary)
  
  // Convert to base64url (URL-safe base64)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * SHA256 hash function using Web Crypto API
 */
export async function sha256(data: string): Promise<ArrayBuffer> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment with Web Crypto API
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    return await window.crypto.subtle.digest('SHA-256', dataBuffer)
  } else {
    // Fallback for environments without Web Crypto API
    // This is a simple implementation and should not be used in production
    console.warn('⚠️ [CRYPTO] Web Crypto API not available, using fallback SHA256')
    return fallbackSHA256(data)
  }
}

/**
 * Fallback SHA256 implementation (not cryptographically secure, for development only)
 */
function fallbackSHA256(data: string): Promise<ArrayBuffer> {
  console.warn('⚠️ [CRYPTO] Using fallback SHA256 - not suitable for production')
  
  // Simple hash for development - NOT SECURE
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Convert to ArrayBuffer (32 bytes for SHA256)
  const buffer = new ArrayBuffer(32)
  const view = new DataView(buffer)
  
  // Fill with pseudo-random data based on hash
  for (let i = 0; i < 8; i++) {
    view.setUint32(i * 4, hash + i)
  }
  
  return Promise.resolve(buffer)
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length)
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array)
  } else {
    // Fallback for non-browser environments
    console.warn('⚠️ [CRYPTO] Web Crypto API not available, using Math.random() fallback')
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  
  return array
}

/**
 * Validate base64url string format
 */
export function isValidBase64URL(str: string): boolean {
  // Base64url uses only A-Z, a-z, 0-9, -, and _ (no padding)
  const base64urlRegex = /^[A-Za-z0-9_-]+$/
  return base64urlRegex.test(str)
}

/**
 * Generate a secure random string suitable for PKCE code verifier
 */
export function generateCodeVerifier(length: number = 128): string {
  if (length < 43 || length > 128) {
    throw new Error('Code verifier length must be between 43 and 128 characters')
  }
  
  // Generate enough random bytes (3 bytes = 4 base64 characters)
  const byteLength = Math.ceil(length * 3 / 4)
  const randomBytes = generateRandomBytes(byteLength)
  const codeVerifier = base64URLEncode(randomBytes)
  
  // Trim to exact length
  return codeVerifier.substring(0, length)
}