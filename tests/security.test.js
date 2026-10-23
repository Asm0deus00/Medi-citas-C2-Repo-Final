const test = require('node:test');
const assert = require('node:assert/strict');
const { createToken, authenticate } = require('../src/middleware/authentication');
const { assertPatientAccess, requireAdmin } = require('../src/middleware/authorization');

process.env.SESSION_SECRET = 'clave_de_prueba_aleatoria_de_32_caracteres_o_mas';

function runAuthenticate(tokenValue) {
  const request = { get: () => `Bearer ${tokenValue}` };
  let capturedError;
  authenticate(request, {}, (error) => {
    capturedError = error;
  });
  return { request, error: capturedError };
}

test('Un token válido identifica al paciente', () => {
  const token = createToken({ id: 5, patient_id: 9, role: 'patient' });
  const { request, error } = runAuthenticate(token);
  assert.equal(error, undefined);
  assert.equal(request.user.patientId, 9);
});

test('Un token alterado se rechaza con 401', () => {
  const token = createToken({ id: 5, patient_id: 9, role: 'patient' });
  assert.equal(runAuthenticate(`${token}x`).error.status, 401);
});

test('Un paciente no puede acceder a datos de otro paciente', () => {
  const patient = { role: 'patient', patientId: 9 };
  assert.throws(() => assertPatientAccess(patient, 10), /No puede acceder/);
  assert.doesNotThrow(() => assertPatientAccess(patient, 9));
});

test('Un administrador accede a datos de cualquier paciente', () => {
  assert.doesNotThrow(() => assertPatientAccess({ role: 'admin', patientId: null }, 10));
});

test('requireAdmin bloquea a los pacientes', () => {
  let capturedError;
  requireAdmin({ user: { role: 'patient' } }, {}, (error) => {
    capturedError = error;
  });
  assert.equal(capturedError.status, 403);
});
