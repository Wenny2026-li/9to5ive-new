import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getUserName } from '../api';

const DOC_TYPES = ['playbook', 'runbook', 'brd', 'sop', 'architecture', 'api', 'other'];

export default function NewDocumentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', content: '', type: 'playbook', tags: '', ownerName: getUserName(),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.content || !form.type) {
      setError('Title, content, and type are required.');
      return;
    }
    setSaving(true);
    try {
      const doc = await api.documents.create({
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      navigate(`/documents/${doc.documentId}`);
    } catch (err) {
      setError(err.message || 'Failed to create document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">New Document</div>
          <div className="page-subtitle">Add a new document to the knowledge base</div>
        </div>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title <span>*</span></label>
            <input className="form-control" name="title" placeholder="Document title" value={form.title} onChange={handleChange} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Type <span>*</span></label>
              <select className="form-control" name="type" value={form.type} onChange={handleChange}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Owner Name</label>
              <input className="form-control" name="ownerName" value={form.ownerName} onChange={handleChange} placeholder="Document owner" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <input className="form-control" name="tags" placeholder="comma-separated tags, e.g. auth, security, api" value={form.tags} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Content <span>*</span></label>
            <textarea
              className="form-control"
              name="content"
              placeholder="Document content (Markdown supported)"
              value={form.content}
              onChange={handleChange}
              style={{ minHeight: 300 }}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner" /> Saving...</> : 'Create Document'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
