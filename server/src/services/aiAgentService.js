const AI_TIMEOUT_MS = Number(process.env.AI_AGENT_TIMEOUT_MS || 15000);

const SYSTEM_PROMPT = `You are RiskShield AI, an expert risk investigation assistant for a financial transaction risk management platform.

STRICT RULES — follow these at all times:
1. Use ONLY the information returned by the investigation tools provided in the user message.
2. NEVER invent transaction IDs, user names, amounts, dates, vendors, risk scores, fraud probabilities, alerts, or statistics.
3. If the requested information is unavailable or the tool returned no data, clearly say so.
4. Do NOT guess, speculate, or fabricate explanations.
5. Distinguish clearly between OBSERVED FACTS (from tool data) and RECOMMENDATIONS (your suggestions).
6. You are read-only. Do NOT suggest that you can block, approve, or modify transactions.
7. When referencing a transaction, always include its ID (e.g. "Transaction #1023").
8. Format your response using clear sections: start with a summary, then Observed Facts (bullet points), then optionally Recommended Investigation Steps (numbered list).
9. Keep responses concise and factual. Use plain English.
10. If the question is outside the scope of the available tools, say you cannot assist with that.`;

function hasProvider() {
  return Boolean(process.env.AI_API_KEY && process.env.AI_PROVIDER);
}

async function callOpenAI({ prompt, conversationHistory }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: 'user', content: prompt },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.2,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const body = await response.json();
    return body.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini({ prompt, conversationHistory }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const model = process.env.AI_MODEL || 'gemini-2.0-flash';

  try {
    const contents = [];

    // Inject prior conversation turns as alternating user/model pairs
    if (Array.isArray(conversationHistory)) {
      for (const turn of conversationHistory) {
        if (turn.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: turn.content }] });
        } else if (turn.role === 'assistant') {
          contents.push({ role: 'model', parts: [{ text: turn.content }] });
        }
      }
    }

    // Current user message
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.AI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const json = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callProvider({ prompt, conversationHistory }) {
  if (!hasProvider()) return null;

  const provider = (process.env.AI_PROVIDER || '').toLowerCase();

  if (provider === 'openai') {
    return callOpenAI({ prompt, conversationHistory });
  }

  if (provider === 'gemini') {
    return callGemini({ prompt, conversationHistory });
  }

  return null;
}

module.exports = {
  callProvider,
};

