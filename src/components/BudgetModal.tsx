import React, { useState, useEffect } from 'react';
import { Category, Budget } from '../types';
import { X } from 'lucide-react';

interface BudgetModalProps {
  isOpen: boolean;
  budget: Budget | null; // null if adding new
  categories: Category[];
  initialMonth?: string; // e.g. '2026-10'
  onClose: () => void;
  onSave: (categoryId: string, monthYear: string, limit: number) => Promise<void>;
  onNavigateToCategories?: () => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  budget,
  categories,
  initialMonth = '2026-10',
  onClose,
  onSave,
  onNavigateToCategories,
}) => {
  const [categoryId, setCategoryId] = useState('');
  const [monthYear, setMonthYear] = useState(initialMonth);
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (budget) {
      setCategoryId(budget.category_id);
      setMonthYear(budget.month_year);
      setMonthlyLimit(budget.monthly_limit.toString());
    } else {
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setMonthYear(initialMonth);
      setMonthlyLimit('');
    }
    setError('');
  }, [budget, categories, initialMonth, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
      setError('Please select a valid month.');
      return;
    }

    const limitNum = parseFloat(monthlyLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      setError('Budget amount must be greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      await onSave(categoryId, monthYear, limitNum);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save budget.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {budget ? 'Edit Budget' : 'Set Monthly Budget'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {categories.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 space-y-2">
              <p>You haven't created any categories yet. A category is required to set a budget.</p>
              {onNavigateToCategories && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToCategories();
                  }}
                  className="font-semibold text-blue-600 underline hover:text-blue-800"
                >
                  Create a category first →
                </button>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={!!budget} // In edit mode, category is locked or updated
                >
                  <option value="" disabled>
                    -- Select Category --
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Month & Year <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  required
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={!!budget}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Monthly Limit (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-500 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder="e.g. 5000 or 1250.50"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Must be greater than zero. If a budget for this category and month exists, it will be updated.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || categories.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : budget ? 'Update Budget' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
