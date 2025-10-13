import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CVUpload from '../CVUpload'
import { cvApi } from '../../../services/api'

// Mock the API
jest.mock('../../../services/api', () => ({
  cvApi: {
    uploadCV: jest.fn(),
  },
}))

// Mock the CV store
jest.mock('../../../stores/cvStore', () => ({
  useCVStore: jest.fn(() => ({
    uploadCV: mockUploadCV,
  })),
}))

// Mock file validation utility
jest.mock('../../../utils/fileValidation', () => ({
  validateCVFile: jest.fn(),
}))

// Mock FilePreview component
jest.mock('../FilePreview', () => ({
  __esModule: true,
  default: ({ file, onRemove, onUpload, uploading }: any) => (
    <div data-testid="file-preview">
      <div>{file.name}</div>
      <button onClick={onRemove}>Remove</button>
      <button onClick={onUpload} disabled={uploading}>Upload CV</button>
      {uploading && <div>Uploading CV...</div>}
    </div>
  ),
}))

const mockCvApi = cvApi as jest.Mocked<typeof cvApi>
const mockUploadCV = jest.fn()
const mockValidateCVFile = require('../../../utils/fileValidation').validateCVFile as jest.Mock

describe('CVUpload', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Default: validation passes
    mockValidateCVFile.mockReturnValue({ isValid: true })
    mockUploadCV.mockResolvedValue({
      id: 'cv123',
      original_filename: 'test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      parsed_data: { test: 'data' },
      is_parsed: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    })
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

    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    // Wait for file to be selected and validated
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    // Click upload button inside FilePreview
    const uploadButtons = screen.getAllByText('Upload CV')
    const uploadButton = uploadButtons[uploadButtons.length - 1] // Get the button from FilePreview
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(mockUploadCV).toHaveBeenCalledWith(file)
    })

    // Component has a 1-second delay before calling onSuccess
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('should handle drag and drop', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

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
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })
  })

  it('should show error for invalid file type', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

    // Mock validation failure
    mockValidateCVFile.mockReturnValue({
      isValid: false,
      error: 'Please upload a PDF, DOC, or DOCX file'
    })

    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    // Use fireEvent.change with proper file list structure
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    fireEvent.change(fileInput)

    await waitFor(() => {
      expect(mockValidateCVFile).toHaveBeenCalledWith(file)
      expect(screen.getByText('Please upload a PDF, DOC, or DOCX file')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(mockUploadCV).not.toHaveBeenCalled()
  })

  it('should show error for file too large', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }) // 11MB

    // Mock validation failure
    mockValidateCVFile.mockReturnValue({
      isValid: false,
      error: 'File size must be less than 10MB'
    })

    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    // Use fireEvent.change with proper file list structure
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    fireEvent.change(fileInput)

    await waitFor(() => {
      expect(mockValidateCVFile).toHaveBeenCalledWith(file)
      expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(mockUploadCV).not.toHaveBeenCalled()
  })

  it('should show upload progress', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    // Mock a delayed response
    mockUploadCV.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        id: 'cv123',
        original_filename: 'test.pdf',
        file_size: 1024,
        file_type: 'application/pdf',
        parsed_data: { test: 'data' },
        is_parsed: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }), 300))
    )

    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    // Wait for file to be selected
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    // Click upload button inside FilePreview
    const uploadButtons = screen.getAllByText('Upload CV')
    const uploadButton = uploadButtons[uploadButtons.length - 1]
    await user.click(uploadButton)

    // The component immediately shows uploading state
    await waitFor(() => {
      const uploadingTexts = screen.getAllByText('Uploading CV...')
      expect(uploadingTexts.length).toBeGreaterThan(0)
    })

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should show success message after upload', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    // Wait for file to be selected
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    // Click upload button inside FilePreview
    const uploadButtons = screen.getAllByText('Upload CV')
    const uploadButton = uploadButtons[uploadButtons.length - 1]
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText('CV uploaded successfully! AI is now parsing your CV in the background.')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should show error message on upload failure', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    mockUploadCV.mockRejectedValueOnce({
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

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    // Wait for file to be selected
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    // Click upload button inside FilePreview
    const uploadButtons = screen.getAllByText('Upload CV')
    const uploadButton = uploadButtons[uploadButtons.length - 1]
    fireEvent.click(uploadButton)

    await waitFor(() => {
      // Component shows response.data.detail if available
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    }, { timeout: 3000 })

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

  it('should not close dialog during upload', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    // Mock a long-running upload
    mockUploadCV.mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    )

    render(
      <CVUpload
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    // Wait for file to be selected
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    // Click upload button inside FilePreview
    const uploadButtons = screen.getAllByText('Upload CV')
    const uploadButton = uploadButtons[uploadButtons.length - 1]
    await user.click(uploadButton)

    // Wait for uploading state
    await waitFor(() => {
      const uploadingTexts = screen.getAllByText('Uploading CV...')
      expect(uploadingTexts.length).toBeGreaterThan(0)
    })

    // Try to close during upload
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).not.toHaveBeenCalled()
  })
})
