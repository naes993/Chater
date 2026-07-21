#!/usr/bin/env node
/**
 * Minimal local reply bridge for ChatEBT.
 *
 * Run:  node agent-bridge.js
 * Then set a persona's agent endpoint to: http://127.0.0.1:8787/reply
 *
 * By default returns a stub reply. To use Hermes CLI (if installed):
 *   CHATER_AGENT_CMD='hermes' node agent-bridge.js
 *
 * The command receives the prompt on stdin and should print the reply on stdout.
 */
const http = require('http');
const { spawn } = require('child_process');

const PORT = Number(process.env.CHATER_BRIDGE_PORT || 8787);
const AGENT_CMD = process.env.CHATER_AGENT_CMD || '';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function buildPrompt(payload) {
  const persona = payload.persona || {};
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const lines = [
    persona.systemPrompt || ('You are ' + (persona.name || 'a chat persona') + '. Stay in character. Keep replies short.'),
    '',
    'Conversation:'
  ];
  messages.forEach(m => {
    const who = m.role === 'assistant' ? (persona.name || 'Bot') : 'User';
    lines.push(who + ': ' + (m.content || ''));
  });
  lines.push((persona.name || 'Bot') + ':');
  return lines.join('\n');
}

function runAgent(prompt) {
  return new Promise((resolve, reject) => {
    if (!AGENT_CMD) {
      resolve('Bridge online. Set CHATER_AGENT_CMD to your Hermes/OpenClaw CLI for live replies.');
      return;
    }
    const child = spawn(AGENT_CMD, {
      shell: true,
      env: process.env
    });
    let out = '';
    let err = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      const text = out.trim() || err.trim();
      if (!text) reject(new Error('Agent returned empty output (code ' + code + ')'));
      else resolve(text);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, agent: AGENT_CMD || null }));
    return;
  }
  if (req.method === 'POST' && req.url === '/reply') {
    try {
      const body = await readBody(req);
      const prompt = buildPrompt(body);
      const reply = await runAgent(prompt);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(e.message || e) }));
    }
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('ChatEBT agent bridge on http://127.0.0.1:' + PORT + '/reply');
  console.log(AGENT_CMD
    ? ('Using agent command: ' + AGENT_CMD)
    : 'Stub mode (no CHATER_AGENT_CMD). Still useful to test wiring.');
});
