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
 * @param markdownDiff - The markdown diff string with strikethrough and bold markers
 * @returns The corrected text with all markers removed
 */
export function parseMarkdownDiff(markdownDiff: string): string {
  if (!markdownDiff || markdownDiff.trim() === '') {
    return '';
  }

  let result = markdownDiff;

  // Remove strikethrough blocks (~~text~~) including the markers
  // This regex matches ~~ followed by any characters (non-greedy) followed by ~~
  result = result.replace(/~~(.*?)~~/g, '');

  // Remove bold markers (**text**) but keep the text
  // This regex matches ** followed by any characters (non-greedy) followed by **
  result = result.replace(/\*\*(.*?)\*\*/g, '$1');

  // Clean up any extra whitespace that might have been left
  // Replace multiple spaces with single space
  result = result.replace(/\s+/g, ' ');

  // Trim leading and trailing whitespace
  result = result.trim();

  return result;
}
