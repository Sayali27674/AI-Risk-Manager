import React, { useEffect, useState } from 'react';
import { fetchRiskAnalysisData } from '../services/api';
import RiskBadge from '../components/RiskBadge';

const RiskAnalysis = () => {
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getRiskData = async () => {
      try {
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
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">
          Loading risk analysis...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Risk Analysis
        </h1>

        <p className="mt-1 text-gray-500">
          Analyze transaction risk scores and contributing factors.
        </p>
      </div>

      {riskData.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">
            No risk analysis data available.
          </p>
        </div>
      ) : (

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

          {riskData.map((risk) => (

            <div
              key={risk.id}
              className="rounded-lg border bg-white p-5 shadow-sm"
            >

              {/* Header */}
              <div className="mb-4 flex items-center justify-between">

                <h2 className="text-lg font-semibold">
                  Risk Score #{risk.id}
                </h2>

                <RiskBadge
                  level={risk.riskLevel}
                />

              </div>

              {/* Main Score */}
              <div className="mb-5">

                <p className="text-sm text-gray-500">
                  Overall Risk Score
                </p>

                <p className="text-3xl font-bold">
                  {risk.score ?? 0}
                  <span className="text-lg text-gray-400">
                    /100
                  </span>
                </p>

              </div>

              {/* Risk Details */}
              <div className="space-y-3 text-sm">

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Risk Level
                  </span>

                  <span className="font-medium">
                    {risk.riskLevel || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Rule Score
                  </span>

                  <span className="font-medium">
                    {risk.ruleScore ?? 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Anomaly Score
                  </span>

                  <span className="font-medium">
                    {risk.anomalyScore ?? 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Fraud Probability
                  </span>

                  <span className="font-medium">
                    {risk.fraudProbability ?? 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Model Version
                  </span>

                  <span className="font-medium">
                    {risk.modelVersion || 'Rule Engine'}
                  </span>
                </div>

              </div>

              {/* Risk Factors */}
              <div className="mt-5">

                <h3 className="mb-2 font-semibold">
                  Risk Factors
                </h3>

                {risk.reasons ? (

                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">

                    {Array.isArray(risk.reasons) ? (

                      risk.reasons.map((reason, index) => (
                        <li key={index}>
                          {reason}
                        </li>
                      ))

                    ) : (

                      <li>
                        {String(risk.reasons)}
                      </li>

                    )}

                  </ul>

                ) : (

                  <p className="text-sm text-gray-500">
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