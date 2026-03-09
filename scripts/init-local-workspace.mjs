import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const usage = `
Usage:
  npm run workspace:init
  npm run workspace:init -- --root "D:\\TeacherTwin-Workspace"

What it does:
  - creates a clean ignored local workspace for teacher data and generated outputs
  - creates incoming, profiles, exports, reference, and scratch folders
  - respects TEACHERTWIN_LOCAL_ROOT, TEACHERTWIN_PROFILE_DIR, and TEACHERTWIN_EXPORT_DIR from .env.local
`;

const parseArgs = (argv) => {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).trim();
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }
  return options;
};

const loadEnvFile = async () => {
  const envPath = path.resolve('.env.local');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    const env = {};
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[key] = value;
    });
    return env;
  } catch {
    return {};
  }
};

const resolveRoot = (options, env) => path.resolve(options.root || env.TEACHERTWIN_LOCAL_ROOT || 'workspace');

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const envFile = await loadEnvFile();
  const env = { ...envFile, ...process.env };
  const rootDir = resolveRoot(options, env);
  const profileDir = path.resolve(env.TEACHERTWIN_PROFILE_DIR || path.join(rootDir, 'profiles'));
  const exportDir = path.resolve(env.TEACHERTWIN_EXPORT_DIR || path.join(rootDir, 'exports'));
  const managedDirs = [
    path.join(rootDir, 'incoming'),
    path.join(rootDir, 'reference'),
    path.join(rootDir, 'scratch'),
    profileDir,
    exportDir,
  ];

  await Promise.all(managedDirs.map((dir) => fs.mkdir(dir, { recursive: true })));

  console.log('Initialized local workspace directories:');
  managedDirs.forEach((dir) => console.log(`- ${dir}`));

  if (!env.TEACHERTWIN_LOCAL_ROOT && !env.TEACHERTWIN_PROFILE_DIR && !env.TEACHERTWIN_EXPORT_DIR) {
    console.log('');
    console.log('Recommended .env.local additions:');
    console.log(`TEACHERTWIN_LOCAL_ROOT=${rootDir}`);
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message}`);
  process.exit(1);
});
