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
