const { v4: uuidv4 } = require('uuid');
const { ddb, TABLES, GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('../lib/dynamodb');
const { ok, created, notFound, badRequest, forbidden } = require('../lib/response');
const { recordAuditEntry } = require('../lib/audit');

async function createReviewCycle(documentId, body) {
  const { proposedContent, changeDescription, requesterName, proposedTitle, proposedTags } = body;
  if (!changeDescription || !requesterName) {
    return badRequest('changeDescription and requesterName are required');
  }

  const docResult = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId } }));
  if (!docResult.Item) return notFound(`Document ${documentId} not found`);

  const reviewCycleId = uuidv4();
  const now = new Date().toISOString();

  const reviewCycle = {
    reviewCycleId,
    documentId,
    proposedContent: proposedContent || docResult.Item.content,
    proposedTitle: proposedTitle || docResult.Item.title,
    proposedTags: proposedTags || docResult.Item.tags,
    changeDescription,
    requesterName,
    status: 'SUBMITTED',
    createdAt: now,
    updatedAt: now,
    statusHistory: [{ status: 'SUBMITTED', timestamp: now, actor: requesterName }],
  };

  await ddb.send(new PutCommand({ TableName: TABLES.REVIEW_CYCLES, Item: reviewCycle }));

  await recordAuditEntry({
    documentId,
    authorName: requesterName,
    action: 'REVIEW_CYCLE_CREATED',
    changeDescription: `Review cycle created: ${changeDescription}`,
    beforeState: null,
    afterState: reviewCycle,
  });

  return created(reviewCycle);
}

async function getReviewCycle(documentId, reviewCycleId) {
  const result = await ddb.send(new GetCommand({ TableName: TABLES.REVIEW_CYCLES, Key: { reviewCycleId } }));
  if (!result.Item || result.Item.documentId !== documentId) {
    return notFound(`Review cycle ${reviewCycleId} not found`);
  }
  return ok(result.Item);
}

async function listReviewCycles(documentId) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.REVIEW_CYCLES,
    IndexName: 'documentId-index',
    KeyConditionExpression: 'documentId = :docId',
    ExpressionAttributeValues: { ':docId': documentId },
  }));
  return ok({ reviewCycles: result.Items || [] });
}

async function listAllReviewCycles(queryParams) {
  const { status } = queryParams || {};
  const { ScanCommand } = require('../lib/dynamodb');

  const params = { TableName: TABLES.REVIEW_CYCLES };
  if (status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues = { ':status': status };
  }

  const result = await ddb.send(new ScanCommand(params));
  const items = (result.Items || []).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return ok({ reviewCycles: items, count: items.length });
}

async function approveReviewCycle(documentId, reviewCycleId, body) {
  const { approverName, comments } = body || {};
  if (!approverName) return badRequest('approverName is required');

  const rcResult = await ddb.send(new GetCommand({ TableName: TABLES.REVIEW_CYCLES, Key: { reviewCycleId } }));
  if (!rcResult.Item || rcResult.Item.documentId !== documentId) {
    return notFound(`Review cycle ${reviewCycleId} not found`);
  }

  const rc = rcResult.Item;
  if (rc.status === 'APPROVED' || rc.status === 'MERGED') {
    return badRequest(`Review cycle is already ${rc.status}`);
  }

  const now = new Date().toISOString();
  const newHistory = [...(rc.statusHistory || []), { status: 'APPROVED', timestamp: now, actor: approverName, comments }];

  await ddb.send(new UpdateCommand({
    TableName: TABLES.REVIEW_CYCLES,
    Key: { reviewCycleId },
    UpdateExpression: 'SET #status = :status, approverName = :approver, approvedAt = :now, updatedAt = :now, statusHistory = :history, approvalComments = :comments',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'APPROVED',
      ':approver': approverName,
      ':now': now,
      ':history': newHistory,
      ':comments': comments || '',
    },
  }));

  await recordAuditEntry({
    documentId,
    authorName: approverName,
    action: 'REVIEW_CYCLE_APPROVED',
    changeDescription: `Review cycle approved by ${approverName}`,
    beforeState: rc,
    afterState: { ...rc, status: 'APPROVED', approverName },
  });

  const updated = await ddb.send(new GetCommand({ TableName: TABLES.REVIEW_CYCLES, Key: { reviewCycleId } }));
  return ok(updated.Item);
}

