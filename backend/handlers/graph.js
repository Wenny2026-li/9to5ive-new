const { v4: uuidv4 } = require('uuid');
const { ddb, TABLES, GetCommand, PutCommand, QueryCommand, DeleteCommand, ScanCommand } = require('../lib/dynamodb');
const { ok, created, notFound, badRequest } = require('../lib/response');

const VALID_RELATIONSHIP_TYPES = ['references', 'depends_on', 'contradicts', 'related_to', 'supersedes'];

async function getRelationships(documentId) {
  const outgoing = await ddb.send(new QueryCommand({
    TableName: TABLES.GRAPH,
    KeyConditionExpression: 'fromDocumentId = :id',
    ExpressionAttributeValues: { ':id': documentId },
  }));

  const incomingResult = await ddb.send(new ScanCommand({
    TableName: TABLES.GRAPH,
    FilterExpression: 'toDocumentId = :id',
    ExpressionAttributeValues: { ':id': documentId },
  }));

  return ok({
    documentId,
    outgoing: outgoing.Items || [],
    incoming: incomingResult.Items || [],
  });
}

async function addRelationship(documentId, body) {
  const { toDocumentId, relationshipType, description, createdBy } = body;
  if (!toDocumentId || !relationshipType) {
    return badRequest('toDocumentId and relationshipType are required');
  }
  if (!VALID_RELATIONSHIP_TYPES.includes(relationshipType)) {
    return badRequest(`relationshipType must be one of: ${VALID_RELATIONSHIP_TYPES.join(', ')}`);
  }

  const fromDoc = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId } }));
  if (!fromDoc.Item) return notFound(`Document ${documentId} not found`);

  const toDoc = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId: toDocumentId } }));
  if (!toDoc.Item) return notFound(`Target document ${toDocumentId} not found`);

  const now = new Date().toISOString();
  const relationship = {
    fromDocumentId: documentId,
    toDocumentId,
    relationshipType,
    description: description || '',
    createdBy: createdBy || 'anonymous',
    createdAt: now,
  };

  const sortKey = `${toDocumentId}#${relationshipType}`;
  await ddb.send(new PutCommand({
    TableName: TABLES.GRAPH,
    Item: { ...relationship, sortKey },
  }));

  return created(relationship);
}

async function removeRelationship(documentId, toDocumentId, relationshipType) {
  const sortKey = `${toDocumentId}#${relationshipType}`;
  await ddb.send(new DeleteCommand({
    TableName: TABLES.GRAPH,
    Key: { fromDocumentId: documentId, sortKey },
  }));
  return ok({ message: 'Relationship removed' });
}

async function getAllRelationships() {
  const result = await ddb.send(new ScanCommand({ TableName: TABLES.GRAPH }));
  return ok({ relationships: result.Items || [] });
}

module.exports = { getRelationships, addRelationship, removeRelationship, getAllRelationships };
