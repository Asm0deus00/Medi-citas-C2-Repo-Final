const test = require('node:test');
const assert = require('node:assert/strict');
const { dateTime, date, integer, id, optionalText, measurement } = require('../src/utils/validate');

test('dateTime acepta una fecha real y conserva el formato admitido', () => {
  assert.equal(dateTime('2026-12-07T09:00'), '2026-12-07 09:00');
  assert.equal(dateTime('2026-12-07T09:00:30'), '2026-12-07 09:00:30');
});

test('dateTime rechaza texto que no representa una fecha', () => {
  assert.throws(() => dateTime('fecha inválida'), /fecha/i);
});

test('dateTime rechaza fechas y horas imposibles', () => {
  assert.throws(() => dateTime('2026-02-30T09:00'));
  assert.throws(() => dateTime('2026-12-07T24:00'));
  assert.throws(() => dateTime('2026-12-07T09:60'));
});

test('date acepta YYYY-MM-DD y rechaza días inexistentes o formatos distintos', () => {
  assert.equal(date('2026-12-07'), '2026-12-07');
  assert.throws(() => date('2026-02-30'), /YYYY-MM-DD/);
  assert.throws(() => date('07/12/2026'));
  assert.throws(() => date(undefined));
});

test('integer e id rechazan booleanos, vacíos, decimales y enteros inseguros', () => {
  for (const invalidValue of [true, '', null, 1.2, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => integer(invalidValue, 'id'));
  }
  assert.equal(id('7'), 7);
});

test('optionalText recorta espacios y aplica el límite después de recortar', () => {
  assert.equal(optionalText('  texto  ', 'campo', 10), 'texto');
  assert.throws(() => optionalText('demasiado largo', 'campo', 4));
});

test('measurement admite negativos y rechaza datos inválidos', () => {
  assert.equal(measurement(-2.5, 'valor'), -2.5);
  assert.throws(() => measurement('abc', 'valor'));
  assert.throws(() => measurement(null, 'valor'));
});
