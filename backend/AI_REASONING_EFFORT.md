# AI Reasoning Effort Configuration

## Overview

The AI reasoning effort is now configurable via the `AI_REASONING_EFFORT` environment variable, allowing you to control the quality/cost/speed trade-off for all AI operations without code changes.

## Configuration

### Environment Variable

Add to your `.env` file:

```bash
AI_REASONING_EFFORT=medium
```

### Available Options

| Value | Description | Use Case |
|-------|-------------|----------|
| `low` | **Faster, cheaper, may take shortcuts**<br>- Quick responses<br>- Lower quality<br>- May quote verbatim or use simpler logic | Development, testing, or non-critical operations |
| `medium` | **Balanced quality and cost (RECOMMENDED)**<br>- Good quality responses<br>- Reasonable speed<br>- Natural, professional content | Production default, general use |
| `high` | **Better quality, slower, more expensive**<br>- Highest quality responses<br>- More reasoning and analysis<br>- Longer processing time | Critical content, important presentations |

### Default Value

If not specified, defaults to `medium` (recommended for production).

## Where It's Used

The reasoning effort configuration is applied to AI operations:

### General AI Operations (uses `AI_REASONING_EFFORT`)

2. **Content Enhancement** (`content_enhancement.py`) - Improving CV bullet points
3. **Section Generation** (`section_generation.py`) - Creating "Why I'm a Good Fit" sections
4. **Job Fit Analysis** (`job_fit.py`) - Analyzing candidate-job match
5. **ATS Optimization** (`ats_optimization.py`) - Keyword analysis and suggestions

### Parsing Operations (uses `AI_PARSING_REASONING_EFFORT`)

1. **CV Parsing** (`cv_parsing.py`) - Extracting structured data from CV text
6. **Job Extraction** (`job_extraction.py`) - Parsing job descriptions from URLs

> **Note:** Parsing operations use a separate configuration (`AI_PARSING_REASONING_EFFORT`) that defaults to `"low"` for faster, more cost-effective parsing since these are more structured operations.

## Examples

### Recommended Production Setup
```bash
# General AI operations - balanced quality
AI_REASONING_EFFORT=medium

# Parsing operations - fast and efficient
AI_PARSING_REASONING_EFFORT=low
```

### Development/Testing (Fast, Cheap)
```bash
AI_REASONING_EFFORT=low
AI_PARSING_REASONING_EFFORT=low
```

### High-Quality Content Generation
```bash
# High quality for content generation
AI_REASONING_EFFORT=high

# Keep parsing fast
AI_PARSING_REASONING_EFFORT=low
```

## Impact on Quality

### With `effort="low"`:
- AI may take shortcuts
- May quote job requirements verbatim
- Less natural content generation
- Faster processing

### With `effort="medium"`:
- Balanced approach
- Natural, professional content
- Proper paraphrasing and synthesis
- Good reasoning quality

### With `effort="high"`:
- Maximum quality
- Deep analysis and reasoning
- Most natural and professional output
- Slower processing, higher cost

## Cost Implications

The reasoning effort directly impacts token usage and API costs:

- **Low**: Fewer reasoning tokens, faster completion
- **Medium**: Moderate reasoning tokens
- **High**: More reasoning tokens, higher cost

## Implementation Details

The configuration is defined in `backend/src/config.py`:

```python
class AIConfig:
    # General AI operations reasoning effort
    REASONING_EFFORT: str = os.getenv("AI_REASONING_EFFORT", "medium")

    # Parsing-specific reasoning effort (CV and JD parsing)
    PARSING_REASONING_EFFORT: str = os.getenv("AI_PARSING_REASONING_EFFORT", "low")
```

**General AI services** use `REASONING_EFFORT`:

```python
from openai.types.shared_params import Reasoning
from src.config import AIConfig

response = client.responses.parse(
    model=AIConfig.OPENAI_MODEL,
    input=[...],
    text_format=Schema,
    reasoning=Reasoning(effort=AIConfig.REASONING_EFFORT),
)
```

**Parsing services** use `PARSING_REASONING_EFFORT`:

```python
response = client.responses.parse(
    model=AIConfig.OPENAI_MODEL,
    input=[...],
    text_format=Schema,
    reasoning=Reasoning(effort=AIConfig.PARSING_REASONING_EFFORT),
)
```

## Testing

All 25 AI service tests pass with the configurable reasoning effort.

Run tests:
```bash
cd backend
source venv/bin/activate
python -m pytest tests/unit/test_ai_service.py tests/unit/test_job_fit_generation.py -v
```

## Troubleshooting

### Quality Issues
If AI responses are too simplistic or quote verbatim:
- Change `AI_REASONING_EFFORT=low` to `medium` or `high`

### Performance Issues
If AI operations are too slow:
- Change `AI_REASONING_EFFORT=high` to `medium` or `low`

### Cost Issues
If API costs are too high:
- Change `AI_REASONING_EFFORT=high` to `medium` or `low`
- Monitor token usage in logs

## Related Configuration

Other AI configuration options in `.env`:

```bash
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-5-nano

# Reasoning effort settings
AI_REASONING_EFFORT=medium              # For content generation, analysis
AI_PARSING_REASONING_EFFORT=low         # For CV/JD parsing

# Other AI settings
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=4000
```

## Summary

| Environment Variable | Default | Used For | Recommendation |
|---------------------|---------|----------|----------------|
| `AI_REASONING_EFFORT` | `medium` | Content enhancement, section generation, job fit analysis, ATS optimization | Keep at `medium` for production |
| `AI_PARSING_REASONING_EFFORT` | `low` | CV parsing, Job description extraction | Keep at `low` for fast parsing |
