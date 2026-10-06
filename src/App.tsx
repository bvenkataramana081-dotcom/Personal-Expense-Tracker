import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ToastContainer, ToastMessage } from './components/Toast';
import { CategoryModal } from './components/CategoryModal';
import { BudgetModal } from './components/BudgetModal';
import { ExpenseModal } from './components/ExpenseModal';
import { TestRunnerModal } from './components/TestRunnerModal';
import { DashboardPage } from './pages/DashboardPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { AuthPage } from './pages/AuthPage';
import { Category, Budget, Expense } from './types';
import { api } from './api/client';

function MainApp() {
  const { user, loading } = useAuth();

  // Navigation
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'categories' | 'budgets' | 'expenses'>('dashboard');

  // Modals
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [testRunnerOpen, setTestRunnerOpen] = useState(false);

  // Categories cache for dropdowns
  const [userCategories, setUserCategories] = useState<Category[]>([]);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check URL parameters for Section 10 redirect messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successMsg = params.get('success');
    const errorMsg = params.get('error');

    if (successMsg) {
      showToast(decodeURIComponent(successMsg), 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (errorMsg) {
      showToast(decodeURIComponent(errorMsg), 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check if path requested a specific page
    const pathname = window.location.pathname;
    if (pathname.includes('/categories')) setCurrentPage('categories');
    else if (pathname.includes('/budgets')) setCurrentPage('budgets');
    else if (pathname.includes('/expenses')) setCurrentPage('expenses');
    else setCurrentPage('dashboard');
  }, []);

  const refreshCategories = async () => {
    if (!user) return;
    try {
      const res = await api.getCategories();
      setUserCategories(res.categories);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      refreshCategories();
    }
  }, [user]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-gray-700">Loading ExpenseTrack...</p>
      </div>
    );
  }

  // Protected route check
  if (!user) {
    return (
      <>
        <AuthPage showToast={showToast} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Handlers for Category CRUD
  const handleSaveCategory = async (name: string, description?: string) => {
    if (editingCategory) {
      const res = await api.updateCategory(editingCategory.id, { name, description });
      showToast(res.message || 'Category updated successfully.', 'success');
    } else {
      const res = await api.createCategory({ name, description });
      showToast(res.message || 'Category created successfully.', 'success');
    }
    await refreshCategories();
  };

  // Handlers for Budget CRUD
  const handleSaveBudget = async (categoryId: string, monthYear: string, limit: number) => {
    if (editingBudget) {
      const res = await api.updateBudget(editingBudget.id, { monthly_limit: limit, category_id: categoryId, month_year: monthYear });
      showToast(res.message || 'Budget updated successfully.', 'success');
    } else {
      const res = await api.saveBudget({ category_id: categoryId, month_year: monthYear, monthly_limit: limit });
      showToast(res.message || 'Budget saved successfully.', 'success');
    }
  };

  // Handlers for Expense CRUD
  const handleSaveExpense = async (categoryId: string, amount: number, date: string, notes?: string) => {
    if (editingExpense) {
      const res = await api.updateExpense(editingExpense.id, { category_id: categoryId, amount, date, notes });
      showToast(res.message || 'Expense updated successfully.', 'success');
    } else {
      const res = await api.createExpense({ category_id: categoryId, amount, date, notes });
      showToast(res.message || 'Expense added successfully.', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      {/* Navigation */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page as any)}
        onOpenTestSuite={() => setTestRunnerOpen(true)}
      />

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {currentPage === 'dashboard' && (
          <DashboardPage
            onOpenAddExpense={() => {
              setEditingExpense(null);
              setExpenseModalOpen(true);
            }}
            onOpenSetBudget={() => {
              setEditingBudget(null);
              setBudgetModalOpen(true);
            }}
            onOpenAddCategory={() => {
              setEditingCategory(null);
              setCategoryModalOpen(true);
            }}
            onNavigate={(page) => setCurrentPage(page as any)}
            showToast={showToast}
          />
        )}

        {currentPage === 'categories' && (
          <CategoriesPage
            onOpenAddCategory={() => {
              setEditingCategory(null);
              setCategoryModalOpen(true);
            }}
            onOpenEditCategory={(cat) => {
              setEditingCategory(cat);
              setCategoryModalOpen(true);
            }}
            showToast={showToast}
          />
        )}

        {currentPage === 'budgets' && (
          <BudgetsPage
            onOpenSetBudget={() => {
              setEditingBudget(null);
              setBudgetModalOpen(true);
            }}
            onOpenEditBudget={(b) => {
              setEditingBudget(b);
              setBudgetModalOpen(true);
            }}
            showToast={showToast}
          />
        )}

        {currentPage === 'expenses' && (
          <ExpensesPage
            onOpenAddExpense={() => {
              setEditingExpense(null);
              setExpenseModalOpen(true);
            }}
            onOpenEditExpense={(e) => {
              setEditingExpense(e);
              setExpenseModalOpen(true);
            }}
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>
            <span className="font-semibold text-gray-700">ExpenseTrack</span> — Personal Expense Tracker & Budget Manager
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTestRunnerOpen(true)}
              className="text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              Run Automated Tests (8/8)
            </button>
            <span>•</span>
            <span>Isolated Multi-User Storage</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CategoryModal
        isOpen={categoryModalOpen}
        category={editingCategory}
        onClose={() => setCategoryModalOpen(false)}
        onSave={handleSaveCategory}
      />

      <BudgetModal
        isOpen={budgetModalOpen}
        budget={editingBudget}
        categories={userCategories}
        onClose={() => setBudgetModalOpen(false)}
        onSave={handleSaveBudget}
        onNavigateToCategories={() => {
          setBudgetModalOpen(false);
          setCurrentPage('categories');
        }}
      />

      <ExpenseModal
        isOpen={expenseModalOpen}
        expense={editingExpense}
        categories={userCategories}
        onClose={() => setExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        onNavigateToCategories={() => {
          setExpenseModalOpen(false);
          setCurrentPage('categories');
        }}
      />

      <TestRunnerModal
        isOpen={testRunnerOpen}
        onClose={() => setTestRunnerOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
