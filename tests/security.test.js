const test = require('node:test');
const assert = require('node:assert/strict');
const { makeToken, authenticate, owner } = require('../src/middleware/access');
const { measurement } = require('../src/utils/validate');

test('Los resultados numéricos admiten valores negativos y rechazan datos inválidos', () => {
  assert.equal(measurement(-2.5, 'valor'), -2.5);
  assert.throws(() => measurement('abc', 'valor'));
  assert.throws(() => measurement(null, 'valor'));
});
test('Un token válido identifica al paciente y rechaza suplantación', () => {
  process.env.SESSION_SECRET = 'clave_de_prueba_aleatoria_de_32_caracteres_o_mas';
  const token = makeToken({ id: 5, patient_id: 9, role: 'patient' });
  const run = value => {
    let error;
    let called = false;
    const req = { get: () => `Bearer ${value}` };
    authenticate(req, {}, e => { error = e; called = !e; });
    return { req, error, called };
  };
  const valid = run(token);
  assert.equal(valid.called, true);
  assert.equal(valid.req.user.patientId, 9);
  assert.throws(() => owner(valid.req, 10), /No puede acceder/);
  assert.doesNotThrow(() => owner(valid.req, 9));
  assert.equal(run(token + 'x').error.status, 401);
});
