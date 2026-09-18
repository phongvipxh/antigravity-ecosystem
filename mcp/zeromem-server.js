#!/usr/bin/env node
/**
 * ZeroMem Model Context Protocol (MCP) Server
 * Exposes Zero-token memory recall, status, and build tools over stdio JSON-RPC.
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

const SERVER_INFO = {
  name: 'zeromem',
  version: '0.1.0'
};

const TOOLS = [
  {
    name: 'zeromem_recall',
    description: 'Retrieve evidence from past conversation transcripts using ZeroMem zero-token deterministic memory pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search term or question to recall from past sessions.'
        },
        top_k: {
          type: 'integer',
          description: 'Number of evidence blocks to retrieve (default: 5).',
          default: 5
        },
        project: {
          type: 'string',
          description: 'Optional project slug to restrict recall scope.'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'zeromem_status',
    description: 'Check ZeroMem index health, total indexed units, entities, and corpus projects.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'zeromem_build',
    description: 'Update or rebuild ZeroMem transcript index and entity graph.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

function runZeromemCmd(args) {
  return new Promise((resolve) => {
    const pythonExe = 'C:\\Users\\lucaha\\ZeroMem\\.venv\\Scripts\\python.exe';
    const proc = spawn(pythonExe, ['-m', 'zeromem.cli', ...args], {
      cwd: 'C:\\Users\\lucaha\\ZeroMem',
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString('utf-8'); });
    proc.stderr.on('data', (d) => { stderr += d.toString('utf-8'); });

    proc.on('close', (code) => {
      resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });

    proc.on('error', (err) => {
      resolve({ code: 1, stdout: '', stderr: err.message });
    });
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (msg.jsonrpc !== '2.0') return;

    // 1. Initialize
    if (msg.method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }

    // 2. Notifications (initialized)
    if (msg.method === 'notifications/initialized') {
      return; // no response needed
    }

    // 3. List Tools
    if (msg.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: msg.id,
        result: { tools: TOOLS }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }

    // 4. Call Tool
    if (msg.method === 'tools/call') {
      const toolName = msg.params?.name;
      const args = msg.params?.arguments || {};

      if (toolName === 'zeromem_recall') {
        const cmdArgs = ['recall', args.query];
        if (args.top_k) cmdArgs.push('--top-k', String(args.top_k));
        if (args.project) cmdArgs.push('--project', String(args.project));

        const res = await runZeromemCmd(cmdArgs);
        const output = res.stdout || res.stderr || 'No results returned.';
        const response = {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: output }],
            isError: res.code !== 0
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
        return;
      }

      if (toolName === 'zeromem_status') {
        const res = await runZeromemCmd(['status']);
        const response = {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: res.stdout || res.stderr }],
            isError: res.code !== 0
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
        return;
      }

      if (toolName === 'zeromem_build') {
        const res1 = await runZeromemCmd(['build']);
        const res2 = await runZeromemCmd(['graph']);
        const text = `Build Output:\n${res1.stdout}\n\nGraph Output:\n${res2.stdout}`;
        const response = {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text }],
            isError: res1.code !== 0 || res2.code !== 0
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
        return;
      }

      // Unknown tool
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: `Tool '${toolName}' not found.` }
      }) + '\n');
      return;
    }

    // Default error
    if (msg.id) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: `Method '${msg.method}' not found.` }
      }) + '\n');
    }
  } catch (err) {
    // ignore parse errors
  }
});