async function rejectReviewCycle(documentId, reviewCycleId, body) {
  const { approverName, reason } = body || {};
  if (!approverName || !reason) return badRequest('approverName and reason are required');

  const rcResult = await ddb.send(new GetCommand({ TableName: TABLES.REVIEW_CYCLES, Key: { reviewCycleId } }));
  if (!rcResult.Item || rcResult.Item.documentId !== documentId) {
    return notFound(`Review cycle ${reviewCycleId} not found`);
  }

  const rc = rcResult.Item;
  if (rc.status === 'REJECTED' || rc.status === 'MERGED') {
    return badRequest(`Review cycle is already ${rc.status}`);
  }

  const now = new Date().toISOString();
  const newHistory = [...(rc.statusHistory || []), { status: 'REJECTED', timestamp: now, actor: approverName, reason }];

  await ddb.send(new UpdateCommand({
    TableName: TABLES.REVIEW_CYCLES,
    Key: { reviewCycleId },
    UpdateExpression: 'SET #status = :status, rejectedBy = :approver, rejectedAt = :now, updatedAt = :now, rejectionReason = :reason, statusHistory = :history',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'REJECTED',
      ':approver': approverName,
      ':now': now,
      ':reason': reason,
      ':history': newHistory,
    },
  }));

  await recordAuditEntry({
    documentId,
    authorName: approverName,
    action: 'REVIEW_CYCLE_REJECTED',
    changeDescription: `Review cycle rejected: ${reason}`,
    beforeState: rc,
    afterState: { ...rc, status: 'REJECTED', rejectionReason: reason },
  });

  const updated = await ddb.send(new GetCommand({ TableName: TABLES.REVIEW_CYCLES, Key: { reviewCycleId } }));
  return ok(updated.Item);
}

async function mergeReviewCycle(documentId, reviewCycleId, body) {
  const { mergedBy } = body || {};
  if (!mergedBy) return badRequest('mergedBy is required');

  const rcResult = await ddb.send(new GetCommand({ TableName: TABLES.REVIEW_CYCLES, Key: { reviewCycleId } }));
  if (!rcResult.Item || rcResult.Item.documentId !== documentId) {
    return notFound(`Review cycle ${reviewCycleId} not found`);
  }

  const rc = rcResult.Item;
  if (rc.status !== 'APPROVED') {
    return badRequest('Review cycle must be APPROVED before merging');
  }

  const docResult = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId } }));
  if (!docResult.Item) return notFound(`Document ${documentId} not found`);

  const { updateDocument } = require('./documents');
  await updateDocument(documentId, {
    content: rc.proposedContent,
    title: rc.proposedTitle,
    tags: rc.proposedTags,
    changeDescription: rc.changeDescription,
    status: 'CURRENT',
  }, mergedBy);

  const now = new Date().toISOString();
  const newHistory = [...(rc.statusHistory || []), { status: 'MERGED', timestamp: now, actor: mergedBy }];

  await ddb.send(new UpdateCommand({
    TableName: TABLES.REVIEW_CYCLES,
    Key: { reviewCycleId },
    UpdateExpression: 'SET #status = :status, mergedBy = :mergedBy, mergedAt = :now, updatedAt = :now, statusHistory = :history',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'MERGED',
      ':mergedBy': mergedBy,
      ':now': now,
      ':history': newHistory,
    },
  }));

  await recordAuditEntry({
    documentId,
    authorName: mergedBy,
    action: 'REVIEW_CYCLE_MERGED',
    changeDescription: `Changes merged into document: ${rc.changeDescription}`,
    beforeState: docResult.Item,
    afterState: { ...docResult.Item, content: rc.proposedContent },
  });

  const updated = await ddb.send(new GetCommand({ TableName: TABLES.REVIEW_CYCLES, Key: { reviewCycleId } }));
  return ok(updated.Item);
}

module.exports = { createReviewCycle, getReviewCycle, listReviewCycles, listAllReviewCycles, approveReviewCycle, rejectReviewCycle, mergeReviewCycle };
