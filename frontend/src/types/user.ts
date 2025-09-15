export interface User {
  id: string
  email: string
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile extends User {
  full_name?: string
  avatar_url?: string
  preferences?: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  notifications: {
    email: boolean
    browser: boolean
  }
}
