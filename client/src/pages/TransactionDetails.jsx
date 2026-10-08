import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchTransactionDetails,
  recalculateTransactionRisk,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ErrorState, StatusBadge } from '../components/dashboard/ui';
import { RefreshIcon } from '../components/icons';

function formatPercent(value) {
  if (value == null) return 'Not available yet';
  return `${Math.round(Number(value) * 100)}%`;
}

function formatAmount(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(value || 0));
}

function humanizeFeature(feature) {
  return String(feature)
    .replace(/^transaction_type=/, 'Transaction type: ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reasonList(reasons, key) {
  return Array.isArray(reasons?.[key]) ? reasons[key] : [];
}

function behavioralFindings(behavior) {
  if (!behavior?.available) return [];

  return Object.entries(behavior.deviations || {}).map(([key, deviation]) => ({
    key,
    label: humanizeFeature(key),
    ok: !deviation.unusual,
    text:
      deviation.reasons?.[0] ||
      `${humanizeFeature(key)} is consistent with the user's historical behavior.`,
  }));
}

const TransactionDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const canRecalculate = ['ADMIN', 'ANALYST'].includes(user?.role);

  useEffect(() => {
    const getTransactionDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchTransactionDetails(id);
        setTransaction(data);
      } catch (err) {
        setError('Failed to fetch transaction details');
      } finally {
        setLoading(false);
      }
    };

    getTransactionDetails();
  }, [id]);

  const riskScore = transaction?.riskScore;
  const reasons = riskScore?.reasons || {};
  const behavior = reasons.behavior;
  const findings = behavioralFindings(behavior);
  const shapFactors = reasonList(reasons, 'shap_factors');
  const maxContribution = useMemo(
    () =>
      Math.max(
        ...shapFactors.map((factor) => Math.abs(Number(factor.shap_value))),
        0,
      ),
    [shapFactors],
  );

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      await recalculateTransactionRisk(id);
      setTransaction(await fetchTransactionDetails(id));
    } catch (err) {
      setError('Failed to recalculate risk');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <header className="card p-5">
          <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded bg-slate-100" />
        </header>
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            fetchTransactionDetails(id)
              .then(setTransaction)
              .catch(() => setError('Failed to fetch transaction details'))
              .finally(() => setLoading(false));
          }}
        />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="card p-6">
        <ErrorState message="Transaction not found." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Transaction Details
          </h1>
          <p className="mt-1 text-sm text-slate-500">ID: {transaction.id}</p>
        </div>
        {canRecalculate && (
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="btn-primary"
          >
            <RefreshIcon className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculating…' : 'Recalculate Risk'}
          </button>
        )}
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Risk Score
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {riskScore?.score ?? 'N/A'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Risk Level
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {riskScore?.riskLevel ?? 'N/A'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Fraud Probability
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {formatPercent(riskScore?.fraudProbability)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
            Transaction
          </h2>
          <dl className="mt-3 divide-y divide-slate-100 space-y-0 text-sm">
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-medium text-slate-900">
                {formatAmount(transaction.amount, transaction.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Date</dt>
              <dd className="font-medium text-slate-900">
                {new Date(transaction.timestamp).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <StatusBadge status={transaction.status} />
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Vendor</dt>
              <dd className="font-medium text-slate-900">
                {transaction.vendor?.name ?? 'Unknown'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
            Model Scores
          </h2>
          <dl className="mt-3 divide-y divide-slate-100 space-y-0 text-sm">
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Rule Score</dt>
              <dd className="font-medium text-slate-900">
                {riskScore?.ruleScore ?? 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Anomaly Score</dt>
              <dd className="font-medium text-slate-900">
                {riskScore?.anomalyScore ?? 'Not available yet'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Model Version</dt>
              <dd className="font-medium text-slate-900">
                {riskScore?.modelVersion ?? 'N/A'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Why is this transaction risky?
        </h2>
        {[
          ['Rule-based reasons', reasonList(reasons, 'rule_reasons')],
          ['Anomaly detection', reasonList(reasons, 'anomaly_reasons')],
          ['Fraud prediction', reasonList(reasons, 'fraud_reasons')],
        ].map(([title, items]) => (
          <div key={title} className="card p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
              {title}
            </h3>
            {items.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {items.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No signals reported.</p>
            )}
          </div>
        ))}
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Behavioral Analysis
          </h2>
          <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            Behavioral Risk Score:{' '}
            {behavior?.available ? behavior.behavioralScore : 'N/A'}
          </span>
        </div>

        {behavior?.available ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">
              Behavioral Risk Level: {behavior.behavioralRiskLevel}
            </p>
            <div className="space-y-2">
              {findings.map((finding) => (
                <div
                  key={finding.key}
                  className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-sm"
                >
                  <span
                    className={
                      finding.ok ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'
                    }
                  >
                    {finding.ok ? 'OK' : 'Risk'}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{finding.label}</p>
                    <p className="text-slate-600">{finding.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            {behavior?.reason || 'Behavioral analysis is not available yet.'}
          </p>
        )}
      </section>

      <section id="shap" className="card p-4">
        <h2 className="text-lg font-semibold text-slate-900">
          SHAP model explanation
        </h2>
        {shapFactors.length ? (
          <div className="mt-4 space-y-3">
            {shapFactors.map((factor) => {
              const magnitude = Math.abs(Number(factor.shap_value));
              const width = maxContribution
                ? `${Math.max((magnitude / maxContribution) * 100, 8)}%`
                : '8%';

              return (
                <div key={`${factor.feature}-${factor.shap_value}`}>
                  <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {humanizeFeature(factor.feature)}
                    </span>
                    <span className="text-gray-600">
                      Model Contribution: {factor.impact_level}
                    </span>
                  </div>
                  <div className="h-3 rounded bg-gray-100">
                    <div
                      className={`h-3 rounded ${
                        factor.shap_value >= 0 ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {factor.value} {factor.impact_direction}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-600">
            No SHAP explanation is available for this transaction.
          </p>
        )}
      </section>
    </div>
  );
};

export default TransactionDetails;
