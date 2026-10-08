const { test, describe } = require('node:test');
const assert = require('node:assert');

process.env.REVIEW_CYCLES_TABLE = 'review-cycles';
process.env.AUDIT_TABLE = 'audit';
process.env.DOCUMENTS_TABLE = 'documents';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';

const { ddb } = require('../lib/dynamodb');
const { approveReviewCycle } = require('../handlers/review-cycles');

// Short-circuits the real document client after it has marshalled the input,
// so marshalling errors surface exactly as they would against DynamoDB.
// Runs after the SDK's unmarshall step would, so outputs are given unmarshalled.
const sent = [];
function fakeDynamo(next, context) {
  return async (args) => {
    sent.push(context.commandName);
    if (context.commandName === 'GetItemCommand') {
      const item = {
        reviewCycleId: 'rc-1',
        documentId: 'doc-1',
        status: 'SUBMITTED',
        changeDescription: 'Fix typo',
        requesterName: 'alice',
        statusHistory: [{ status: 'SUBMITTED', timestamp: '2026-01-01T00:00:00.000Z', actor: 'alice' }],
      };
      return { output: { Item: item, $metadata: {} }, response: {} };
    }
    if (context.commandName === 'QueryCommand') return { output: { Items: [], $metadata: {} }, response: {} };
    return { output: { $metadata: {} }, response: {} };
  };
}

ddb.middlewareStack.add(fakeDynamo, { step: 'build', name: 'fakeDynamo' });

describe('approveReviewCycle', () => {
  test('approves when the request body has no comments', async () => {
    const result = await approveReviewCycle('doc-1', 'rc-1', { approverName: 'bob' });
    assert.strictEqual(result.statusCode, 200);
    assert.ok(sent.includes('UpdateItemCommand'));
  });
});
