# Tasks

Ordered, traceable task breakdown for implementation.

Derived from the approved execution PLAN. Phases are computed from the declared `depends_on` edges: tasks in the same phase have no dependency between them and may be worked in parallel; a later phase waits on the phases before it.

This file lists **only this repo's tasks**. A dependency on work in another repo is marked _waits on other repos_ — coordinate it, don't look for it here.

## Phase 2 — DATA

- task-data-design-graph-schema — Design/Decide: Design the graph database schema for the knowledge graph: define node types (Document, Section, Entity, Concept), edge types (references, contradicts, depends_on, related_to), and properties. Ensure the schema supports coherence analysis, impact analysis, and dependency tracking. (repo: `knowledge-graph-service`) (waits on other repos: task-infra-provision-graph-database) [traces: BR-FUNC-coherence-validation-on-enhancement#1, BR-FUNC-impact-analysis-on-enhancement-type#1]

## Phase 3 — API

- task-api-design-graph-coherence-report-contract — Design/Decide: Design the API contract for knowledge graph coherence analysis: specify request parameters (optional filters), response format (report with inconsistencies, gaps, orphaned documents, and recommendations), and report generation/export options. (repo: `knowledge-graph-service`) (depends on task-data-design-graph-schema)
