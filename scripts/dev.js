const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

function loadEnvFile(envFilePath) {
  const content = fs.readFileSync(envFilePath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

function waitForHttpHealth({ port, timeoutMs = 60000, intervalMs = 1000 }) {
  const startedAt = Date.now();

  function attempt() {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/health`, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(body || '{}');
            resolve({
              ok: res.statusCode === 200 && json?.status === 'OK',
              statusCode: res.statusCode,
            });
          } catch {
            resolve({ ok: res.statusCode === 200, statusCode: res.statusCode });
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy(new Error('health timeout'));
      });
    });
  }

  return new Promise(async (resolve, reject) => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const r = await attempt();
        if (r.ok) return resolve(true);
      } catch {
        // ignore and retry
      }
      if (Date.now() - startedAt > timeoutMs) {
        return reject(new Error(`Backend health not reachable on port ${port} within ${timeoutMs}ms`));
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  });
}

async function waitForPostgres(dbUrl, timeoutMs = 60000) {
  const { Pool } = require('../server/node_modules/pg');
  const pool = new Pool({ connectionString: dbUrl, ssl: false });
  const startedAt = Date.now();

  while (true) {
    try {
      const r = await pool.query('SELECT 1 as ok');
      if (r.rows?.[0]?.ok === 1) return;
    } catch {
      // ignore and retry
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Postgres not ready within ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function waitForRedis(redisUrl, timeoutMs = 60000) {
  const redis = require('../server/node_modules/redis');
  const startedAt = Date.now();
  const client = redis.createClient({ url: redisUrl });
  let lastErr = null;

  while (true) {
    try {
      await client.connect();
      const r = await client.ping();
      if (String(r).toUpperCase() === 'PONG') {
        await client.quit();
        return;
      }
    } catch (e) {
      lastErr = e;
    }
    if (Date.now() - startedAt > timeoutMs) {
      try {
        await client.quit();
      } catch {}
      throw new Error(`Redis not ready within ${timeoutMs}ms: ${lastErr?.message || lastErr}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

function spawnNpm(commandArgs) {
  return spawn('npm', commandArgs, {
    stdio: 'inherit',
    shell: true,
  });
}

function findDockerCommand() {
  const candidates = ['docker', 'docker.exe'];
  for (const command of candidates) {
    const result = spawnSync(command, ['--version'], { shell: true, stdio: 'pipe' });
    if (result.status === 0) return command;
  }
  return null;
}

function getRunningComposeServices(dockerCommand) {
  const result = spawnSync(dockerCommand, ['compose', 'ps', '--services', '--filter', 'status=running'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    encoding: 'utf8',
  });

  if (result.status !== 0) return [];

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function ensureBackingServices() {
  const dockerCommand = findDockerCommand();
  if (!dockerCommand) {
    throw new Error('Docker is not available. Start Postgres and Redis manually, then run npm run dev again.');
  }

  const runningServices = getRunningComposeServices(dockerCommand);

  if (!runningServices.includes('postgres') || !runningServices.includes('redis')) {
    console.log('Starting PostgreSQL and Redis with Docker Compose...');
    const result = spawnSync(dockerCommand, ['compose', 'up', '-d', 'postgres', 'redis'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      throw new Error('Failed to start PostgreSQL and Redis with Docker Compose.');
    }
  }
}

async function main() {
  const env = loadEnvFile(path.join(__dirname, '..', 'server', '.env'));
  const PORT = Number(env.PORT || 3001);
  const DATABASE_URL = env.DATABASE_URL;
  const REDIS_URL = env.REDIS_URL || 'redis://localhost:6379';

  if (!DATABASE_URL) {
    throw new Error('Missing DATABASE_URL in server/.env');
  }

  // Ensure backing services are up before the app starts.
  ensureBackingServices();

  // Wait for backing services to be ready (prevents “DB busy / not ready” startup errors).
  console.log('Waiting for Postgres...');
  await waitForPostgres(DATABASE_URL, 60000);
  console.log('Postgres ready.');

  console.log('Waiting for Redis...');
  await waitForRedis(REDIS_URL, 60000);
  console.log('Redis ready.');

  let backendStarted = false;
  let backendProc = null;
  let frontendProc = null;

  // If backend is already running, don't start another instance.
  try {
    await waitForHttpHealth({ port: PORT, timeoutMs: 2000, intervalMs: 500 });
    console.log(`Backend already running on port ${PORT}, skipping backend start.`);
  } catch {
    console.log(`Starting backend (port ${PORT})...`);
    backendProc = spawnNpm(['run', 'server']);
    backendStarted = true;
    try {
      await waitForHttpHealth({ port: PORT, timeoutMs: 60000, intervalMs: 1000 });
    } catch (e) {
      if (backendProc) backendProc.kill('SIGINT');
      throw e;
    }
  }

  console.log('Starting frontend...');
  frontendProc = spawnNpm(['run', 'client']);

  const cleanup = () => {
    try {
      if (frontendProc) frontendProc.kill('SIGINT');
    } catch {}
    try {
      if (backendProc && backendStarted) backendProc.kill('SIGINT');
    } catch {}
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((e) => {
  console.error('dev-safe failed:', e?.message || e);
  process.exit(1);
});

