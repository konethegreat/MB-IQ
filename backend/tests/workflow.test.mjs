// Code written by Kone & Claude | The code does the following: " Exercises the real login, JWT,
// role guards and delivery workflow over HTTP against an independent fictional SQLite database. "
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { startDemo } from '../../scripts/demo-runtime.mjs';

test('synthetic delivery workflow and role boundaries', { timeout: 120000 }, async t => {
  const callerDirectory = await mkdtemp(join(tmpdir(), 'mbiq-caller-fixture-'));
  const callerDatabase = join(callerDirectory, 'caller.db');
  t.after(async () => {
    assert.equal(dirname(callerDirectory), resolve(tmpdir()));
    await rm(callerDirectory, { recursive: true, force: true });
  });
  await writeFile(callerDatabase, 'Caller database must remain untouched.');
  const inherited = {
    DATABASE_URL: `file:${callerDatabase.replaceAll('\\', '/')}`, NODE_ENV: 'production',
    ALLOW_DEMO_SEED: 'false', AUTH_PROVIDER: 'sso',
    ANTHROPIC_API_KEY: 'synthetic-unusable-provider-value',
    GITHUB_MCP_URL: 'http://127.0.0.1:1/never-contact', GITHUB_MCP_TOKEN: 'synthetic-unusable-token',
  };
  const previous = Object.fromEntries(Object.keys(inherited).map(key => [key, process.env[key]]));
  let demo;
  try {
    Object.assign(process.env, inherited);
    demo = await startDemo();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
  t.after(() => demo.stop());
  console.log(demo.verification.trim());
  console.log(demo.insights.trim());

  // Code written by Kone & Claude | The code does the following: " Sends real HTTP requests and
  // asserts their status before exposing the response to a workflow assertion. "
  async function request(actor, path, method = 'GET', body, status = 200) {
    const response = await fetch(`${demo.origin}/api${path}`, {
      method, signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
    return data;
  }
  const actors = {};
  await t.test('all five roles authenticate through HTTP without leaking password hashes', async () => {
    for (const [key, email, role] of [
      ['leader', 'leader', 'FINAL_LEADER'], ['manager', 'manager-a', 'SQUAD_LEADER'],
      ['alpha', 'engineer1', 'TEAM_CAPTAIN'], ['apex', 'engineer4', 'TEAM_CAPTAIN'],
      ['engineer', 'engineer2', 'SOFTWARE_ENGINEER'], ['colleague', 'engineer3', 'SOFTWARE_ENGINEER'],
      ['apexEngineer', 'engineer5', 'SOFTWARE_ENGINEER'], ['staff', 'staff', 'GENERAL_FIRM'],
    ]) {
      actors[key] = await request(null, '/auth/login', 'POST', { email: `${email}@example.test`, password: demo.password });
      assert.equal(actors[key].user.role, role);
      assert.equal('passwordHash' in actors[key].user, false);
      const restored = await request(actors[key], '/auth/me');
      assert.equal(restored.user.id, actors[key].user.id);
    }
  });
  const { leader, manager, alpha, apex, engineer, colleague, apexEngineer, staff } = actors;
  await t.test('demo overrides inherited database, production/SSO and provider settings without seeding caller data', async () => {
    assert.equal(await readFile(callerDatabase, 'utf8'), 'Caller database must remain untouched.');
    const health = await request(null, '/health');
    assert.equal(health.authProvider, 'local');
    assert.equal(health.aiConfigured, false);
    assert.equal(health.githubMcpReady, false);
  });
  await t.test('wrong passwords, absent sessions and forged tokens are denied', async () => {
    await request(null, '/auth/login', 'POST', { email: 'manager-a@example.test', password: `${demo.password}-wrong` }, 401);
    await request(null, '/tasks', 'GET', undefined, 401);
    await request({ token: 'forged.token.signature' }, '/projects', 'GET', undefined, 401);
  });
  let project;
  await t.test('manager creates a fictional Alpha project and owns it', async () => {
    project = await request(manager, '/projects', 'POST', { name: 'Synthetic Release Board', team: 'Team Alpha', description: 'Fictional delivery rehearsal.' }, 201);
    assert.equal(project.ownerId, manager.user.id);
    assert.equal(project.team, 'Team Alpha');
  });
  await t.test('Team Lead, engineer and General Firm cannot create projects', async () => {
    for (const actor of [alpha, engineer, staff]) await request(actor, '/projects', 'POST', { name: 'Forbidden project' }, 403);
  });
  let sprint;
  await t.test('Alpha lead opens a sprint linked to the Alpha project', async () => {
    sprint = await request(alpha, '/sprints', 'POST', { name: 'Synthetic Sprint', team: 'Team Alpha', projectId: project.id }, 201);
    assert.equal(sprint.team, 'Team Alpha');
    assert.equal(sprint.projectId, project.id);
  });
  const apexProject = (await request(manager, '/projects')).find(p => p.team === 'Team Apex');
  await t.test('lead cannot create a sprint on the other team, including forged project/team pairs', async () => {
    await request(alpha, '/sprints', 'POST', { name: 'Forbidden Apex sprint', team: 'Team Apex', projectId: apexProject.id }, 403);
    await request(alpha, '/sprints', 'POST', { name: 'Disguised Apex sprint', team: 'Team Alpha', projectId: apexProject.id }, 403);
    await request(alpha, '/sprints', 'POST', { name: 'Unlinked Apex sprint', team: 'Team Apex' }, 403);
  });
  await t.test('lead without an explicit team inherits its own team; unknown projects return 400', async () => {
    const own = await request(alpha, '/sprints', 'POST', { name: 'Implicit Alpha sprint' }, 201);
    assert.equal(own.team, 'Team Alpha');
    await request(manager, '/sprints', 'POST', { name: 'Missing project', projectId: 'missing-project' }, 400);
    await request(manager, '/sprints', 'POST', { name: 'Mismatched team', team: 'Team Apex', projectId: project.id }, 400);
  });
  await t.test('engineers and General Firm cannot create sprints', async () => {
    for (const actor of [engineer, staff]) await request(actor, '/sprints', 'POST', { name: 'Forbidden sprint' }, 403);
  });
  let task;
  await t.test('lead assigns a fictional task with project and sprint to an Alpha engineer', async () => {
    task = await request(alpha, '/tasks', 'POST', { title: 'Verify fictional release checklist', projectId: project.id, sprintId: sprint.id, ownerId: engineer.user.id, acceptance: 'Only fictional examples are used.' }, 201);
    assert.equal(task.status, 'To Do');
    assert.equal(task.ownerId, engineer.user.id);
    assert.equal(task.sprintId, sprint.id);
    const listed = await request(engineer, `/tasks?sprintId=${sprint.id}`);
    assert.ok(listed.some(row => row.id === task.id));
  });
  await t.test('unknown relationships and mismatched sprint/project are rejected before writing', async () => {
    for (const fields of [{ projectId: 'missing' }, { ownerId: 'missing' }, { sprintId: 'missing' }]) {
      await request(manager, '/tasks', 'POST', { title: 'Invalid reference', ...fields }, 400);
    }
    const apexSprint = (await request(manager, '/sprints')).find(s => s.team === 'Team Apex');
    await request(manager, '/tasks', 'POST', { title: 'Mismatched sprint', projectId: project.id, sprintId: apexSprint.id }, 400);
    await request(alpha, '/tasks', 'POST', { title: 'Forbidden sprint-only task', sprintId: apexSprint.id }, 403);
  });
  await t.test('lead cannot assign tasks to another team or an unscoped General Firm owner', async () => {
    for (const fields of [{ projectId: apexProject.id }, { ownerId: apexEngineer.user.id }, { ownerId: staff.user.id }]) {
      await request(alpha, '/tasks', 'POST', { title: 'Forbidden task', ...fields }, 403);
    }
    await request(alpha, '/tasks', 'POST', { title: 'Unscoped lead task' }, 403);
    const noTeam = await request(manager, '/projects', 'POST', { name: 'Unscoped department project' }, 201);
    await request(alpha, '/tasks', 'POST', { title: 'Ambiguous project task', projectId: noTeam.id }, 403);
  });
  await t.test('an engineer moves its task through progress and review, with other fields preserved', async () => {
    const progressing = await request(engineer, `/tasks/${task.id}`, 'PATCH', { status: 'In Progress', title: 'Injected title', ownerId: colleague.user.id, priority: 'Critical' });
    assert.equal(progressing.status, 'In Progress');
    assert.equal(progressing.title, task.title);
    assert.equal(progressing.ownerId, engineer.user.id);
    assert.equal(progressing.priority, task.priority);
    const review = await request(engineer, `/tasks/${task.id}`, 'PATCH', { status: 'In Review' });
    assert.equal(review.status, 'In Review');
    const standup = await request(manager, '/insights/standup?team=Team%20Alpha');
    assert.match(standup.markdown, /Verify fictional release checklist/);
  });
  await t.test('unassigned colleagues, Apex leads and General Firm cannot move the Alpha task', async () => {
    for (const actor of [colleague, apex, staff]) await request(actor, `/tasks/${task.id}`, 'PATCH', { status: 'Done' }, 403);
    const preserved = (await request(manager, '/tasks')).find(row => row.id === task.id);
    assert.equal(preserved.status, 'In Review');
  });
  await t.test('unknown statuses cannot hide a task from every board column', async () => {
    await request(engineer, `/tasks/${task.id}`, 'PATCH', { status: 'Invisible' }, 400);
    const visible = (await request(engineer, '/tasks')).find(row => row.id === task.id);
    assert.equal(visible.status, 'In Review');
  });
  await t.test('lead cannot edit an Apex-owned task that has no project', async () => {
    const loose = await request(manager, '/tasks', 'POST', { title: 'Apex task without project', ownerId: apexEngineer.user.id }, 201);
    await request(alpha, `/tasks/${loose.id}`, 'PATCH', { status: 'Done' }, 403);
    await request(alpha, `/tasks/${loose.id}`, 'PATCH', { ownerId: engineer.user.id }, 403);
    const preserved = (await request(manager, '/tasks')).find(row => row.id === loose.id);
    assert.equal(preserved.status, 'To Do');
    assert.equal(preserved.ownerId, apexEngineer.user.id);
  });
  await t.test('lead cannot claim a department task without any team context', async () => {
    const loose = await request(manager, '/tasks', 'POST', { title: 'Unscoped department task' }, 201);
    await request(alpha, `/tasks/${loose.id}`, 'PATCH', { ownerId: engineer.user.id }, 403);
    await request(leader, `/tasks/${loose.id}`, 'PATCH', { ownerId: engineer.user.id });
  });
  await t.test('cross-team reads remain available while lead reassignment stays team-scoped', async () => {
    const other = await request(alpha, `/tasks?projectId=${apexProject.id}`);
    assert.ok(other.length > 0);
    await request(alpha, `/tasks/${task.id}`, 'PATCH', { ownerId: apexEngineer.user.id }, 403);
    const reassigned = await request(alpha, `/tasks/${task.id}`, 'PATCH', { ownerId: colleague.user.id });
    assert.equal(reassigned.ownerId, colleague.user.id);
    await request(engineer, `/tasks/${task.id}`, 'PATCH', { status: 'Done' }, 403);
  });
  await t.test('new owner finishes the task and project/sprint counts reflect the saved work', async () => {
    const done = await request(colleague, `/tasks/${task.id}`, 'PATCH', { status: 'Done' });
    assert.equal(done.status, 'Done');
    const detail = await request(manager, `/projects/${project.id}`);
    assert.equal(detail.tasks.find(row => row.id === task.id).status, 'Done');
    const counts = await request(manager, `/sprints?projectId=${project.id}`);
    assert.equal(counts.find(row => row.id === sprint.id)._count.tasks, 1);
  });
  await t.test('General Firm sees progress but no task, sprint or document payloads', async () => {
    const progress = await request(staff, `/projects/${project.id}`);
    assert.equal(progress._count.tasks, 1);
    for (const key of ['tasks', 'sprints', 'documents']) assert.equal(key in progress, false);
    for (const path of ['/tasks', '/sprints', '/documents', '/notes']) await request(staff, path, 'GET', undefined, 403);
  });
  await t.test('General Firm feedback persists in its own history and the IT inbox with no AI usage', async () => {
    const note = await request(staff, '/notes', 'POST', { subject: 'Synthetic release feedback', body: 'The fictional checklist is easy to follow.' }, 201);
    assert.equal(note.authorId, staff.user.id);
    assert.ok((await request(staff, '/notes/mine')).some(row => row.id === note.id));
    assert.ok((await request(manager, '/notes')).some(row => row.id === note.id));
    const health = await request(null, '/health');
    assert.equal(health.aiConfigured, false);
    assert.equal(health.githubMcpReady, false);
    const usage = await request(manager, '/settings/usage');
    assert.equal(usage.totalCalls, 0);
    assert.equal(usage.totalCostUsd, 0);
  });
});
