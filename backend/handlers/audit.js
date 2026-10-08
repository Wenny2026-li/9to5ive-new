const { ddb, TABLES, QueryCommand, GetCommand, ScanCommand } = require('../lib/dynamodb');
const { ok, notFound, forbidden, serverError } = require('../lib/response');
const { verifyAuditRecord } = require('../lib/audit');

async function getAuditTrail(documentId) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.AUDIT,
    KeyConditionExpression: 'documentId = :docId',
    ExpressionAttributeValues: { ':docId': documentId },
    ScanIndexForward: false,
  }));

  return ok({ documentId, auditRecords: result.Items || [] });
}

async function getAllAuditRecords(queryParams) {
  const { limit } = queryParams || {};

  const params = { TableName: TABLES.AUDIT };
  if (limit) params.Limit = parseInt(limit, 10);

  const result = await ddb.send(new ScanCommand(params));
  const items = (result.Items || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return ok({ auditRecords: items, count: items.length });
}

async function verifyRecord(documentId, auditId) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.AUDIT,
    KeyConditionExpression: 'documentId = :docId AND auditId = :auditId',
    ExpressionAttributeValues: { ':docId': documentId, ':auditId': auditId },
  }));

  if (!result.Items || result.Items.length === 0) {
    return notFound(`Audit record ${auditId} not found`);
  }

  const record = result.Items[0];
  const verification = await verifyAuditRecord(record);
  return ok({ auditId, documentId, ...verification });
}

async function rejectModification() {
  const timestamp = new Date().toISOString();
  console.warn(JSON.stringify({
    level: 'SECURITY',
    message: 'Attempted modification of audit record rejected',
    timestamp,
    action: 'AUDIT_MODIFICATION_ATTEMPT',
  }));
  return forbidden('Audit records are immutable and cannot be modified or deleted');
}

module.exports = { getAuditTrail, getAllAuditRecords, verifyRecord, rejectModification };
