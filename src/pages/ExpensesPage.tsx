import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Expense, Category } from '../types';
import { formatCurrency, formatDate, formatMonthYear } from '../utils/calculations';
import {
  Receipt,
  PlusCircle,
  Pencil,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';

interface ExpensesPageProps {
  onOpenAddExpense: () => void;
  onOpenEditExpense: (expense: Expense) => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  onOpenAddExpense,
  onOpenEditExpense,
  showToast,
}) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const [expRes, catRes] = await Promise.all([
        api.getExpenses(
          showAllMonths ? undefined : selectedMonth,
          selectedCategoryId || undefined
        ),
        api.getCategories(),
      ]);
      setExpenses(expRes.expenses);
      setCategories(catRes.categories);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch expenses.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, showAllMonths, selectedCategoryId]);

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
      const res = await api.deleteExpense(id);
      showToast(res.message || 'Expense deleted successfully.', 'success');
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete expense.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const found = categories.find((c) => c.id === categoryId);
    return found ? found.name : 'Unknown Category';
  };

  const totalFilteredAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Expenses</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            View and manage your spending transactions.
          </p>
        </div>

        <button
          onClick={onOpenAddExpense}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Filter and Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector */}
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

          {/* Category filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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

        <div className="flex items-center justify-between md:justify-end gap-4 text-sm font-semibold">
          <span className="text-gray-500">{expenses.length} records</span>
          <span className="text-gray-900">
            Total:{' '}
            <span className="text-blue-700 font-bold">
              {formatCurrency(totalFilteredAmount)}
            </span>
          </span>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium text-gray-600">Loading expenses...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && expenses.length === 0 && (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Receipt className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-gray-900">
              {showAllMonths
                ? 'No expenses recorded yet.'
                : `No expenses recorded for ${formatMonthYear(selectedMonth)}.`}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Add your spending to automatically track category usage and alerts.
            </p>
          </div>
          <button
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Expense</span>
          </button>
        </div>
      )}

      {/* Responsive Table / Cards */}
      {!loading && expenses.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map((exp) => {
                    const catName = getCategoryName(exp.category_id);
                    return (
                      <tr key={exp.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">
                          {formatDate(exp.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-gray-900 uppercase text-xs px-2.5 py-1 bg-gray-100 rounded-md">
                            {catName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-extrabold text-gray-900 text-base">
                            {formatCurrency(exp.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                          {exp.notes ? exp.notes : <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => onOpenEditExpense(exp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-gray-500" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(exp.id)}
                              disabled={deletingId === exp.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>{deletingId === exp.id ? 'Deleting...' : 'Delete'}</span>
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

          {/* Mobile Cards View */}
          <div className="sm:hidden space-y-3">
            {expenses.map((exp) => {
              const catName = getCategoryName(exp.category_id);
              return (
                <div
                  key={exp.id}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-xs uppercase px-2.5 py-0.5 bg-gray-100 rounded-md">
                      {catName}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(exp.date)}</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-gray-900">
                      {formatCurrency(exp.amount)}
                    </span>
                    {exp.notes && (
                      <p className="text-xs text-gray-600 italic line-clamp-1 max-w-[55%]">
                        {exp.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                    <button
                      onClick={() => onOpenEditExpense(exp)}
                      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      disabled={deletingId === exp.id}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
