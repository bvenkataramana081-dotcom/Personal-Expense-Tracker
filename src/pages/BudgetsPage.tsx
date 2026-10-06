import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Budget, Category } from '../types';
import { formatCurrency, formatMonthYear } from '../utils/calculations';
import {
  PieChart,
  PlusCircle,
  Pencil,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface BudgetsPageProps {
  onOpenSetBudget: () => void;
  onOpenEditBudget: (budget: Budget) => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({
  onOpenSetBudget,
  onOpenEditBudget,
  showToast,
}) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      const [bRes, cRes] = await Promise.all([
        api.getBudgets(showAllMonths ? undefined : selectedMonth),
        api.getCategories(),
      ]);
      setBudgets(bRes.budgets);
      setCategories(cRes.categories);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch budgets.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, [selectedMonth, showAllMonths]);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await api.deleteBudget(id);
      showToast(res.message || 'Budget deleted successfully.', 'success');
      setBudgets((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete budget.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const found = categories.find((c) => c.id === categoryId);
    return found ? found.name : 'Unknown Category';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Budgets</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Set and track monthly spending targets per category.
          </p>
        </div>

        <button
          onClick={onOpenSetBudget}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Set Budget</span>
        </button>
      </div>

      {/* Month Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg p-1">
            <button
              onClick={handlePrevMonth}
              disabled={showAllMonths}
              className="p-1 hover:bg-white text-gray-600 hover:text-gray-900 rounded disabled:opacity-40"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-0.5 font-semibold text-gray-800 text-sm">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{formatMonthYear(selectedMonth)}</span>
            </div>
            <button
              onClick={handleNextMonth}
              disabled={showAllMonths}
              className="p-1 hover:bg-white text-gray-600 hover:text-gray-900 rounded disabled:opacity-40"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllMonths}
              onChange={(e) => setShowAllMonths(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>View All Months</span>
          </label>
        </div>

        <div className="text-xs font-semibold text-gray-500">
          Showing {budgets.length} {budgets.length === 1 ? 'budget' : 'budgets'}
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium text-gray-600">Loading budgets...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && budgets.length === 0 && (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <PieChart className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-gray-900">
              {showAllMonths
                ? 'No budgets configured yet.'
                : `No budget has been set for ${formatMonthYear(selectedMonth)}.`}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Set monthly spending limits for each category to maintain control over your finances.
            </p>
          </div>
          <button
            onClick={onOpenSetBudget}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Set Budget</span>
          </button>
        </div>
      )}

      {/* Budgets Table */}
      {!loading && budgets.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Month</th>
                  <th className="px-6 py-4">Monthly Limit</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {budgets.map((b) => {
                  const catName = getCategoryName(b.category_id);
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{catName}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatMonthYear(b.month_year)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-blue-700 text-base">
                          {formatCurrency(b.monthly_limit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => onOpenEditBudget(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-500" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
                            disabled={deletingId === b.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>{deletingId === b.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
