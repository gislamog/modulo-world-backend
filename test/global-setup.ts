import { execSync } from 'node:child_process';

// Runs once before the e2e suite. Two jobs: refuse to run against
// anything that is not a disposable test database, and make sure that
// database has the current schema.

/**
 * The guard. A suite that truncates tables against the dev database eats
 * the seed data exactly once before you learn, so this fails loudly
 * rather than trusting the environment to be set correctly.
 */
function assertDisposableDatabase(url: string): void {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`DATABASE_URL is not a valid URL: ${url}`);
  }

  // The leading slash is part of the path, not the name.
  const database = parsed.pathname.replace(/^\//, '');

  if (!database) {
    throw new Error('DATABASE_URL names no database.');
  }

  // Naming convention, deliberately strict: the database has to say it is
  // for tests. 'modulo_world' does not match, which is the whole point.
  if (!/(^|[_-])test($|[_-])|_test$|^test/.test(database)) {
    throw new Error(
      `Refusing to run the e2e suite against database "${database}". ` +
        'The name must identify it as a test database, for example ' +
        'modulo_world_test. This guard exists because the suite resets ' +
        'the schema and would otherwise destroy development data.',
    );
  }
}

export async function setup(): Promise<void> {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. The e2e suite needs a disposable test ' +
        'database. See the testing section of the README.',
    );
  }

  assertDisposableDatabase(url);

  // Applies every migration to the empty test database. 'migrate reset'
  // rather than 'deploy' so each run starts from a known state, and
  // --force skips the interactive confirmation, which has nothing to
  // answer it in CI.
  //
  // Prisma 7 dropped --skip-generate and --skip-seed from this command.
  // Passing either fails with a usage error rather than being ignored.
  execSync('npx prisma migrate reset --force', {
    stdio: 'inherit',
    env: process.env,
  });
}
