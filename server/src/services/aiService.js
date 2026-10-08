const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || 'http://localhost:8000';

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 3000);

async function predictAnomaly(features) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${AI_SERVICE_URL}/api/anomaly/predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(features),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function predictFraud(features) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.AI_TIMEOUT_MS || 3000),
  );

  try {
    const baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${baseUrl}/api/fraud/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Fraud AI returned HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  predictAnomaly,
  predictFraud,
};