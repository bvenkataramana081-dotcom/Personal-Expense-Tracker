import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createUser,
  findUserByEmailOrUsername,
  findUserById,
  createSession,
  getUserIdFromSession,
  deleteSession,
  getCategoriesByUser,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getBudgetsByUser,
  getBudgetById,
  upsertBudget,
  updateBudget,
  deleteBudget,
  getExpensesByUser,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  _resetDatabase,
} from './server/db';
import {
  hashPassword,
  verifyPassword,
  requireAuth,
  AuthenticatedRequest,
  extractSessionToken,
} from './server/auth';
import {
  getAlertStatus,
  formatMonthYear,
} from './src/utils/calculations';
import { CategorySpending, MonthlyDashboardData } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Authentication Endpoints ---

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      res.status(400).json({ error: 'Username is required.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const existingUser = findUserByEmailOrUsername(email) || findUserByEmailOrUsername(username);
    if (existingUser) {
      res.status(400).json({ error: 'Username or email already in use.' });
      return;
    }

    const passwordHash = hashPassword(password);
    const user = createUser(username, email, passwordHash);
    const token = createSession(user.id);

    res.cookie('session_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
      token,
      message: 'Registration successful.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/email and password are required.' });
      return;
    }

    const user = findUserByEmailOrUsername(identifier);
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }

    const token = createSession(user.id);

    res.cookie('session_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
      token,
      message: 'Login successful.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  try {
    const token = extractSessionToken(req);
    if (token) {
      deleteSession(token);
    }
    res.clearCookie('session_token');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// --- Category Endpoints ---

app.get('/api/categories', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const categories = getCategoriesByUser(req.userId!);
  res.json({ categories });
});

app.post('/api/categories', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }

    const category = createCategory(req.userId!, name, description);
    res.status(201).json({ category, message: 'Category created successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/categories/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }

    const category = updateCategory(id, req.userId!, name, description);
    res.json({ category, message: 'Category updated successfully.' });
  } catch (err: any) {
    if (err.message.includes('not found or unauthorized')) {
      res.status(404).json({ error: 'Category not found or unauthorized.' });
      return;
    }
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    deleteCategory(id, req.userId!);
    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err: any) {
    if (err.message.includes('not found or unauthorized')) {
      res.status(404).json({ error: 'Category not found or unauthorized.' });
      return;
    }
    // Safe deletion refusal
    res.status(400).json({ error: err.message });
  }
});

// --- Budget Endpoints ---

app.get('/api/budgets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const month = req.query.month as string | undefined;
  const budgets = getBudgetsByUser(req.userId!, month);
  res.json({ budgets });
});

app.post('/api/budgets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category_id, month_year, monthly_limit } = req.body;

    if (!category_id) {
      res.status(400).json({ error: 'Please select a category.' });
      return;
    }

    if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
      res.status(400).json({ error: 'A valid month (YYYY-MM) is required.' });
      return;
    }

    const limitNum = Number(monthly_limit);
    if (isNaN(limitNum) || limitNum <= 0) {
      res.status(400).json({ error: 'Budget amount must be greater than zero.' });
      return;
    }

    const budget = upsertBudget(req.userId!, category_id, month_year, limitNum);
    res.status(201).json({ budget, message: 'Budget saved successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/budgets/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { monthly_limit, category_id, month_year } = req.body;

    const limitNum = Number(monthly_limit);
    if (isNaN(limitNum) || limitNum <= 0) {
      res.status(400).json({ error: 'Budget amount must be greater than zero.' });
      return;
    }

    const budget = updateBudget(id, req.userId!, limitNum, category_id, month_year);
    res.json({ budget, message: 'Budget updated successfully.' });
  } catch (err: any) {
    if (err.message.includes('not found or unauthorized')) {
      res.status(404).json({ error: 'Budget not found or unauthorized.' });
      return;
    }
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/budgets/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    deleteBudget(id, req.userId!);
    res.json({ success: true, message: 'Budget deleted successfully.' });
  } catch (err: any) {
    if (err.message.includes('not found or unauthorized')) {
      res.status(404).json({ error: 'Budget not found or unauthorized.' });
      return;
    }
    res.status(400).json({ error: err.message });
  }
});

