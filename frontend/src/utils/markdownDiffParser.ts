/**
 * Markdown Diff Parser Utility
 *
 * Parses markdown_diff format to extract the corrected text.
 * Removes strikethrough markers (~~text~~) and bold markers (**text**),
 * keeping only the final corrected text.
 *
 * Format:
 * - ~~strikethrough~~ for removed text
 * - **bold** for added text
 *
 * Example:
 * Input: "Led ~~a team~~ **team of 5 engineers** in developing **scalable** web applications"
 * Output: "Led team of 5 engineers in developing scalable web applications"
 */

/**
 * Parses markdown_diff string to extract corrected text
 *
 * Processing steps:
 * 1. Converts literal \n escape sequences to actual newlines
 * 2. Removes strikethrough markers (~~text~~) and their content
 * 3. Removes bold markers (**text**) but keeps the content
 * 4. Collapses multiple consecutive spaces within lines to single space
 * 5. Preserves paragraph breaks (empty lines between content)
 * 6. Removes leading/trailing whitespace (including leading/trailing newlines)
 *
 * @param markdownDiff - The markdown diff string with strikethrough and bold markers
 * @returns The corrected text with all markers removed and whitespace normalized
 *
 * @example
 * // Bullet list with corrections
 * parseMarkdownDiff("- ~~Old~~ **New** item\\n- Another item")
 * // Returns: "- New item\n- Another item"
 *
 * @example
 * // Paragraph with corrections and breaks
 * parseMarkdownDiff("Para 1 with ~~old~~ **new** text.\\n\\nPara 2 here.")
 * // Returns: "Para 1 with new text.\n\nPara 2 here."
 */
export function parseMarkdownDiff(markdownDiff: string): string {
  if (!markdownDiff || markdownDiff.trim() === '') {
    return '';
  }

  let result = markdownDiff;

  // Convert literal \n escape sequences to actual newlines
  // This handles cases where the backend sends literal "\n" (backslash + n)
  result = result.replace(/\\n/g, '\n');

  // Remove strikethrough blocks (~~text~~) including the markers
  // This regex matches ~~ followed by any characters (non-greedy) followed by ~~
  result = result.replace(/~~(.*?)~~/g, '');

  // Remove bold markers (**text**) but keep the text
  // This regex matches ** followed by any characters (non-greedy) followed by **
  result = result.replace(/\*\*(.*?)\*\*/g, '$1');

  // Clean up extra whitespace while preserving intentional newlines
  // Split by newlines, process each line, preserve paragraph breaks
  const lines = result.split('\n');
  const processedLines: string[] = [];
  let lastWasEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Collapse multiple spaces within the line to single space
    const collapsedLine = line.replace(/\s+/g, ' ');

    // Skip completely empty lines UNLESS they're between non-empty lines (paragraph break)
    if (collapsedLine.length === 0) {
      // Check if this is a paragraph break (empty line between content)
      const hasPrevContent = processedLines.length > 0 && !lastWasEmpty;
      const hasNextContent = lines.slice(i + 1).some(l => l.trim().length > 0);

      // Preserve ONE empty line if it's between content (paragraph break)
      // This collapses multiple consecutive empty lines to a single one
      if (hasPrevContent && hasNextContent && !lastWasEmpty) {
        processedLines.push('');
        lastWasEmpty = true;
      }
      // Otherwise skip it (leading/trailing/consecutive empty lines)
    } else {
      processedLines.push(collapsedLine);
      lastWasEmpty = false;
    }
  }

  result = processedLines.join('\n');

  // Trim leading and trailing whitespace
  result = result.trim();

  return result;
}
