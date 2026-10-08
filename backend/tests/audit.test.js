const { test, describe } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

function computeHash(record, previousHash) {
  const content = JSON.stringify({ ...record, previousHash });
  return crypto.createHash('sha256').update(content).digest('hex');
}

function verifyAuditRecord(record) {
  const { contentHash, previousHash, ...rest } = record;
  const expectedHash = computeHash(rest, previousHash);
  return {
    valid: expectedHash === contentHash,
    reason: expectedHash === contentHash ? null : 'Hash mismatch',
  };
}

describe('Audit Trail', () => {
  test('verifyAuditRecord returns valid for correct record', () => {
    const record = {
      documentId: 'doc1',
      auditId: 'audit1',
      timestamp: '2024-01-01T00:00:00Z',
      authorName: 'Test User',
      action: 'CREATE',
      changeDescription: 'Created document',
      beforeState: null,
      afterState: '{"title": "Test"}',
      previousHash: null,
    };
    record.contentHash = computeHash(record, null);
    const result = verifyAuditRecord(record);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.reason, null);
  });

  test('verifyAuditRecord returns invalid for tampered record', () => {
    const record = {
      documentId: 'doc1',
      auditId: 'audit1',
      timestamp: '2024-01-01T00:00:00Z',
      authorName: 'Test User',
      action: 'CREATE',
      changeDescription: 'Created document',
      beforeState: null,
      afterState: '{"title": "Test"}',
      previousHash: null,
    };
    record.contentHash = computeHash(record, null);
    record.authorName = 'Hacker';
    const result = verifyAuditRecord(record);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'Hash mismatch');
  });

  test('audit records include hash chain linking', () => {
    const records = [];
    let previousHash = null;

    for (const action of ['CREATE', 'UPDATE', 'REVIEW_CYCLE_CREATED']) {
      const record = {
        documentId: 'doc1',
        auditId: `audit-${action}`,
        timestamp: new Date().toISOString(),
        authorName: 'User',
        action,
        changeDescription: `Action: ${action}`,
        previousHash,
      };
      record.contentHash = computeHash(record, previousHash);
      records.push(record);
      previousHash = record.contentHash;
    }

    assert.strictEqual(records[1].previousHash, records[0].contentHash);
    assert.strictEqual(records[2].previousHash, records[1].contentHash);
    assert.notStrictEqual(records[0].contentHash, records[1].contentHash);
  });

  test('forbidden response for audit modification attempts', () => {
    const { forbidden } = require('../lib/response');
    const result = forbidden('Audit records are immutable and cannot be modified or deleted');
    assert.strictEqual(result.statusCode, 403);
    const body = JSON.parse(result.body);
    assert.ok(body.error.includes('immutable'));
  });
});
