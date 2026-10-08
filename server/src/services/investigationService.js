const prisma = require('../models/prisma');
const riskInvestigationAgent = require('../agents/riskInvestigationAgent');

async function chat({ userId, message }) {
  const result = await riskInvestigationAgent.investigate({ userId, message });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'AI_INVESTIGATION',
      entity: 'INVESTIGATION',
      entityId: 'chat',
      metadata: {
        question: message,
        timestamp: new Date().toISOString(),
        toolsUsed: result.toolsUsed,
        sourceCount: result.sources.length,
      },
    },
  });

  return result;
}

module.exports = {
  chat,
};
