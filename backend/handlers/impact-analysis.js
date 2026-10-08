const { ddb, TABLES, ScanCommand, QueryCommand } = require('../lib/dynamodb');
const { invokeModel } = require('../lib/bedrock');
const { ok, badRequest, serverError } = require('../lib/response');

async function analyzeImpact(body) {
  const { enhancement, enhancementType, authorName } = body;
  if (!enhancement) return badRequest('enhancement description is required');

  const docsResult = await ddb.send(new ScanCommand({
    TableName: TABLES.DOCUMENTS,
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'CURRENT' },
  }));
  const documents = docsResult.Items || [];

  if (documents.length === 0) {
    return ok({ enhancement, affectedDocuments: [], confidenceScore: 100, analysisId: Date.now().toString() });
  }

  const documentSummaries = documents.map(d => ({
    documentId: d.documentId,
    title: d.title,
    type: d.type,
    tags: d.tags,
    excerpt: (d.content || '').substring(0, 300),
  }));

  const systemPrompt = `You are an expert at analyzing software documentation impact.
Given a proposed enhancement, identify which documents in the knowledge base may be affected.
Return a JSON array of affected documents with explanations. Be thorough but accurate.
Format: { "affectedDocuments": [{"documentId": "...", "title": "...", "relevanceScore": 0-100, "explanation": "..."}], "confidenceScore": 0-100, "summary": "..." }`;

  const userMessage = `Enhancement Type: ${enhancementType || 'general'}
Enhancement Description: ${enhancement}

Knowledge Base Documents (${documents.length} total):
${JSON.stringify(documentSummaries, null, 2)}

Identify which documents need to be reviewed or updated due to this enhancement.
Explain WHY each document is affected (e.g., "mentions the affected API", "documents the changed permission model").
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
    console.error('Bedrock error:', err);
    result = {
      affectedDocuments: documents.map(d => ({
        documentId: d.documentId,
        title: d.title,
        relevanceScore: 50,
        explanation: 'Unable to determine specific impact - please review manually',
      })),
      confidenceScore: 0,
      summary: 'AI analysis unavailable - all documents listed for manual review',
    };
  }

  const affectedDocuments = (result.affectedDocuments || []).map(ad => {
    const doc = documents.find(d => d.documentId === ad.documentId);
    return { ...ad, type: doc?.type, tags: doc?.tags };
  });

  affectedDocuments.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  return ok({
    analysisId: Date.now().toString(),
    enhancement,
    enhancementType,
    affectedDocuments,
    confidenceScore: result.confidenceScore || 0,
    summary: result.summary || '',
    totalDocumentsAnalyzed: documents.length,
  });
}

module.exports = { analyzeImpact };
