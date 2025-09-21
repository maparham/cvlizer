/**
 * Component that performs initial validation when CV data is loaded
 */
import React, { useEffect } from 'react'
import { useCVEditor } from '../../contexts/CVEditorContext'
import { validateCVData } from '../../utils/validationUtils'

interface InitialValidationProps {
  children: React.ReactNode
}

export const InitialValidation: React.FC<InitialValidationProps> = ({ children }) => {
  const { cvData, setValidationErrors, validationErrors } = useCVEditor()

  useEffect(() => {
    // Only run initial validation if we don't already have validation errors
    // (to avoid overriding errors from save attempts)
    if (cvData && validationErrors.length === 0) {
      const errors = validateCVData(cvData)
      if (errors.length > 0) {
        setValidationErrors(errors)
      }
    }
  }, [cvData, setValidationErrors, validationErrors.length])

  return <>{children}</>
}
