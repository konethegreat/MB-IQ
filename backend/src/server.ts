// Code written by Kone & Claude | The code does the following: " The API entry point: configures
// Express (CORS, JSON parsing), mounts every feature router under /api (auth, projects, sprints, tasks,
// users, documents, messages, meetings, notes, AI), exposes a health check, and starts the HTTP server
// on the configured port. "

import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { projectRouter } from './routes/project.routes';
import { sprintRouter } from './routes/sprint.routes';
import { taskRouter } from './routes/task.routes';
import { userRouter } from './routes/user.routes';
import { documentRouter } from './routes/document.routes';
import { messageRouter } from './routes/message.routes';
import { meetingRouter } from './routes/meeting.routes';
import { noteRouter } from './routes/note.routes';
import { aiRouter } from './routes/ai.routes';
import { settingsRouter } from './routes/settings.routes';
import { agentRouter } from './routes/agent.routes';
import { systemRouter } from './routes/system.routes';
import { diagramsRouter } from './routes/diagrams.routes';
import { insightsRouter } from './routes/insights.routes';
import { providerStatusDetailed } from './services/agent/registry';
import { getMode, getResolvedModel } from './services/settings.service';
import { isAiConfigured } from './config/env';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Code written by Kone & Claude | The code does the following: " Simple health/identity endpoint used
// for uptime checks and to confirm which auth provider, AI mode, and MCP providers are active. "
app.get('/api/health', async (_req, res) => {
  const mcpProviders = await providerStatusDetailed().catch(() => []);
  res.json({
    service: 'MB IQ Command Centre API',
    status: 'ok',
    authProvider: env.authProvider,
    aiConfigured: isAiConfigured(),
    activeModel: await getResolvedModel().catch(() => env.anthropicModel),
    mode: await getMode().catch(() => 'MAX'),
    mcpProviders,
    githubMcpReady: env.githubMcpUrl.trim().length > 0,
    time: new Date().toISOString(),
  });
});

// Mount feature routers.
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/sprints', sprintRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/users', userRouter);
app.use('/api/documents', documentRouter);
app.use('/api/messages', messageRouter);
app.use('/api/meetings', meetingRouter);
app.use('/api/notes', noteRouter);
app.use('/api/ai', aiRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/agent', agentRouter);
app.use('/api/system', systemRouter);
app.use('/api/diagrams', diagramsRouter);
app.use('/api/insights', insightsRouter);

// Code written by Kone & Claude | The code does the following: " Final fallback error handler so any
// unhandled route error returns clean JSON instead of an HTML stack trace. "
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(env.port, () => {
  console.log(`MB IQ API listening on http://localhost:${env.port}  (auth: ${env.authProvider})`);
});
