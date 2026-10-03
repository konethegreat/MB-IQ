# MB IQ Production Readiness

## 1. Current state

MB IQ is currently at the v0.6 feature-complete stage. The full internal command centre experience is implemented, including:

- Five distinct role dashboards (Final Leader, Squad Leader, Team Lead, Software Engineer, General Firm).
- Projects, tasks, sprints, notes, communication, meetings, documents, reports, and innovation tracking.
- An embedded AI assistant with internal tools and a human-in-the-loop approval model.
- Structured AI output, Mermaid diagram rendering, and PDF report generation.
- A documentation engine and persistent saved artifacts.

This is a production-ready architecture with a temporary demo database and local auth model in place for the initial build.

## 2. What is missing for production deployment

The system is missing the final production integration points needed for the company rollout:

- **GitHub MCP server URL** (`GITHUB_MCP_URL`) — required to connect the backend agent to the company’s GitHub MCP provider.
- **GitHub MCP token** (`GITHUB_MCP_TOKEN`) — required to authenticate that connection and enable repo/issue/PR tools.
- **Production database** — the current demo uses SQLite. A firm database such as Postgres, MySQL, or the company’s existing user database is needed.
- **Corporate SSO / identity provider** — the current auth is a local JWT provider. The system is architected to swap in SSO without rewriting the app, but that integration still needs to happen.

## 3. What the deployment will require

### 3.1 Infrastructure and hosting

- Static hosting for the React frontend on the firm’s web server or CDN.
- A Node/Express backend service running on the internal server or a container platform.
- Secure environment variable management for secrets.
- Network access between the backend and the company database.
- Optional: internal-only access for the GitHub MCP URL and token.

### 3.2 Database and persistence

- Replace the demo SQLite datasource with the firm’s production database.
- The backend uses Prisma, so changing `backend/prisma/schema.prisma` datasource provider and `DATABASE_URL` is sufficient.
- Confirm the production database supports the schema and the firm’s security controls.
- If the company prefers a managed database, Prisma already supports Postgres, MySQL, SQL Server, and other providers.

### 3.3 Authentication and identity

- Implement the `SsoAuthProvider` behind the existing `AuthProvider` interface.
- Configure the backend to validate the firm’s SSO assertions and mint application JWTs with the same shape as the current local auth.
- Ensure role tier information and user metadata are available from the corporate identity source.
- Keep secrets out of source control: the JWT secret, SSO credentials, and any callback configuration must be managed securely.

### 3.4 GitHub MCP integration

- Obtain the company’s internal GitHub MCP server URL.
- Obtain a valid MCP token with the correct access scope.
- Add these to the backend environment.
- With the connection active, the agent can use GitHub tools in addition to the system’s internal read/write tools.
- Without these values, the app still works, but the GitHub-connected agent capabilities remain offline.

### 3.5 Security and permissions

- Deploy with RBAC enforced by the backend using `backend/src/config/rbac.ts`.
- Keep all sensitive configuration in the environment or secrets store.
- Do not commit `.env` or secret values.
- Validate that the firm’s security policy approves the Anthropic API key workflow and the internal AI endpoints.

## 4. Recommended production rollout plan

### Step 1 — Infrastructure prep

- Provision the internal server or container host.
- Confirm the hosting environment can serve the frontend and run the backend reliably.
- Ensure the server can access the company database and the GitHub MCP endpoint if required.

### Step 2 — Database migration

- Configure Prisma to point to the company database.
- Run migrations or `prisma db push` if the schema can be safely applied.
- Load seed data if needed for initial users, then switch to the firm’s real user and work data.

### Step 3 — SSO integration

- Wire the backend auth layer to the firm’s identity provider.
- Test login flows for each role type.
- Confirm token validation and RBAC enforcement on protected routes.

### Step 4 — GitHub MCP connection

- Add `GITHUB_MCP_URL` and `GITHUB_MCP_TOKEN` to the backend environment.
- Test that the agent can list GitHub tools and authenticate successfully.
- Verify that the approval workflow still prevents destructive execution without explicit sign-off.

### Step 5 — QA and internal testing

- Run end-to-end tests with actual user roles.
- Verify dashboards, notes, meetings, reports, diagrams, and AI workflows.
- Confirm that the risk radar and auto-standup insights are accurate.
- Validate that saved documents and generated PDFs render correctly.

### Step 6 — Internal launch

- Host the app on the company domain.
- Communicate to the IT division that MB IQ is available.
- Provide a quick user guide on the five-tier roles and agent safety flow.

## 5. Production readiness summary

MB IQ is ready for the final handoff phase. The codebase is complete and feature-rich, with the only remaining gaps being integration points rather than core functionality.

- The demo value is already there: dashboards, workflows, AI assistance, document persistence and reporting.
- The missing items are well-defined: GitHub MCP connectivity, production database, and corporate SSO.
- Once those are supplied, the system can be deployed internally and used by the firm.

## 6. Important note on the database

The current demo uses SQLite only for easy local setup and proof-of-concept. SQLite is not a production database for this system.

- In production, use the firm’s chosen database engine.
- The backend is already built to support that switch through Prisma.
- Moving to a production database is a configuration change, not an application rewrite.

## 7. Final recommendation

This is a deployment-ready internal product with a clear path to launch.

For the fastest transition to production, prioritise:

1. setting the production database connection,
2. enabling the company SSO provider,
3. adding the GitHub MCP server URL and token,
4. deploying the frontend and backend to the internal server.

Once those items are in place, MB IQ can move from demo to firm-wide internal use.