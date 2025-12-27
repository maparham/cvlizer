/**
 * HTML Diff Parser Utility
 *
 * Parses html_diff format to extract the corrected text.
 * Removes <del> tags and their content, and removes <ins> tags but keeps the content.
 *
 * Format:
 * - <del>text</del> for removed text
 * - <ins>text</ins> for added text
 *
 * Example:
 * Input: "Led <del>a team</del><ins>team of 5 engineers</ins> in developing <ins>scalable</ins> web applications"
 * Output: "Led team of 5 engineers in developing scalable web applications"
 */

/**
 * Parses html_diff string to extract corrected text
 *
 * Processing steps:
 * 1. Removes <del> tags and their content
 * 2. Removes <ins> tags but keeps the content
 * 3. Converts <br> tags to newlines
 * 4. Collapses multiple consecutive spaces to single space
 * 5. Preserves paragraph breaks
 * 6. Removes leading/trailing whitespace
 *
 * @param htmlDiff - The HTML diff string with <del> and <ins> tags
 * @returns The corrected text with all tags removed and whitespace normalized
 *
 * @example
 * // Bullet list with corrections
 * parseHtmlDiff("- <del>Old</del><ins>New</ins> item<br>- Another item")
 * // Returns: "- New item\n- Another item"
 *
 * @example
 * // Paragraph with corrections
 * parseHtmlDiff("Para 1 with <del>old</del><ins>new</ins> text.<br><br>Para 2 here.")
 * // Returns: "Para 1 with new text.\n\nPara 2 here."
 */
export function parseHtmlDiff(htmlDiff: string): string {
  if (!htmlDiff || htmlDiff.trim() === '') {
    return '';
  }

  let result = htmlDiff;

  // Remove <del> tags and their content
  result = result.replace(/<del>.*?<\/del>/g, '');

  // Remove <ins> tags but keep the content
  result = result.replace(/<ins>(.*?)<\/ins>/g, '$1');

  // Convert <br> tags to newlines
  result = result.replace(/<br\s*\/?>/g, '\n');

  // Clean up extra whitespace while preserving intentional newlines
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
      if (hasPrevContent && hasNextContent && !lastWasEmpty) {
        processedLines.push('');
        lastWasEmpty = true;
      }
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
