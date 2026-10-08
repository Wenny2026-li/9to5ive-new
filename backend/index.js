const { options } = require('./lib/response');
const documents = require('./handlers/documents');
const reviewCycles = require('./handlers/review-cycles');
const auditHandler = require('./handlers/audit');
const impactAnalysis = require('./handlers/impact-analysis');
const coherence = require('./handlers/coherence');
const graph = require('./handlers/graph');
const chat = require('./handlers/chat');

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return {};
  }
}

function getAuthorName(event) {
  return (event.headers && (event.headers['x-user-name'] || event.headers['X-User-Name'])) || 'anonymous';
}

function matchPath(pattern, path) {
  const paramNames = [];
  const regexStr = pattern.replace(/{([^}]+)}/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  const regex = new RegExp(`^${regexStr}$`);
  const match = path.match(regex);
  if (!match) return null;
  const params = {};
  paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
  return params;
}

const ROUTES = [
  ['GET',  '/health',                                                            (p, q, b, a) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ status: 'ok' }) })],
  ['POST', '/documents',                                                         (p, q, b, a) => documents.createDocument(b, a)],
  ['GET',  '/documents',                                                         (p, q, b, a) => documents.listDocuments(q)],
  ['GET',  '/documents/{documentId}',                                            (p, q, b, a) => documents.getDocument(p.documentId)],
  ['PUT',  '/documents/{documentId}',                                            (p, q, b, a) => documents.updateDocument(p.documentId, b, a)],
  ['GET',  '/documents/{documentId}/versions',                                   (p, q, b, a) => documents.getVersionHistory(p.documentId)],
  ['GET',  '/documents/{documentId}/audit',                                      (p, q, b, a) => auditHandler.getAuditTrail(p.documentId)],
  ['GET',  '/documents/{documentId}/relationships',                              (p, q, b, a) => graph.getRelationships(p.documentId)],
  ['POST', '/documents/{documentId}/relationships',                              (p, q, b, a) => graph.addRelationship(p.documentId, b)],
  ['POST', '/documents/{documentId}/review-cycles',                              (p, q, b, a) => reviewCycles.createReviewCycle(p.documentId, b)],
  ['GET',  '/documents/{documentId}/review-cycles',                              (p, q, b, a) => reviewCycles.listReviewCycles(p.documentId)],
  ['GET',  '/documents/{documentId}/review-cycles/{reviewCycleId}',             (p, q, b, a) => reviewCycles.getReviewCycle(p.documentId, p.reviewCycleId)],
  ['POST', '/documents/{documentId}/review-cycles/{reviewCycleId}/approve',     (p, q, b, a) => reviewCycles.approveReviewCycle(p.documentId, p.reviewCycleId, b)],
  ['POST', '/documents/{documentId}/review-cycles/{reviewCycleId}/reject',      (p, q, b, a) => reviewCycles.rejectReviewCycle(p.documentId, p.reviewCycleId, b)],
  ['POST', '/documents/{documentId}/review-cycles/{reviewCycleId}/merge',       (p, q, b, a) => reviewCycles.mergeReviewCycle(p.documentId, p.reviewCycleId, b)],
  ['POST', '/documents/{documentId}/coherence',                                  (p, q, b, a) => coherence.validateCoherence(p.documentId, b)],
  ['GET',  '/review-cycles',                                                     (p, q, b, a) => reviewCycles.listAllReviewCycles(q)],
  ['GET',  '/audit',                                                             (p, q, b, a) => auditHandler.getAllAuditRecords(q)],
  ['PUT',  '/audit/{auditId}',                                                   (p, q, b, a) => auditHandler.rejectModification()],
  ['DELETE','/audit/{auditId}',                                                  (p, q, b, a) => auditHandler.rejectModification()],
  ['GET',  '/audit/{documentId}/{auditId}/verify',                               (p, q, b, a) => auditHandler.verifyRecord(p.documentId, p.auditId)],
  ['POST', '/impact-analysis',                                                   (p, q, b, a) => impactAnalysis.analyzeImpact(b)],
  ['POST', '/chat',                                                              (p, q, b, a) => chat.chat(b)],
  ['GET',  '/search',                                                            (p, q, b, a) => documents.listDocuments(q)],
  ['GET',  '/graph/coherence',                                                   (p, q, b, a) => coherence.analyzeGraphCoherence()],
];

exports.handler = async (event) => {
  const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();
  const path = event.rawPath || event.path || '/';
  const queryParams = event.queryStringParameters || {};

  if (method === 'OPTIONS') return options();

  const body = parseBody(event);
  const authorName = getAuthorName(event);

  try {
    for (const [routeMethod, pattern, handler] of ROUTES) {
      if (routeMethod !== method) continue;
      const params = matchPath(pattern, path);
      if (params !== null) {
        return await handler(params, queryParams, body, authorName);
      }
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `Route not found: ${method} ${path}` }),
    };
  } catch (err) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error', details: err.message }),
    };
  }
};
