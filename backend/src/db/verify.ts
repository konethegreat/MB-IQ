// Code written by Kone & Claude | The code does the following: " A self-contained verification test
// that proves the demo is ready for manual testing. For every one of the 10 RBAC users it (1) runs
// the REAL login path (the active AuthProvider) with the documented password, (2) asserts the
// returned role/tier/team are correct, and (3) confirms a wrong password is rejected. It also checks
// the database holds exactly the expected user set, then prints a PASS/FAIL table and exits non-zero
// on any failure so it can be wired into CI later. Run with: npm run db:verify "

import { prisma } from './prisma';
import { DEMO_PASSWORD } from './demo-config';
import { getAuthProvider } from '../auth';
import { ROLE_TIER, ROLE_LABEL, type RoleKey } from '../config/rbac';

interface ExpectedUser {
  email: string;
  password: string;
  role: RoleKey;
  team: string | null;
}

// Must mirror src/db/seed.ts exactly — the single set of credentials used for manual testing.
const EXPECTED: ExpectedUser[] = [
  { email: 'leader@example.test', password: DEMO_PASSWORD, role: 'FINAL_LEADER', team: 'Management' },
  { email: 'manager-a@example.test', password: DEMO_PASSWORD, role: 'SQUAD_LEADER', team: 'Management' },
  { email: 'manager-b@example.test', password: DEMO_PASSWORD, role: 'SQUAD_LEADER', team: 'Management' },
  // Six software engineers; two of them (engineer1 on Alpha, engineer4 on Apex) are Tier-3 Team Leads.
  { email: 'engineer1@example.test', password: DEMO_PASSWORD, role: 'TEAM_CAPTAIN', team: 'Team Alpha' },
  { email: 'engineer2@example.test', password: DEMO_PASSWORD, role: 'SOFTWARE_ENGINEER', team: 'Team Alpha' },
  { email: 'engineer3@example.test', password: DEMO_PASSWORD, role: 'SOFTWARE_ENGINEER', team: 'Team Alpha' },
  { email: 'engineer4@example.test', password: DEMO_PASSWORD, role: 'TEAM_CAPTAIN', team: 'Team Apex' },
  { email: 'engineer5@example.test', password: DEMO_PASSWORD, role: 'SOFTWARE_ENGINEER', team: 'Team Apex' },
  { email: 'engineer6@example.test', password: DEMO_PASSWORD, role: 'SOFTWARE_ENGINEER', team: 'Team Apex' },
  { email: 'staff@example.test', password: DEMO_PASSWORD, role: 'GENERAL_FIRM', team: null },
];

async function main() {
  const provider = getAuthProvider();
  const failures: string[] = [];

  console.log(`\nMB IQ — user verification (auth provider: "${provider.name}")\n`);
  console.log('  RESULT  TIER  ROLE                EMAIL                   TEAM');
  console.log('  ' + '─'.repeat(74));

  for (const exp of EXPECTED) {
    const problems: string[] = [];

    // 1) Real login with the documented password must succeed.
    const user = await provider.authenticate({ email: exp.email, password: exp.password });
    if (!user) {
      problems.push('login failed with documented password');
    } else {
      if (user.role !== exp.role) problems.push(`role ${user.role} != ${exp.role}`);
      if ((user.team ?? null) !== exp.team) problems.push(`team ${user.team ?? 'null'} != ${exp.team ?? 'null'}`);
    }

    // 2) A wrong password must be rejected (negative test).
    const bad = await provider.authenticate({ email: exp.email, password: exp.password + '_WRONG' });
    if (bad) problems.push('SECURITY: wrong password was accepted');

    const ok = problems.length === 0;
    const tier = ROLE_TIER[exp.role];
    const label = ROLE_LABEL[exp.role];
    console.log(
      `  ${ok ? ' PASS ' : ' FAIL '}   ${tier}    ${label.padEnd(18)}  ${exp.email.padEnd(22)}  ${exp.team ?? '—'}`,
    );
    if (!ok) failures.push(`${exp.email}: ${problems.join('; ')}`);
  }

  // 3) The database must contain exactly the expected users — no missing, no extras.
  const dbEmails = (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email).sort();
  const expEmails = EXPECTED.map((e) => e.email).sort();
  const missing = expEmails.filter((e) => !dbEmails.includes(e));
  const extra = dbEmails.filter((e) => !expEmails.includes(e));
  if (missing.length) failures.push(`missing users: ${missing.join(', ')}`);
  if (extra.length) failures.push(`unexpected users: ${extra.join(', ')}`);

  const projects = await prisma.project.count();
  const tasks = await prisma.task.count();

  console.log('  ' + '─'.repeat(74));
  console.log(`\n  Users: ${dbEmails.length}/${EXPECTED.length}  |  Projects: ${projects}  |  Tasks: ${tasks}`);

  if (failures.length) {
    console.log(`\n❌ VERIFICATION FAILED (${failures.length} issue(s)):`);
    failures.forEach((f) => console.log(`   - ${f}`));
    process.exitCode = 1;
  } else {
    console.log('\n✅ ALL CHECKS PASSED — every RBAC user can log in with the documented password. Ready to test.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
