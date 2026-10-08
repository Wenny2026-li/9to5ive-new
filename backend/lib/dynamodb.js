const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLES = {
  DOCUMENTS: process.env.DOCUMENTS_TABLE,
  VERSIONS: process.env.VERSIONS_TABLE,
  AUDIT: process.env.AUDIT_TABLE,
  REVIEW_CYCLES: process.env.REVIEW_CYCLES_TABLE,
  GRAPH: process.env.GRAPH_TABLE,
};

module.exports = { ddb, TABLES, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand };
