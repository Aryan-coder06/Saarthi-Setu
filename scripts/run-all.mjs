import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] === 'start' ? 'start' : 'dev';
const children = [
  spawn(process.execPath, [resolve(root, 'services/rule-engine/src/server.js')], { cwd: resolve(root, 'services/rule-engine'), stdio: 'inherit', env: { ...process.env, PORT: process.env.RULE_ENGINE_PORT || '3000' } }),
  spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), mode, '--hostname', '127.0.0.1', '--port', process.env.WEB_PORT || '8080'], { cwd: root, stdio: 'inherit', env: process.env }),
];
let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill(signal);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));
for (const child of children) child.on('exit', code => {
  if (!stopping) { process.exitCode = code || 1; stop(); }
});
