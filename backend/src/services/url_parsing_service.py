"""
URL Parsing Service for Job Descriptions

This module provides functionality to parse job posting URLs and extract
job description content using OpenAI AI service for intelligent content extraction.
Includes local browser automation using Playwright for handling JavaScript-rendered job postings.

Key responsibilities:
- Parse job posting URLs using standard web scraping
- Fallback to local browser automation for JavaScript-heavy sites
- Extract job description content and metadata using OpenAI
- Handle various URL formats and site structures
- Provide intelligent content extraction and structuring
- Sanitize and clean extracted content
- Handle dynamic content loading with JavaScript rendering

Usage:
- Use parse_job_url() to extract content from job posting URLs
- Automatically falls back to browser automation for sites requiring JavaScript
- Returns structured job description data
- Handles errors gracefully with detailed error messages

Browser Automation Integration:
- Uses Playwright for reliable JavaScript rendering
- Enables dynamic content loading with intelligent waiting
- Handles complex sites like jobs.wien.gv.at
- Maintains existing functionality for standard sites
"""

import requests
import re
from typing import Dict, Any, Optional
from urllib.parse import urlparse, parse_qs
import time
from bs4 import BeautifulSoup
import logging
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

logger = logging.getLogger(__name__)


def parse_job_url(url: str, user_id: str = None, db_session = None) -> Dict[str, Any]:
    """
    Parse a job posting URL and extract job description content using OpenAI.
    
    Args:
        url: The job posting URL to parse
        
    Returns:
        Dictionary containing parsed job description data
    """
    try:
        # Validate URL
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return {
                "error": "Invalid URL format. Please check the URL and try again, or use the 'Text' tab to enter the job description manually.",
                "success": False
            }
        
        # Extract raw content from URL using web scraping with browser automation fallback
        raw_content = _extract_raw_content_with_fallback(url)
        if not raw_content:
            return {
                "error": "Unable to extract content from this URL. The page may be empty or protected. Please copy and paste the job description manually using the 'Text' tab.",
                "success": False
            }
        
        # Use OpenAI to intelligently parse and structure the content
        return _parse_with_openai(raw_content, url, user_id, db_session)
            
    except ValueError as e:
        # These are user-friendly error messages from _extract_raw_content
        logger.error(f"URL parsing failed for {url}: {str(e)}")
        return {
            "error": str(e),
            "success": False
        }
    except Exception as e:
        logger.error(f"Failed to parse URL {url}: {str(e)}")
        return {
            "error": f"Unable to parse this URL. Please copy and paste the job description manually using the 'Text' tab.",
            "success": False
        }


def _extract_raw_content_with_fallback(url: str) -> str:
    """
    Extract raw content from URL with browser automation fallback for JavaScript-heavy sites.
    
    First attempts standard web scraping, then falls back to browser automation if that fails
    or returns insufficient content. For known JavaScript-heavy sites, tries browser automation first.
    
    Args:
        url: The URL to extract content from
        
    Returns:
        Extracted text content or empty string if both methods fail
    """
    # Check if this is a known JavaScript-heavy site
    is_js_heavy_site = any(domain in url.lower() for domain in [
        'jobs.wien.gv.at', 'wien.gv.at', 'karriere.', 'jobs.'
    ])
    
    if is_js_heavy_site:
        logger.info(f"Detected JavaScript-heavy site, trying browser automation first for {url}")
        # Try browser automation first for known problematic sites
        try:
            content = _extract_with_browser_automation(url)
            if content and len(content) > 500:  # Ensure we got substantial content
                logger.info(f"Browser automation successful for {url}")
                return content
        except Exception as e:
            logger.warning(f"Browser automation failed for {url}: {str(e)}")
    
    # Try standard scraping first (or as fallback)
    try:
        logger.info(f"Attempting standard scraping for {url}")
        content = _extract_raw_content(url)
        if content and len(content) > 500:  # Ensure we got substantial content
            logger.info(f"Standard scraping successful for {url}")
            return content
        elif content:
            logger.warning(f"Standard scraping returned minimal content for {url}, trying browser automation")
    except Exception as e:
        logger.warning(f"Standard scraping failed for {url}: {str(e)}")
    
    # Fall back to browser automation for JavaScript-heavy sites or if standard scraping had minimal content
    if not is_js_heavy_site:  # Only try if we haven't already
        try:
            logger.info(f"Attempting browser automation for {url}")
            content = _extract_with_browser_automation(url)
            if content:
                logger.info(f"Browser automation successful for {url}")
                return content
        except Exception as e:
            logger.error(f"Browser automation failed for {url}: {str(e)}")
    
    return ""


