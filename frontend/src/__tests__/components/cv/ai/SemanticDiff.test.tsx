/**
 * Unit tests for SemanticDiff component
 *
 * Tests the HTML diff rendering with DOMPurify sanitization
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SemanticDiff } from '../../../../components/cv/ai/SemanticDiff';

describe('SemanticDiff', () => {
  describe('Empty content handling', () => {
    it('should return null for empty string', () => {
      const { container } = render(<SemanticDiff htmlDiff="" />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      const { container } = render(<SemanticDiff htmlDiff="   " />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('HTML rendering', () => {
    it('should render HTML with del and ins tags', () => {
      const input = '<del>Leveraged</del><ins>Used</ins>';
      const { container } = render(<SemanticDiff htmlDiff={input} />);

      expect(container.querySelector('del')).toHaveTextContent('Leveraged');
      expect(container.querySelector('ins')).toHaveTextContent('Used');
    });

    it('should convert newlines to br tags', () => {
      const input = 'Line 1\nLine 2';
      const { container } = render(<SemanticDiff htmlDiff={input} />);

      const brTags = container.querySelectorAll('br');
      expect(brTags.length).toBe(1);
    });

    it('should handle mixed content', () => {
      const input = 'The <del>job is</del><ins>job was</ins> challenging';
      const { container } = render(<SemanticDiff htmlDiff={input} />);

      expect(container.querySelector('del')).toHaveTextContent('job is');
      expect(container.querySelector('ins')).toHaveTextContent('job was');
      expect(container.textContent).toContain('The');
      expect(container.textContent).toContain('challenging');
    });
  });

  describe('Sanitization', () => {
    it('should sanitize dangerous HTML tags', () => {
      const input = '<script>alert("xss")</script><del>old</del><ins>new</ins>';
      const { container } = render(<SemanticDiff htmlDiff={input} />);

      // Script tag should be removed
      expect(container.querySelector('script')).toBeNull();
      expect(container.textContent).not.toContain('alert');

      // But del and ins should remain
      expect(container.querySelector('del')).toHaveTextContent('old');
      expect(container.querySelector('ins')).toHaveTextContent('new');
    });

    it('should remove disallowed attributes', () => {
      const input = '<del onclick="alert(1)">old</del><ins style="color:red">new</ins>';
      const { container } = render(<SemanticDiff htmlDiff={input} />);

      const delEl = container.querySelector('del');
      const insEl = container.querySelector('ins');

      expect(delEl?.hasAttribute('onclick')).toBe(false);
      expect(insEl?.hasAttribute('style')).toBe(false);
    });
  });

  describe('Styling', () => {
    it('should render with custom className', () => {
      const { container } = render(
        <SemanticDiff htmlDiff="<del>old</del><ins>new</ins>" className="custom-class" />
      );

      const box = container.querySelector('.custom-class');
      expect(box).toBeInTheDocument();
    });

    it('should apply del styling via CSS', () => {
      const { container } = render(<SemanticDiff htmlDiff="<del>removed</del>" />);

      // Just check that the element exists - actual styling is applied via sx prop
      expect(container.querySelector('del')).toBeInTheDocument();
    });

    it('should apply ins styling via CSS', () => {
      const { container } = render(<SemanticDiff htmlDiff="<ins>added</ins>" />);

      // Just check that the element exists - actual styling is applied via sx prop
      expect(container.querySelector('ins')).toBeInTheDocument();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple changes in one line', () => {
      const input = 'Led <del>a team</del><ins>team of 5 engineers</ins> and <del>worked</del><ins>collaborated</ins>';
      const { container } = render(<SemanticDiff htmlDiff={input} />);

      const delTags = container.querySelectorAll('del');
      const insTags = container.querySelectorAll('ins');

      expect(delTags.length).toBe(2);
      expect(insTags.length).toBe(2);
      expect(delTags[0]).toHaveTextContent('a team');
      expect(insTags[0]).toHaveTextContent('team of 5 engineers');
    });

    it('should handle multi-line content with newlines', () => {
      const input = '- First item\n- <del>Old</del><ins>New</ins> second item\n- Third item';
      const { container } = render(<SemanticDiff htmlDiff={input} />);

      expect(container.querySelector('del')).toHaveTextContent('Old');
      expect(container.querySelector('ins')).toHaveTextContent('New');

      // Should have converted newlines to br tags
      const brTags = container.querySelectorAll('br');
      expect(brTags.length).toBe(2);
    });

    it('should handle only additions (no deletions)', () => {
      const input = 'Text with <ins>new addition</ins> here';
      const { container } = render(<SemanticDiff htmlDiff={input} />);

      expect(container.querySelector('ins')).toHaveTextContent('new addition');
      expect(container.querySelector('del')).toBeNull();
    });

    it('should handle only deletions (no additions)', () => {
      const input = 'Text with <del>removed part</del> here';
      const { container } = render(<SemanticDiff htmlDiff={input} />);

      expect(container.querySelector('del')).toHaveTextContent('removed part');
      expect(container.querySelector('ins')).toBeNull();
    });
  });
});
