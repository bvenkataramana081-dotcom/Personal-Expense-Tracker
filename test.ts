import {
  _resetDatabase,
  createUser,
  createCategory,
  getCategoriesByUser,
  getCategoryById,
  upsertBudget,
  getBudgetsByUser,
  createExpense,
  getExpensesByUser,
  getUserIdFromSession,
  createSession,
} from './server/db';
import { getAlertStatus } from './src/utils/calculations';

console.log('====================================================');
console.log('🧪 RUNNING AUTOMATED ACCEPTANCE & UNIT TEST SUITE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (details) console.error(`   Details: ${details}`);
  }
}

async function runTests() {
  _resetDatabase();

  // Test 1 — Normal status
  // Budget = ₹5,000, Spent = ₹2,500
  // Expected: 50%, Normal
  {
    const budget = 5000;
    const spent = 2500;
    const pct = (spent / budget) * 100;
    const status = getAlertStatus(pct);
    assert(pct === 50 && status === 'NORMAL', 'Test 1 — Normal status: 50% (< 80%) yields NORMAL', `Expected NORMAL, got ${status}`);
  }

  // Test 2 — Warning status
  // Budget = ₹5,000, Spent = ₹4,000
  // Expected: 80%, Warning
  {
    const budget = 5000;
    const spent = 4000;
    const pct = (spent / budget) * 100;
    const status = getAlertStatus(pct);
    assert(pct === 80 && status === 'WARNING', 'Test 2 — Warning status: 80% (>= 80% and < 100%) yields WARNING', `Expected WARNING, got ${status}`);
  }

  // Test 3 — Danger status
  // Budget = ₹5,000, Spent = ₹5,000
  // Expected: 100%, Danger
  {
    const budget = 5000;
    const spent = 5000;
    const pct = (spent / budget) * 100;
    const status = getAlertStatus(pct);
    assert(pct === 100 && status === 'DANGER', 'Test 3 — Danger status: 100% (>= 100%) yields DANGER', `Expected DANGER, got ${status}`);
  }

  // Test 4 — Over budget
  // Budget = ₹5,000, Spent = ₹6,000
  // Expected: 120%, Danger, Remaining = -₹1,000
  {
    const budget = 5000;
    const spent = 6000;
    const pct = (spent / budget) * 100;
    const remaining = budget - spent;
    const status = getAlertStatus(pct);
    assert(
      pct === 120 && status === 'DANGER' && remaining === -1000,
      'Test 4 — Over budget: 120% yields DANGER and Remaining = -1,000',
      `Got pct=${pct}, status=${status}, remaining=${remaining}`
    );
  }

  // Test 5 — Monthly filtering
  // September expense must not affect October totals.
  {
    const user = createUser('FilterUser', 'filter@example.com', 'dummy_hash');
    const cat = createCategory(user.id, 'FilterFood');
    upsertBudget(user.id, cat.id, '2026-10', 5000);
    createExpense(user.id, cat.id, 2000, '2026-10-15');
    createExpense(user.id, cat.id, 4000, '2026-09-20'); // September expense

    const octExpenses = getExpensesByUser(user.id, '2026-10');
    const octTotal = octExpenses.reduce((s, e) => s + e.amount, 0);
    assert(
      octTotal === 2000 && octExpenses.length === 1,
      'Test 5 — Monthly filtering: September expense (₹4,000) does not affect October total (₹2,000)',
      `October total: ${octTotal}`
    );
  }

  // Test 6 — User isolation
  // User A cannot access User B's categories, budgets, expenses
  {
    const userA = createUser('Rahul', 'rahul@example.com', 'dummy_hash');
    const userB = createUser('Priya', 'priya@example.com', 'dummy_hash');

    const catA = createCategory(userA.id, 'RahulFood');
    const catB = createCategory(userB.id, 'PriyaFood');

    upsertBudget(userA.id, catA.id, '2026-10', 5000);
    upsertBudget(userB.id, catB.id, '2026-10', 6000);

    createExpense(userA.id, catA.id, 500, '2026-10-06');
    createExpense(userB.id, catB.id, 800, '2026-10-06');

    // Rahul checks his records
    const rahulCats = getCategoriesByUser(userA.id);
    const priyaCats = getCategoriesByUser(userB.id);
    const rahulBudgets = getBudgetsByUser(userA.id, '2026-10');
    const priyaBudgets = getBudgetsByUser(userB.id, '2026-10');
    const rahulExpenses = getExpensesByUser(userA.id, '2026-10');
    const priyaExpenses = getExpensesByUser(userB.id, '2026-10');

    // Rahul trying to fetch Priya's category by ID
    const rahulTryingCatB = getCategoryById(catB.id, userA.id);

    // Rahul trying to create an expense on Priya's category
    let crossCatForbidden = false;
    try {
      createExpense(userA.id, catB.id, 250, '2026-10-06');
    } catch {
      crossCatForbidden = true;
    }

    const isolated =
      rahulCats.length === 1 &&
      rahulCats[0].name === 'RahulFood' &&
      priyaCats.length === 1 &&
      priyaCats[0].name === 'PriyaFood' &&
      rahulBudgets.length === 1 &&
      rahulBudgets[0].monthly_limit === 5000 &&
      priyaBudgets.length === 1 &&
      priyaBudgets[0].monthly_limit === 6000 &&
      rahulExpenses.length === 1 &&
      priyaExpenses.length === 1 &&
      rahulTryingCatB === undefined &&
      crossCatForbidden;

    assert(
      isolated,
      'Test 6 — User isolation: Rahul and Priya records completely isolated and cross-user operations blocked',
      'Isolation check failed'
    );
  }

  // Test 7 — Authentication
  // Unauthenticated users cannot access protected records
  {
    const validUser = createUser('AuthUser', 'auth@example.com', 'dummy_hash');
    const validToken = createSession(validUser.id);

    const validCheck = getUserIdFromSession(validToken);
    const invalidCheck = getUserIdFromSession('totally_invalid_session_token_123');

    assert(
      validCheck === validUser.id && invalidCheck === null,
      'Test 7 — Authentication: Unauthenticated or invalid sessions rejected',
      `Valid: ${validCheck}, Invalid: ${invalidCheck}`
    );
  }

  // Test 8 — Validation
  // Zero and negative expenses and budgets must be rejected
  {
    const valUser = createUser('ValUser', 'val@example.com', 'dummy_hash');
    const cat = createCategory(valUser.id, 'ValCategory');

    let zeroExpenseBlocked = false;
    let negExpenseBlocked = false;
    let zeroBudgetBlocked = false;
    let negBudgetBlocked = false;

    try {
      createExpense(valUser.id, cat.id, 0, '2026-10-01');
    } catch {
      zeroExpenseBlocked = true;
    }

    try {
      createExpense(valUser.id, cat.id, -250, '2026-10-01');
    } catch {
      negExpenseBlocked = true;
    }

    try {
      upsertBudget(valUser.id, cat.id, '2026-10', 0);
    } catch {
      zeroBudgetBlocked = true;
    }

    try {
      upsertBudget(valUser.id, cat.id, '2026-10', -500);
    } catch {
      negBudgetBlocked = true;
    }

    const validationsPassed =
      zeroExpenseBlocked && negExpenseBlocked && zeroBudgetBlocked && negBudgetBlocked;

    assert(
      validationsPassed,
      'Test 8 — Validation: Zero and negative expenses & budgets strictly rejected',
      'Validation check failed'
    );
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTS: ${passedTests} / ${totalTests} tests passed`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
