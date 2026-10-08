const { ddb, TABLES, ScanCommand, GetCommand } = require('../lib/dynamodb');
const { invokeModel } = require('../lib/bedrock');
const { ok, badRequest } = require('../lib/response');

async function chat(body) {
  const { message, conversationHistory, documentIds, authorName } = body;
  if (!message) return badRequest('message is required');

  let contextDocs = [];
  if (documentIds && documentIds.length > 0) {
    for (const docId of documentIds.slice(0, 5)) {
      const result = await ddb.send(new GetCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId: docId } }));
      if (result.Item) contextDocs.push(result.Item);
    }
  } else {
    const result = await ddb.send(new ScanCommand({
      TableName: TABLES.DOCUMENTS,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'CURRENT' },
      Limit: 20,
    }));
    contextDocs = result.Items || [];
  }

  const systemPrompt = `You are an AI assistant for the 9To5ive New Knowledge Base Management Platform.
You help users:
1. Describe and plan documentation changes
2. Identify which documents need to be updated
3. Draft proposed document content
4. Analyze dependencies between documents
5. Detect coherence issues

You have access to the knowledge base documents listed below.
When suggesting documentation changes, be specific about WHAT should change and WHY.
If asked to draft content, provide concrete text that can be used directly.

Always structure your responses with:
- A direct answer to the question
- Specific document references when relevant
- Concrete next steps

Knowledge Base Documents (${contextDocs.length} documents):
${contextDocs.map(d => `[${d.documentId}] "${d.title}" (${d.type}): ${(d.content || '').substring(0, 200)}...`).join('\n')}`;

  const messages = [
    ...(conversationHistory || []).map(h => ({
      role: h.role,
      content: h.content,
    })),
    { role: 'user', content: message },
  ];

  let aiResponse;
  try {
    const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
    const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'apac.anthropic.claude-3-haiku-20240307-v1:0';

    const bedrockBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    };

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(bedrockBody),
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    aiResponse = result.content[0].text;
  } catch (err) {
    console.error('Bedrock chat error:', err);
    aiResponse = "I'm unable to process your request right now. Please try again later or use the Impact Analysis tool directly.";
  }

  const mentionedDocs = contextDocs.filter(d =>
    aiResponse.toLowerCase().includes(d.title.toLowerCase()) ||
    aiResponse.includes(d.documentId)
  );

  return ok({
    response: aiResponse,
    mentionedDocuments: mentionedDocs.map(d => ({ documentId: d.documentId, title: d.title, type: d.type })),
    updatedHistory: [
      ...(conversationHistory || []),
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse },
    ],
  });
}

module.exports = { chat };
