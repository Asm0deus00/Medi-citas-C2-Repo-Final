const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../src/utils/validate');
test('IDs válidos', () => { assert.equal(v.id(3),3); assert.throws(()=>v.id(-1)); });
test('email válido', () => { assert.equal(v.email('A@B.co'),'a@b.co'); assert.throws(()=>v.email('incorrecto')); });
test('fecha válida', () => { assert.equal(v.dateTime('2026-11-18T09:00'),'2026-11-18 09:00'); assert.throws(()=>v.dateTime('mañana')); });
test('calificación y estados', () => { assert.equal(v.choice('completed','status',['scheduled','completed','cancelled']),'completed'); assert.throws(()=>v.choice('other','status',['scheduled'])); });