def _extract_with_browser_automation(url: str) -> str:
    """
    Extract content from URL using Selenium browser automation with JavaScript rendering.
    
    Uses Selenium to handle dynamic sites that require client-side rendering.
    Waits for content to load and extracts clean text content.
    
    Args:
        url: The URL to extract content from
        
    Returns:
        Extracted text content or empty string if extraction fails
        
    Raises:
        Exception: If browser automation fails
    """
    driver = None
    
    try:
        logger.info(f"Starting browser automation for {url}")
        
        # Configure Chrome options for headless mode
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-setuid-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--no-first-run')
        chrome_options.add_argument('--no-default-browser-check')
        chrome_options.add_argument('--disable-default-apps')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-web-security')
        chrome_options.add_argument('--disable-features=VizDisplayCompositor')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Initialize the Chrome driver
        driver = webdriver.Chrome(options=chrome_options)
        driver.set_page_load_timeout(60)  # 60 seconds timeout
        
        logger.info(f"Navigating to {url}")
        
        # Navigate to the URL
        driver.get(url)
        
        # Wait for page to load
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Wait for common job posting content selectors
        content_selectors = [
            (By.TAG_NAME, "main"),
            (By.TAG_NAME, "article"),
            (By.CLASS_NAME, "content"),
            (By.CLASS_NAME, "job-description"),
            (By.CLASS_NAME, "job-content"),
            (By.CLASS_NAME, "description"),
            (By.ID, "content"),
            (By.CLASS_NAME, "main-content")
        ]
        
        content_found = False
        for by, selector in content_selectors:
            try:
                WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((by, selector))
                )
                content_found = True
                logger.info(f"Found content with selector: {selector}")
                break
            except TimeoutException:
                continue
        
        # Additional wait for dynamic content (especially for JavaScript-heavy sites)
        time.sleep(3)
        
        # Extract page content using JavaScript
        content = driver.execute_script("""
            // Remove script and style elements
            const scripts = document.querySelectorAll('script, style, nav, header, footer, .navigation, .menu, .sidebar');
            scripts.forEach(el => el.remove());
            
            // Try to find main content area
            const contentSelectors = [
                'main', 'article', '.content', '.job-description', 
                '.job-content', '.description', '#content', '.main-content',
                '.job-details', '.position-description', '.job-info'
            ];
            
            let contentElement = null;
            for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim().length > 100) {
                    contentElement = element;
                    break;
                }
            }
            
            // Fall back to body if no specific content area found
            if (!contentElement) {
                contentElement = document.body;
            }
            
            // Get text content with preserved line breaks
            const text = contentElement.textContent || contentElement.innerText || '';
            
            // Clean up the text
            return text
                .replace(/\\s+/g, ' ')  // Replace multiple whitespace with single space
                .replace(/\\n\\s*\\n/g, '\\n\\n')  // Preserve paragraph breaks
                .trim();
        """)
        
        if content and len(content) > 100:
            logger.info(f"Browser automation extracted {len(content)} characters from {url}")
            return content
        else:
            logger.warning(f"Browser automation extracted minimal content from {url}")
            raise Exception("Browser automation extracted minimal content")
            
    except TimeoutException as e:
        logger.error(f"Browser automation timeout for {url}: {str(e)}")
        raise Exception(f"Browser automation timeout: {str(e)}")
    except WebDriverException as e:
        logger.error(f"Browser automation driver error for {url}: {str(e)}")
        raise Exception(f"Browser automation driver error: {str(e)}")
    except Exception as e:
        logger.error(f"Browser automation failed for {url}: {str(e)}")
        raise
    finally:
        # Clean up browser resources
        if driver:
            try:
                driver.quit()
            except Exception as e:
                logger.warning(f"Error closing browser: {str(e)}")


def _extract_raw_content(url: str) -> str:
    """Extract raw content from URL using web scraping."""
    try:
        # Add a small delay to be respectful to the server
        time.sleep(1)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get all text content
        text = soup.get_text(separator='\n', strip=True)
        
        # Clean up the text
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        cleaned_text = '\n'.join(lines)
        
        return cleaned_text if len(cleaned_text) > 100 else ""
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            logger.error(f"Rate limited by {url}: {str(e)}")
            raise ValueError("This job site is blocking automated requests. Please copy and paste the job description manually using the 'Text' tab.")
        elif e.response.status_code == 403:
            logger.error(f"Access forbidden for {url}: {str(e)}")
            raise ValueError("This job site requires authentication or blocks automated access. Please copy and paste the job description manually using the 'Text' tab.")
        else:
            logger.error(f"HTTP error accessing {url}: {str(e)}")
            raise ValueError(f"Unable to access this URL (HTTP {e.response.status_code}). Please copy and paste the job description manually using the 'Text' tab.")
    except requests.exceptions.Timeout as e:
        logger.error(f"Timeout accessing {url}: {str(e)}")
        raise ValueError("The job site took too long to respond. Please copy and paste the job description manually using the 'Text' tab.")
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error accessing {url}: {str(e)}")
        raise ValueError("Unable to access this URL. Please copy and paste the job description manually using the 'Text' tab.")
    except Exception as e:
        logger.error(f"Failed to extract content from {url}: {str(e)}")
        raise ValueError("Unable to extract content from this URL. Please copy and paste the job description manually using the 'Text' tab.")


def _parse_with_openai(raw_content: str, url: str, user_id: str = None, db_session = None) -> Dict[str, Any]:
    """Parse job description content using OpenAI AI service."""
    try:
        # Import here to avoid circular imports
        try:
            from .ai_service import extract_job_description_with_ai
        except ImportError:
            # Fallback for test environments or when running standalone
            from src.services.ai_service import extract_job_description_with_ai
        
        # Use the AI service to parse the content
        result = extract_job_description_with_ai(raw_content, url, user_id=user_id, db_session=db_session)
        
        # Check if AI service returned an error
        if result.get("error"):
            return {
                "error": f"AI parsing failed: {result.get('error')}. Please copy and paste the job description manually using the 'Text' tab.",
                "success": False
            }
        
        return {
            "success": True,
            "content": result.get("content", ""),
            "title": result.get("title", ""),
            "company": result.get("company", ""),
            "location": result.get("location", ""),
            "source_url": url,
            "source": result.get("source", "ai_parsed")
        }
        
    except Exception as e:
        logger.error(f"Failed to parse content with OpenAI: {str(e)}")
        return {
            "error": f"AI service is currently unavailable. Please copy and paste the job description manually using the 'Text' tab.",
            "success": False
        }


def is_supported_url(url: str) -> bool:
    """Check if the URL appears to be a valid web URL."""
    try:
        parsed_url = urlparse(url)
        return bool(parsed_url.scheme and parsed_url.netloc)
    except Exception:
        return False

