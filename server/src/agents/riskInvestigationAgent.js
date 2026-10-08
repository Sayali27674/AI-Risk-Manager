const tools = require('./investigationTools');
const aiAgentService = require('../services/aiAgentService');

const CONTEXT_LIMIT = Number(process.env.AI_AGENT_CONTEXT_LIMIT || 6);
const conversations = new Map();

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

function weekRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

function remember(userId, update) {
  const current = conversations.get(userId) || { messages: [] };
  const next = {
    ...current,
    ...update,
    messages: [...current.messages, update.message].filter(Boolean).slice(-CONTEXT_LIMIT),
  };
  conversations.set(userId, next);
  return next;
}

function getContext(userId) {
  return conversations.get(userId) || {};
}

function extractTransactionId(message, context) {
  const explicit = message.match(/\b(?:txn|transaction)[-\s#:]*([0-9]+)\b/i);
  if (explicit) return Number(explicit[1]);
  const bare = message.match(/\b(?:id|#)\s*([0-9]+)\b/i);
  if (bare) return Number(bare[1]);
  if (/\b(this|that|it|previous)\b/i.test(message)) return context.lastTransactionId;
  return null;
}

function extractVendorId(message, context) {
  const explicit = message.match(/\bvendor[-\s#:]*([0-9]+)\b/i);
  if (explicit) return Number(explicit[1]);
  return context.lastVendorId || null;
}

function extractUserId(message, context) {
  const explicit = message.match(/\buser[-\s#:]*([0-9]+)\b/i);
  if (explicit) return Number(explicit[1]);
  return context.lastUserId || null;
}

function chooseTools(message, context) {
  const lower = message.toLowerCase();
  const transactionId = extractTransactionId(message, context);
  const vendorId = extractVendorId(message, context);
  const userId = extractUserId(message, context);
  const selected = [];

  if (transactionId) {
    selected.push(['getTransaction', { transactionId }]);
    selected.push(['getTransactionRisk', { transactionId }]);
  }

  if (lower.includes('behavior') || lower.includes('unusual user') || lower.includes('previous transactions')) {
    if (userId) selected.push(['getUserBehavior', { userId }]);
  }

  if (lower.includes('highest-risk') || lower.includes('highest risk') || lower.includes('high risk')) {
    selected.push(['getHighRiskTransactions', {
      ...(lower.includes('today') ? todayRange() : {}),
      minimumRiskScore: lower.includes('critical') ? 81 : 70,
      limit: 10,
    }]);
  }

  if (lower.includes('alert')) {
    selected.push(['getAlerts', {
      ...(lower.includes('critical') ? { severity: 'CRITICAL' } : {}),
      ...(lower.includes('open') ? { status: 'OPEN' } : {}),
      ...(transactionId ? { transactionId } : {}),
      limit: 10,
    }]);
  }

  if (lower.includes('vendor') || vendorId) {
    if (vendorId) {
      selected.push(['getVendorRisk', { vendorId }]);
    } else {
      selected.push(['getHighRiskTransactions', { minimumRiskScore: 70, limit: 10 }]);
    }
  }

  if (lower.includes('trend') || lower.includes('increased') || lower.includes('week') || lower.includes('changed')) {
    selected.push(['getRiskTrends', weekRange()]);
  }

  if (!selected.length) {
    selected.push(['getHighRiskTransactions', { minimumRiskScore: 70, limit: 5 }]);
    selected.push(['getAlerts', { status: 'OPEN', limit: 5 }]);
  }

  return selected.filter((item, index, all) => (
    all.findIndex((candidate) =>
      candidate[0] === item[0] &&
      JSON.stringify(candidate[1]) === JSON.stringify(item[1]),
    ) === index
  ));
}

async function executeTools(selected) {
  const results = [];

  for (const [name, args] of selected) {
    if (!Object.prototype.hasOwnProperty.call(tools, name)) continue;
    try {
      const data = await tools[name](args);
      results.push({ name, args, data });
    } catch (error) {
      results.push({
        name,
        args,
        error: 'The requested data could not be retrieved.',
      });
    }
  }

  return results;
}

function collectSources(toolResults) {
  const seen = new Set();
  const sources = [];

  for (const result of toolResults) {
    for (const source of result.data?.sources || []) {
      const key = `${source.type}:${source.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push(source);
    }
  }

  return sources;
}

function linesForTransaction(result) {
  const tx = result.data?.transaction;
  if (!tx) return ['I could not find that transaction.'];
  return [
    `Transaction ${tx.id} is a ${tx.transactionType} for ${tx.currency} ${tx.amount} with vendor ${tx.vendor?.name || 'Unknown Vendor'}.`,
    `It occurred at ${new Date(tx.timestamp).toLocaleString()} from ${tx.location} using device ${tx.deviceId}.`,
  ];
}

function linesForRisk(result) {
  const risk = result.data?.risk;
  if (!risk) return ['No risk score was found for that transaction.'];
  const lines = [
    `It is classified as ${risk.riskLevel} with a final risk score of ${risk.finalRiskScore}.`,
    `Component scores: rules ${risk.ruleScore}, anomaly ${risk.anomalyScore ?? 'unavailable'}, fraud probability ${risk.fraudProbability == null ? 'unavailable' : `${Math.round(risk.fraudProbability * 100)}%`}, behavioral ${risk.behavioralScore ?? 'unavailable'}.`,
  ];
  const reasons = risk.reasons || {};
  const reasonLines = [
    ...(reasons.rule_reasons || []),
    ...(reasons.anomaly_reasons || []),
    ...(reasons.fraud_reasons || []),
    ...(reasons.behavior?.reasons || []),
  ];
  if (reasonLines.length) {
    lines.push(`Observed reasons: ${reasonLines.slice(0, 6).join(' ')}`);
  }
  if (risk.shapFactors?.length) {
    lines.push(
      `Top SHAP model contributions: ${risk.shapFactors
        .map((factor) => `${factor.feature} (${factor.impact_level})`)
        .join(', ')}.`,
    );
  }
  return lines;
}

function composeFallbackAnswer(message, toolResults) {
  const observed = [];
  const recommendations = [];

  for (const result of toolResults) {
    if (result.error) {
      observed.push(`${result.name}: ${result.error}`);
      continue;
    }

    if (result.name === 'getTransaction') observed.push(...linesForTransaction(result));
    if (result.name === 'getTransactionRisk') observed.push(...linesForRisk(result));
    if (result.name === 'getUserBehavior') {
      const behavior = result.data?.behavior;
      if (!behavior?.available) {
        observed.push(behavior?.reason || 'Behavioral profile is unavailable.');
      } else {
        const profile = behavior.profile;
        observed.push(
          `User ${result.data.user.id} behavior profile: average amount ${profile.averageAmount}, median amount ${profile.medianAmount}, ${profile.averageDailyTransactions} transactions/day on average, ${profile.knownDevices} known devices, ${profile.knownLocations} known locations.`,
        );
      }
    }
    if (result.name === 'getHighRiskTransactions') {
      const rows = result.data?.transactions || [];
      observed.push(
        rows.length
          ? `Highest-risk transactions: ${rows
              .map((row) => `TXN-${row.transactionId} score ${row.score} (${row.riskLevel})`)
              .join(', ')}.`
          : 'No high-risk transactions matched the requested filters.',
      );
    }
    if (result.name === 'getAlerts') {
      const alerts = result.data?.alerts || [];
      observed.push(
        alerts.length
          ? `Alerts found: ${alerts
              .map((alert) => `ALT-${alert.id} ${alert.severity} ${alert.status} for TXN-${alert.transactionId}`)
              .join(', ')}.`
          : 'No alerts matched the requested filters.',
      );
    }
    if (result.name === 'getVendorRisk') {
      const data = result.data;
      if (!data?.found) {
        observed.push('The requested vendor was not found.');
      } else {
        observed.push(
          `Vendor ${data.vendor.name} is classified as ${data.vendor.riskLevel}. It has ${data.stats.transactionCount} scored transactions, average risk ${data.stats.averageRisk ?? 'unavailable'}, ${data.stats.highRiskTransactionCount} high-risk transactions, and ${data.stats.criticalTransactionCount} critical transactions.`,
        );
      }
    }
    if (result.name === 'getRiskTrends') {
      const trends = result.data?.trends || [];
      observed.push(
        trends.length
          ? `Risk trend over ${trends.length} day(s): ${trends
              .map((day) => `${day.date} avg ${day.averageRisk}, high ${day.highRiskCount}, critical ${day.criticalRiskCount}`)
              .join('; ')}.`
          : 'No risk trend data was found for the requested range.',
      );
    }
  }

  if (/why|flagged|critical|fraud|risk/i.test(message)) {
    recommendations.push('Review the transaction details and compare the rule, behavioral, fraud, and SHAP signals.');
    recommendations.push('Verify any new device, unusual location, or unusual vendor category before taking action.');
  }

  return [
    'Observed:',
    ...observed.map((line) => `- ${line}`),
    recommendations.length ? '\nRecommendations:' : '',
    ...recommendations.map((line, index) => `${index + 1}. ${line}`),
  ].filter(Boolean).join('\n');
}

async function investigate({ userId, message }) {
  const context = getContext(userId);
  const selectedTools = chooseTools(message, context);
  const toolResults = await executeTools(selectedTools);
  const sources = collectSources(toolResults);

  // Build structured prompt with labelled tool data sections
  const toolSummary = toolResults.map((r) => {
    if (r.error) return `[${r.name}]: Error — ${r.error}`;
    return `[${r.name}]:\n${JSON.stringify(r.data, null, 2)}`;
  }).join('\n\n');

  const prompt = `The analyst asked: "${message}"

The following investigation tool results were retrieved from the database. Use ONLY this data in your answer:

${toolSummary}

Answer the analyst's question based strictly on the data above.`;

  // Pass prior conversation turns so the LLM can resolve contextual references
  const conversationHistory = (context.messages || []).flatMap((msg) => [
    { role: 'user', content: msg },
  ]);

  const providerAnswer = await aiAgentService.callProvider({ prompt, conversationHistory });
  const answer = providerAnswer || composeFallbackAnswer(message, toolResults);

  const transactionResult = toolResults.find((result) => result.data?.transaction);
  const riskResult = toolResults.find((result) => result.data?.risk);
  const userBehavior = toolResults.find((result) => result.data?.user);
  remember(userId, {
    message,
    lastTransactionId: transactionResult?.data?.transaction?.id ||
      riskResult?.data?.risk?.transactionId ||
      context.lastTransactionId,
    lastUserId: transactionResult?.data?.transaction?.user?.id ||
      userBehavior?.data?.user?.id ||
      context.lastUserId,
    lastVendorId: transactionResult?.data?.transaction?.vendor?.id ||
      context.lastVendorId,
  });

  return {
    answer,
    sources,
    toolsUsed: toolResults.map((result) => result.name),
  };
}

module.exports = {
  investigate,
  chooseTools,
  composeFallbackAnswer,
};
