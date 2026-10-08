# Tasks

Ordered, traceable task breakdown for implementation.

Derived from the approved execution PLAN. Phases are computed from the declared `depends_on` edges: tasks in the same phase have no dependency between them and may be worked in parallel; a later phase waits on the phases before it.

This file lists **only this repo's tasks**. A dependency on work in another repo is marked _waits on other repos_ — coordinate it, don't look for it here.

## Phase 3 — API

- task-api-design-impact-analysis-contract — Design/Decide: Design the API contract for impact analysis: specify request format (proposed change/enhancement description), response format (ranked list of affected documents with explanations), error cases, and integration with the knowledge graph query interface. (repo: `impact-analysis-service`) (waits on other repos: task-data-design-graph-schema) [traces: BR-FUNC-impact-analysis-on-enhancement-type#1, BR-FUNC-impact-analysis-on-enhancement-type#3]

## Phase 5 — API

- task-api-test-impact-analysis-accuracy — Test/Verify: Verify impact analysis accuracy: test against a set of 20 representative enhancements with manual expert validation, confirm the system recommends at least 80% of documents that should be reviewed, and validate that explanations are accurate and helpful. (repo: `impact-analysis-service`) (waits on other repos: task-api-implement-impact-analysis) [traces: BR-FUNC-impact-analysis-on-enhancement-type#2]
