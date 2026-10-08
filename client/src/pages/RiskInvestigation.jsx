import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendInvestigationMessage } from '../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'Show me the highest-risk transactions today.',
  'Summarize open critical alerts.',
  'Which vendors have the highest risk?',
  'Show unusual user activity.',
  'Has transaction risk increased this week?',
  'What factors increased the fraud probability?',
  'Explain the behavioral anomalies for the last flagged transaction.',
  'Show recent high-risk transactions.',
];

const LOADING_STAGES = [
  'Thinking…',
  'Retrieving transaction data…',
  'Analyzing risk signals…',
  'Generating investigation report…',
];

// ─── Source chip component ────────────────────────────────────────────────────

function SourceChip({ source }) {
  const labels = {
    transaction: `Transaction #${source.id}`,
    risk_score: `Risk Score #${source.id}`,
    alert: `Alert #${source.id}`,
    vendor: `Vendor #${source.id}`,
    user: `User #${source.id}`,
    behavior_analysis: `Behavior Analysis`,
    shap_explanation: `SHAP Explanation`,
    risk_trend: `Risk Trends`,
  };

  const label = labels[source.type] || `${source.type} #${source.id}`;

  if (source.type === 'transaction') {
    return (
      <Link
        to={`/transactions/${source.id}`}
        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200 transition-colors"
      >
        <span>🔗</span>
        {label}
      </Link>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
      <span>📄</span>
      {label}
    </span>
  );
}

// ─── Message bubble component ─────────────────────────────────────────────────

function MessageBubble({ entry }) {
  if (entry.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white shadow-sm">
          {entry.content}
        </div>
      </div>
    );
  }

  if (entry.role === 'error') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <p className="mb-1 text-xs font-semibold text-red-600 uppercase tracking-wide">Error</p>
          <p className="text-sm text-red-700">{entry.content}</p>
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-3">
        {/* Agent header */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow">
            AI
          </div>
          <span className="text-xs font-medium text-gray-500">RiskShield AI</span>
        </div>

        {/* Answer */}
        <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {entry.content}
          </div>

          {/* Sources */}
          {Array.isArray(entry.sources) && entry.sources.length > 0 && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Sources
              </p>
              <div className="flex flex-wrap gap-2">
                {entry.sources.map((source, idx) => (
                  <SourceChip key={`${source.type}-${source.id}-${idx}`} source={source} />
                ))}
              </div>
            </div>
          )}

          {/* Tools used (collapsible detail) */}
          {Array.isArray(entry.toolsUsed) && entry.toolsUsed.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                Tools used: {entry.toolsUsed.join(', ')}
              </summary>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading indicator ────────────────────────────────────────────────────────

function LoadingIndicator({ stage }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow">
            AI
          </div>
          <span className="text-xs font-medium text-gray-500">RiskShield AI</span>
        </div>
        <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
            </div>
            <span className="text-sm text-gray-500">{stage}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function RiskInvestigation() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(LOADING_STAGES[0]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const stageTimerRef = useRef(null);

  const isAuthorized = ['ADMIN', 'ANALYST'].includes(user?.role);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Animate loading stage text
  useEffect(() => {
    if (!loading) {
      clearInterval(stageTimerRef.current);
      setLoadingStage(LOADING_STAGES[0]);
      return;
    }
    let idx = 0;
    stageTimerRef.current = setInterval(() => {
      idx = (idx + 1) % LOADING_STAGES.length;
      setLoadingStage(LOADING_STAGES[idx]);
    }, 2200);
    return () => clearInterval(stageTimerRef.current);
  }, [loading]);

  async function handleSubmit(questionOverride) {
    const question = (questionOverride ?? input).trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question, id: Date.now() }]);
    setLoading(true);

    try {
      const result = await sendInvestigationMessage(question);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer || 'No response was returned.',
          sources: result.sources || [],
          toolsUsed: result.toolsUsed || [],
          id: Date.now(),
        },
      ]);
    } catch (err) {
      const status = err?.response?.status;
      let errMsg = 'An unexpected error occurred. Please try again.';

      if (status === 403) {
        errMsg = 'You do not have permission to use the AI Investigation Agent. ADMIN or ANALYST role is required.';
      } else if (status === 429) {
        errMsg = 'Too many investigation requests. Please wait a moment before trying again.';
      } else if (status === 400) {
        errMsg = 'Please enter a valid investigation question.';
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network')) {
        errMsg = 'Unable to reach the server. Please check your connection.';
      } else if (err?.response?.data?.message) {
        errMsg = err.response.data.message;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'error', content: errMsg, id: Date.now() },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleClear() {
    setMessages([]);
    inputRef.current?.focus();
  }

  // ─── Unauthorized state ─────────────────────────────────────────────────────

  if (!isAuthorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <div className="mb-4 text-5xl">🚫</div>
          <h2 className="mb-2 text-xl font-bold text-red-800">Access Denied</h2>
          <p className="text-sm text-red-700">
            The AI Risk Investigation Agent is only available to <strong>ADMIN</strong> and{' '}
            <strong>ANALYST</strong> users. Your current role is <strong>{user?.role || 'unknown'}</strong>.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main UI ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Risk Investigation</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Ask natural-language questions about transactions, risk scores, alerts, vendors, and behavioral patterns.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Clear Chat
              </button>
            )}
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Empty state with suggested questions */}
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                  <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="mb-2 text-xl font-semibold text-gray-700">Start an Investigation</h2>
                <p className="mb-8 max-w-md text-sm text-gray-500">
                  Ask about any transaction, risk score, alert, vendor, or behavioral pattern. The agent answers only from real database data.
                </p>

                <div className="w-full max-w-2xl">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Suggested Questions
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleSubmit(q)}
                        disabled={loading}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800 transition-colors disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation messages */}
            {messages.length > 0 && (
              <div className="mx-auto max-w-3xl space-y-5 py-2">
                {messages.map((entry) => (
                  <MessageBubble key={entry.id} entry={entry} />
                ))}
                {loading && <LoadingIndicator stage={loadingStage} />}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Suggested questions strip (visible when chat has messages) */}
          {messages.length > 0 && !loading && (
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="shrink-0 text-xs font-medium text-gray-400">Suggest:</span>
                {SUGGESTED_QUESTIONS.slice(0, 5).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSubmit(q)}
                    disabled={loading}
                    className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-gray-200 bg-white px-6 py-4">
            <div className="mx-auto max-w-3xl">
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    rows={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    placeholder="Ask a question about your risk data… (Enter to send, Shift+Enter for new line)"
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400 transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={loading || !input.trim()}
                  className="self-end rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                The agent answers only from real database records. It cannot modify transactions or perform financial actions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
