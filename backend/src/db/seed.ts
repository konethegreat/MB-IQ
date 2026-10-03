// Code written by Kone & Claude | The code does the following: " Seeds the demo database with users that
// match the org's 5-tier RBAC model (Demo Final Leader as Tier 1; Demo Manager A & Demo Manager B as joint Tier-2 admins over
// both squads; SIX Software Engineers, two of them Tier-3 Team Leads — one per squad; one General Firm
// user), then lays down a deterministic, demo-rich dataset (projects across both teams, sprints, a spread
// of tasks incl. blocked/overdue/unassigned, documents, channel messages and a sample meeting) so every
// tier's dashboard has real material to show. Users are upserted (safe to re-run); stale accounts from
// earlier seeds are pruned (unless they hold notes); the sample work data is reset each run so demos are
// always consistent. Notes left by the General Firm are preserved. "

import bcrypt from 'bcryptjs';
import { DEMO_PASSWORD } from './demo-config';
import { prisma } from './prisma';
import type { RoleKey } from '../config/rbac';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: RoleKey;
  team: string | null;
  avatar: string;
}

// The full org: 1 Final Leader, 2 Squad Leaders (joint admins, team "Management"), 6 Software Engineers
// (engineer1 & engineer4 are Tier-3 Team Leads — one per squad, 3 members per squad), 1 General Firm user.
const USERS: SeedUser[] = [
  { name: 'Demo Final Leader', email: 'leader@example.test', password: DEMO_PASSWORD, role: 'FINAL_LEADER', team: 'Management', avatar: 'MB' },
  { name: 'Demo Manager A', email: 'manager-a@example.test', password: DEMO_PASSWORD, role: 'SQUAD_LEADER', team: 'Management', avatar: 'TS' },
  { name: 'Demo Manager B', email: 'manager-b@example.test', password: DEMO_PASSWORD, role: 'SQUAD_LEADER', team: 'Management', avatar: 'NK' },
  // Squad: Team Alpha (engineer1 leads).
  { name: 'Software Engineer 1', email: 'engineer1@example.test', password: DEMO_PASSWORD, role: 'TEAM_CAPTAIN', team: 'Team Alpha', avatar: 'E1' },
  { name: 'Software Engineer 2', email: 'engineer2@example.test', password: DEMO_PASSWORD, role: 'SOFTWARE_ENGINEER', team: 'Team Alpha', avatar: 'E2' },
  { name: 'Software Engineer 3', email: 'engineer3@example.test', password: DEMO_PASSWORD, role: 'SOFTWARE_ENGINEER', team: 'Team Alpha', avatar: 'E3' },
  // Squad: Team Apex (engineer4 leads).
  { name: 'Software Engineer 4', email: 'engineer4@example.test', password: DEMO_PASSWORD, role: 'TEAM_CAPTAIN', team: 'Team Apex', avatar: 'E4' },
  { name: 'Software Engineer 5', email: 'engineer5@example.test', password: DEMO_PASSWORD, role: 'SOFTWARE_ENGINEER', team: 'Team Apex', avatar: 'E5' },
  { name: 'Software Engineer 6', email: 'engineer6@example.test', password: DEMO_PASSWORD, role: 'SOFTWARE_ENGINEER', team: 'Team Apex', avatar: 'E6' },
  { name: 'General Firm Member', email: 'staff@example.test', password: DEMO_PASSWORD, role: 'GENERAL_FIRM', team: null, avatar: 'GF' },
];

