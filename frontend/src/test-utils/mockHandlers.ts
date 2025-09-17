/**
 * Mock handlers for API calls in tests
 */

import { rest } from 'msw'
import { mockUser, mockCV, mockJobDescription, mockAuthTokens, mockPaginationResponse } from './testData'

export const authHandlers = [
  // Login
  rest.post('/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockAuthTokens)
    )
  }),

  // Register
  rest.post('/auth/register', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockAuthTokens)
    )
  }),

  // Refresh token
  rest.post('/auth/refresh', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockAuthTokens)
    )
  }),

  // Logout
  rest.post('/auth/logout', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Successfully logged out' })
    )
  }),

  // Get current user
  rest.get('/auth/me', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockUser)
    )
  })
]

export const cvHandlers = [
  // Upload CV
  rest.post('/api/cvs/', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockCV)
    )
  }),

  // List CVs
  rest.get('/api/cvs/', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockPaginationResponse)
    )
  }),

  // Get CV by ID
  rest.get('/api/cvs/:id', (req, res, ctx) => {
    const { id } = req.params
    if (id === 'cv-123') {
      return res(
        ctx.status(200),
        ctx.json(mockCV)
      )
    }
    return res(
      ctx.status(404),
      ctx.json({ detail: 'CV not found' })
    )
  }),

  // Update CV
  rest.put('/api/cvs/:id', (req, res, ctx) => {
    const { id } = req.params
    if (id === 'cv-123') {
      return res(
        ctx.status(200),
        ctx.json({ ...mockCV, ...req.body })
      )
    }
    return res(
      ctx.status(404),
      ctx.json({ detail: 'CV not found' })
    )
  }),

  // Delete CV
  rest.delete('/api/cvs/:id', (req, res, ctx) => {
    const { id } = req.params
    if (id === 'cv-123') {
      return res(
        ctx.status(200),
        ctx.json({ message: 'CV deleted successfully' })
      )
    }
    return res(
      ctx.status(404),
      ctx.json({ detail: 'CV not found' })
    )
  })
]

export const jobDescriptionHandlers = [
  // Create job description
  rest.post('/api/job-descriptions/', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockJobDescription)
    )
  }),

  // List job descriptions
  rest.get('/api/job-descriptions/', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        job_descriptions: [mockJobDescription],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1
      })
    )
  }),

  // Get job description by ID
  rest.get('/api/job-descriptions/:id', (req, res, ctx) => {
    const { id } = req.params
    if (id === 'job-123') {
      return res(
        ctx.status(200),
        ctx.json(mockJobDescription)
      )
    }
    return res(
      ctx.status(404),
      ctx.json({ detail: 'Job description not found' })
    )
  }),

  // Update job description
  rest.put('/api/job-descriptions/:id', (req, res, ctx) => {
    const { id } = req.params
    if (id === 'job-123') {
      return res(
        ctx.status(200),
        ctx.json({ ...mockJobDescription, ...req.body })
      )
    }
    return res(
      ctx.status(404),
      ctx.json({ detail: 'Job description not found' })
    )
  }),

  // Delete job description
  rest.delete('/api/job-descriptions/:id', (req, res, ctx) => {
    const { id } = req.params
    if (id === 'job-123') {
      return res(
        ctx.status(200),
        ctx.json({ message: 'Job description deleted successfully' })
      )
    }
    return res(
      ctx.status(404),
      ctx.json({ detail: 'Job description not found' })
    )
  })
]

export const aiHandlers = [
  // Get AI suggestions
  rest.post('/api/ai/suggestions', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        suggestions: {
          personal_info: {
            suggestions: [
              {
                field: 'full_name',
                current: 'John Doe',
                suggested: 'John A. Doe',
                reason: 'Adding middle initial for professionalism'
              }
            ]
          }
        }
      })
    )
  }),

  // Optimize CV
  rest.post('/api/ai/optimize', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        optimized_data: mockCV.parsed_data,
        suggestions: []
      })
    )
  })
]

export const errorHandlers = [
  // Auth errors
  rest.post('/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({ detail: 'Incorrect email or password' })
    )
  }),

  rest.post('/auth/register', (req, res, ctx) => {
    return res(
      ctx.status(400),
      ctx.json({ detail: 'Email already registered' })
    )
  }),

  // CV errors
  rest.post('/api/cvs/', (req, res, ctx) => {
    return res(
      ctx.status(400),
      ctx.json({ detail: 'File type not allowed' })
    )
  }),

  rest.get('/api/cvs/:id', (req, res, ctx) => {
    return res(
      ctx.status(404),
      ctx.json({ detail: 'CV not found' })
    )
  }),

  // Server errors
  rest.get('/api/cvs/', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ detail: 'Internal server error' })
    )
  })
]

export const allHandlers = [
  ...authHandlers,
  ...cvHandlers,
  ...jobDescriptionHandlers,
  ...aiHandlers
]

