/**
 * Favicon Badge Notification Utility
 *
 * This module provides a utility to dynamically add/remove badge indicators on the
 * browser favicon to notify users of pending actions or completed tasks when the
 * browser tab is inactive.
 *
 * Key features:
 * - Display badge with count on favicon
 * - Clear badge when tab becomes active
 * - Works alongside page visibility API
 * - Fallback safe if favicon doesn't exist
 */

/**
 * Original favicon URL cache
 */
let originalFavicon: string | null = null;

/**
 * Canvas cache for generated badge images
 */
const badgeCanvasCache = new Map<number, HTMLCanvasElement>();

/**
 * Cache for base favicon (no badge)
 */
let baseFaviconCanvas: HTMLCanvasElement | null = null;

/**
 * Initialize and cache the original favicon URL
 */
function initializeFavicon(): void {
  if (typeof document === "undefined") return;

  const faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (faviconLink && !originalFavicon) {
    originalFavicon = faviconLink.href;
  }
}

/**
 * Get or create the base favicon canvas (no badge)
 */
function getBaseFaviconCanvas(): HTMLCanvasElement {
  if (baseFaviconCanvas) {
    return baseFaviconCanvas;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  drawBaseFavicon(ctx);

  baseFaviconCanvas = canvas;
  return canvas;
}

/**
 * Draw the base favicon design on canvas
 */
function drawBaseFavicon(ctx: CanvasRenderingContext2D): void {
  // Background circle
  const gradient = ctx.createLinearGradient(0, 0, 64, 64);
  gradient.addColorStop(0, "#1976d2");
  gradient.addColorStop(1, "#1565c0");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  // CV document icon
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  // Draw rounded rectangle manually for compatibility
  const x = 22;
  const y = 18;
  const width = 20;
  const height = 20;
  const radius = 2;
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();

  // Text lines on document
  ctx.strokeStyle = "#1976d2";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(28, 28);
  ctx.lineTo(44, 28);
  ctx.moveTo(28, 34);
  ctx.lineTo(36, 34);
  ctx.moveTo(28, 40);
  ctx.lineTo(44, 40);
  ctx.stroke();

  // Sparkle/AI indicator
  ctx.fillStyle = "#ffc107";
  ctx.beginPath();
  ctx.arc(44, 22, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(44, 19);
  ctx.lineTo(44, 25);
  ctx.moveTo(41, 22);
  ctx.lineTo(47, 22);
  ctx.stroke();
}

/**
 * Get or create a canvas for a specific badge count
 */
async function getBadgeCanvas(count: number): Promise<HTMLCanvasElement> {
  // Check cache first
  if (badgeCanvasCache.has(count)) {
    return badgeCanvasCache.get(count)!;
  }

  // Create new canvas
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Draw the base favicon
  drawBaseFavicon(ctx);

  // Draw red circle for badge
  ctx.fillStyle = "#dc004e";
  ctx.beginPath();
  ctx.arc(48, 16, 14, 0, Math.PI * 2);
  ctx.fill();

  // Draw white text with count
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const displayCount = count > 99 ? "99+" : count.toString();
  ctx.fillText(displayCount, 48, 16);

  // Cache canvas
  badgeCanvasCache.set(count, canvas);
  return canvas;
}

/**
 * Update the favicon with a badge showing the count
 */
export async function setFaviconBadge(count: number): Promise<void> {
  if (typeof document === "undefined") return;

  initializeFavicon();

  if (!originalFavicon) {
    console.warn("No favicon found to add badge to");
    return;
  }

  try {
    const canvas = await getBadgeCanvas(count);

    // Convert canvas to data URL and update favicon
    const dataUrl = canvas.toDataURL("image/png");
    updateFavicon(dataUrl);
  } catch (error) {
    console.error("Failed to set favicon badge:", error);
  }
}

/**
 * Clear the badge and restore original favicon
 */
export function clearFaviconBadge(): void {
  if (typeof document === "undefined") return;

  try {
    const canvas = getBaseFaviconCanvas();
    const dataUrl = canvas.toDataURL("image/png");
    updateFavicon(dataUrl);
  } catch (error) {
    console.error("Failed to clear favicon badge:", error);
    // Fallback to original if available
    if (originalFavicon) {
      updateFavicon(originalFavicon);
    }
  }
}

/**
 * Update the favicon link element with a new href
 */
function updateFavicon(url: string): void {
  const faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (faviconLink) {
    faviconLink.href = url;
  }
}

/**
 * Check if the page is currently hidden/background
 */
export function isPageHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}
