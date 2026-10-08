const { ddb, TABLES, GetCommand, ScanCommand, QueryCommand } = require('../lib/dynamodb');
const { invokeModel } = require('../lib/bedrock');
const { ok, badRequest } = require('../lib/response');

async function validateCoherence(documentId, body) {
  const { proposedContent, proposedTitle, changeDescription } = body;
  if (!proposedContent) return badRequest('proposedContent is required');

  const docResult = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId } }));
  if (!docResult.Item) {
    return ok({ documentId, violations: [], isCoherent: true, message: 'Document not found - no coherence check possible' });
  }

  const graphResult = await ddb.send(new QueryCommand({
    TableName: TABLES.GRAPH,
    KeyConditionExpression: 'fromDocumentId = :id',
    ExpressionAttributeValues: { ':id': documentId },
  }));
  const relationships = graphResult.Items || [];

  const relatedDocs = [];
  for (const rel of relationships) {
    const related = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId: rel.toDocumentId } }));
    if (related.Item) {
      relatedDocs.push({ ...related.Item, relationshipType: rel.relationshipType });
    }
  }

  if (relatedDocs.length === 0) {
    return ok({ documentId, violations: [], isCoherent: true, message: 'No related documents to check coherence against', confidenceScore: 100 });
  }

  const systemPrompt = `You are an expert at detecting contradictions and inconsistencies in technical documentation.
Given a proposed change and existing related documents, identify any contradictions.
Return JSON: { "violations": [{"documentId": "...", "documentTitle": "...", "existingStatement": "...", "conflictingStatement": "...", "severity": "HIGH|MEDIUM|LOW", "explanation": "..."}], "isCoherent": true|false, "confidenceScore": 0-100, "summary": "..." }`;

  const userMessage = `Document being changed: "${docResult.Item.title}"
Change Description: ${changeDescription || 'Update'}

Proposed new content:
${proposedContent.substring(0, 1000)}

Related documents to check against:
${relatedDocs.map(d => `--- ${d.title} (${d.relationshipType}) ---\n${(d.content || '').substring(0, 500)}`).join('\n\n')}

Identify any direct contradictions between the proposed content and the existing related documents.
Focus on factual contradictions (opposing claims about the same fact/process/requirement).
Return only JSON.`;

  let result;
  try {
    const aiResponse = await invokeModel(systemPrompt, userMessage);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON in response');
    }
  } catch (err) {
    console.error('Bedrock coherence error:', err);
    result = {
      violations: [],
      isCoherent: true,
      confidenceScore: 0,
      summary: 'AI coherence analysis unavailable',
    };
  }

  return ok({
    documentId,
    violations: result.violations || [],
    isCoherent: result.isCoherent !== false,
    confidenceScore: result.confidenceScore || 0,
    summary: result.summary || '',
    relatedDocumentsChecked: relatedDocs.length,
  });
}

async function analyzeGraphCoherence() {
  const docsResult = await ddb.send(new ScanCommand({
    TableName: TABLES.DOCUMENTS,
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'CURRENT' },
  }));
  const documents = docsResult.Items || [];

  const graphResult = await ddb.send(new ScanCommand({ TableName: TABLES.GRAPH }));
  const edges = graphResult.Items || [];

  const documentIds = new Set(documents.map(d => d.documentId));
  const orphanedDocs = documents.filter(d => !edges.some(e => e.fromDocumentId === d.documentId || e.toDocumentId === d.documentId));

  const brokenEdges = edges.filter(e => !documentIds.has(e.fromDocumentId) || !documentIds.has(e.toDocumentId));

  return ok({
    totalDocuments: documents.length,
    totalRelationships: edges.length,
    orphanedDocuments: orphanedDocs.map(d => ({ documentId: d.documentId, title: d.title, type: d.type })),
    brokenRelationships: brokenEdges,
    recommendations: [
      ...(orphanedDocs.length > 0 ? [`${orphanedDocs.length} documents have no relationships - consider adding references`] : []),
      ...(brokenEdges.length > 0 ? [`${brokenEdges.length} relationships reference non-existent documents`] : []),
    ],
    healthScore: Math.max(0, 100 - (orphanedDocs.length * 5) - (brokenEdges.length * 10)),
  });
}

module.exports = { validateCoherence, analyzeGraphCoherence };
