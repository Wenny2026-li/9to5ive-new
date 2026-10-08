# Tasks

One repository, one folder per service: knowledge-service, api-gateway, document-store-service, knowledge-graph-service, change-tracking-service, impact-analysis-service, document-review-service. Each service's own Spec-Kit files are under `spec/services/<service>/`.

## knowledge-service

# Tasks

Ordered, traceable task breakdown for implementation.

Derived from the approved execution PLAN. Phases are computed from the declared `depends_on` edges: tasks in the same phase have no dependency between them and may be worked in parallel; a later phase waits on the phases before it.

This file lists **only this repo's tasks**. A dependency on work in another repo is marked _waits on other repos_ — coordinate it, don't look for it here.

## Phase 0 — INFRA

- task-infra-decision-deployment-topology — Design/Decide: Resolve the infrastructure architecture decision: specify the target deployment model (e.g., Kubernetes, cloud-managed services), MongoDB provisioning strategy (replication, sharding, backup), graph database choice and provisioning, search index infrastructure (Elasticsearch, Solr, or embedded), monitoring/alerting stack, and disaster recovery/backup strategy. Document the decision with rationale and constraints. (repo: `knowledge-service`)

## Phase 1 — INFRA

- task-infra-provision-mongodb — Prepare: Provision the MongoDB instance(s) for knowledge-service document storage, including replication configuration, backup/recovery procedures, connection pooling, and integration with the deployment environment. Wire connection credentials into service configuration via environment variables. (repo: `knowledge-service`) (depends on task-infra-decision-deployment-topology) [traces: BR-COMP-documentation-retention-policy#1]
- task-infra-provision-graph-database — Prepare: Provision the graph database instance for knowledge graph storage and relationship tracking, including replication, backup, and connection configuration. Wire connection credentials into service configuration via environment variables. (repo: `knowledge-service`) (depends on task-infra-decision-deployment-topology)
- task-infra-provision-search-index — Prepare: Provision the search index infrastructure (e.g., Elasticsearch cluster or equivalent) for full-text and semantic search across knowledge documents. Configure indexing pipelines, replication, and backup. Wire connection credentials into service configuration. (repo: `knowledge-service`) (depends on task-infra-decision-deployment-topology) [traces: BR-NONF-documentation-search-latency#1, BR-NONF-documentation-search-latency#2, BR-NONF-documentation-search-latency#3]
- task-infra-observability-stack — Prepare: Set up monitoring, logging, and alerting infrastructure for knowledge-service: structured logging aggregation, metrics collection, dashboards for search latency and document ingestion, and alert rules for SLA violations and security events. (repo: `knowledge-service`) (depends on task-infra-decision-deployment-topology) [traces: BR-NONF-documentation-search-latency#1, BR-NONF-documentation-search-latency#2, BR-NONF-documentation-search-latency#3, BR-SECU-audit-trail-immutability#2]

## Phase 3 — API, DATA

- task-data-implement-document-ingestion — Implement: Implement the document ingestion pipeline: parse incoming documents (text, markdown, structured), extract semantic sections, create graph nodes and edges, index into search infrastructure, and record initial audit entry. Handle multiple input formats and validate document structure. (repo: `knowledge-service`) (depends on task-infra-provision-search-index) (waits on other repos: task-data-design-document-schema, task-data-design-graph-schema) [traces: IF-SVC-KNOWLEDGE-0001]
- task-data-implement-document-fetch — Implement: Implement the document fetch operation: retrieve a document by id from MongoDB, include its current content, metadata, change history from the audit trail, and relationships from the knowledge graph. Return a complete document view with all context. (repo: `knowledge-service`) (waits on other repos: task-data-design-document-schema, task-data-design-audit-schema) [traces: IF-SVC-KNOWLEDGE-0005]
- task-data-implement-audit-trail — Implement: Implement immutable audit trail recording: append-only writes to the audit collection, include tamper-detection hashing (e.g., HMAC-SHA256 of previous record + current record), reject any modification/deletion attempts with security event logging, and provide verification methods for integrity checks. (repo: `knowledge-service`) (waits on other repos: task-data-design-audit-schema) [traces: IF-SVC-KNOWLEDGE-0003]
- task-api-design-coherence-validation-contract — Design/Decide: Design the API contract for coherence validation on document update: specify request format (document update with change reason), response format (list of flagged contradictions with source documents and conflicting statements), and user acknowledgment/resolution workflow. (repo: `knowledge-service`) (waits on other repos: task-data-design-graph-schema) [traces: BR-FUNC-coherence-validation-on-enhancement#1, BR-FUNC-coherence-validation-on-enhancement#2]

## Phase 4 — API, DATA

- task-data-implement-search — Implement: Implement full-text and semantic search across knowledge documents: query the search index with ranking by relevance, return results with scores and context snippets, and enforce the 2-second latency SLA. Support filtering by tags, topics, and metadata. (repo: `knowledge-service`) (depends on task-data-implement-document-ingestion, task-infra-provision-search-index) [traces: IF-SVC-KNOWLEDGE-0006]
- task-api-implement-impact-analysis — Implement: Implement impact analysis logic: given a proposed enhancement, query the knowledge graph to identify related documents, extract relationships and dependencies, rank by relevance, and generate explanations for why each document may be affected (e.g., 'mentions the affected API', 'documents the changed permission model'). (repo: `knowledge-service`) (depends on task-data-implement-document-ingestion) (waits on other repos: task-api-design-impact-analysis-contract) [traces: IF-SVC-KNOWLEDGE-0002]
- task-api-implement-coherence-validation — Implement: Implement coherence validation: compare proposed document changes against related existing sections in the knowledge graph, identify direct contradictions (opposing claims about the same fact/process/requirement), flag each contradiction with source document and conflicting statements, and allow user to acknowledge, resolve, or override with justification. (repo: `knowledge-service`) (depends on task-api-design-coherence-validation-contract, task-data-implement-document-ingestion) [traces: BR-FUNC-coherence-validation-on-enhancement#1, BR-FUNC-coherence-validation-on-enhancement#2, BR-FUNC-coherence-validation-on-enhancement#3]
- task-api-implement-graph-coherence-analysis — Implement: Implement knowledge graph coherence analysis: traverse the entire graph to identify inconsistencies (contradictory relationships), gaps (missing expected relationships), orphaned documents (no relationships), and generate recommendations for improving coherence. Return a structured report. (repo: `knowledge-service`) (depends on task-data-implement-document-ingestion) (waits on other repos: task-api-design-graph-coherence-report-contract) [traces: IF-SVC-KNOWLEDGE-0008]

## Phase 5 — API, BE

- task-api-implement-document-update — Implement: Implement the document update operation: accept a document update, validate coherence against the knowledge graph, persist the change to MongoDB with audit trail entry, update graph relationships, re-index in search infrastructure, and trigger notifications to dependent documents/stakeholders. (repo: `knowledge-service`) (depends on task-api-implement-coherence-validation, task-data-implement-audit-trail) [traces: IF-SVC-KNOWLEDGE-0007]
- task-api-test-coherence-validation — Test/Verify: Verify coherence validation accuracy: test against a set of 50 document pairs with known contradictions and non-contradictions, confirm the system correctly identifies at least 85% of actual contradictions, and does not flag more than 10% false positives. (repo: `knowledge-service`) (depends on task-api-implement-coherence-validation) [traces: BR-FUNC-coherence-validation-on-enhancement#4]
- task-be-implement-document-review-determination — Implement: Implement the document review determination logic: given an enhancement type and scope, analyze the knowledge graph and document relationships to determine which existing documents should be reviewed or updated. Return a ranked list with explanations for each document. (repo: `knowledge-service`) (depends on task-api-implement-impact-analysis) (waits on other repos: task-be-design-document-review-determination-contract) [traces: IF-SVC-KNOWLEDGE-0004]

## api-gateway

# Tasks

Ordered, traceable task breakdown for implementation.

Derived from the approved execution PLAN. Phases are computed from the declared `depends_on` edges: tasks in the same phase have no dependency between them and may be worked in parallel; a later phase waits on the phases before it.

This file lists **only this repo's tasks**. A dependency on work in another repo is marked _waits on other repos_ — coordinate it, don't look for it here.

## Phase 0 — BFF

- task-bff-decision-capabilities — Design/Decide: Resolve the BFF architecture decision: specify what BFF responsibilities exist (e.g., API gateway, request/response translation, authentication/authorization enforcement, rate limiting, request aggregation), identify which knowledge-service capabilities are exposed through the BFF, and define the BFF-to-knowledge-service integration contract. (repo: `api-gateway`)

## Phase 5 — BFF

- task-bff-design-api-contracts — Design/Decide: Design the BFF API contracts: specify which knowledge-service operations are exposed (search, fetch, update, impact analysis, coherence analysis), define request/response formats for external callers, and specify authentication/authorization requirements for each endpoint. (repo: `api-gateway`) (depends on task-bff-decision-capabilities) (waits on other repos: task-api-design-impact-analysis-contract, task-api-design-coherence-validation-contract, task-be-design-document-review-determination-contract)

## Phase 6 — BFF

- task-bff-implement-gateway-routing — Implement: Implement the BFF API gateway: route external requests to knowledge-service endpoints, enforce authentication/authorization, transform requests/responses as needed, handle errors gracefully, and propagate correlation ids for tracing. (repo: `api-gateway`) (depends on task-bff-design-api-contracts)

## Phase 7 — BFF

- task-bff-implement-search-endpoint — Implement: Implement the BFF search endpoint: accept search queries from external callers, route to knowledge-service search operation, transform and return results with proper error handling and latency enforcement. (repo: `api-gateway`) (depends on task-bff-implement-gateway-routing) (waits on other repos: task-data-implement-search) [traces: BR-FUNC-knowledge-discovery-across-sources#1, BR-FUNC-knowledge-discovery-across-sources#2, BR-FUNC-knowledge-discovery-across-sources#3]
- task-bff-implement-document-fetch-endpoint — Implement: Implement the BFF document fetch endpoint: accept document id requests from external callers, route to knowledge-service fetch operation, return complete document with history and relationships. (repo: `api-gateway`) (depends on task-bff-implement-gateway-routing) (waits on other repos: task-data-implement-document-fetch) [traces: BR-FUNC-change-tracking-and-audit#2]
- task-bff-implement-document-update-endpoint — Implement: Implement the BFF document update endpoint: accept document update requests from external callers, enforce authorization, route to knowledge-service update operation with coherence validation, and return results with flagged contradictions for user review. (repo: `api-gateway`) (depends on task-bff-implement-gateway-routing) (waits on other repos: task-api-implement-document-update) [traces: BR-FUNC-coherence-validation-on-enhancement#1, BR-FUNC-coherence-validation-on-enhancement#2, BR-FUNC-change-tracking-and-audit#1]
- task-bff-implement-impact-analysis-endpoint — Implement: Implement the BFF impact analysis endpoint: accept enhancement descriptions from external callers, route to knowledge-service impact analysis operation, and return ranked list of affected documents with explanations. (repo: `api-gateway`) (depends on task-bff-implement-gateway-routing) (waits on other repos: task-api-implement-impact-analysis) [traces: BR-FUNC-impact-analysis-on-enhancement-type#1, BR-FUNC-impact-analysis-on-enhancement-type#3]

## Phase 8 — BFF

- task-bff-test-gateway-contracts — Test/Verify: Verify BFF API contracts: test all exposed endpoints against their specifications, confirm proper request/response transformation, verify authentication/authorization enforcement, and validate error handling. (repo: `api-gateway`) (depends on task-bff-implement-search-endpoint, task-bff-implement-document-fetch-endpoint, task-bff-implement-document-update-endpoint, task-bff-implement-impact-analysis-endpoint)

## document-store-service

# Tasks

Ordered, traceable task breakdown for implementation.

Derived from the approved execution PLAN. Phases are computed from the declared `depends_on` edges: tasks in the same phase have no dependency between them and may be worked in parallel; a later phase waits on the phases before it.

This file lists **only this repo's tasks**. A dependency on work in another repo is marked _waits on other repos_ — coordinate it, don't look for it here.

## Phase 2 — DATA

- task-data-design-document-schema — Design/Decide: Design the MongoDB document schema for knowledge documents: define fields for content, metadata (title, author, tags, version), semantic sections, relationships, timestamps, and audit references. Ensure the schema supports efficient querying and indexing for search and impact analysis. (repo: `document-store-service`) (waits on other repos: task-infra-provision-mongodb) [traces: BR-FUNC-knowledge-discovery-across-sources#1, BR-FUNC-knowledge-discovery-across-sources#2]

## Phase 5 — DATA

- task-data-test-search-latency — Test/Verify: Verify search latency SLAs: load test with 10,000 documents and 50 concurrent users, measure p50/p95/p99 latencies, confirm all queries return within 2 seconds (p95 ≤ 3 seconds), and document performance characteristics. (repo: `document-store-service`) (waits on other repos: task-data-implement-search) [traces: BR-NONF-documentation-search-latency#1, BR-NONF-documentation-search-latency#2, BR-NONF-documentation-search-latency#3]

## knowledge-graph-service

# Tasks

Ordered, traceable task breakdown for implementation.

Derived from the approved execution PLAN. Phases are computed from the declared `depends_on` edges: tasks in the same phase have no dependency between them and may be worked in parallel; a later phase waits on the phases before it.

This file lists **only this repo's tasks**. A dependency on work in another repo is marked _waits on other repos_ — coordinate it, don't look for it here.

## Phase 2 — DATA

- task-data-design-graph-schema — Design/Decide: Design the graph database schema for the knowledge graph: define node types (Document, Section, Entity, Concept), edge types (references, contradicts, depends_on, related_to), and properties. Ensure the schema supports coherence analysis, impact analysis, and dependency tracking. (repo: `knowledge-graph-service`) (waits on other repos: task-infra-provision-graph-database) [traces: BR-FUNC-coherence-validation-on-enhancement#1, BR-FUNC-impact-analysis-on-enhancement-type#1]

## Phase 3 — API

- task-api-design-graph-coherence-report-contract — Design/Decide: Design the API contract for knowledge graph coherence analysis: specify request parameters (optional filters), response format (report with inconsistencies, gaps, orphaned documents, and recommendations), and report generation/export options. (repo: `knowledge-graph-service`) (depends on task-data-design-graph-schema)

## change-tracking-service

# Tasks

Ordered, traceable task breakdown for implementation.

Derived from the approved execution PLAN. Phases are computed from the declared `depends_on` edges: tasks in the same phase have no dependency between them and may be worked in parallel; a later phase waits on the phases before it.

This file lists **only this repo's tasks**. A dependency on work in another repo is marked _waits on other repos_ — coordinate it, don't look for it here.

## Phase 2 — DATA

- task-data-design-audit-schema — Design/Decide: Design the immutable audit trail schema: define fields for change timestamp, author, document id, change type (add/modify/delete), before/after content snapshots, change reason, and tamper-detection hash. Ensure records are append-only and tamper-detectable. (repo: `change-tracking-service`) (waits on other repos: task-infra-provision-mongodb) [traces: BR-FUNC-change-tracking-and-audit#1, BR-SECU-audit-trail-immutability#1, BR-SECU-audit-trail-immutability#3]

## Phase 4 — DATA

- task-data-test-audit-immutability — Test/Verify: Verify audit trail immutability: attempt to modify/delete audit records and confirm rejection, verify tamper-detection hashes are correct, confirm security events are logged for rejected attempts, and validate integrity verification methods. (repo: `change-tracking-service`) (waits on other repos: task-data-implement-audit-trail) [traces: BR-SECU-audit-trail-immutability#1, BR-SECU-audit-trail-immutability#2, BR-SECU-audit-trail-immutability#3, BR-SECU-audit-trail-immutability#4]

## impact-analysis-service

# Tasks

Ordered, traceable task breakdown for implementation.

Derived from the approved execution PLAN. Phases are computed from the declared `depends_on` edges: tasks in the same phase have no dependency between them and may be worked in parallel; a later phase waits on the phases before it.

This file lists **only this repo's tasks**. A dependency on work in another repo is marked _waits on other repos_ — coordinate it, don't look for it here.

## Phase 3 — API

- task-api-design-impact-analysis-contract — Design/Decide: Design the API contract for impact analysis: specify request format (proposed change/enhancement description), response format (ranked list of affected documents with explanations), error cases, and integration with the knowledge graph query interface. (repo: `impact-analysis-service`) (waits on other repos: task-data-design-graph-schema) [traces: BR-FUNC-impact-analysis-on-enhancement-type#1, BR-FUNC-impact-analysis-on-enhancement-type#3]

## Phase 5 — API

- task-api-test-impact-analysis-accuracy — Test/Verify: Verify impact analysis accuracy: test against a set of 20 representative enhancements with manual expert validation, confirm the system recommends at least 80% of documents that should be reviewed, and validate that explanations are accurate and helpful. (repo: `impact-analysis-service`) (waits on other repos: task-api-implement-impact-analysis) [traces: BR-FUNC-impact-analysis-on-enhancement-type#2]

## document-review-service

# Tasks

Ordered, traceable task breakdown for implementation.

Derived from the approved execution PLAN. Phases are computed from the declared `depends_on` edges: tasks in the same phase have no dependency between them and may be worked in parallel; a later phase waits on the phases before it.

This file lists **only this repo's tasks**. A dependency on work in another repo is marked _waits on other repos_ — coordinate it, don't look for it here.

## Phase 4 — BE

- task-be-design-document-review-determination-contract — Design/Decide: Design the API contract for determining documents for review: specify request format (enhancement type and scope), response format (ranked list of documents requiring review with explanations), and integration with impact analysis. (repo: `document-review-service`) (waits on other repos: task-api-design-impact-analysis-contract) [traces: BR-FUNC-impact-analysis-on-enhancement-type#1]