// --- Expense Endpoints ---

app.get('/api/expenses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const month = req.query.month as string | undefined;
  const categoryId = req.query.category_id as string | undefined;
  const expenses = getExpensesByUser(req.userId!, month, categoryId);
  res.json({ expenses });
});

app.get('/api/expenses/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const expense = getExpenseById(id, req.userId!);
  if (!expense) {
    res.status(404).json({ error: 'You are not authorized to access this record.' });
    return;
  }
  res.json({ expense });
});

app.post('/api/expenses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category_id, amount, date, notes } = req.body;

    if (!category_id) {
      res.status(400).json({ error: 'Please select a category.' });
      return;
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      res.status(400).json({ error: 'Expense amount must be greater than zero.' });
      return;
    }

    if (!date) {
      res.status(400).json({ error: 'Date is required.' });
      return;
    }

    const expense = createExpense(req.userId!, category_id, amountNum, date, notes);
    res.status(201).json({ expense, message: 'Expense added successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { category_id, amount, date, notes } = req.body;

    if (!category_id) {
      res.status(400).json({ error: 'Please select a category.' });
      return;
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      res.status(400).json({ error: 'Expense amount must be greater than zero.' });
      return;
    }

    if (!date) {
      res.status(400).json({ error: 'Date is required.' });
      return;
    }

    const expense = updateExpense(id, req.userId!, category_id, amountNum, date, notes);
    res.json({ expense, message: 'Expense updated successfully.' });
  } catch (err: any) {
    if (err.message.includes('not found or unauthorized')) {
      res.status(404).json({ error: 'You are not authorized to access this record.' });
      return;
    }
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    deleteExpense(id, req.userId!);
    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err: any) {
    if (err.message.includes('not found or unauthorized')) {
      res.status(404).json({ error: 'You are not authorized to access this record.' });
      return;
    }
    res.status(400).json({ error: err.message });
  }
});

// --- Section 10: Required Endpoint POST /expenses/create/ ---
app.post('/expenses/create/', (req: Request, res: Response) => {
  // Support both cookie/token authentication
  const token = extractSessionToken(req);
  if (!token) {
    // If unauthenticated redirect or 401
    if (req.accepts('html')) {
      res.redirect(303, '/login?error=' + encodeURIComponent('Please log in first.'));
      return;
    }
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const userId = getUserIdFromSession(token);
  if (!userId) {
    if (req.accepts('html')) {
      res.redirect(303, '/login?error=' + encodeURIComponent('Session expired.'));
      return;
    }
    res.status(401).json({ error: 'Invalid session.' });
    return;
  }

  const { category_id, amount, date, notes } = req.body;
  const amountNum = Number(amount);

  const errors: string[] = [];
  if (!category_id) errors.push('Please select a category.');
  if (isNaN(amountNum) || amountNum <= 0) errors.push('Expense amount must be greater than zero.');
  if (!date) errors.push('Date is required.');

  if (errors.length > 0) {
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      res.redirect(
        303,
        `/expenses?error=${encodeURIComponent(errors.join(', '))}&amount=${encodeURIComponent(
          amount || ''
        )}&category_id=${encodeURIComponent(category_id || '')}&date=${encodeURIComponent(
          date || ''
        )}`
      );
      return;
    }
    res.status(400).json({ errors, error: errors[0] });
    return;
  }

  try {
    createExpense(userId, category_id, amountNum, date, notes);
    if (req.accepts('html') && !req.headers['x-requested-with']?.includes('XMLHttpRequest')) {
      res.redirect(303, '/expenses?success=' + encodeURIComponent('Expense added successfully.'));
      return;
    }
    res.status(201).json({ message: 'Expense created successfully.' });
  } catch (err: any) {
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      res.redirect(303, `/expenses?error=${encodeURIComponent(err.message)}`);
      return;
    }
    res.status(400).json({ error: err.message });
  }
});

// --- Dashboard Aggregation Endpoint ---

