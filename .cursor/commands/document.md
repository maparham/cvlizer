# Module Documentation Instructions

## Overview
This document provides comprehensive instructions for adding module-level documentation to changed files in the CV Lator project. The focus is on creating clear, maintainable documentation that explains the purpose and functionality of each module.

## Documentation Standards

### 1. Module-Level Documentation (Required)
Every module must include a comprehensive header comment block at the very top of the file, before any imports.

#### Format for TypeScript/JavaScript Files:
```typescript
/**
 * Module Name - Brief Description
 *
 * This module provides [detailed description of what the module does and why it exists].
 *
 * Key responsibilities:
 * - [Primary responsibility 1]
 * - [Primary responsibility 2]
 * - [Primary responsibility 3]
 *
 * Usage context:
 * - [When and how this module should be used]
 * - [Dependencies or requirements]
 */
```

#### Format for Python Files:
```python
"""
Module Name - Brief Description

This module provides [detailed description of what the module does and why it exists].

Key responsibilities:
- [Primary responsibility 1]
- [Primary responsibility 2]
- [Primary responsibility 3]

Usage context:
- [When and how this module should be used]
- [Dependencies or requirements]
"""
```

### 2. Documentation Style Guidelines

#### Prefer Block Comments Over Inline Comments
- **Use multi-line comment blocks** for complex explanations
- **Avoid inline comments** unless absolutely necessary for critical clarifications
- **Block comments** are easier to read and maintain
- **Inline comments** should only be used for brief, essential clarifications

#### Comment Placement
- **Module header**: At the very top, before imports
- **Function/class documentation**: Immediately before the declaration
- **Complex logic**: Above the code block being explained
- **Critical sections**: Above important business logic

### 3. Required Documentation Elements

#### Module Header Must Include:
1. **Module Name**: Clear, descriptive name
2. **Brief Description**: One-line summary of purpose
3. **Detailed Description**: Comprehensive explanation of functionality
4. **Key Responsibilities**: Bulleted list of main functions
5. **Usage Context**: When and how to use the module
6. **Dependencies**: Important external dependencies

#### Function/Class Documentation Must Include:
1. **Purpose**: What the function/class does
2. **Parameters**: Description of all parameters
3. **Return Value**: What the function returns
4. **Side Effects**: Any external state changes
5. **Exceptions**: Possible errors that can be thrown

### 4. Function/Class Documentation Format

#### Format for TypeScript/JavaScript Functions (Google Style):
```typescript
/**
 * Brief description of what the function does.
 *
 * Detailed explanation of the function's purpose and behavior.
 * This can span multiple lines and should provide comprehensive
 * information about the function's behavior.
 *
 * @param {Type} paramName - Description of the parameter
 * @param {Type} [optionalParam=defaultValue] - Description of optional parameter
 * @returns {Type} Description of what the function returns
 * @throws {ErrorType} Description of when this error is thrown
 */
```

#### Format for TypeScript/JavaScript Classes (Google Style):
```typescript
/**
 * Class Name - Brief Description
 *
 * Detailed description of what the class represents and its purpose.
 * This can span multiple lines and should provide comprehensive
 * information about the class's behavior and usage.
 *
 */
class ClassName {
  /**
   * Brief description of the method.
   *
   * @param {Type} paramName - Description of the parameter
   * @returns {Type} Description of what the method returns
   * @throws {ErrorType} Description of when this error is thrown
   */
  methodName(paramName: Type): ReturnType {
    // Implementation
  }
}
```

#### Format for Python Functions (Google Style):
```python
def function_name(param1: Type, param2: Type = None) -> ReturnType:
    """Brief description of what the function does.

    Detailed explanation of the function's purpose and behavior.
    This can span multiple lines and should provide comprehensive
    information about the function's behavior.

    Args:
        param1 (Type): Description of the parameter
        param2 (Type, optional): Description of optional parameter. Defaults to None.

    Returns:
        Type: Description of what the function returns

    Raises:
        ErrorType: Description of when this error is thrown

    """
```

#### Format for Python Classes (Google Style):
```python
class ClassName:
    """Class Name - Brief Description

    Detailed description of what the class represents and its purpose.
    This can span multiple lines and should provide comprehensive
    information about the class's behavior and usage.

    Attributes:
        attribute1 (Type): Description of the attribute
        attribute2 (Type): Description of the attribute

    """

    def method_name(self, param1: Type) -> ReturnType:
        """Brief description of the method.

        Detailed explanation of the method's purpose and behavior.

        Args:
            param1 (Type): Description of the parameter

        Returns:
            ReturnType: Description of what the method returns

        Raises:
            ErrorType: Description of when this error is thrown
        """
```

### 5. Language-Specific Guidelines

#### TypeScript/JavaScript Files:
- Use JSDoc format following Google Style Guide
- Include `@param`, `@returns`, `@throws` tags
- Document React component props and state
- Explain complex business logic
- Document API endpoints and their purposes
- Use proper JSDoc syntax for better IDE support and documentation generation

#### Python Files:
- Use Google Style docstrings for functions and classes
- Follow PEP 257 docstring conventions
- Use `Args:`, `Returns:`, `Raises:` sections
- Document class attributes and methods
- Explain complex algorithms
- Document API endpoints and their purposes
- Use proper docstring format for Sphinx and other documentation generators

