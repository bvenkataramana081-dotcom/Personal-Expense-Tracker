import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Category } from '../types';
import {
  Tags,
  PlusCircle,
  Pencil,
  Trash2,
  FolderOpen,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

interface CategoriesPageProps {
  onOpenAddCategory: () => void;
  onOpenEditCategory: (category: Category) => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  onOpenAddCategory,
  onOpenEditCategory,
  showToast,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.getCategories();
      setCategories(res.categories);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch categories.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    setDeleteError(null);
    setDeletingId(id);

    try {
      const res = await api.deleteCategory(id);
      showToast(res.message || `Category "${name}" deleted successfully.`, 'success');
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      // Deletion prevented due to existing expenses or authorization
      const msg = err.message || 'Failed to delete category.';
      setDeleteError(msg);
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Categories</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage your personal expense categories. Only you have access to these categories.
          </p>
        </div>

        <button
          onClick={onOpenAddCategory}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Add Category</span>
        </button>
      </div>

      {deleteError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{deleteError}</p>
            <p className="text-xs text-rose-700 mt-0.5">
              To protect financial history and budget calculations, categories with existing expense transactions cannot be removed.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium text-gray-600">Loading categories...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && categories.length === 0 && (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-gray-900">
              You haven't created any categories yet.
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Create categories such as Food, Travel, or Shopping to organize your monthly budgets and expenses.
            </p>
          </div>
          <button
            onClick={onOpenAddCategory}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Category</span>
          </button>
        </div>
      )}

      {/* Categories Grid/List */}
      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-gray-300 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">
                    {cat.name}
                  </h3>
                  <span className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                    Category
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 min-h-[2.5rem]">
                  {cat.description || (
                    <span className="italic text-gray-400">No description provided</span>
                  )}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => onOpenEditCategory(cat)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-gray-500" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={deletingId === cat.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete category (safe deletion)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{deletingId === cat.id ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