app.get('/api/dashboard', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const monthYear = (req.query.month as string) || '2026-10'; // default current month

  const userCategories = getCategoriesByUser(userId);
  const userBudgets = getBudgetsByUser(userId, monthYear);
  const userExpenses = getExpensesByUser(userId, monthYear);

  // Total budget is sum of all category budgets for this month
  const totalBudget = userBudgets.reduce((sum, b) => sum + b.monthly_limit, 0);

  // Total spent is sum of all expenses for this month
  const totalSpent = userExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Remaining budget
  const remainingBudget = totalBudget - totalSpent;

  // Category breakdown:
  // Show all categories that have a budget for this month,
  // PLUS any category that has expenses for this month even if no budget is set.
  const categoriesBreakdown: CategorySpending[] = [];

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {};
  for (const exp of userExpenses) {
    expensesByCategory[exp.category_id] =
      (expensesByCategory[exp.category_id] || 0) + exp.amount;
  }

  // Budget map
  const budgetMap: Record<string, (typeof userBudgets)[0]> = {};
  for (const b of userBudgets) {
    budgetMap[b.category_id] = b;
  }

  for (const cat of userCategories) {
    const budget = budgetMap[cat.id] || null;
    const spent = Math.round((expensesByCategory[cat.id] || 0) * 100) / 100;

    // Only include category in breakdown if it has a budget OR has spent money in this month
    if (!budget && spent === 0) {
      continue;
    }

    if (budget) {
      const budgetLimit = budget.monthly_limit;
      const remaining = Math.round((budgetLimit - spent) * 100) / 100;
      const percentage = Math.round((spent / budgetLimit) * 10000) / 100; // 2 decimal precision
      const status = getAlertStatus(percentage);

      categoriesBreakdown.push({
        category: cat,
        budget,
        budgetLimit,
        spent,
        remaining,
        percentage,
        status,
      });
    } else {
      // Category has expenses but no budget
      categoriesBreakdown.push({
        category: cat,
        budget: null,
        budgetLimit: null,
        spent,
        remaining: null,
        percentage: null,
        status: null,
      });
    }
  }

  // Sort: highest spent first
  categoriesBreakdown.sort((a, b) => b.spent - a.spent);

  const responseData: MonthlyDashboardData = {
    monthYear,
    formattedMonth: formatMonthYear(monthYear),
    totalBudget: Math.round(totalBudget * 100) / 100,
    totalSpent: Math.round(totalSpent * 100) / 100,
    remainingBudget: Math.round(remainingBudget * 100) / 100,
    categoriesBreakdown,
  };

  res.json(responseData);
});

// --- Demo Data Seeder for current user ---

