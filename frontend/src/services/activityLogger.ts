/**
 * User Activity Logging Service
 *
 * This module provides comprehensive logging of user activities, errors, and system events
 * to enable effective problem recreation and debugging by administrators.
 *
 * Key responsibilities:
 * - Log user interactions and page views
 * - Capture JavaScript errors with context
 * - Track API calls and responses
 * - Monitor user actions for debugging purposes
 * - Provide session management for activity tracking
 */

interface ActivityDetails {
  [key: string]: any;
}

interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  onLine: boolean;
  screenResolution: string;
  windowSize: string;
  timezone: string;
}

interface UserActivity {
  activityType: string;
  action: string;
  description?: string;
  details?: ActivityDetails;
  pageUrl?: string;
  sessionId: string;
}

interface ErrorContext {
  component?: string;
  props?: any;
  state?: any;
  userId?: string;
  timestamp: string;
}

class ActivityLogger {
  private sessionId: string;
  private userId: string | null = null;
  private isEnabled: boolean = true;
  private activityQueue: UserActivity[] = [];
  private flushInterval: number = 10000; // 10 seconds
  private maxQueueSize: number = 100;
  private lastPageView: string | null = null;
  private lastActivityTime: number = 0;
  private activityThrottleMs: number = 1000; // 1 second throttle

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupErrorHandling();
    this.setupActivityFlushing();
    // Don't log page view in constructor - wait for user authentication
  }

  /**
   * Initialize the activity logger with user information
   */
  init(userId: string) {
    this.userId = userId;
    this.logUserAction("session_start", "User session started", {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get browser and system information
   */
  private getBrowserInfo(): BrowserInfo {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  /**
   * Log a user action with throttling
   */
  logUserAction(
    action: string,
    description?: string,
    details?: ActivityDetails,
  ) {
    if (!this.isEnabled || !this.userId) return;

    const now = Date.now();

    // Throttle identical actions within 1 second
    if (now - this.lastActivityTime < this.activityThrottleMs) {
      return;
    }

    this.lastActivityTime = now;

    const activity: UserActivity = {
      activityType: "user_action",
      action,
      description,
      details: {
        ...details,
        browserInfo: this.getBrowserInfo(),
        timestamp: new Date().toISOString(),
      },
      pageUrl: window.location.href,
      sessionId: this.sessionId,
    };

    this.queueActivity(activity);
  }

  /**
   * Log a page view with deduplication
   */
  logPageView(pageUrl?: string) {
    if (!this.isEnabled) return;

    const currentUrl = pageUrl || window.location.pathname;

    // Skip if same page as last page view
    if (this.lastPageView === currentUrl) {
      return;
    }

    this.lastPageView = currentUrl;

    const activity: UserActivity = {
      activityType: "page_view",
      action: "page_view",
      description: `Viewed page: ${currentUrl}`,
      details: {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        referrer: document.referrer,
        browserInfo: this.getBrowserInfo(),
        timestamp: new Date().toISOString(),
      },
      pageUrl: pageUrl || window.location.href,
      sessionId: this.sessionId,
    };

    this.queueActivity(activity);
  }

  /**
   * Log an API call
   */
  logAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime?: number,
    requestData?: any,
    responseData?: any,
  ) {
    if (!this.isEnabled || !this.userId) return;

    const activity: UserActivity = {
      activityType: "api_call",
      action: `${method.toLowerCase()}_${endpoint.replace(/\//g, "_").replace(/^_|_$/g, "")}`,
      description: `${method} ${endpoint} - ${statusCode}`,
      details: {
        endpoint,
        method,
        statusCode,
        responseTime,
        requestData: this.sanitizeData(requestData),
        responseData: this.sanitizeData(responseData),
        timestamp: new Date().toISOString(),
      },
      pageUrl: window.location.href,
      sessionId: this.sessionId,
    };

    this.queueActivity(activity);
  }

  /**
   * Log an error with context
   */
  logError(
    error: Error,
    errorType: string,
    context?: ErrorContext,
    additionalDetails?: ActivityDetails,
  ) {
    if (!this.isEnabled) return;

    const activity: UserActivity = {
      activityType: "error",
      action: `error_${errorType}`,
      description: `Error: ${error.message}`,
      details: {
        errorMessage: error.message,
        errorType,
        stackTrace: error.stack,
        context: context || {},
        additionalDetails: additionalDetails || {},
        browserInfo: this.getBrowserInfo(),
        timestamp: new Date().toISOString(),
      },
      pageUrl: window.location.href,
      sessionId: this.sessionId,
    };

    this.queueActivity(activity);
    this.flushActivities(); // Immediately flush errors
  }

  /**
   * Log a form submission
   */
  logFormSubmission(formName: string, formData?: any, success: boolean = true) {
    if (!this.isEnabled || !this.userId) return;

    this.logUserAction("form_submission", `Form submitted: ${formName}`, {
      formName,
      success,
      formData: this.sanitizeData(formData),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log a file upload
   */
  logFileUpload(
    fileName: string,
    fileSize: number,
    fileType: string,
    success: boolean = true,
  ) {
    if (!this.isEnabled || !this.userId) return;

    this.logUserAction("file_upload", `File uploaded: ${fileName}`, {
      fileName,
      fileSize,
      fileType,
      success,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Queue an activity for batch processing
   */
  private queueActivity(activity: UserActivity) {
    this.activityQueue.push(activity);

    // Flush if queue is full
    if (this.activityQueue.length >= this.maxQueueSize) {
      this.flushActivities();
    }
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any, depth: number = 0): any {
    if (!data || depth > 10) return data;

    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "key",
      "auth",
      "credential",
      "ssn",
      "creditcard",
      "credit_card",
      "cardnumber",
      "card_number",
      "cvv",
      "cvc",
      "pin",
      "pincode",
      "pin_code",
      "passphrase",
      "privatekey",
      "private_key",
      "apikey",
      "api_key",
      "accesskey",
      "access_key",
      "sessionid",
      "session_id",
      "cookie",
      "cookies",
    ];

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item, depth + 1));
    }

    if (typeof data === "object" && data !== null) {
      const sanitized: any = {};

      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const normalizedKey = key.toLowerCase();

          if (
            sensitiveKeys.some((sensitive) => normalizedKey.includes(sensitive))
          ) {
            sanitized[key] = "[REDACTED]";
          } else if (typeof data[key] === "object" && data[key] !== null) {
            sanitized[key] = this.sanitizeData(data[key], depth + 1);
          } else {
            sanitized[key] = data[key];
          }
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Setup automatic activity flushing
   */
  private setupActivityFlushing() {
    setInterval(() => {
      this.flushActivities();
    }, this.flushInterval);

    // Flush on page unload using navigator.sendBeacon for reliable delivery
    window.addEventListener("beforeunload", () => {
      this.flushActivitiesOnUnload();
    });
  }

  /**
   * Flush activities on page unload using navigator.sendBeacon for reliable delivery
   */
  private flushActivitiesOnUnload() {
    if (this.activityQueue.length === 0 || !this.userId) {
      return;
    }

    try {
      // Copy the queued activities
      const activitiesToFlush = [...this.activityQueue];

      // Create a Blob with the activities data
      const blob = new Blob([JSON.stringify(activitiesToFlush)], {
        type: "application/json",
      });

      // Use navigator.sendBeacon if available, otherwise fall back to regular flush
      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          "/api/user-activities/batch",
          blob,
        );
        if (success) {
          // Clear the queue only if sendBeacon succeeded
          this.activityQueue = [];
        } else {
          // Fall back to regular flush if sendBeacon failed
          this.flushActivities();
        }
      } else {
        // Fall back to regular flush if sendBeacon is not available
        this.flushActivities();
      }
    } catch (error) {
      // Fall back to regular flush on error
      this.flushActivities();
    }
  }

  /**
   * Setup global error handling
   */
  private setupErrorHandling() {
    // Global JavaScript error handler
    window.addEventListener("error", (event) => {
      this.logError(new Error(event.message), "javascript_error", {
        component: event.filename,
        props: { lineno: event.lineno, colno: event.colno },
        timestamp: new Date().toISOString(),
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      this.logError(
        new Error(event.reason?.message || "Unhandled promise rejection"),
        "promise_rejection",
        {
          component: "promise_rejection",
          props: { reason: event.reason },
          timestamp: new Date().toISOString(),
        },
      );
    });
  }

  /**
   * Flush queued activities to the server
   */
  private async flushActivities() {
    if (this.activityQueue.length === 0 || !this.userId) return;

    const activities = [...this.activityQueue];
    this.activityQueue = [];

    try {
      // Import api dynamically to avoid circular dependencies
      const { default: api } = await import("./api");

      // Send activities to backend
      await api.post("/api/user-activities/batch", { activities });
    } catch (error) {
      // Re-queue activities if sending failed
      this.activityQueue.unshift(...activities);
    }
  }

  /**
   * Enable or disable activity logging
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * End the current session
   */
  endSession() {
    if (this.userId) {
      this.logUserAction("session_end", "User session ended", {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      });
    }
    this.flushActivities();
  }

  /**
   * Manually flush activities (for testing/debugging)
   */
  async flushNow() {
    await this.flushActivities();
  }
}

// Create a singleton instance
export const activityLogger = new ActivityLogger();

// Export the class for testing
export { ActivityLogger };

// React hook for easy integration
export const useActivityLogger = () => {
  return {
    logUserAction: activityLogger.logUserAction.bind(activityLogger),
    logError: activityLogger.logError.bind(activityLogger),
    logFormSubmission: activityLogger.logFormSubmission.bind(activityLogger),
    logFileUpload: activityLogger.logFileUpload.bind(activityLogger),
    logAPICall: activityLogger.logAPICall.bind(activityLogger),
    getSessionId: activityLogger.getSessionId.bind(activityLogger),
  };
};
