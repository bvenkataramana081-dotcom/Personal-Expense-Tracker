export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  month_year: string; // Format: 'YYYY-MM', e.g. '2026-10'
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  date: string; // Format: 'YYYY-MM-DD', e.g. '2026-10-06'
  notes?: string;
  created_at: string;
}

export type AlertStatus = 'NORMAL' | 'WARNING' | 'DANGER';

export interface CategorySpending {
  category: Category;
  budget: Budget | null;
  budgetLimit: number | null; // null if no budget set
  spent: number;
  remaining: number | null; // budgetLimit - spent, or null
  percentage: number | null; // (spent / budgetLimit) * 100, or null
  status: AlertStatus | null; // null if no budget set
}

export interface MonthlyDashboardData {
  monthYear: string; // '2026-10'
  formattedMonth: string; // 'October 2026'
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number; // totalBudget - totalSpent
  categoriesBreakdown: CategorySpending[];
}
