import React, { useState, useEffect } from 'react';
import { Category, Expense } from '../types';
import { X, Send } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  expense: Expense | null; // null if adding new
  categories: Category[];
  initialDate?: string; // e.g. '2026-10-06'
  onClose: () => void;
  onSave: (categoryId: string, amount: number, date: string, notes?: string) => Promise<void>;
  onNavigateToCategories?: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  expense,
  categories,
  initialDate,
  onClose,
  onSave,
  onNavigateToCategories,
}) => {
  const todayStr = initialDate || new Date().toISOString().split('T')[0];

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitViaFormEndpoint, setSubmitViaFormEndpoint] = useState(false);

  useEffect(() => {
    if (expense) {
      setCategoryId(expense.category_id);
      setAmount(expense.amount.toString());
      setDate(expense.date);
      setNotes(expense.notes || '');
    } else {
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setAmount('');
      setDate(todayStr);
      setNotes('');
    }
    setError('');
  }, [expense, categories, todayStr, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (submitViaFormEndpoint && !expense) {
      // Let standard HTML POST submission handle POST /expenses/create/ (Section 10)
      return;
    }

    e.preventDefault();
    setError('');

    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Expense amount must be greater than zero.');
      return;
    }

    if (!date) {
      setError('Date is required.');
      return;
    }

    try {
      setSubmitting(true);
      await onSave(categoryId, amountNum, date, notes.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {expense ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <p className="text-xs text-gray-500">
              Track spending against your monthly category budgets
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          action={submitViaFormEndpoint && !expense ? '/expenses/create/' : undefined}
          method={submitViaFormEndpoint && !expense ? 'POST' : undefined}
          className="p-6 space-y-4"
        >
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {categories.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 space-y-2">
              <p>You haven't created any categories yet. A category is required to log an expense.</p>
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
                  name="category_id"
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-500 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="amount"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 500 or 1250.50"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Must be greater than zero.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Notes <span className="text-xs text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Lunch with friends, groceries, fuel"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {!expense && (
                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={submitViaFormEndpoint}
                      onChange={(e) => setSubmitViaFormEndpoint(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Submit via Section 10 endpoint (POST /expenses/create/ with redirect)</span>
                  </label>
                </div>
              )}
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
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
