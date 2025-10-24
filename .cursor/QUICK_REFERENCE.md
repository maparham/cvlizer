# CV Optimizer - Quick Reference Guide

> **Quick lookup for common patterns and rules. See [CLAUDE.md](../CLAUDE.md) for comprehensive documentation.**

## 🚨 Critical Rules (Never Break These)

### 1. Always Debug Before Fixing
**NEVER propose a fix without first:**
- Using Read tool to examine the actual code
- Quoting the relevant code sections in your response
- Explaining what the code currently does
- Identifying the specific root cause

**❌ FORBIDDEN:**
- Assuming behavior based on file names or patterns
- Proposing fixes without reading actual implementation
- Applying "common solutions" without understanding the specific code

### 2. Never Claim Complete Without User Verification
**NEVER say "fixed", "done", or "resolved" until:**
- User has tested and confirmed it works, OR
- You've added new tests + 100% pass rate + internal logic only

**✅ ALWAYS say instead:**
"Changes implemented. Please verify by [specific steps]. Let me know if the issue persists."

### 3. Server Management
**NEVER start, stop, or restart servers** unless user explicitly requests.
- Hot-reload handles all changes automatically
- Applies to: frontend, backend, databases, all services

### 4. Never Break Existing Functionality
- Preserve ALL existing behavior when fixing issues
- Make the **smallest possible change**
- Understand fully before changing anything
- NO REGRESSIONS - test thoroughly

### 5. Analyze Architecture First
- **Search codebase** for similar functionality before implementing
- Check existing patterns, state management, UI components
- Don't duplicate functionality or create new patterns when existing ones work

## 🏗️ Architecture Quick Reference

### Backend Request Flow
```
Request → Middleware (clerk_auth.py) → API Route → Service Layer → Database → Response
```
- **ALWAYS** use `get_effective_user` dependency for auth
- **ALWAYS** filter by `user_id` for user-owned resources
- Business logic goes in **service layer**, not API routes

### Frontend Data Flow
```
User Action → Component → Custom Hook → Zustand Store → API Service → Backend
                                                ↓
                                           Response → Store Update → Component Re-render
```
- Use **Zustand selectors** to prevent unnecessary re-renders
- Extract complex logic into **custom hooks**
- API calls through **service layer** (not directly in components)

## 🔧 Common Patterns

### Backend API Endpoint Pattern
```python
from src.api.dependencies import get_effective_user
from fastapi import Depends, HTTPException, status

@router.post("/resource")
async def create_resource(
    data: ResourceCreateSchema,
    user: User = Depends(get_effective_user),
    db: Session = Depends(get_db)
) -> ResourceResponse:
    """
    Create a new resource for the authenticated user.

    Args:
        data: Resource creation data
        user: Authenticated user (handles impersonation)
        db: Database session

    Returns:
        ResourceResponse: Created resource
    """
    # Validate user ownership if needed
    existing = db.query(Resource).filter_by(user_id=user.id).first()

    # Call service layer
    resource = resource_service.create(db, user.id, data)

    return ResourceResponse.from_orm(resource)
```

### Frontend Component Pattern
```typescript
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useStore } from '../stores/store';

/**
 * ComponentName - Brief description of what this component does
 *
 * Usage:
 * ```tsx
 * <ComponentName prop1="value" prop2={123} />
 * ```
 */

interface ComponentNameProps {
  prop1: string;
  prop2: number;
  onAction?: () => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2,
  onAction
}) => {
  // Use selectors to prevent unnecessary re-renders
  const data = useStore(state => state.data);

  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return expensiveOperation(data);
  }, [data]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">{prop1}</Typography>
      {/* Component content */}
    </Box>
  );
};
```

### AI Service Pattern
```python
async def ai_operation(db: Session, user_id: str, data: dict):
    """AI operation with proper error handling and logging."""

    # 1. Check if AI is enabled
    if not is_ai_enabled():
        raise HTTPException(status_code=503, detail="AI service unavailable")

    # 2. Call OpenAI with retry logic
    for attempt in range(3):
        try:
            response = await openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )

            # 3. Log usage
            await ai_usage_service.log_usage(
                db=db,
                user_id=user_id,
                operation="operation_name",
                tokens=response.usage.total_tokens,
                cost=calculate_cost(response.usage)
            )

            return response

        except Exception as e:
            if attempt == 2:  # Last attempt
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

### Background Task Pattern
```python
def background_ai_task(task_id: str, user_id: str, data: dict):
    """Background task with proper session management."""
    db = SessionLocal()
    try:
        # Update task status
        task = db.query(Task).filter_by(id=task_id).first()
        task.status = "processing"
        db.commit()

        # Perform AI operation
        result = perform_ai_operation(data)

        # Update with result
        task.status = "completed"
        task.result = result
        db.commit()

    except Exception as e:
        task.status = "failed"
        task.error = str(e)
        db.commit()
        raise
    finally:
        db.close()  # ALWAYS close session
