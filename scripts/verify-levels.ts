// Solves every built-in campaign level and checks it against its design:
// par must equal the true minimum, and the turn limit must leave that solution room.
// Usage: npm run verify:levels
import { LEVELS } from '../src/game/levels';
import { solveLevel } from '../src/game/solver';

let problems = 0;
console.log('level  title                         min  par  limit  solutions  openings  rain');
for (const level of LEVELS) {
  const rain = !level.disableSpawns;
  const r = solveLevel(level);
  const min = r.optimal ?? '—';
  const flags: string[] = [];
  if (r.status !== 'solved') flags.push(r.status === 'too_big' ? 'search too big' : 'UNSOLVABLE');
  else if (!rain && r.optimal !== level.parMoves) flags.push(`par should be ${r.optimal}`);
  else if (rain && r.optimal! > level.parMoves) flags.push(`par below minimum ${r.optimal}`);
  if (r.status === 'solved' && level.maxTurns < r.optimal!) flags.push('limit below minimum');
  problems += flags.length;
  console.log(
    `${String(level.id).padStart(5)}  ${level.title.padEnd(28)}  ${String(min).padStart(3)}  ${String(level.parMoves).padStart(3)}` +
    `  ${String(level.maxTurns).padStart(5)}  ${String(r.solutions).padStart(9)}  ${`${r.openingMovesThatWork}/${r.openingMoves}`.padStart(8)}  ${rain ? 'yes' : 'no'}` +
    (flags.length ? `   <- ${flags.join('; ')}` : '')
  );
}
if (problems > 0) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log('\nAll levels solvable; every rain-free par equals the true minimum.');
