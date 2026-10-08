const test = require('node:test');
const assert = require('node:assert/strict');
const behaviorService = require('./behaviorService');

function transaction(overrides = {}) {
  return {
    id: 1,
    userId: 1,
    amount: 100,
    timestamp: new Date('2026-10-08T12:00:00.000Z'),
    location: 'Pune',
    deviceId: 'device_1',
    transactionType: 'PAYMENT',
    vendor: {
      name: 'Acme',
      category: 'Retail',
      riskLevel: 'LOW',
    },
    ...overrides,
  };
}

test('buildProfile calculates amount and frequency statistics', () => {
  const history = [
    transaction({ amount: 100, timestamp: new Date('2026-10-01T10:00:00Z') }),
    transaction({ amount: 200, timestamp: new Date('2026-10-02T11:00:00Z') }),
    transaction({ amount: 300, timestamp: new Date('2026-10-03T12:00:00Z') }),
    transaction({ amount: 400, timestamp: new Date('2026-10-04T13:00:00Z') }),
    transaction({ amount: 500, timestamp: new Date('2026-10-05T14:00:00Z') }),
  ];

  const profile = behaviorService.buildProfile(history);

  assert.equal(profile.averageAmount, 300);
  assert.equal(profile.medianAmount, 300);
  assert.equal(profile.maximumAmount, 500);
  assert.equal(profile.minimumAmount, 100);
  assert.equal(profile.transactionCount, 5);
  assert.equal(profile.knownDevices, 1);
  assert.equal(profile.knownLocations, 1);
});

test('amount analysis flags dynamically calculated high ratios', () => {
  const profile = behaviorService.buildProfile([
    transaction({ amount: 100 }),
    transaction({ amount: 120 }),
    transaction({ amount: 90 }),
    transaction({ amount: 110 }),
    transaction({ amount: 80 }),
  ]);

  const result = behaviorService.__test.analyzeAmount(
    transaction({ amount: 700 }),
    profile,
  );

  assert.equal(result.unusual, true);
  assert.equal(result.ratioToAverage > 6, true);
  assert.match(result.reasons[0], /higher than the user's average/);
});

test('device and location analysis distinguish known behavior', () => {
  const profile = behaviorService.buildProfile([
    transaction({ deviceId: 'device_1', location: 'Pune' }),
    transaction({ deviceId: 'device_1', location: 'Pune' }),
    transaction({ deviceId: 'device_2', location: 'Mumbai' }),
    transaction({ deviceId: 'device_2', location: 'Mumbai' }),
    transaction({ deviceId: 'device_1', location: 'Pune' }),
  ]);

  const knownDevice = behaviorService.__test.analyzeDevice(
    transaction({ deviceId: 'device_1' }),
    profile,
  );
  const newLocation = behaviorService.__test.analyzeLocation(
    transaction({ location: 'Delhi' }),
    profile,
  );

  assert.equal(knownDevice.unusual, false);
  assert.equal(newLocation.unusual, true);
});
