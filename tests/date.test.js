const test = require('node:test');
const assert = require('node:assert/strict');
const { dateTime } = require('../src/utils/validate');
test('La fecha se parsea para una cita válida', () => {
 assert.equal(dateTime('2026-12-07T09:00'), '2026-12-07 09:00');
});
test('Se rechaza un texto que no representa fecha', () => {
 assert.throws(() => dateTime('fecha inválida'), /fecha/i);
});
