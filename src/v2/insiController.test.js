import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INSI_BRAND,
  INSI_STATES,
  INSI_SIZES,
  INSI_PROPS,
  mapReactionToState,
  scanDatasetAndInputSecurity,
  createAutonomousTaskEngine,
  createInsiController
} from './insiController.js';

test('INSI_BRAND exposes official insi and insi.ai brand identity', () => {
  assert.equal(INSI_BRAND.characterName, 'insi');
  assert.equal(INSI_BRAND.brandName, 'insi.ai');
  assert.equal(INSI_BRAND.parentProduct, 'InsightBoard VDB');
  assert.equal(INSI_BRAND.tagline, 'Powered by InsightBoard VDB');
});

test('INSI_STATES, INSI_SIZES, and INSI_PROPS include all personality states, sizes, and props', () => {
  assert.ok(INSI_STATES.includes('idle'));
  assert.ok(INSI_STATES.includes('greeting'));
  assert.ok(INSI_STATES.includes('thinking'));
  assert.ok(INSI_STATES.includes('celebrating'));
  assert.ok(INSI_STATES.includes('magic_import'));
  assert.ok(INSI_STATES.includes('heavy_ai'));
  assert.ok(INSI_STATES.includes('audio_sync'));
  assert.ok(INSI_STATES.includes('viewing_charts'));
  assert.ok(INSI_STATES.includes('flexing'));
  assert.ok(INSI_STATES.includes('roaming_heading'));
  assert.ok(INSI_STATES.includes('malware_alert'));
  assert.ok(INSI_STATES.includes('legal_alert'));
  assert.deepEqual([...INSI_SIZES], ['sm', 'md', 'lg', 'xl']);
  assert.ok(INSI_PROPS.includes('magician_wand'));
  assert.ok(INSI_PROPS.includes('chair_laptop'));
  assert.ok(INSI_PROPS.includes('ai_power_core'));
  assert.ok(INSI_PROPS.includes('audio_deck'));
  assert.ok(INSI_PROPS.includes('security_shield'));
  assert.ok(INSI_PROPS.includes('legal_gavel'));
});

test('mapReactionToState maps error, success, data_import (magician wand), heavy_ai, and audio_sync accurately', () => {
  const errReaction = mapReactionToState('error');
  assert.equal(errReaction.state, 'confused');

  const successReaction = mapReactionToState('success');
  assert.equal(successReaction.state, 'celebrating');
  assert.equal(successReaction.prop, 'magician_wand');

  const importReaction = mapReactionToState('data_import');
  assert.equal(importReaction.state, 'magic_import');
  assert.equal(importReaction.prop, 'magician_wand');

  const heavyAiReaction = mapReactionToState('heavy_ai');
  assert.equal(heavyAiReaction.state, 'heavy_ai');
  assert.equal(heavyAiReaction.prop, 'ai_power_core');
  assert.equal(heavyAiReaction.size, 'xl');

  const audioReaction = mapReactionToState('audio_sync');
  assert.equal(audioReaction.state, 'audio_sync');
  assert.equal(audioReaction.prop, 'audio_deck');
});

test('scanDatasetAndInputSecurity detects malware/XSS/formula threats and developer legal/PII triggers', () => {
  const malwareRes = scanDatasetAndInputSecurity({
    fileName: 'invoice.csv.exe',
    rows: [{ name: '<script>alert(1)</script>', cmd: '=CMD|"/C calc"!A0' }]
  });
  assert.equal(malwareRes.status, 'malware_alert');
  assert.equal(malwareRes.riskLevel, 'HIGH');
  assert.ok(malwareRes.threatsFound.length >= 2);

  const legalRes = scanDatasetAndInputSecurity({
    fields: ['store_name', 'credit_card_number', 'private_key'],
    rows: [{ store_name: 'Alpha', credit_card_number: '4111', private_key: 'sk-1234567890123456789012345' }]
  });
  assert.equal(legalRes.status, 'legal_alert');
  assert.ok(legalRes.legalFlags.length >= 1);

  const cleanRes = scanDatasetAndInputSecurity({
    fileName: 'retail_sales.csv',
    fields: ['store_name', 'revenue'],
    rows: [{ store_name: 'Zara', revenue: 450000 }]
  });
  assert.equal(cleanRes.status, 'clean');
  assert.equal(cleanRes.riskLevel, 'SAFE');
});

test('createInsiController supports all imperative animation commands and rotates corners and sizes', () => {
  const events = [];
  const ctrl = createInsiController((state) => events.push(state));

  assert.equal(ctrl.appear().visible, true);
  assert.equal(ctrl.greet().state, 'greeting');
  assert.equal(ctrl.wave().state, 'waving');
  assert.equal(ctrl.sleep().state, 'sleeping');
  assert.equal(ctrl.wake().state, 'surprised');
  assert.equal(ctrl.think().state, 'thinking');
  assert.equal(ctrl.heavyAi().state, 'heavy_ai');
  assert.equal(ctrl.magicImport().prop, 'magician_wand');
  assert.equal(ctrl.audioSync().prop, 'audio_deck');
  assert.equal(ctrl.viewCharts().prop, 'chart_holo');
  assert.equal(ctrl.read().state, 'reading');
  assert.equal(ctrl.drink().state, 'drinking');
  assert.equal(ctrl.dance().state, 'dancing');
  assert.equal(ctrl.flex().state, 'flexing');
  assert.equal(ctrl.roamHeading().state, 'roaming_heading');
  assert.equal(ctrl.pullDashboard().state, 'pulling_dashboard');
  assert.equal(ctrl.malwareAlert().state, 'malware_alert');
  assert.equal(ctrl.legalAlert().state, 'legal_alert');
  assert.equal(ctrl.celebrate().state, 'celebrating');
  assert.equal(ctrl.type().state, 'typing');
  assert.equal(ctrl.observe().state, 'observing');
  assert.equal(ctrl.walk().state, 'walking');
  assert.equal(ctrl.react('error').state, 'confused');
  assert.equal(ctrl.react('success').state, 'celebrating');
  assert.equal(ctrl.disappear().visible, false);
  assert.ok(events.length >= 22);
});

test('AutonomousTaskEngine enforces permission and explicit user confirmation gates', async () => {
  const engine = createAutonomousTaskEngine();
  assert.equal(engine.getCapabilities().length, 10);

  const blocked = await engine.executeAuthorizedTask(
    'authorized_task_execution',
    () => 'ran',
    { userConfirmed: false }
  );
  assert.equal(blocked.executed, false);
  assert.equal(blocked.requiresConfirmation, true);

  const allowed = await engine.executeAuthorizedTask(
    'authorized_task_execution',
    () => 'ran-with-consent',
    { userConfirmed: true }
  );
  assert.equal(allowed.executed, true);
  assert.equal(allowed.result, 'ran-with-consent');
});