// Code written by Kone & Claude | The code does the following: " Runs the full seed: upserts every RBAC
// user with a hashed password, prunes stale accounts, resets the sample work tables, then recreates a
// consistent demo dataset. "
async function main() {
  console.log('Seeding MB IQ database...');

  const created: Record<string, string> = {}; // email -> id
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, team: u.team, avatar: u.avatar, passwordHash },
      create: { name: u.name, email: u.email, role: u.role, team: u.team, avatar: u.avatar, passwordHash },
    });
    created[u.email] = user.id;
    console.log(`  ok ${u.role.padEnd(18)} ${u.email}`);
  }

  // Reset sample work data (FK-safe order) so the demo is deterministic on every run. Notes are kept.
  await prisma.task.deleteMany();
  await prisma.document.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.message.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.project.deleteMany();

  // Prune accounts from earlier seeds that are no longer part of the org model (e.g. the old
  // captain1/captain2). Never delete a user who has left notes, so real General-Firm feedback survives.
  const keepEmails = USERS.map((u) => u.email);
  const pruned = await prisma.user.deleteMany({ where: { email: { notIn: keepEmails }, notes: { none: {} } } });
  if (pruned.count > 0) console.log(`  ok pruned ${pruned.count} stale account(s) from earlier seeds.`);

  // --- Projects: a spread of teams, statuses, priorities and health (incl. one Red, one Amber). ---
  const pCommand = await prisma.project.create({
    data: {
      name: 'MB IQ Engineering Command Centre', type: 'Internal Operations Project', status: 'Development',
      priority: 'Critical', health: 'Green',
      description: 'Central command centre for MB software engineering projects, sprints, docs, meetings and AI tracking.',
      team: 'Team Alpha', ownerId: created['manager-a@example.test'],
      startDate: new Date('2026-06-17'), dueDate: new Date('2026-07-15'),
    },
  });
  const pLegal = await prisma.project.create({
    data: {
      name: 'Community Legal Access App', type: 'Social Impact Technology Project', status: 'Idea',
      priority: 'Medium', health: 'Amber',
      description: 'A public-facing legal literacy tool explaining basic legal concepts for urban and rural communities.',
      team: 'Team Apex', ownerId: created['manager-b@example.test'],
      startDate: new Date('2026-06-20'), dueDate: new Date('2026-08-30'),
    },
  });
  const pBilling = await prisma.project.create({
    data: {
      name: 'Client Billing Portal', type: 'Client Delivery Project', status: 'Testing',
      priority: 'High', health: 'Green',
      description: 'Self-service billing and invoicing portal for the firm’s retainer clients.',
      team: 'Team Alpha', ownerId: created['engineer1@example.test'],
      startDate: new Date('2026-05-26'), dueDate: new Date('2026-07-05'),
    },
  });
  const pAnalytics = await prisma.project.create({
    data: {
      name: 'Internal Analytics Dashboard', type: 'Internal Operations Project', status: 'On Hold',
      priority: 'Low', health: 'Red',
      description: 'Firm-wide analytics view; on hold pending data-warehouse access and prioritisation.',
      team: 'Team Apex', ownerId: created['engineer4@example.test'],
      startDate: new Date('2026-06-01'), dueDate: new Date('2026-09-10'),
    },
  });

  // --- Sprints: one active sprint per team. ---
  const sAlpha = await prisma.sprint.create({
    data: {
      name: 'Sprint 1: Command Centre Core', team: 'Team Alpha', projectId: pCommand.id,
      goal: 'Ship role-based dashboards, the sprint board and the documentation module.',
      startDate: new Date('2026-06-17'), endDate: new Date('2026-06-30'),
    },
  });
  const sApex = await prisma.sprint.create({
    data: {
      name: 'Sprint 1: Apex Foundations', team: 'Team Apex', projectId: pLegal.id,
      goal: 'Establish the concept note, legal taxonomy and content service spec.',
      startDate: new Date('2026-06-17'), endDate: new Date('2026-06-30'),
    },
  });

  // --- Tasks: spread across owners, statuses, priorities and due dates (some overdue/unassigned). Each
  // task is owned by someone on the OWNING project's squad (Team Leads deliver too), or left unassigned. ---
  await prisma.task.createMany({
    data: [
      // Team Alpha - Command Centre
      { title: 'Build role-based dashboards', description: 'Distinct dashboards for all five RBAC tiers.', status: 'In Progress', priority: 'High', branch: 'feature/dashboard-ui', acceptance: 'Each tier sees a different, relevant dashboard.', projectId: pCommand.id, sprintId: sAlpha.id, ownerId: created['engineer2@example.test'], dueDate: new Date('2026-06-25') },
      { title: 'Sprint board status moves', description: 'Kanban columns and self-service status changes.', status: 'In Review', priority: 'High', branch: 'feature/sprint-board', projectId: pCommand.id, sprintId: sAlpha.id, ownerId: created['engineer3@example.test'], dueDate: new Date('2026-06-23') },
      { title: 'Wire documentation module', description: 'Documentation centre with add/list.', status: 'To Do', priority: 'Medium', branch: 'feature/docs', projectId: pCommand.id, sprintId: sAlpha.id, ownerId: created['engineer1@example.test'], dueDate: new Date('2026-06-28') },
      { title: 'Fix login alignment & fluid CSS', description: 'Re-align the login page and apply the fluid #ADD135 design system.', status: 'Blocked', priority: 'Critical', branch: 'feature/login-css', projectId: pCommand.id, sprintId: sAlpha.id, ownerId: created['engineer2@example.test'], dueDate: new Date('2026-06-18') },
      { title: 'Review acceptance criteria', description: 'Team Lead review of sprint acceptance criteria.', status: 'Done', priority: 'Medium', projectId: pCommand.id, sprintId: sAlpha.id, ownerId: created['engineer1@example.test'], dueDate: new Date('2026-06-19') },
      // Team Alpha - Billing Portal
      { title: 'Payment gateway integration', description: 'Integrate the card payment gateway (unassigned - needs an owner).', status: 'To Do', priority: 'High', projectId: pBilling.id, ownerId: null, dueDate: new Date('2026-07-01') },
      { title: 'Portal QA pass', description: 'End-to-end QA of the billing flows.', status: 'Testing', priority: 'Medium', branch: 'qa/billing', projectId: pBilling.id, ownerId: created['engineer3@example.test'], dueDate: new Date('2026-06-27') },
      // Team Apex - Legal Access
      { title: 'Concept note: urban & rural', description: 'Draft the urban and rural use-case concept note.', status: 'In Progress', priority: 'Medium', branch: 'docs/concept', projectId: pLegal.id, sprintId: sApex.id, ownerId: created['engineer5@example.test'], dueDate: new Date('2026-06-26') },
      { title: 'Legal taxonomy research', description: 'Research a plain-language legal topic taxonomy.', status: 'To Do', priority: 'Medium', projectId: pLegal.id, sprintId: sApex.id, ownerId: created['engineer6@example.test'], dueDate: new Date('2026-06-30') },
      { title: 'Content API spec', description: 'Specify the content service API.', status: 'Blocked', priority: 'High', branch: 'feature/content-api', projectId: pLegal.id, sprintId: sApex.id, ownerId: created['engineer4@example.test'], dueDate: new Date('2026-06-19') },
      { title: 'Accessibility pass', description: 'WCAG AA review of the public screens.', status: 'To Do', priority: 'High', projectId: pLegal.id, sprintId: sApex.id, ownerId: created['engineer5@example.test'], dueDate: new Date('2026-06-17') },
      { title: 'Stakeholder mapping', description: 'Map community and partner stakeholders.', status: 'Done', priority: 'Low', projectId: pLegal.id, sprintId: sApex.id, ownerId: created['engineer4@example.test'], dueDate: new Date('2026-06-16') },
      // Team Apex - Analytics (on hold)
      { title: 'Define analytics KPIs', description: 'Agree the KPI set (blocked by data-warehouse access).', status: 'To Do', priority: 'Medium', projectId: pAnalytics.id, ownerId: null, dueDate: new Date('2026-07-20') },
    ],
  });

  // --- Documentation records. ---
  await prisma.document.createMany({
    data: [
      { title: 'Project Brief', type: 'Project Brief', status: 'Active', content: 'Build the MB IQ Engineering Command Centre as the daily operating system for the MB Software Engineering Department.', projectId: pCommand.id },
      { title: 'System Architecture', type: 'Technical Documentation', status: 'Draft', content: 'React + TypeScript SPA, Node/Express REST API, Prisma ORM (SQLite for demo, Postgres-ready), JWT auth behind an AuthProvider interface for org SSO.', projectId: pCommand.id },
      { title: 'Change Log', type: 'Change Log', status: 'Active', content: 'v0.2 - restored all nine features, added five distinct tier dashboards and the fluid #ADD135 design system.', projectId: pCommand.id },
      { title: 'Community Legal Access - Concept Note', type: 'Project Brief', status: 'Draft', content: 'Problem, target users, urban relevance, rural relevance and prototype scope for the legal literacy tool.', projectId: pLegal.id },
    ],
  });

  // --- Channel messages. ---
  await prisma.message.createMany({
    data: [
      { channel: 'General Department Updates', body: 'Welcome to MB IQ Command Centre v0.2 - role-based dashboards are now live for every tier.', authorId: created['leader@example.test'] },
      { channel: 'Team Alpha', body: 'Sprint 1 demo this Friday. Please keep your task statuses up to date on the board.', authorId: created['engineer1@example.test'] },
      { channel: 'Blockers', body: 'Blocked on the login alignment task - need the new design tokens merged first.', authorId: created['engineer2@example.test'] },
      { channel: 'Deployments', body: 'Staging deploy planned for Monday once the sprint board lands.', authorId: created['manager-a@example.test'] },
    ],
  });

  // --- One sample meeting pack. ---
  await prisma.meeting.create({
    data: {
      title: 'Sprint 1 Planning', type: 'Sprint Planning',
      transcript: 'Team aligned on dashboards, sprint board and documentation. Login CSS is blocked pending design tokens. Apex to progress the concept note and content API spec.',
      summary: 'Meeting Purpose:\nSprint 1 Planning to align the teams and convert discussion into action.\n\nRecommended Action Plan:\n1. Unblock the login CSS task by merging design tokens.\n2. Progress the Apex concept note and content API spec.\n3. Assign an owner to the payment gateway integration.\n\nNext Steps:\n- Confirm owners and deadlines; share with the Management Lead.',
      createdBy: created['manager-a@example.test'],
    },
  });

  console.log('  ok sample projects, sprints, tasks, documents, messages and a meeting created.');
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
