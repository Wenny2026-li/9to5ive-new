const { test, describe } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

function computeHash(record, previousHash) {
  const content = JSON.stringify({ ...record, previousHash });
  return crypto.createHash('sha256').update(content).digest('hex');
}

describe('Hash Chain', () => {
  test('computeHash produces consistent SHA-256 hash', () => {
    const record = { documentId: 'doc1', action: 'CREATE', timestamp: '2024-01-01T00:00:00Z' };
    const hash1 = computeHash(record, null);
    const hash2 = computeHash(record, null);
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);
  });

  test('computeHash produces different hash for different records', () => {
    const record1 = { documentId: 'doc1', action: 'CREATE' };
    const record2 = { documentId: 'doc2', action: 'CREATE' };
    const hash1 = computeHash(record1, null);
    const hash2 = computeHash(record2, null);
    assert.notStrictEqual(hash1, hash2);
  });

  test('computeHash incorporates previousHash into chain', () => {
    const record = { documentId: 'doc1', action: 'UPDATE' };
    const prev = 'abc123prevhash';
    const hashWithPrev = computeHash(record, prev);
    const hashWithoutPrev = computeHash(record, null);
    assert.notStrictEqual(hashWithPrev, hashWithoutPrev);
  });

  test('chain of records can be verified', () => {
    const records = [];
    let previousHash = null;

    for (let i = 0; i < 3; i++) {
      const record = { documentId: 'doc1', action: 'UPDATE', index: i };
      const hash = computeHash(record, previousHash);
      records.push({ ...record, contentHash: hash, previousHash });
      previousHash = hash;
    }

    let prev = null;
    let valid = true;
    for (const r of records) {
      const { contentHash, previousHash: stored, ...rest } = r;
      const expected = computeHash(rest, stored);
      if (expected !== contentHash) { valid = false; break; }
      if (stored !== prev) { valid = false; break; }
      prev = contentHash;
    }
    assert.strictEqual(valid, true);
  });

  test('tampered record fails verification', () => {
    const record = { documentId: 'doc1', action: 'CREATE', timestamp: '2024-01-01T00:00:00Z' };
    const hash = computeHash(record, null);
    const stored = { ...record, contentHash: hash, previousHash: null };

    const tampered = { ...stored, action: 'DELETE' };
    const { contentHash, previousHash, ...rest } = tampered;
    const recomputed = computeHash(rest, previousHash);
    assert.notStrictEqual(recomputed, contentHash);
  });
});
