import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CheckCircle2, XCircle, RotateCcw, X, ShieldCheck } from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{
    allPassed: boolean;
    testResults: {
      id: string;
      title: string;
      passed: boolean;
      expected: string;
      actual: string;
    }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    try {
      setRunning(true);
      setError(null);
      const data = await api.runAutomatedTests();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to execute test suite.');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && !results && !running) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Automated Acceptance & Unit Test Suite
              </h2>
              <p className="text-xs text-gray-500">
                Verifies Section 31 & 32 requirements and system boundary conditions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {running && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-gray-600">Executing 8 automated test suites...</p>
            </div>
          )}

          {!running && results && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  results.allPassed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {results.allPassed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {results.allPassed
                        ? 'All 8 Automated Acceptance Tests Passed (100%)'
                        : 'Some Tests Failed'}
                    </h3>
                    <p className="text-xs mt-0.5 opacity-90">
                      8 of 8 required test assertions verified against live business logic and database.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-white/80 shadow-2xs">
                  {results.testResults.filter((t) => t.passed).length}/8 PASS
                </span>
              </div>

              <div className="space-y-2.5">
                {results.testResults.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {t.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-snug">
                            {idx + 1}. {t.title}
                          </p>
                          <div className="mt-1 text-xs space-y-0.5 text-gray-600">
                            <p>
                              <span className="font-medium text-gray-500">Expected:</span> {t.expected}
                            </p>
                            <p>
                              <span className="font-medium text-gray-500">Actual:</span>{' '}
                              <span className={t.passed ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'}>
                                {t.actual}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-2xs font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          t.passed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500">CLI runner also available via: <code>npm test</code></p>
          <div className="flex gap-2">
            <button
              onClick={runTests}
              disabled={running}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
              Re-run Test Suite
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
