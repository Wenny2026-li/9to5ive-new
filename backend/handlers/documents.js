const { v4: uuidv4 } = require('uuid');
const { ddb, TABLES, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require('../lib/dynamodb');
const { ok, created, notFound, badRequest, serverError } = require('../lib/response');
const { recordAuditEntry } = require('../lib/audit');

async function createDocument(body, authorName) {
  const { title, content, type, tags, ownerId, ownerName } = body;
  if (!title || !content || !type) {
    return badRequest('title, content, and type are required');
  }

  const documentId = uuidv4();
  const now = new Date().toISOString();
  const versionNumber = 1;

  const document = {
    documentId,
    title,
    content,
    type,
    tags: tags || [],
    ownerId: ownerId || 'anonymous',
    ownerName: ownerName || authorName || 'anonymous',
    status: 'CURRENT',
    version: versionNumber,
    createdAt: now,
    updatedAt: now,
    createdBy: authorName || 'anonymous',
  };

  await ddb.send(new PutCommand({ TableName: TABLES.DOCUMENTS, Item: document }));

  await ddb.send(new PutCommand({
    TableName: TABLES.VERSIONS,
    Item: {
      documentId,
      versionNumber,
      content,
      title,
      createdAt: now,
      createdBy: authorName || 'anonymous',
      changeDescription: 'Initial version',
    },
  }));

  await recordAuditEntry({
    documentId,
    authorName: authorName || 'anonymous',
    action: 'CREATE',
    changeDescription: `Document created: ${title}`,
    beforeState: null,
    afterState: document,
  });

  return created(document);
}

async function getDocument(documentId) {
  const result = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId } }));
  if (!result.Item) return notFound(`Document ${documentId} not found`);

  const graphResult = await ddb.send(new QueryCommand({
    TableName: TABLES.GRAPH,
    KeyConditionExpression: 'fromDocumentId = :id',
    ExpressionAttributeValues: { ':id': documentId },
  }));
  const relationships = graphResult.Items || [];

  return ok({ ...result.Item, relationships });
}

async function listDocuments(queryParams) {
  const { type, status, tag, q } = queryParams || {};

  let filterParts = [];
  let expressionValues = {};
  let expressionNames = {};

  if (type) {
    filterParts.push('#type = :type');
    expressionNames['#type'] = 'type';
    expressionValues[':type'] = type;
  }
  if (status) {
    filterParts.push('#status = :status');
    expressionNames['#status'] = 'status';
    expressionValues[':status'] = status;
  }

  const params = { TableName: TABLES.DOCUMENTS };
  if (filterParts.length > 0) {
    params.FilterExpression = filterParts.join(' AND ');
    params.ExpressionAttributeValues = expressionValues;
    params.ExpressionAttributeNames = expressionNames;
  }

  const result = await ddb.send(new ScanCommand(params));
  let items = result.Items || [];

  if (tag) {
    items = items.filter(doc => doc.tags && doc.tags.includes(tag));
  }

  if (q) {
    const query = q.toLowerCase();
    items = items.filter(doc =>
      (doc.title && doc.title.toLowerCase().includes(query)) ||
      (doc.content && doc.content.toLowerCase().includes(query)) ||
      (doc.tags && doc.tags.some(t => t.toLowerCase().includes(query)))
    );
  }

  items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return ok({ documents: items, count: items.length });
}

async function updateDocument(documentId, body, authorName) {
  const existing = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId } }));
  if (!existing.Item) return notFound(`Document ${documentId} not found`);

  const { title, content, tags, status } = body;
  const now = new Date().toISOString();
  const newVersion = (existing.Item.version || 1) + 1;

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (tags !== undefined) updates.tags = tags;
  if (status !== undefined) updates.status = status;
  updates.version = newVersion;
  updates.updatedAt = now;

  const updateExpressions = Object.keys(updates).map(k => `#${k} = :${k}`);
  const attrNames = Object.fromEntries(Object.keys(updates).map(k => [`#${k}`, k]));
  const attrValues = Object.fromEntries(Object.keys(updates).map(k => [`:${k}`, updates[k]]));

  await ddb.send(new UpdateCommand({
    TableName: TABLES.DOCUMENTS,
    Key: { documentId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: attrNames,
    ExpressionAttributeValues: attrValues,
  }));

  if (content !== undefined) {
    await ddb.send(new PutCommand({
      TableName: TABLES.VERSIONS,
      Item: {
        documentId,
        versionNumber: newVersion,
        content,
        title: title || existing.Item.title,
        createdAt: now,
        createdBy: authorName || 'anonymous',
        changeDescription: body.changeDescription || 'Document updated',
      },
    }));
  }

  await recordAuditEntry({
    documentId,
    authorName: authorName || 'anonymous',
    action: 'UPDATE',
    changeDescription: body.changeDescription || 'Document updated',
    beforeState: existing.Item,
    afterState: { ...existing.Item, ...updates },
  });

  const updated = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId } }));
  return ok(updated.Item);
}

async function getVersionHistory(documentId) {
  const docResult = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId } }));
  if (!docResult.Item) return notFound(`Document ${documentId} not found`);

  const versionsResult = await ddb.send(new QueryCommand({
    TableName: TABLES.VERSIONS,
    KeyConditionExpression: 'documentId = :id',
    ExpressionAttributeValues: { ':id': documentId },
    ScanIndexForward: false,
  }));

  return ok({ documentId, versions: versionsResult.Items || [] });
}

module.exports = { createDocument, getDocument, listDocuments, updateDocument, getVersionHistory };