```

## 🧪 Testing Quick Reference

### Backend Test Pattern
```python
def test_endpoint(client, test_user, test_db):
    """Test endpoint with authenticated user."""
    # Arrange
    headers = {"Authorization": f"Bearer {test_user.token}"}
    data = {"field": "value"}

    # Act
    response = client.post("/api/endpoint", json=data, headers=headers)

    # Assert
    assert response.status_code == 200
    assert response.json()["field"] == "value"
```

### Frontend Test Pattern
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('should handle user interaction', () => {
    // Arrange
    const onAction = jest.fn();
    render(<ComponentName prop1="test" prop2={123} onAction={onAction} />);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(onAction).toHaveBeenCalled();
  });
});
```

## 📝 Documentation Quick Reference

### File Header (TypeScript)
```typescript
/**
 * Module Name - Brief description of module purpose
 *
 * This module handles [key responsibility]. It should be used when [usage context].
 *
 * Key features:
 * - Feature 1
 * - Feature 2
 *
 * Dependencies:
 * - dependency1
 * - dependency2
 *
 * Example:
 * ```typescript
 * import { functionName } from './module';
 * const result = functionName(params);
 * ```
 */
```

### File Header (Python)
```python
"""
Module Name - Brief description of module purpose.

This module handles [key responsibility]. It should be used when [usage context].

Key features:
- Feature 1
- Feature 2

Dependencies:
- dependency1
- dependency2

Example:
    from module import function_name
    result = function_name(params)
"""
```

## 🔒 Security Checklist

- [ ] Use `get_effective_user` dependency for auth
- [ ] Filter all queries by `user_id`
- [ ] Validate inputs with Pydantic schemas
- [ ] Sanitize user inputs before processing
- [ ] Validate file types and sizes
- [ ] Use ORM only (no raw SQL)
- [ ] Never expose API keys to frontend
- [ ] Generic error messages for users
- [ ] HTTPS only in production

## 🐛 Bug Fix Workflow

1. **Read Actual Code**: Use Read tool, quote relevant sections, explain current behavior
2. **Analyze**: Search codebase for related code and patterns
3. **Root Cause**: Identify the actual problem source (not symptoms)
4. **Fix at Source**: Backend validation, API format, or data entry
5. **Minimal Change**: Don't modify working code, one line fix > ten lines
6. **Test E2E**: User action → API → DB → Response → UI
7. **Add Logs**: `console.log('Debug:', JSON.stringify(obj, null, 2))`
8. **Wait for Verification**: Provide test steps, NEVER claim "fixed" until user confirms
9. **No Regressions**: Ensure no new problems introduced

**Required Response Format:**
```
Investigation:
- [x] Read code at: [file:line]
- [x] Current behavior: [quote code]
- [x] Root cause: [explanation]

Changes implemented. Please verify by:
1. [specific test step]
2. [expected result]

Let me know if the issue persists.
```

## 🎯 SOLID Principles Quick Reference

- **SRP**: One class/component = one responsibility
- **OCP**: Open for extension, closed for modification
- **LSP**: Subtypes must be substitutable
- **ISP**: No unused methods/props
- **DIP**: Depend on abstractions

## 📚 Import Order

### Backend (Python)
```python
# 1. Standard library
import os
from datetime import datetime

# 2. Third-party
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# 3. Local application
from src.models import User, CV
from src.services import ai_service
from src.schemas import CVCreateSchema
```

### Frontend (TypeScript)
```typescript
// 1. React
import React, { useState, useEffect } from 'react';

// 2. Third-party
import { Box, Typography } from '@mui/material';
import axios from 'axios';

// 3. Local
import { useStore } from '../stores/store';
import { apiService } from '../services/apiService';

// 4. Types
import type { User, CV } from '../types';
```

## 🔗 Quick Links

- **API Docs (Swagger)**: http://localhost:8000/docs
- **Frontend Dev Server**: http://localhost:3000
- **Backend Dev Server**: http://localhost:8000

## 📋 MVP Coverage Targets

- **Backend**: 80%+ test coverage
- **Frontend**: 70%+ test coverage
- Focus on critical business logic and user workflows
