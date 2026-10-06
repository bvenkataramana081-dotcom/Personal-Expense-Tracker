import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { MonthlyDashboardData, Category } from '../types';
import {
  formatCurrency,
  formatMonthYear,
  getStatusBadge,
  getClampedProgress,
} from '../utils/calculations';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  PlusCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
  Database,
  Sparkles,
  PieChart,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenAddExpense: () => void;
  onOpenSetBudget: () => void;
  onOpenAddCategory: () => void;
  onNavigate: (page: string) => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenAddExpense,
  onOpenSetBudget,
  onOpenAddCategory,
  onNavigate,
  showToast,
}) => {
  // Current month default: October 2026
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [data, setData] = useState<MonthlyDashboardData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchDashboard = async (month: string) => {
    try {
      setLoading(true);
      const [dashData, catData] = await Promise.all([
        api.getDashboard(month),
        api.getCategories(),
      ]);
      setData(dashData);
      setCategories(catData.categories);
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedMonth);
  }, [selectedMonth]);

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

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await api.seedDemo();
      showToast(res.message, 'success');
      setSelectedMonth('2026-10');
      fetchDashboard('2026-10');
    } catch (err: any) {
      showToast(err.message || 'Failed to seed demo data', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const isOverBudget = data && data.remainingBudget < 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Section Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Personal Expense Tracker
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              PERSONAL EXPENSE TRACKER
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-medium mt-1">
              Know where your money goes before your money is gone.
            </p>
          </div>

          {/* Month Selector & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Picker Control */}
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl p-1 shadow-2xs">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1 font-semibold text-gray-800 text-sm sm:text-base">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{formatMonthYear(selectedMonth)}</span>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAddExpense}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
              <button
                onClick={onOpenSetBudget}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors shadow-2xs"
              >
                <PieChart className="w-4 h-4 text-gray-500" />
                <span>Set Budget</span>
              </button>
            </div>
          </div>
        </div>

        {/* Optional Demo Data banner if user has no expenses */}
        {data && data.totalSpent === 0 && data.totalBudget === 0 && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-950">
                  New here? Load standard demo dataset for {formatMonthYear(selectedMonth)}
                </p>
                <p className="text-xs text-blue-800 mt-0.5">
                  Populates Food (Warning), Travel (Normal), Shopping (Danger), and Entertainment sample data.
                </p>
              </div>
            </div>
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors shadow-xs disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{seeding ? 'Loading Demo Data...' : 'Load Sample Data'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Budget Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              TOTAL BUDGET
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {data ? formatCurrency(data.totalBudget) : '₹0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Planned budget for {data ? data.formattedMonth : ''}
            </p>
          </div>
        </div>

        {/* Total Spent Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              TOTAL SPENT
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {data ? formatCurrency(data.totalSpent) : '₹0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Sum of expenses in {data ? data.formattedMonth : ''}
            </p>
          </div>
        </div>

        {/* Remaining Budget Card */}
        <div
          className={`rounded-2xl p-6 border shadow-xs relative overflow-hidden ${
            isOverBudget
              ? 'bg-rose-50/50 border-rose-300'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isOverBudget ? 'text-rose-700' : 'text-gray-500'
              }`}
            >
              REMAINING BUDGET
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isOverBudget
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {isOverBudget ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isOverBudget ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {data ? formatCurrency(data.remainingBudget) : '₹0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isOverBudget ? (
                <span className="text-rose-700 font-semibold flex items-center gap-1">
                  <span>🚨 Over budget by {formatCurrency(Math.abs(data.remainingBudget))}</span>
                </span>
              ) : (
                'Total Budget minus Total Spent'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              CATEGORY BREAKDOWN
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Category spending against monthly budget limits for {formatMonthYear(selectedMonth)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              &lt; 80% Normal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              80% - 99% Warning
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              ≥ 100% Danger
            </span>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-medium text-gray-600">Calculating monthly figures...</p>
          </div>
        )}

        {/* Empty states */}
        {!loading && (!data || data.categoriesBreakdown.length === 0) && (
          <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <PieChart className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-gray-900">
                No budget or expenses recorded for this month
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Set monthly limits for your categories or record new expenses to see your spending breakdown.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {categories.length === 0 ? (
                <button
                  onClick={onOpenAddCategory}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Add Category</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={onOpenSetBudget}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Set Budget</span>
                  </button>
                  <button
                    onClick={onOpenAddExpense}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-gray-500" />
                    <span>+ Add Expense</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Category Breakdown Cards Grid */}
        {!loading && data && data.categoriesBreakdown.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.categoriesBreakdown.map((item) => {
              const hasBudget = item.budgetLimit !== null && item.budgetLimit > 0;
              const badge = item.status ? getStatusBadge(item.status) : null;
              const clampedProgress =
                item.percentage !== null ? getClampedProgress(item.percentage) : 0;
              const isCatOverBudget = item.remaining !== null && item.remaining < 0;

              return (
                <div
                  key={item.category.id}
                  className={`bg-white rounded-2xl p-6 border transition-all shadow-xs flex flex-col justify-between ${
                    isCatOverBudget
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div>
                    {/* Header: Category Name + Alert Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight uppercase">
                          {item.category.name}
                        </h3>
                        {item.category.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {item.category.description}
                          </p>
                        )}
                      </div>

                      {hasBudget && badge ? (
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider shrink-0 ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border bg-gray-50 text-gray-600 border-gray-200 shrink-0">
                          No budget set
                        </span>
                      )}
                    </div>

                    {/* Figures row: Budget, Spent, Remaining */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 text-xs">
                      <div>
                        <span className="text-gray-500 font-medium block">Budget</span>
                        <span className="text-sm font-bold text-gray-900 mt-0.5 block">
                          {hasBudget ? formatCurrency(item.budgetLimit!) : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Spent</span>
                        <span className="text-sm font-bold text-gray-900 mt-0.5 block">
                          {formatCurrency(item.spent)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Remaining</span>
                        <span
                          className={`text-sm font-bold mt-0.5 block ${
                            isCatOverBudget
                              ? 'text-rose-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {item.remaining !== null ? formatCurrency(item.remaining) : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Usage */}
                    {hasBudget ? (
                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 font-semibold">
                            Used: <span className="text-gray-900">{item.percentage}%</span>
                          </span>
                          {isCatOverBudget && (
                            <span className="text-rose-600 font-bold text-2xs uppercase tracking-wider">
                              Exceeded Limit
                            </span>
                          )}
                        </div>

                        {/* Progress Bar: visually capped at 100%, actual percentage shown above */}
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              badge ? badge.barColor : 'bg-blue-600'
                            }`}
                            style={{ width: `${clampedProgress}%` }}
                            role="progressbar"
                            aria-valuenow={item.percentage!}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
                        <span>No budget configured for {formatMonthYear(selectedMonth)}.</span>
                        <button
                          onClick={onOpenSetBudget}
                          className="font-semibold text-blue-600 hover:text-blue-800 underline shrink-0 ml-2"
                        >
                          Set Budget
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <button
                      onClick={() => onNavigate('expenses')}
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <span>View Category Expenses</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
