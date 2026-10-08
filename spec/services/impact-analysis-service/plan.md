# Technical Plan

## Delivery phases

Scoped to the `impact-analysis-service` repo's capabilities within the approved execution plan.

### INT — architecture · gated

_No capabilities listed._

## Architecture

A microservices architecture that solves distributed knowledge management by isolating knowledge graph coherence, document storage and versioning, impact analysis, review workflows, and immutable audit tracking into distinct services. The api-gateway provides a unified HTTP surface; domain services communicate via explicit REST contracts and async events. The design ensures that enhancements can be tracked coherently across documents, reviewers can assess impact before approval, and all changes are immutably audited.

The domain is organized into two bounded contexts: Knowledge Management (owns KnowledgeDocument aggregate root, DocumentVersion entities, DocumentRelationship value objects, DocumentType classifications, and Change entities to track mutations) and Enhancement Impact Analysis (owns Enhancement aggregate root, ImpactAnalysisResult entities, CoherenceViolation value objects, and DependencyChain value objects). The ubiquitous language includes Knowledge Document, Document Type, Version, Change, Document Relationship, Coherence, and Change Tracking. Ten domain events coordinate cross-service communication: DocumentCreated, DocumentVersioned, EnhancementProposed, ImpactAnalysisCompleted, ReviewerAssigned, ReviewApprovalGateReached, ReviewApproved, ReviewRejected, DocumentChangesMerged, and DocumentPublished.

### This service

- **impact-analysis-service** — domain

### Other services in scope

- **knowledge-graph-service** — domain
- **document-store-service** — domain
- **document-review-service** — domain
- **change-tracking-service** — domain
- **api-gateway** — edge
- **notification-service** — integration

### API contracts

- **Create document** — POST /documents
- **Retrieve document by id** — GET /documents/{documentId}
- **List documents** — GET /documents
- **Retrieve document version history** — GET /documents/{documentId}/versions
- **Initiate review cycle** — POST /documents/{documentId}/review-cycles
- **Retrieve review cycle status** — GET /documents/{documentId}/review-cycles/{reviewCycleId}
- **Approve review cycle** — POST /documents/{documentId}/review-cycles/{reviewCycleId}/approve
- **Reject review cycle** — POST /documents/{documentId}/review-cycles/{reviewCycleId}/reject
- **Merge approved changes** — POST /documents/{documentId}/review-cycles/{reviewCycleId}/merge
- **Analyze impact of enhancement** — POST /impact-analysis

### Non-functional requirements

- **Documentation search latency (p50)** — p50 search query response time ≤ 1 second against a knowledge base of 10,000 documents
- **Documentation search latency (p95)** — p95 search query response time ≤ 3 seconds against a knowledge base of 10,000 documents under 50 concurrent users
- **Documentation search throughput** — Knowledge-graph-service sustains ≥ 50 concurrent search queries with p95 latency ≤ 3 seconds; no query is rejected due to capacity
- **Audit log immutability enforcement** — Audit records in change-tracking-service are append-only; 0 UPDATE or DELETE operations are permitted on audit records after creation; any such attempt is rejected with HTTP 403 Forbidden and logged as a security event
- **Audit log tamper detection** — Every audit record includes a cryptographic hash (SHA-256) of its content and a hash-chain pointer to the prior record; verification of any record's integrity completes in < 100ms; 100% of audit records are hash-chained with no gaps
- **Audit log security event logging** — Every rejected modification or deletion attempt against an audit record is logged as a security event within 100ms; the event includes timestamp (UTC, millisecond precision), user identity (authenticated principal), action attempted, and rejection reason; 100% of rejection attempts are logged with 0 silent failures
- **Audit record retrieval and verification** — A security officer can retrieve any audit record and verify its integrity (hash-chain validation) within 500ms; the verification API returns a boolean (valid/invalid) and the reason for any invalidity; 100% of retrievals complete successfully with no data loss
- **Document change audit coverage** — 100% of state changes to documents (create, update, merge, reject, publish) are recorded in the audit log within 1 second of the change; 0 changes bypass the audit trail
- **Knowledge graph coherence consistency** — Knowledge-graph-service enforces all coherence rules (relationship cardinality, version constraints, entity dependencies) at write time; 0 incoherent states are persisted; any write that would violate a rule is rejected with HTTP 400 Bad Request and a typed error code
- **Impact analysis completeness** — Impact-analysis-service identifies 100% of documents that may be affected by a proposed enhancement based on knowledge-graph relationships; no affected document is missed; the service returns a confidence score (0–100%) indicating the certainty of the analysis
