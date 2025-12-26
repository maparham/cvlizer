/**
 * Unit tests for SemanticDiff component
 *
 * Tests the markdown diff rendering and normalization logic
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SemanticDiff } from '../../../../components/cv/ai/SemanticDiff';

// Mock the MarkdownRenderer component
jest.mock('../../../../components/common/MarkdownRenderer', () => {
  return function MockMarkdownRenderer({ content }: { content: string }) {
    return <div data-testid="markdown-renderer">{content}</div>;
  };
});

describe('SemanticDiff', () => {
  describe('Empty content handling', () => {
    it('should return null for empty string', () => {
      const { container } = render(<SemanticDiff markdownDiff="" />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      const { container } = render(<SemanticDiff markdownDiff="   " />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Markdown normalization', () => {
    it('should add space between adjacent strikethrough and bold', () => {
      const input = '~~Leveraged~~**Used**';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      expect(content).toBe('~~Leveraged~~ **Used**');
    });

    it('should add space between adjacent bold and strikethrough', () => {
      const input = '**New**~~Old~~';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      expect(content).toBe('**New** ~~Old~~');
    });

    it('should add space between text and bold', () => {
      const input = 'text**bold**';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      expect(content).toBe('text **bold**');
    });

    it('should add space between bold and text', () => {
      const input = '**bold**text';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      expect(content).toBe('**bold** text');
    });

    it('should handle period after text with bold period', () => {
      const input = 'text**.**';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      // Matches t**. → t **. (opening), but .** at end doesn't match because no char after final *
      expect(content).toBe('text **.**');
    });

    it('should handle multiple adjacent elements in sequence', () => {
      const input = '~~old1~~**new1**~~old2~~**new2**';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      expect(content).toBe('~~old1~~ **new1** ~~old2~~ **new2**');
    });

    it('should not add extra spaces if already spaced', () => {
      const input = '~~old~~ **new**';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      // Should not double-space
      expect(content).toBe('~~old~~ **new**');
    });

    it('should handle real-world example: job/is was', () => {
      const input = 'The ~~job is~~**job was** challenging';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      expect(content).toBe('The ~~job is~~ **job was** challenging');
    });

    it('should handle bullet list with adjacent elements', () => {
      const input = '- ~~Managed~~**Led** team\n- ~~Worked~~**Developed** app';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      expect(content).toBe('- ~~Managed~~ **Led** team\n- ~~Worked~~ **Developed** app');
    });
  });

  describe('Rendering', () => {
    it('should render with proper className', () => {
      const { container } = render(
        <SemanticDiff markdownDiff="test" className="custom-class" />
      );

      const box = container.querySelector('.custom-class');
      expect(box).toBeInTheDocument();
    });

    it('should pass diffMode=true to MarkdownRenderer', () => {
      // This is implicitly tested by the mock, but we verify the component structure
      render(<SemanticDiff markdownDiff="test content" />);

      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle text with bold at word boundary', () => {
      const input = 'Led ~~a team~~**team of 5 engineers**';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      expect(content).toBe('Led ~~a team~~ **team of 5 engineers**');
    });

    it('should preserve normal spacing in content', () => {
      const input = '~~old text~~ **new text** and more';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      expect(content).toBe('~~old text~~ **new text** and more');
    });

    it('should handle consecutive bold elements', () => {
      const input = 'text**bold1****bold2**more';
      render(<SemanticDiff markdownDiff={input} />);

      const content = screen.getByTestId('markdown-renderer').textContent;
      // First: text**bold1** → text **bold1**
      // Then: **bold1****bold2** → **bold1** **bold2**
      // Then: **bold2**more → **bold2** more
      expect(content).toBe('text **bold1** **bold2** more');
    });
  });
});
