const test = require('node:test');
const assert = require('node:assert/strict');
const { dateTime, integer, id, optionalText } = require('../src/utils/validate');

test('dateTime accepts a real local date and preserves supported format', () => {
  assert.equal(dateTime('2026-12-07T09:00'), '2026-12-07 09:00');
  assert.equal(dateTime('2026-12-07T09:00:30'), '2026-12-07 09:00:30');
});

test('dateTime rejects impossible calendar dates and times', () => {
  assert.throws(() => dateTime('2026-02-30T09:00'));
  assert.throws(() => dateTime('2026-12-07T24:00'));
  assert.throws(() => dateTime('2026-12-07T09:60'));
});

test('integer and id reject booleans, blanks, decimals and unsafe integers', () => {
  for (const value of [true, '', null, 1.2, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => integer(value, 'id'));
  }
  assert.equal(id('7'), 7);
});

test('optionalText trims whitespace and enforces the limit after trimming', () => {
  assert.equal(optionalText('  texto  ', 'campo', 10), 'texto');
  assert.throws(() => optionalText('demasiado largo', 'campo', 4));
});
