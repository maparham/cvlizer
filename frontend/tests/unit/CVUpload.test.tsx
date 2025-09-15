import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CVUpload from '../../src/components/cv/CVUpload'
import { cvApi } from '../../src/services/api'

// Mock the API
jest.mock('../../src/services/api', () => ({
  cvApi: {
    uploadCV: jest.fn(),
  },
}))

const mockCvApi = cvApi as jest.Mocked<typeof cvApi>

describe('CVUpload', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render upload dialog', () => {
    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    expect(screen.getByText('Upload CV')).toBeInTheDocument()
    expect(screen.getByText('Drag & drop your CV here')).toBeInTheDocument()
    expect(screen.getByText('Supported formats: PDF, DOC, DOCX (max 10MB)')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(
      <CVUpload
        open={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    expect(screen.queryByText('Upload CV')).not.toBeInTheDocument()
  })

  it('should handle file selection via input', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    mockCvApi.uploadCV.mockResolvedValueOnce({
      id: 'cv123',
      original_filename: 'test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      parsed_data: { test: 'data' },
      is_parsed: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    })
    
    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    const fileInput = screen.getByLabelText(/file/i)
    await user.upload(fileInput, file)
    
    await waitFor(() => {
      expect(mockCvApi.uploadCV).toHaveBeenCalledWith(file)
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should handle drag and drop', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    mockCvApi.uploadCV.mockResolvedValueOnce({
      id: 'cv123',
      original_filename: 'test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      parsed_data: { test: 'data' },
      is_parsed: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    })
    
    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    const dropZone = screen.getByText('Drag & drop your CV here').closest('div')
    
    fireEvent.dragEnter(dropZone!)
    expect(screen.getByText('Drop your CV here')).toBeInTheDocument()
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    })
    
    await waitFor(() => {
      expect(mockCvApi.uploadCV).toHaveBeenCalledWith(file)
    })
  })

  it('should show error for invalid file type', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    
    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    const fileInput = screen.getByLabelText(/file/i)
    await user.upload(fileInput, file)
    
    await waitFor(() => {
      expect(screen.getByText('Please upload a PDF, DOC, or DOCX file')).toBeInTheDocument()
    })
    
    expect(mockCvApi.uploadCV).not.toHaveBeenCalled()
  })

  it('should show error for file too large', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }) // 11MB
    
    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    const fileInput = screen.getByLabelText(/file/i)
    await user.upload(fileInput, file)
    
    await waitFor(() => {
      expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument()
    })
    
    expect(mockCvApi.uploadCV).not.toHaveBeenCalled()
  })

  it('should show upload progress', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    // Mock a delayed response
    mockCvApi.uploadCV.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        id: 'cv123',
        original_filename: 'test.pdf',
        file_size: 1024,
        file_type: 'application/pdf',
        parsed_data: { test: 'data' },
        is_parsed: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }), 100))
    )
    
    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    const fileInput = screen.getByLabelText(/file/i)
    await user.upload(fileInput, file)
    
    await waitFor(() => {
      expect(screen.getByText('Uploading and parsing CV...')).toBeInTheDocument()
    })
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should show success message after upload', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    mockCvApi.uploadCV.mockResolvedValueOnce({
      id: 'cv123',
      original_filename: 'test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      parsed_data: { test: 'data' },
      is_parsed: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    })
    
    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    const fileInput = screen.getByLabelText(/file/i)
    await user.upload(fileInput, file)
    
    await waitFor(() => {
      expect(screen.getByText('CV uploaded and parsed successfully!')).toBeInTheDocument()
    })
  })

  it('should show error message on upload failure', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    mockCvApi.uploadCV.mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Upload failed'
        }
      }
    })
    
    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    const fileInput = screen.getByLabelText(/file/i)
    await user.upload(fileInput, file)
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
    
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('should close dialog on cancel', () => {
    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should not close dialog during upload', () => {
    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )
    
    // Simulate uploading state
    const fileInput = screen.getByLabelText(/file/i)
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    // Mock a long-running upload
    mockCvApi.uploadCV.mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    )
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    // Try to close during upload
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).not.toHaveBeenCalled()
  })
})
