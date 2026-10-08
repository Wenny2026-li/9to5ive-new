import React, { useState } from 'react';

export default function UserNamePrompt({ onSet }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onSet(name.trim());
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">Welcome to 9To5ive New</div>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
            This platform helps you manage your knowledge base and track documentation changes.
            Enter your display name to get started.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Your Display Name <span>*</span></label>
              <input
                className="form-control"
                placeholder="e.g., Sarah Chen"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!name.trim()}>
              Get Started
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