### 6. Documentation Quality Standards

#### Writing Guidelines:
- **Clear and concise**: Use simple, direct language
- **Complete**: Cover all important aspects
- **Accurate**: Ensure documentation matches implementation
- **Up-to-date**: Keep documentation current with code changes
- **Consistent**: Follow the same format across all modules

#### Content Requirements:
- **Explain the "why"**: Not just what the code does, but why it exists
- **Provide context**: When and how the module should be used
- **Document assumptions**: Any important assumptions or constraints
- **Note limitations**: Known limitations or future improvements

### 7. Implementation Process

#### For New Files:
1. Add module header documentation before any imports
2. Document all public functions and classes
3. Add comments for complex business logic

#### For Modified Files:
1. Update module header if functionality has changed
2. Add documentation for new functions/classes
3. Update existing documentation if behavior changed

#### For Existing Files:
1. Add module header if missing
2. Document undocumented public functions
3. Add comments for complex logic

### 8. Examples

#### Good Module Header (TypeScript):
```typescript
/**
 * CV Validation Service
 *
 * This module provides comprehensive validation for CV data structures,
 * ensuring data integrity and business rule compliance before saving.
 *
 * Key responsibilities:
 * - Validates CV section data against business rules
 * - Performs cross-field validation and consistency checks
 * - Provides detailed error messages for validation failures
 * - Supports both individual field and full CV validation
 *
 * Usage context:
 * - Import and use validateCV() for full CV validation
 * - Use validateSection() for individual section validation
 * - Check validation results and display errors to users
 *
 * Dependencies:
 * - CV data schemas and types
 * - Business rule definitions
 * - Error handling utilities
 */
```

#### Good Module Header (Python):
```python
"""
CV Parsing Service

This module handles the parsing and extraction of data from uploaded CV files.
It supports multiple file formats and converts unstructured CV content into
structured data that can be used by the CV editor.

Key responsibilities:
- Parse PDF and DOCX CV files
- Extract text content and structure
- Convert unstructured data to structured format
- Handle various CV layouts and formats

Usage context:
- Use parse_cv_file() to process uploaded files
- Returns structured CV data ready for editing
- Handles errors gracefully with detailed error messages

Dependencies:
- PyMuPDF for PDF processing
- python-docx for DOCX processing
- Custom CV data models
"""
```

### 9. Checklist for Documentation Review

#### Module Header Checklist:
- [ ] Module name is clear and descriptive
- [ ] Brief description explains the purpose
- [ ] Detailed description covers functionality
- [ ] Key responsibilities are listed
- [ ] Usage context is provided
- [ ] Dependencies are documented

#### Function/Class Documentation Checklist:
- [ ] Purpose is clearly explained
- [ ] Parameters are documented
- [ ] Return values are described
- [ ] Side effects are noted
- [ ] Exceptions are documented

#### Code Comments Checklist:
- [ ] Complex logic is explained
- [ ] Business rules are documented
- [ ] Non-obvious implementation details are clarified
- [ ] TODO comments are added for known limitations
- [ ] Inline comments are minimal and essential only

### 10. Common Mistakes to Avoid

#### Documentation Mistakes:
- ❌ Writing obvious comments that just repeat the code
- ❌ Using inline comments for complex explanations
- ❌ Forgetting to update documentation when code changes
- ❌ Writing documentation that doesn't match implementation
- ❌ Using technical jargon without explanation

#### Best Practices:
- ✅ Write documentation that explains the "why" not just the "what"
- ✅ Use block comments for complex explanations
- ✅ Keep documentation up-to-date with code changes
- ✅ Write for someone who has never seen the code before

### 11. Documentation Generator Compatibility

#### Supported Documentation Generators:
- **JSDoc**: Full support for TypeScript/JavaScript with Google Style
- **Sphinx**: Full support for Python with Google Style docstrings
- **TypeDoc**: Enhanced TypeScript documentation generation
- **ESDoc**: Alternative JavaScript documentation generator
- **pydoc**: Built-in Python documentation generator
- **Doxygen**: Multi-language documentation generator

#### Google Style Benefits:
- **Wide Compatibility**: Works with most popular documentation generators
- **IDE Support**: Better autocomplete and IntelliSense in IDEs
- **Standard Format**: Follows industry-standard conventions
- **Tool Integration**: Seamless integration with CI/CD pipelines
- **Cross-Platform**: Consistent across different development environments

### 12. Tools and Resources

#### Documentation Tools:
- JSDoc for TypeScript/JavaScript
- Sphinx for Python documentation
- Markdown for README files
- Code comments for inline documentation

#### Review Process:
1. Self-review using the checklist
2. Peer review for accuracy and completeness
3. Update documentation with code changes
4. Regular documentation audits

## Conclusion

Proper module documentation is essential for maintaining a clean, understandable codebase. By following these guidelines, we ensure that all modules are well-documented, making the codebase easier to understand, maintain, and extend.

Remember: Good documentation is an investment in the future of the project. It saves time, reduces bugs, and makes onboarding new developers much easier.
