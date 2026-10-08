const { test, describe, mock } = require('node:test');
const assert = require('node:assert');

describe('Document response helpers', () => {
  test('ok returns 200 with JSON body', () => {
    const { ok } = require('../lib/response');
    const result = ok({ id: 1, name: 'Test' });
    assert.strictEqual(result.statusCode, 200);
    const body = JSON.parse(result.body);
    assert.strictEqual(body.id, 1);
  });

  test('created returns 201', () => {
    const { created } = require('../lib/response');
    const result = created({ documentId: 'abc' });
    assert.strictEqual(result.statusCode, 201);
  });

  test('notFound returns 404', () => {
    const { notFound } = require('../lib/response');
    const result = notFound('Document not found');
    assert.strictEqual(result.statusCode, 404);
    const body = JSON.parse(result.body);
    assert.strictEqual(body.error, 'Document not found');
  });

  test('badRequest returns 400', () => {
    const { badRequest } = require('../lib/response');
    const result = badRequest('Missing fields');
    assert.strictEqual(result.statusCode, 400);
    const body = JSON.parse(result.body);
    assert.strictEqual(body.error, 'Missing fields');
  });

  test('forbidden returns 403', () => {
    const { forbidden } = require('../lib/response');
    const result = forbidden('Not allowed');
    assert.strictEqual(result.statusCode, 403);
    const body = JSON.parse(result.body);
    assert.strictEqual(body.error, 'Not allowed');
  });

  test('all responses have CORS headers', () => {
    const { ok, created, notFound, forbidden } = require('../lib/response');
    for (const fn of [() => ok({}), () => created({}), () => notFound(), () => forbidden()]) {
      const result = fn();
      assert.strictEqual(result.headers['Access-Control-Allow-Origin'], '*');
    }
  });

  test('options returns 200 with CORS headers', () => {
    const { options } = require('../lib/response');
    const result = options();
    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual(result.headers['Access-Control-Allow-Origin'], '*');
  });
});
