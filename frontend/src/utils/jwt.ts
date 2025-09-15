export interface DecodedJWT {
  sub?: string
  email?: string
  exp?: number
  [key: string]: any
}

export const decodeJWT = (token: string): DecodedJWT | null => {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch {
    return null
  }
}

export const isJWTExpired = (token: string): boolean => {
  const payload = decodeJWT(token)
  if (!payload?.exp) return false
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}


