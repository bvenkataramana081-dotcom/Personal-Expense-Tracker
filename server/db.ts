import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Category, Budget, Expense } from '../src/types';

interface StoredUser extends User {
  password_hash: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  categories: Category[];
  budgets: Budget[];
  expenses: Expense[];
  sessions: { token: string; user_id: string; expires_at: number }[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

const defaultData: DatabaseSchema = {
  users: [],
  categories: [],
  budgets: [],
  expenses: [],
  sessions: [],
};

let memoryDb: DatabaseSchema = defaultData;

function initDb(): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDb = JSON.parse(content);
    } else {
      saveDb();
    }
  } catch (err) {
    console.error('Failed to initialize database, using memory fallback:', err);
    memoryDb = { ...defaultData };
  }
}

function saveDb(): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

initDb();

// --- Auth & User Store ---

export function createUser(username: string, email: string, passwordHash: string): StoredUser {
  const user: StoredUser = {
    id: crypto.randomUUID(),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };
  memoryDb.users.push(user);
  saveDb();
  return user;
}

export function findUserByEmailOrUsername(identifier: string): StoredUser | undefined {
  const clean = identifier.trim().toLowerCase();
  return memoryDb.users.find(
    (u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
  );
}

export function findUserById(id: string): StoredUser | undefined {
  return memoryDb.users.find((u) => u.id === id);
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  memoryDb.sessions.push({ token, user_id: userId, expires_at: expiresAt });
  saveDb();
  return token;
}

export function getUserIdFromSession(token: string): string | null {
  const session = memoryDb.sessions.find((s) => s.token === token && s.expires_at > Date.now());
  return session ? session.user_id : null;
}

export function deleteSession(token: string): void {
  memoryDb.sessions = memoryDb.sessions.filter((s) => s.token !== token);
  saveDb();
}

// --- Category Store ---

export function getCategoriesByUser(userId: string): Category[] {
  return memoryDb.categories
    .filter((c) => c.user_id === userId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCategoryById(id: string, userId: string): Category | undefined {
  return memoryDb.categories.find((c) => c.id === id && c.user_id === userId);
}

export function createCategory(userId: string, name: string, description?: string): Category {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Category name is required.');
  }

  // Prevent duplicate category name for the same user (case-insensitive)
  const existing = memoryDb.categories.find(
    (c) => c.user_id === userId && c.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (existing) {
    throw new Error(`Category "${trimmedName}" already exists.`);
  }

  const category: Category = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: trimmedName,
    description: description ? description.trim() : '',
    created_at: new Date().toISOString(),
  };

  memoryDb.categories.push(category);
  saveDb();
  return category;
}

export function updateCategory(
  id: string,
  userId: string,
  name: string,
  description?: string
): Category {
  const category = getCategoryById(id, userId);
  if (!category) {
    throw new Error('Category not found or unauthorized.');
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Category name is required.');
  }

  const duplicate = memoryDb.categories.find(
    (c) => c.user_id === userId && c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Another category named "${trimmedName}" already exists.`);
  }

  category.name = trimmedName;
  category.description = description ? description.trim() : '';
  saveDb();
  return category;
}

export function deleteCategory(id: string, userId: string): void {
  const category = getCategoryById(id, userId);
  if (!category) {
    throw new Error('Category not found or unauthorized.');
  }

  // Check if category has existing expenses for this user
  const hasExpenses = memoryDb.expenses.some((e) => e.category_id === id && e.user_id === userId);
  if (hasExpenses) {
    throw new Error('This category cannot be deleted because it has existing expenses.');
  }

  // Remove budgets associated with this category
  memoryDb.budgets = memoryDb.budgets.filter((b) => !(b.category_id === id && b.user_id === userId));
  memoryDb.categories = memoryDb.categories.filter((c) => c.id !== id);
  saveDb();
}

// --- Budget Store ---

export function getBudgetsByUser(userId: string, monthYear?: string): Budget[] {
  return memoryDb.budgets.filter((b) => {
    if (b.user_id !== userId) return false;
    if (monthYear && b.month_year !== monthYear) return false;
    return true;
  });
}

export function getBudgetById(id: string, userId: string): Budget | undefined {
  return memoryDb.budgets.find((b) => b.id === id && b.user_id === userId);
}

export function upsertBudget(
  userId: string,
  categoryId: string,
  monthYear: string,
  monthlyLimit: number
): Budget {
  if (typeof monthlyLimit !== 'number' || isNaN(monthlyLimit) || monthlyLimit <= 0) {
    throw new Error('Budget amount must be greater than zero.');
  }

  // Ensure category belongs to current user
  const category = getCategoryById(categoryId, userId);
  if (!category) {
    throw new Error('Invalid category or unauthorized.');
  }

  // Check if budget exists for this user + category + month_year
  const existing = memoryDb.budgets.find(
    (b) => b.user_id === userId && b.category_id === categoryId && b.month_year === monthYear
  );

  if (existing) {
    existing.monthly_limit = monthlyLimit;
    saveDb();
    return existing;
  }

  const newBudget: Budget = {
    id: crypto.randomUUID(),
    user_id: userId,
    category_id: categoryId,
    monthly_limit: monthlyLimit,
    month_year: monthYear,
    created_at: new Date().toISOString(),
  };

  memoryDb.budgets.push(newBudget);
  saveDb();
  return newBudget;
}

export function updateBudget(
  id: string,
  userId: string,
  monthlyLimit: number,
  categoryId?: string,
  monthYear?: string
): Budget {
  const budget = getBudgetById(id, userId);
  if (!budget) {
    throw new Error('Budget not found or unauthorized.');
  }

  if (typeof monthlyLimit !== 'number' || isNaN(monthlyLimit) || monthlyLimit <= 0) {
    throw new Error('Budget amount must be greater than zero.');
  }

  if (categoryId && categoryId !== budget.category_id) {
    const category = getCategoryById(categoryId, userId);
    if (!category) {
      throw new Error('Invalid category or unauthorized.');
    }
    budget.category_id = categoryId;
  }

  if (monthYear) {
    budget.month_year = monthYear;
  }

  budget.monthly_limit = monthlyLimit;
  saveDb();
  return budget;
}

export function deleteBudget(id: string, userId: string): void {
  const budget = getBudgetById(id, userId);
  if (!budget) {
    throw new Error('Budget not found or unauthorized.');
  }

  memoryDb.budgets = memoryDb.budgets.filter((b) => b.id !== id);
  saveDb();
}

// --- Expense Store ---

export function getExpensesByUser(
  userId: string,
  monthYear?: string,
  categoryId?: string
): Expense[] {
  return memoryDb.expenses
    .filter((e) => {
      if (e.user_id !== userId) return false;
      if (monthYear && !e.date.startsWith(monthYear)) return false;
      if (categoryId && e.category_id !== categoryId) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getExpenseById(id: string, userId: string): Expense | undefined {
  return memoryDb.expenses.find((e) => e.id === id && e.user_id === userId);
}

export function createExpense(
  userId: string,
  categoryId: string,
  amount: number,
  date: string,
  notes?: string
): Expense {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('A valid date (YYYY-MM-DD) is required.');
  }

  // Ensure category belongs to current user
  const category = getCategoryById(categoryId, userId);
  if (!category) {
    throw new Error('Invalid category or unauthorized.');
  }

  const expense: Expense = {
    id: crypto.randomUUID(),
    user_id: userId,
    category_id: categoryId,
    amount: Math.round(amount * 100) / 100, // keep cents precision
    date: date,
    notes: notes ? notes.trim() : '',
    created_at: new Date().toISOString(),
  };

  memoryDb.expenses.push(expense);
  saveDb();
  return expense;
}

export function updateExpense(
  id: string,
  userId: string,
  categoryId: string,
  amount: number,
  date: string,
  notes?: string
): Expense {
  const expense = getExpenseById(id, userId);
  if (!expense) {
    throw new Error('Expense not found or unauthorized.');
  }

  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('A valid date (YYYY-MM-DD) is required.');
  }

  const category = getCategoryById(categoryId, userId);
  if (!category) {
    throw new Error('Invalid category or unauthorized.');
  }

  expense.category_id = categoryId;
  expense.amount = Math.round(amount * 100) / 100;
  expense.date = date;
  expense.notes = notes ? notes.trim() : '';

  saveDb();
  return expense;
}

export function deleteExpense(id: string, userId: string): void {
  const expense = getExpenseById(id, userId);
  if (!expense) {
    throw new Error('Expense not found or unauthorized.');
  }

  memoryDb.expenses = memoryDb.expenses.filter((e) => e.id !== id);
  saveDb();
}

// Reset function for testing purposes
export function _resetDatabase(): void {
  memoryDb = {
    users: [],
    categories: [],
    budgets: [],
    expenses: [],
    sessions: [],
  };
  saveDb();
}
