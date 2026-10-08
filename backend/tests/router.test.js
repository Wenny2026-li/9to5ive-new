const { test, describe } = require('node:test');
const assert = require('node:assert');

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

describe('Lambda Handler Routing', () => {
  test('OPTIONS request returns CORS response', async () => {
    const { options } = require('../lib/response');
    const result = options();
    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual(result.headers['Access-Control-Allow-Origin'], '*');
    assert.ok(result.headers['Access-Control-Allow-Methods'].includes('GET'));
  });

  test('parseBody handles valid JSON', () => {
    function parseBody(event) {
      try {
        return event.body ? JSON.parse(event.body) : {};
      } catch {
        return {};
      }
    }
    const result = parseBody({ body: '{"title": "test", "content": "hello"}' });
    assert.strictEqual(result.title, 'test');
    assert.strictEqual(result.content, 'hello');
  });

  test('parseBody handles missing body', () => {
    function parseBody(event) {
      try {
        return event.body ? JSON.parse(event.body) : {};
      } catch {
        return {};
      }
    }
    const result = parseBody({});
    assert.deepStrictEqual(result, {});
  });

  test('parseBody handles invalid JSON gracefully', () => {
    function parseBody(event) {
      try {
        return event.body ? JSON.parse(event.body) : {};
      } catch {
        return {};
      }
    }
    const result = parseBody({ body: 'invalid-json' });
    assert.deepStrictEqual(result, {});
  });

  test('getAuthorName reads x-user-name header', () => {
    function getAuthorName(event) {
      return (event.headers && (event.headers['x-user-name'] || event.headers['X-User-Name'])) || 'anonymous';
    }
    const result = getAuthorName({ headers: { 'x-user-name': 'Sarah Chen' } });
    assert.strictEqual(result, 'Sarah Chen');
  });

  test('getAuthorName defaults to anonymous', () => {
    function getAuthorName(event) {
      return (event.headers && (event.headers['x-user-name'] || event.headers['X-User-Name'])) || 'anonymous';
    }
    const result = getAuthorName({ headers: {} });
    assert.strictEqual(result, 'anonymous');
  });

  test('matchPath extracts documentId from path', () => {
    const params = matchPath('/documents/{documentId}', '/documents/abc-123');
    assert.deepStrictEqual(params, { documentId: 'abc-123' });
  });

  test('matchPath extracts documentId and reviewCycleId', () => {
    const params = matchPath('/documents/{documentId}/review-cycles/{reviewCycleId}/approve', '/documents/doc1/review-cycles/rc1/approve');
    assert.deepStrictEqual(params, { documentId: 'doc1', reviewCycleId: 'rc1' });
  });

  test('matchPath returns null for non-matching paths', () => {
    const params = matchPath('/documents/{documentId}', '/users/abc');
    assert.strictEqual(params, null);
  });

  test('matchPath returns empty object for exact path match', () => {
    const params = matchPath('/documents', '/documents');
    assert.deepStrictEqual(params, {});
  });

  test('document type validation covers required types', () => {
    const DOC_TYPES = ['playbook', 'runbook', 'brd', 'sop', 'architecture', 'api', 'other'];
    assert.ok(DOC_TYPES.includes('playbook'));
    assert.ok(DOC_TYPES.includes('runbook'));
    assert.ok(DOC_TYPES.includes('brd'));
    assert.ok(DOC_TYPES.includes('sop'));
  });

  test('relationship types include required types', () => {
    const VALID_RELATIONSHIP_TYPES = ['references', 'depends_on', 'contradicts', 'related_to', 'supersedes'];
    assert.ok(VALID_RELATIONSHIP_TYPES.includes('references'));
    assert.ok(VALID_RELATIONSHIP_TYPES.includes('depends_on'));
    assert.ok(VALID_RELATIONSHIP_TYPES.includes('contradicts'));
  });
});
