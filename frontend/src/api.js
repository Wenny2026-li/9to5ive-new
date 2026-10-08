const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.__API_URL__) {
    return window.__API_URL__.replace(/\/$/, '');
  }
  return import.meta.env.VITE_API_URL || '';
};

function getUserName() {
  return localStorage.getItem('userName') || 'anonymous';
}

async function request(method, path, body) {
  const url = `${getApiUrl()}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-name': getUserName(),
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
  return data;
}

const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),

  documents: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/documents${qs ? '?' + qs : ''}`);
    },
    get: (id) => request('GET', `/documents/${id}`),
    create: (data) => request('POST', '/documents', data),
    update: (id, data) => request('PUT', `/documents/${id}`, data),
    versions: (id) => request('GET', `/documents/${id}/versions`),
    audit: (id) => request('GET', `/documents/${id}/audit`),
    relationships: (id) => request('GET', `/documents/${id}/relationships`),
    addRelationship: (id, data) => request('POST', `/documents/${id}/relationships`, data),
    reviewCycles: (id) => request('GET', `/documents/${id}/review-cycles`),
    createReviewCycle: (id, data) => request('POST', `/documents/${id}/review-cycles`, data),
    coherence: (id, data) => request('POST', `/documents/${id}/coherence`, data),
  },

  reviewCycles: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/review-cycles${qs ? '?' + qs : ''}`);
    },
    get: (docId, rcId) => request('GET', `/documents/${docId}/review-cycles/${rcId}`),
    approve: (docId, rcId, data) => request('POST', `/documents/${docId}/review-cycles/${rcId}/approve`, data),
    reject: (docId, rcId, data) => request('POST', `/documents/${docId}/review-cycles/${rcId}/reject`, data),
    merge: (docId, rcId, data) => request('POST', `/documents/${docId}/review-cycles/${rcId}/merge`, data),
  },

  impactAnalysis: (data) => request('POST', '/impact-analysis', data),

  chat: (data) => request('POST', '/chat', data),

  audit: {
    all: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/audit${qs ? '?' + qs : ''}`);
    },
  },

  search: (q, params = {}) => {
    const qs = new URLSearchParams({ q, ...params }).toString();
    return request('GET', `/search?${qs}`);
  },

  graph: {
    coherence: () => request('GET', '/graph/coherence'),
  },
};

export default api;
export { getUserName };
