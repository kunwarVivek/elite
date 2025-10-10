// Time-related testing utilities

export class TimeHelpers {
  /**
   * Get current timestamp
   */
  static now(): Date {
    return new Date();
  }

  /**
   * Create date from string
   */
  static fromString(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Add milliseconds to date
   */
  static addMilliseconds(date: Date, milliseconds: number): Date {
    return new Date(date.getTime() + milliseconds);
  }

  /**
   * Add seconds to date
   */
  static addSeconds(date: Date, seconds: number): Date {
    return this.addMilliseconds(date, seconds * 1000);
  }

  /**
   * Add minutes to date
   */
  static addMinutes(date: Date, minutes: number): Date {
    return this.addSeconds(date, minutes * 60);
  }

  /**
   * Add hours to date
   */
  static addHours(date: Date, hours: number): Date {
    return this.addMinutes(date, hours * 60);
  }

  /**
   * Add days to date
   */
  static addDays(date: Date, days: number): Date {
    return this.addHours(date, days * 24);
  }

  /**
   * Add months to date
   */
  static addMonths(date: Date, months: number): Date {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
  }

  /**
   * Add years to date
   */
  static addYears(date: Date, years: number): Date {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() + years);
    return newDate;
  }

  /**
   * Get start of day
   */
  static startOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }

  /**
   * Get end of day
   */
  static endOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  }

  /**
   * Get start of month
   */
  static startOfMonth(date: Date): Date {
    const newDate = new Date(date);
    newDate.setDate(1);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }

  /**
   * Get end of month
   */
  static endOfMonth(date: Date): Date {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + 1);
    newDate.setDate(0);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  }

  /**
   * Format date for API requests
   */
  static formatForApi(date: Date): string {
    return date.toISOString();
  }

  /**
   * Format date for display
   */
  static formatForDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format date with time for display
   */
  static formatForDisplayWithTime(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: Date): boolean {
    return date.getTime() < Date.now();
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date: Date): boolean {
    return date.getTime() > Date.now();
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date): boolean {
    const today = this.now();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Check if date is within last N days
   */
  static isWithinLastDays(date: Date, days: number): boolean {
    const cutoff = this.addDays(this.now(), -days);
    return date.getTime() >= cutoff.getTime();
  }

  /**
   * Check if date is within next N days
   */
  static isWithinNextDays(date: Date, days: number): boolean {
    const cutoff = this.addDays(this.now(), days);
    return date.getTime() <= cutoff.getTime();
  }

  /**
   * Get relative time string
   */
  static getRelativeTime(date: Date): string {
    const now = this.now();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return this.formatForDisplay(date);
    }
  }

  /**
   * Create test timestamps for different scenarios
   */
  static createTestTimestamps() {
    const now = this.now();

    return {
      now: this.formatForApi(now),
      oneSecondAgo: this.formatForApi(this.addSeconds(now, -1)),
      oneMinuteAgo: this.formatForApi(this.addMinutes(now, -1)),
      oneHourAgo: this.formatForApi(this.addHours(now, -1)),
      oneDayAgo: this.formatForApi(this.addDays(now, -1)),
      oneWeekAgo: this.formatForApi(this.addDays(now, -7)),
      oneMonthAgo: this.formatForApi(this.addMonths(now, -1)),
      oneYearAgo: this.formatForApi(this.addYears(now, -1)),

      oneSecondFromNow: this.formatForApi(this.addSeconds(now, 1)),
      oneMinuteFromNow: this.formatForApi(this.addMinutes(now, 1)),
      oneHourFromNow: this.formatForApi(this.addHours(now, 1)),
      oneDayFromNow: this.formatForApi(this.addDays(now, 1)),
      oneWeekFromNow: this.formatForApi(this.addDays(now, 7)),
      oneMonthFromNow: this.formatForApi(this.addMonths(now, 1)),
      oneYearFromNow: this.formatForApi(this.addYears(now, 1)),
    };
  }

  /**
   * Create business-specific test dates
   */
  static createBusinessTestDates() {
    const now = this.now();

    return {
      // Investment deadlines
      investmentDeadlineSoon: this.formatForApi(this.addDays(now, 7)),
      investmentDeadlinePast: this.formatForApi(this.addDays(now, -7)),

      // Startup founding dates
      foundedRecently: this.formatForApi(this.addMonths(now, -6)),
      foundedLongAgo: this.formatForApi(this.addYears(now, -5)),

      // Pitch creation dates
      pitchCreatedToday: this.formatForApi(this.startOfDay(now)),
      pitchCreatedYesterday: this.formatForApi(this.startOfDay(this.addDays(now, -1))),
      pitchCreatedLastWeek: this.formatForApi(this.startOfDay(this.addDays(now, -7))),

      // Payment dates
      paymentDueToday: this.formatForApi(this.endOfDay(now)),
      paymentDueTomorrow: this.formatForApi(this.endOfDay(this.addDays(now, 1))),
      paymentOverdue: this.formatForApi(this.addDays(now, -3)),
    };
  }

  /**
   * Wait for specified milliseconds
   */
  static async wait(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**
   * Wait for condition to be true
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {
        return;
      }
      await this.wait(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }
}

export default TimeHelpers;