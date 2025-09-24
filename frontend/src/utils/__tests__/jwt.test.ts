import { decodeJWT, isJWTExpired } from '../jwt'

describe('jwt utils', () => {
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

  describe('decodeJWT', () => {
    it('should decode a valid JWT token', () => {
      const decoded = decodeJWT(mockToken)
      expect(decoded).toBeDefined()
      expect(decoded?.sub).toBe('1234567890')
      expect(decoded?.name).toBe('John Doe')
    })

    it('should return null for invalid token', () => {
      const decoded = decodeJWT('invalid-token')
      expect(decoded).toBeNull()
    })

    it('should return null for empty token', () => {
      const decoded = decodeJWT('')
      expect(decoded).toBeNull()
    })
  })

  describe('isJWTExpired', () => {
    it('should return true for expired token', () => {
      // This token has an exp of 1516242622 (Jan 2018)
      const expired = isJWTExpired(mockToken)
      expect(expired).toBe(true)
    })

    it('should return false for valid token with future expiration', () => {
      // Create a token with future expiration
      const futureExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const payload = Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64')
      const futureToken = `header.${payload}.signature`
      const expired = isJWTExpired(futureToken)
      expect(expired).toBe(false)
    })

    it('should return false for token without expiration', () => {
      const payload = Buffer.from(JSON.stringify({ sub: '123' })).toString('base64')
      const tokenWithoutExp = `header.${payload}.signature`
      const expired = isJWTExpired(tokenWithoutExp)
      expect(expired).toBe(false)
    })

    it('should return false for invalid token', () => {
      const expired = isJWTExpired('invalid-token')
      expect(expired).toBe(false)
    })
  })
})
