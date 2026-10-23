const test = require('node:test');
const assert = require('node:assert/strict');
const { timeToMinutes, formatMinutes, buildFreeSlots } = require('../src/utils/schedule');

const OFFSET = '-05:00';
const PAST_REFERENCE = Date.parse('2026-01-01T00:00:00Z');

test('timeToMinutes y formatMinutes son operaciones inversas', () => {
  assert.equal(timeToMinutes('08:30:00'), 510);
  assert.equal(formatMinutes(510), '08:30');
});

test('buildFreeSlots divide un bloque en franjas de 30 minutos', () => {
  const slots = buildFreeSlots({
    date: '2026-12-07',
    workingBlocks: [{ start_time: '08:00:00', end_time: '10:00:00' }],
    busyRanges: [],
    utcOffset: OFFSET,
    now: PAST_REFERENCE
  });
  assert.deepEqual(
    slots.map((slot) => slot.starts_at),
    ['2026-12-07T08:00:00', '2026-12-07T08:30:00', '2026-12-07T09:00:00', '2026-12-07T09:30:00']
  );
});

test('buildFreeSlots excluye las franjas ocupadas por una cita', () => {
  const slots = buildFreeSlots({
    date: '2026-12-07',
    workingBlocks: [{ start_time: '08:00:00', end_time: '10:00:00' }],
    busyRanges: [{ startMinute: 8 * 60 + 30, durationMinutes: 60 }],
    utcOffset: OFFSET,
    now: PAST_REFERENCE
  });
  assert.deepEqual(
    slots.map((slot) => slot.starts_at),
    ['2026-12-07T08:00:00', '2026-12-07T09:30:00']
  );
});

test('buildFreeSlots omite las franjas que ya pasaron', () => {
  const slots = buildFreeSlots({
    date: '2026-12-07',
    workingBlocks: [{ start_time: '08:00:00', end_time: '09:00:00' }],
    busyRanges: [],
    utcOffset: OFFSET,
    now: Date.parse('2026-12-07T08:10:00-05:00')
  });
  assert.deepEqual(
    slots.map((slot) => slot.starts_at),
    ['2026-12-07T08:30:00']
  );
});
