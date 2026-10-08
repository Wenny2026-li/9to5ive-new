import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DocumentDetailPage from './DocumentDetailPage';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    documents: {
      get: vi.fn(),
      versions: vi.fn(),
      reviewCycles: vi.fn(),
      audit: vi.fn(),
      relationships: vi.fn(),
      createReviewCycle: vi.fn(),
    },
    reviewCycles: {},
  },
  getUserName: () => 'tester',
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/documents/doc-1']}>
      <Routes>
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DocumentDetailPage Request Change button', () => {
  beforeEach(() => {
    cleanup();
    api.documents.get.mockResolvedValue({
      documentId: 'doc-1', title: 'Runbook A', type: 'runbook', version: 1,
      ownerName: 'owner', updatedAt: new Date().toISOString(), content: 'Original content', tags: [],
    });
    api.documents.versions.mockResolvedValue({ versions: [] });
    api.documents.reviewCycles.mockResolvedValue({ reviewCycles: [] });
    api.documents.audit.mockResolvedValue({ auditRecords: [] });
    api.documents.relationships.mockResolvedValue({ outgoing: [], incoming: [] });
  });

  it('shows the change request form when clicked from the Content tab', async () => {
    renderPage();
    const button = await screen.findByRole('button', { name: 'Request Change' });
    expect(screen.queryByPlaceholderText('What change are you requesting?')).toBeNull();

    fireEvent.click(button);

    expect(screen.getByPlaceholderText('What change are you requesting?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit Change Request' })).toBeTruthy();
  });
});