app.post('/api/seed-demo', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  try {
    // Check if user already has categories
    const existing = getCategoriesByUser(userId);
    const catMap: Record<string, string> = {};

    for (const name of ['Food', 'Travel', 'Shopping', 'Entertainment']) {
      const found = existing.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (found) {
        catMap[name] = found.id;
      } else {
        const created = createCategory(
          userId,
          name,
          name === 'Food'
            ? 'Food and groceries'
            : name === 'Travel'
            ? 'Transportation and commute'
            : name === 'Shopping'
            ? 'Personal purchases and clothes'
            : 'Movies, outings and recreation'
        );
        catMap[name] = created.id;
      }
    }

    // Set October 2026 budgets:
    // Food — ₹5,000
    // Travel — ₹3,000
    // Shopping — ₹2,000
    // Entertainment — ₹2,000
    upsertBudget(userId, catMap['Food'], '2026-10', 5000);
    upsertBudget(userId, catMap['Travel'], '2026-10', 3000);
    upsertBudget(userId, catMap['Shopping'], '2026-10', 2000);
    upsertBudget(userId, catMap['Entertainment'], '2026-10', 2000);

    // Create expenses:
    // Food — ₹4,000 (80% -> WARNING)
    // Travel — ₹1,000 (33% -> NORMAL)
    // Shopping — ₹2,300 (115% -> DANGER)
    // Entertainment — ₹500 (25% -> NORMAL)
    createExpense(userId, catMap['Food'], 4000, '2026-10-02', 'Weekly supermarket groceries');
    createExpense(userId, catMap['Travel'], 1000, '2026-10-03', 'Metro pass & fuel');
    createExpense(userId, catMap['Shopping'], 2300, '2026-10-04', 'Festival clothing sale');
    createExpense(userId, catMap['Entertainment'], 500, '2026-10-05', 'Cinema ticket & popcorn');

    // Also add one September expense to demonstrate monthly isolation
    createExpense(userId, catMap['Food'], 3500, '2026-09-20', 'September groceries');

    res.json({ message: 'Demo data loaded successfully for October 2026.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Run Automated Unit & Integration Tests Endpoint ---
app.get('/api/run-automated-tests', async (_req: Request, res: Response) => {
  const testResults: {
    id: string;
    title: string;
    passed: boolean;
    expected: string;
    actual: string;
    details?: string;
  }[] = [];

  try {
    // Test 1 — Normal status: Budget = ₹5,000, Spent = ₹2,500 -> 50%, Normal
    {
      const budget = 5000;
      const spent = 2500;
      const percentage = (spent / budget) * 100;
      const status = getAlertStatus(percentage);
      testResults.push({
        id: 'test-1',
        title: 'Test 1 — Normal status (< 80%)',
        passed: percentage === 50 && status === 'NORMAL',
        expected: 'Usage: 50%, Status: NORMAL',
        actual: `Usage: ${percentage}%, Status: ${status}`,
      });
    }

    // Test 2 — Warning status: Budget = ₹5,000, Spent = ₹4,000 -> 80%, Warning
    {
      const budget = 5000;
      const spent = 4000;
      const percentage = (spent / budget) * 100;
      const status = getAlertStatus(percentage);
      testResults.push({
        id: 'test-2',
        title: 'Test 2 — Warning status (>= 80% and < 100%)',
        passed: percentage === 80 && status === 'WARNING',
        expected: 'Usage: 80%, Status: WARNING',
        actual: `Usage: ${percentage}%, Status: ${status}`,
      });
    }

    // Test 3 — Danger status: Budget = ₹5,000, Spent = ₹5,000 -> 100%, Danger
    {
      const budget = 5000;
      const spent = 5000;
      const percentage = (spent / budget) * 100;
      const status = getAlertStatus(percentage);
      testResults.push({
        id: 'test-3',
        title: 'Test 3 — Danger status (>= 100%)',
        passed: percentage === 100 && status === 'DANGER',
        expected: 'Usage: 100%, Status: DANGER',
        actual: `Usage: ${percentage}%, Status: ${status}`,
      });
    }

    // Test 4 — Over budget: Budget = ₹5,000, Spent = ₹6,000 -> 120%, Danger, Remaining = -₹1,000
    {
      const budget = 5000;
      const spent = 6000;
      const percentage = (spent / budget) * 100;
      const remaining = budget - spent;
      const status = getAlertStatus(percentage);
      testResults.push({
        id: 'test-4',
        title: 'Test 4 — Over budget (Spent > Budget)',
        passed: percentage === 120 && status === 'DANGER' && remaining === -1000,
        expected: 'Usage: 120%, Status: DANGER, Remaining: -1000',
        actual: `Usage: ${percentage}%, Status: ${status}, Remaining: ${remaining}`,
      });
    }

    // Test 5 — Monthly filtering: September expense must not affect October totals
    {
      const testUserId = 'test_user_month_filter_' + Date.now();
      const cat = createCategory(testUserId, 'TestCat5');
      upsertBudget(testUserId, cat.id, '2026-10', 5000);
      createExpense(testUserId, cat.id, 2000, '2026-10-15');
      createExpense(testUserId, cat.id, 4000, '2026-09-20'); // September expense

      const octExpenses = getExpensesByUser(testUserId, '2026-10');
      const octTotal = octExpenses.reduce((s, e) => s + e.amount, 0);

      testResults.push({
        id: 'test-5',
        title: 'Test 5 — Monthly filtering',
        passed: octTotal === 2000 && octExpenses.length === 1,
        expected: 'October spent = 2000 (September 4000 excluded)',
        actual: `October spent = ${octTotal} (Expenses count: ${octExpenses.length})`,
      });
    }

    // Test 6 — User isolation: User A cannot access User B's categories, budgets, expenses
    {
      const userAId = 'test_user_A_' + Date.now();
      const userBId = 'test_user_B_' + Date.now();

      const catA = createCategory(userAId, 'UserA_Cat');
      const catB = createCategory(userBId, 'UserB_Cat');

      upsertBudget(userAId, catA.id, '2026-10', 3000);
      upsertBudget(userBId, catB.id, '2026-10', 4000);

      createExpense(userAId, catA.id, 500, '2026-10-01');
      createExpense(userBId, catB.id, 900, '2026-10-01');

      const userACats = getCategoriesByUser(userAId);
      const userBCats = getCategoriesByUser(userBId);
      const userAExpenses = getExpensesByUser(userAId);
      const userBExpenses = getExpensesByUser(userBId);

      // Verify User A cannot fetch User B's category by ID
      const userATryingCatB = getCategoryById(catB.id, userAId);
      // Verify User A cannot create expense with User B's category
      let crossUserExpenseBlocked = false;
      try {
        createExpense(userAId, catB.id, 100, '2026-10-02');
      } catch (err: any) {
        crossUserExpenseBlocked = true;
      }

      const isolated =
        userACats.length === 1 &&
        userACats[0].id === catA.id &&
        userBCats.length === 1 &&
        userBCats[0].id === catB.id &&
        userAExpenses.length === 1 &&
        userBExpenses.length === 1 &&
        userATryingCatB === undefined &&
        crossUserExpenseBlocked;

      testResults.push({
        id: 'test-6',
        title: 'Test 6 — User isolation (Strict multi-tenant security)',
        passed: isolated,
        expected: 'User A and User B records completely partitioned & cross-access rejected',
        actual: isolated ? 'All isolation checks passed' : 'Isolation failed',
      });
    }

    // Test 7 — Authentication: Unauthenticated token rejected
    {
      const invalidToken = 'invalid_token_xyz_123';
      const authenticatedUserId = getUserIdFromSession(invalidToken);

      testResults.push({
        id: 'test-7',
        title: 'Test 7 — Authentication enforcement',
        passed: authenticatedUserId === null,
        expected: 'Unauthenticated/invalid session returns null/401',
        actual: authenticatedUserId === null ? 'Rejected unauthenticated session' : 'Allowed unauthorized access',
      });
    }

    // Test 8 — Validation: Zero and negative expenses & budgets must be rejected
    {
      const testUserId = 'test_val_user_' + Date.now();
      const cat = createCategory(testUserId, 'ValidationCat');

      let rejectedZeroExpense = false;
      let rejectedNegativeExpense = false;
      let rejectedZeroBudget = false;
      let rejectedNegativeBudget = false;

      try {
        createExpense(testUserId, cat.id, 0, '2026-10-01');
      } catch {
        rejectedZeroExpense = true;
      }

      try {
        createExpense(testUserId, cat.id, -100, '2026-10-01');
      } catch {
        rejectedNegativeExpense = true;
      }

      try {
        upsertBudget(testUserId, cat.id, '2026-10', 0);
      } catch {
        rejectedZeroBudget = true;
      }

      try {
        upsertBudget(testUserId, cat.id, '2026-10', -500);
      } catch {
        rejectedNegativeBudget = true;
      }

      const allRejected =
        rejectedZeroExpense &&
        rejectedNegativeExpense &&
        rejectedZeroBudget &&
        rejectedNegativeBudget;

      testResults.push({
        id: 'test-8',
        title: 'Test 8 — Validation (Zero and negative amounts rejected)',
        passed: allRejected,
        expected: 'Amounts <= 0 rejected for both expenses and budgets',
        actual: allRejected ? 'All zero and negative values rejected' : 'Validation failure',
      });
    }

    const allPassed = testResults.every((t) => t.passed);
    res.json({ allPassed, testResults });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Server & Vite Middleware Integration ---
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
