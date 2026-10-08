import React, { useEffect, useState } from 'react';
import { fetchRiskAnalysisData } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { EmptyState, ErrorState, Skeleton } from '../components/dashboard/ui';
import { AnalyticsIcon } from '../components/icons';

const RiskAnalysis = () => {
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const getRiskData = async () => {
      try {
        setLoading(true);
        const response = await fetchRiskAnalysisData();

        // Backend response:
        // {
        //   success: true,
        //   data: [...]
        // }

        const data = Array.isArray(response)
          ? response
          : response?.data || [];

        setRiskData(data);
        setError(null);
      } catch (err) {
        console.error('Risk analysis error:', err);

        setError(
          err.response?.data?.message ||
          err.message ||
          'Failed to load risk analysis'
        );
      } finally {
        setLoading(false);
      }
    };

    getRiskData();
  }, [reloadKey]);

  if (loading) {
    return (
      <div className="space-y-4">
        <header className="card p-5">
          <div className="h-7 w-52 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-slate-100" />
        </header>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64" />
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
          onRetry={() => setReloadKey((current) => current + 1)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <AnalyticsIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Risk Analysis
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Analyze transaction risk scores and contributing factors.
            </p>
          </div>
        </div>
      </header>

      {riskData.length === 0 ? (
        <div className="card p-4">
          <EmptyState message="No risk analysis data available." />
        </div>
      ) : (

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {riskData.map((risk) => (
            <div
              key={risk.id}
              className="card p-5 transition-shadow hover:shadow-md"
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Risk Score #{risk.id}
                </h2>
                <RiskBadge level={risk.riskLevel} />
              </div>

              {/* Main Score */}
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Overall Risk Score
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                  {risk.score ?? 0}
                  <span className="text-lg font-medium text-slate-400">/100</span>
                </p>
              </div>

              {/* Risk Details */}
              <div className="space-y-3 rounded-lg bg-slate-50 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Risk Level</span>
                  <span className="font-medium text-slate-900">
                    {risk.riskLevel || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Rule Score</span>
                  <span className="font-medium text-slate-900">
                    {risk.ruleScore ?? 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Anomaly Score</span>
                  <span className="font-medium text-slate-900">
                    {risk.anomalyScore ?? 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Fraud Probability</span>
                  <span className="font-medium text-slate-900">
                    {risk.fraudProbability ?? 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Model Version</span>
                  <span className="font-medium text-slate-900">
                    {risk.modelVersion || 'Rule Engine'}
                  </span>
                </div>
              </div>

              {/* Risk Factors */}
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-900">
                  Risk Factors
                </h3>

                {risk.reasons ? (
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                    {Array.isArray(risk.reasons) ? (
                      risk.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))
                    ) : (
                      <li>{String(risk.reasons)}</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    No risk factors available.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RiskAnalysis;