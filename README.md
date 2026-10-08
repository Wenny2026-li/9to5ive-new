# 9To5ive New — Knowledge Base Management & Documentation Coherence Platform

## What This App Does

9To5ive New is a centralized knowledge management platform that solves the problem of distributed, inconsistent documentation across software projects. When a team member adds a new feature or process, they need to update multiple documents — playbooks, runbooks, BRDs, SOPs — and ensure all updates are coherent. This platform automates that complexity.

### Core Capabilities

1. **Centralized Knowledge Base** — All project documentation (playbooks, runbooks, BRDs, SOPs, architecture docs, API docs) in one searchable place
2. **Change Request Workflow** — Submit → Review → Approve/Reject → Merge, with full audit trail
3. **AI-Driven Impact Analysis** — Describe a planned enhancement; the AI identifies which documents need updating
4. **Conversational AI Assistant** — Chat with an AI that knows your knowledge base, can draft changes, and detect dependencies
5. **Immutable Audit Trail** — Every change is hash-chain-linked (SHA-256) for tamper detection, compliant with 7-year retention requirements
6. **Knowledge Graph** — Track relationships between documents (references, depends_on, contradicts, related_to)
7. **Document Versioning** — Full version history with the ability to view previous versions

### User Personas

- **Documentation Owner (Sarah Chen)** — Reviews and approves change requests, monitors the knowledge base
- **Access Control Administrator (Jennifer Park)** — Manages governance; views compliance/audit reports  
- **Business Analyst (Alex Thompson)** — Uses the AI chat to describe feature changes and identify affected documents
- **Change Requester (Marcus Rodriguez)** — Submits change requests when discovering documentation errors

## Architecture

```
CloudFront CDN
     │
     ▼
S3 (React SPA)          HTTP API Gateway
                               │
                               ▼
                       Lambda (Node 22)
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              Documents     Audit      Reviews
              (DynamoDB)  (DynamoDB)  (DynamoDB)
                    │          │
                    ▼          
              Bedrock AI
           (Claude Haiku)
```

### AWS Services Used

- **Amazon CloudFront + S3** — Static frontend hosting
- **Amazon API Gateway (HTTP)** — REST API with `$default` stage
- **AWS Lambda (nodejs22.x)** — All backend logic
- **Amazon DynamoDB** — Five tables: documents, versions, audit, review-cycles, graph
- **Amazon Bedrock** — AI features (impact analysis, coherence validation, chat)

### DynamoDB Tables

| Table | Purpose |
|---|---|
| `app-hackatho-rise94f7a1bc-documents` | Core document store |
| `app-hackatho-rise94f7a1bc-versions` | Document version history |
| `app-hackatho-rise94f7a1bc-audit` | Immutable audit trail (DeletionPolicy: Retain) |
| `app-hackatho-rise94f7a1bc-review-cycles` | Change request workflow |
| `app-hackatho-rise94f7a1bc-graph` | Knowledge graph relationships |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /documents | Create document |
| GET | /documents | List/search documents |
| GET | /documents/{id} | Get document with relationships |
| PUT | /documents/{id} | Update document |
| GET | /documents/{id}/versions | Version history |
| GET | /documents/{id}/audit | Document audit trail |
| GET | /documents/{id}/relationships | Knowledge graph edges |
| POST | /documents/{id}/relationships | Add relationship |
| POST | /documents/{id}/review-cycles | Submit change request |
| GET | /documents/{id}/review-cycles | List review cycles |
| GET | /documents/{id}/review-cycles/{rcId} | Get review cycle |
| POST | /documents/{id}/review-cycles/{rcId}/approve | Approve |
| POST | /documents/{id}/review-cycles/{rcId}/reject | Reject (requires reason) |
| POST | /documents/{id}/review-cycles/{rcId}/merge | Merge approved changes |
| POST | /impact-analysis | AI impact analysis |
| POST | /chat | AI conversational interface |
| GET | /audit | All audit records |
| GET | /search | Full-text search |
| GET | /review-cycles | All review cycles |
| GET | /graph/coherence | Knowledge graph health report |
| GET | /health | Health check |

## Deployment

### Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js 22+
- Docker (for SAM builds)

### Deploy

```bash
./deploy.sh
```

This will:
1. Create the S3 artifacts bucket if it doesn't exist
2. Install backend and frontend dependencies
3. Build the SAM application
4. Deploy the CloudFormation stack
5. Upload the React frontend to S3
6. Invalidate the CloudFront cache
7. Write `outputs.json` with the app URL

### Teardown

```bash
./destroy.sh
```

### Outputs

After successful deployment, `outputs.json` contains:
```json
{
  "app_url": "https://<cloudfront-domain>.cloudfront.net",
  "api_url": "https://<apigw-id>.execute-api.ap-southeast-1.amazonaws.com"
}
```

## Security Design

- **No authentication** — Public prototype; users identify by display name stored in `localStorage`
- **Immutable audit trail** — DynamoDB table has `DeletionPolicy: Retain`; the Lambda enforces append-only writes
- **Hash chain** — Each audit record includes SHA-256 of its content plus a pointer to the previous record's hash
- **Tamper detection** — Any modification to an audit record will be detected by hash mismatch on the `/audit/{id}/verify` endpoint
- **IAM least-privilege** — Lambda role has `PermissionsBoundary` set and only DynamoDB + Bedrock permissions

## Local Development

```bash
# Backend
cd backend
npm install
npm test

# Frontend  
cd frontend
npm install
npm test   # Vitest + Testing Library (jsdom)
VITE_API_URL=https://your-api-url npm run dev
```
