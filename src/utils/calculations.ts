import { AlertStatus } from '../types';

/**
 * Determines the alert status according to strict rules:
 * IF percentage < 80: status = NORMAL
 * IF percentage >= 80 AND percentage < 100: status = WARNING
 * IF percentage >= 100: status = DANGER
 */
export function getAlertStatus(percentage: number): AlertStatus {
  if (percentage < 80) {
    return 'NORMAL';
  } else if (percentage >= 80 && percentage < 100) {
    return 'WARNING';
  } else {
    return 'DANGER';
  }
}

/**
 * Returns the badge details for the given alert status
 */
export function getStatusBadge(status: AlertStatus) {
  switch (status) {
    case 'NORMAL':
      return {
        label: '🟢 NORMAL',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barColor: 'bg-emerald-500',
        textColor: 'text-emerald-700',
      };
    case 'WARNING':
      return {
        label: '⚠️ WARNING',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-700',
      };
    case 'DANGER':
      return {
        label: '🚨 DANGER',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        barColor: 'bg-rose-500',
        textColor: 'text-rose-700',
      };
  }
}

/**
 * Formats currency values in INR (₹)
 * Handles integers and decimals accurately (e.g. ₹5,000, ₹1,250.50, -₹1,000)
 */
export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: absAmount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

/**
 * Formats YYYY-MM into human-readable month string, e.g. "October 2026"
 */
export function formatMonthYear(monthYearStr: string): string {
  if (!monthYearStr) return '';
  const [yearStr, monthStr] = monthYearStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return monthYearStr;

  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Formats YYYY-MM-DD into readable date, e.g. "October 6, 2026"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Clamps progress bar percentage to a maximum of 100% while keeping minimum 0%
 */
export function getClampedProgress(percentage: number): number {
  if (percentage <= 0) return 0;
  if (percentage >= 100) return 100;
  return percentage;
}
