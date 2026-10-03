// Code written by Kone & Claude | The code does the following: " Diagram Studio API. Deterministic
// diagrams (er | org | gantt) are read with GET and need only 'doc:view'. AI diagrams (architecture |
// custom) are produced with POST and need 'ai:use' since they call the model. Both return titled Mermaid
// source the frontend renders with <Mermaid>. "

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { generateDiagram, DETERMINISTIC_KINDS, AI_KINDS, type DiagramKind } from '../services/diagram';

export const diagramsRouter = Router();
diagramsRouter.use(authMiddleware);

// Code written by Kone & Claude | The code does the following: " Returns a deterministic diagram (ER, org
// chart or sprint Gantt) built from live data — no AI, works even with no API key. "
diagramsRouter.get('/:kind', requirePermission('doc:view'), async (req, res) => {
  const kind = req.params.kind as DiagramKind;
  if (!DETERMINISTIC_KINDS.includes(kind)) { res.status(400).json({ error: 'Unknown deterministic diagram kind.' }); return; }
  res.json(await generateDiagram(kind, {}));
});

// Code written by Kone & Claude | The code does the following: " Generates an AI diagram (architecture or
// a free-form custom diagram from a prompt) as Mermaid source. "
diagramsRouter.post('/generate', requirePermission('ai:use'), async (req, res) => {
  const kind = String(req.body?.kind ?? 'custom') as DiagramKind;
  if (!AI_KINDS.includes(kind)) { res.status(400).json({ error: 'Unknown AI diagram kind.' }); return; }
  res.json(await generateDiagram(kind, { prompt: req.body?.prompt, userId: req.user!.sub }));
});
