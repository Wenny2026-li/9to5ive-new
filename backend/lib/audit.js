const crypto = require('crypto');
const { ddb, TABLES, PutCommand, QueryCommand } = require('./dynamodb');
const { v4: uuidv4 } = require('uuid');

async function getLastAuditHash(documentId) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.AUDIT,
    KeyConditionExpression: 'documentId = :docId',
    ExpressionAttributeValues: { ':docId': documentId },
    ScanIndexForward: false,
    Limit: 1,
  }));
  if (!result.Items || result.Items.length === 0) return null;
  return result.Items[0].contentHash;
}

function computeHash(record, previousHash) {
  const content = JSON.stringify({ ...record, previousHash });
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function recordAuditEntry({ documentId, authorName, action, changeDescription, beforeState, afterState }) {
  const auditId = `${Date.now()}-${uuidv4()}`;
  const timestamp = new Date().toISOString();
  const previousHash = await getLastAuditHash(documentId);

  const record = {
    documentId,
    auditId,
    timestamp,
    authorName: authorName || 'anonymous',
    action,
    changeDescription,
    beforeState: beforeState ? JSON.stringify(beforeState) : null,
    afterState: afterState ? JSON.stringify(afterState) : null,
    previousHash,
  };

  record.contentHash = computeHash(record, previousHash);

  await ddb.send(new PutCommand({
    TableName: TABLES.AUDIT,
    Item: record,
    ConditionExpression: 'attribute_not_exists(auditId)',
  }));

  return record;
}

async function verifyAuditRecord(record) {
  const { contentHash, previousHash, ...rest } = record;
  const expectedHash = computeHash(rest, previousHash);
  return {
    valid: expectedHash === contentHash,
    reason: expectedHash === contentHash ? null : 'Hash mismatch',
  };
}

module.exports = { recordAuditEntry, verifyAuditRecord, computeHash };
