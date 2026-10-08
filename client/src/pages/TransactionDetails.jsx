import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchTransactionDetails,
  recalculateTransactionRisk,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

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
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-700">{error}</div>;
  }

  if (!transaction) {
    return <div className="p-4">Transaction not found.</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transaction Details</h1>
          <p className="text-sm text-gray-600">ID: {transaction.id}</p>
        </div>
        {canRecalculate && (
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {recalculating ? 'Recalculating...' : 'Recalculate Risk'}
          </button>
        )}
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Risk Score</p>
          <p className="text-3xl font-semibold">{riskScore?.score ?? 'N/A'}</p>
        </div>
        <div className="rounded border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Risk Level</p>
          <p className="text-3xl font-semibold">
            {riskScore?.riskLevel ?? 'N/A'}
          </p>
        </div>
        <div className="rounded border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Fraud Probability</p>
          <p className="text-3xl font-semibold">
            {formatPercent(riskScore?.fraudProbability)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-gray-200 p-4">
          <h2 className="text-lg font-semibold">Transaction</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Amount</dt>
              <dd>{formatAmount(transaction.amount, transaction.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Date</dt>
              <dd>{new Date(transaction.timestamp).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Status</dt>
              <dd>{transaction.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Vendor</dt>
              <dd>{transaction.vendor?.name ?? 'Unknown'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded border border-gray-200 p-4">
          <h2 className="text-lg font-semibold">Model Scores</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Rule Score</dt>
              <dd>{riskScore?.ruleScore ?? 'N/A'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Anomaly Score</dt>
              <dd>{riskScore?.anomalyScore ?? 'Not available yet'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Model Version</dt>
              <dd>{riskScore?.modelVersion ?? 'N/A'}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Why is this transaction risky?</h2>
        {[
          ['Rule-based reasons', reasonList(reasons, 'rule_reasons')],
          ['Anomaly detection', reasonList(reasons, 'anomaly_reasons')],
          ['Fraud prediction', reasonList(reasons, 'fraud_reasons')],
        ].map(([title, items]) => (
          <div key={title} className="rounded border border-gray-200 p-4">
            <h3 className="font-semibold">{title}</h3>
            {items.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {items.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-600">No signals reported.</p>
            )}
          </div>
        ))}
      </section>

      <section className="rounded border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Behavioral Analysis</h2>
          <span className="rounded bg-gray-100 px-3 py-1 text-sm">
            Behavioral Risk Score:{' '}
            {behavior?.available ? behavior.behavioralScore : 'N/A'}
          </span>
        </div>

        {behavior?.available ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-600">
              Behavioral Risk Level: {behavior.behavioralRiskLevel}
            </p>
            <div className="space-y-2">
              {findings.map((finding) => (
                <div
                  key={finding.key}
                  className="flex gap-3 rounded border border-gray-100 p-3 text-sm"
                >
                  <span
                    className={
                      finding.ok ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'
                    }
                  >
                    {finding.ok ? 'OK' : 'Risk'}
                  </span>
                  <div>
                    <p className="font-medium">{finding.label}</p>
                    <p className="text-gray-600">{finding.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-600">
            {behavior?.reason || 'Behavioral analysis is not available yet.'}
          </p>
        )}
      </section>

      <section id="shap" className="rounded border border-gray-200 p-4">
        <h2 className="text-xl font-semibold">SHAP model explanation</h2>
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
