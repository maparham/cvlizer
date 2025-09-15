/**
 * Smart suggestions utilities for CV components
 */

export interface SuggestionData {
  locations: string[]
  positions: string[]
  companies: string[]
  institutions: string[]
  degrees: string[]
  skills: string[]
}

/**
 * Get smart suggestions based on previous entries
 */
export const getSmartSuggestions = (
  fieldType: keyof SuggestionData,
  currentValue: string,
  previousEntries: any[],
  maxSuggestions: number = 5
): string[] => {
  if (!previousEntries || previousEntries.length === 0) {
    return []
  }

  // Extract unique values from previous entries
  const allValues = new Set<string>()
  
  previousEntries.forEach(entry => {
    if (entry && typeof entry === 'object') {
      Object.values(entry).forEach(value => {
        if (typeof value === 'string' && value.trim()) {
          allValues.add(value.trim())
        } else if (Array.isArray(value)) {
          value.forEach(item => {
            if (typeof item === 'string' && item.trim()) {
              allValues.add(item.trim())
            }
          })
        }
      })
    }
  })

  // Filter and sort suggestions
  const suggestions = Array.from(allValues)
    .filter(value => 
      value.toLowerCase().includes(currentValue.toLowerCase()) &&
      value.toLowerCase() !== currentValue.toLowerCase()
    )
    .sort((a, b) => {
      // Prioritize exact matches and starts-with matches
      const aStartsWith = a.toLowerCase().startsWith(currentValue.toLowerCase())
      const bStartsWith = b.toLowerCase().startsWith(currentValue.toLowerCase())
      
      if (aStartsWith && !bStartsWith) return -1
      if (bStartsWith && !aStartsWith) return 1
      
      return a.localeCompare(b)
    })
    .slice(0, maxSuggestions)

  return suggestions
}

/**
 * Get smart date suggestions
 */
export const getSmartDateSuggestions = (fieldType: 'start' | 'end'): string[] => {
  const currentYear = new Date().getFullYear()
  const suggestions: string[] = []

  if (fieldType === 'end') {
    // For end dates, suggest "Present" and recent years
    suggestions.push('Present')
    for (let i = 0; i < 5; i++) {
      suggestions.push(`${currentYear - i}-12`)
    }
  } else {
    // For start dates, suggest recent years
    for (let i = 0; i < 10; i++) {
      suggestions.push(`${currentYear - i}-01`)
    }
  }

  return suggestions
}

/**
 * Get template suggestions for common fields
 */
export const getTemplateSuggestions = (fieldType: string): string[] => {
  const templates: Record<string, string[]> = {
    description: [
      'Led development of scalable web applications using modern technologies',
      'Collaborated with cross-functional teams to deliver high-quality software solutions',
      'Implemented best practices for code quality, testing, and documentation',
      'Mentored junior developers and conducted code reviews',
      'Optimized application performance and reduced load times by 40%'
    ],
    achievements: [
      'Increased team productivity by 25% through process improvements',
      'Reduced system downtime by 60% through proactive monitoring',
      'Led migration of legacy systems to modern cloud infrastructure',
      'Implemented automated testing reducing bugs by 50%',
      'Delivered projects 20% ahead of schedule'
    ],
    skills: [
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
      'AWS', 'Docker', 'Kubernetes', 'Git', 'Agile/Scrum'
    ]
  }

  return templates[fieldType] || []
}

/**
 * Get auto-complete suggestions based on field type and context
 */
export const getAutoCompleteSuggestions = (
  fieldType: string,
  currentValue: string,
  context: any = {}
): string[] => {
  const suggestions: string[] = []

  // Add smart suggestions from previous entries
  if (context.previousEntries) {
    const smartSuggestions = getSmartSuggestions(
      fieldType as keyof SuggestionData,
      currentValue,
      context.previousEntries
    )
    suggestions.push(...smartSuggestions)
  }

  // Add template suggestions
  const templateSuggestions = getTemplateSuggestions(fieldType)
  const filteredTemplates = templateSuggestions.filter(template =>
    template.toLowerCase().includes(currentValue.toLowerCase())
  )
  suggestions.push(...filteredTemplates)

  // Add date suggestions for date fields
  if (fieldType.includes('date')) {
    const dateType = fieldType.includes('end') ? 'end' : 'start'
    const dateSuggestions = getSmartDateSuggestions(dateType)
    const filteredDates = dateSuggestions.filter(date =>
      date.toLowerCase().includes(currentValue.toLowerCase())
    )
    suggestions.push(...filteredDates)
  }

  // Remove duplicates and limit results
  return [...new Set(suggestions)].slice(0, 10)
}

/**
 * Validate and suggest corrections for common field types
 */
export const validateAndSuggest = (fieldType: string, value: string): {
  isValid: boolean
  suggestions: string[]
  error?: string
} => {
  const trimmedValue = value.trim()
  
  switch (fieldType) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedValue)) {
        return {
          isValid: false,
          suggestions: [],
          error: 'Please enter a valid email address'
        }
      }
      break
      
    case 'url':
      const urlRegex = /^https?:\/\/.+\..+/
      if (trimmedValue && !urlRegex.test(trimmedValue)) {
        return {
          isValid: false,
          suggestions: [`https://${trimmedValue}`],
          error: 'Please enter a valid URL starting with http:// or https://'
        }
      }
      break
      
    case 'phone':
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      if (trimmedValue && !phoneRegex.test(trimmedValue.replace(/[\s\-\(\)]/g, ''))) {
        return {
          isValid: false,
          suggestions: [],
          error: 'Please enter a valid phone number'
        }
      }
      break
  }
  
  return {
    isValid: true,
    suggestions: []
  }
}
