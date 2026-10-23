const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SESSION_SECRET = 'clave_de_prueba_aleatoria_de_32_caracteres_o_mas';
const app = require('../src/app');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(() => server.close());

async function send(method, path, body) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return response.status;
}

test('POST /sessions existe y valida el cuerpo antes de consultar la base de datos', async () => {
  assert.equal(await send('POST', '/sessions', {}), 400);
});

test('La ruta anterior con verbo ya no existe', async () => {
  assert.equal(await send('POST', '/auth/login', {}), 404);
});

test('Los recursos privados exigen sesión', async () => {
  for (const path of ['/appointments', '/reviews', '/medical-results', '/review_tags']) {
    assert.equal(await send('GET', path), 401, path);
  }
});

test('Una ruta desconocida responde 404', async () => {
  assert.equal(await send('GET', '/inexistente'), 404);
});
