const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

console.log('====================================================');
console.log(' 🚀 SAHAAYAK UNIFIED FULL-STACK DEVELOPMENT RUNNER');
console.log('====================================================');
console.log(' Starting Backend Server (Port 5000)...');
console.log(' Starting Frontend Client (Port 5173)...');
console.log('----------------------------------------------------');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const nodeCmd = process.execPath;

// Start Server
const serverProcess = spawn(nodeCmd, ['server.js'], {
  cwd: serverDir,
  stdio: 'pipe',
  env: { ...process.env, PORT: '5000' }
});

serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) console.log(`\x1b[36m[SERVER]\x1b[0m ${line.trim()}`);
  });
});

serverProcess.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) console.error(`\x1b[31m[SERVER ERR]\x1b[0m ${line.trim()}`);
  });
});

// Start Client
const clientProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: clientDir,
  stdio: 'pipe',
  env: process.env
});

clientProcess.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) console.log(`\x1b[32m[CLIENT]\x1b[0m ${line.trim()}`);
  });
});

clientProcess.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) console.error(`\x1b[33m[CLIENT WARN]\x1b[0m ${line.trim()}`);
  });
});

function cleanup() {
  console.log('\nStopping Sahaayak services...');
  try { serverProcess.kill(); } catch (e) {}
  try { clientProcess.kill(); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
