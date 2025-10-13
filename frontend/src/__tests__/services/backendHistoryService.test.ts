/**
 * Simplified Backend CV History Service Tests
 *
 * Basic tests to ensure the service can be instantiated and core methods exist.
 */

// Mock the API service before importing anything
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}))

import { BackendCVHistoryService } from '../../services/backendHistoryService'

describe('BackendCVHistoryService', () => {
  let historyService: BackendCVHistoryService

  beforeEach(() => {
    historyService = new BackendCVHistoryService()
  })

  it('should be instantiated successfully', () => {
    expect(historyService).toBeInstanceOf(BackendCVHistoryService)
  })

  it('should have required methods', () => {
    expect(typeof historyService.createSnapshot).toBe('function')
    expect(typeof historyService.getHistoryEntries).toBe('function')
    expect(typeof historyService.getDiff).toBe('function')
    expect(typeof historyService.restoreVersion).toBe('function')
    expect(typeof historyService.deleteHistoryEntry).toBe('function')
  })
})
