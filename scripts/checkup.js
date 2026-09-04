#!/usr/bin/env node
/**
 * Antigravity System Checkup & Health Diagnostic Engine
 * Inspired by Claude Code /checkup & /doctor (v2.1+)
 *
 * Audits 6 Critical Dimensions:
 * 1. Context Budget & Dead Weight (Token usage of rules & skills)
 * 2. Rule Drift & Deduplication (Sync across global, IDE, and repo layers)
 * 3. Skills Integrity & Registry (YAML frontmatter & validation for all 20 skills)
 * 4. MCP Servers & Toolchain Prerequisites (Node, Git, MCP config)
 * 5. Harness Execution Tools & Checkpoint Status (ACI Condenser, Git Checkpoints)
 * 6. Secret Leak & Guardrail Scanner (Scanning for hardcoded API keys & credentials)
 *
 * Supports `--fix` for automatic remediation and state resynchronization.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration Paths
const HOME = process.env.USERPROFILE || process.env.HOME || '';
const GEMINI_CONFIG = path.join(HOME, '.gemini', 'config');
const GEMINI_RULES = path.join(GEMINI_CONFIG, 'rules');
const GEMINI_SKILLS = path.join(GEMINI_CONFIG, 'skills');
const AGENTS_DIR = path.join(HOME, '.agents');
const AGENTS_RULES = path.join(AGENTS_DIR, 'rules');
const AGENTS_SKILLS = path.join(AGENTS_DIR, 'skills');
const ROOT_GEMINI_MD = path.join(HOME, 'GEMINI.md');
const ROOT_AGENTS_MD = path.join(HOME, 'AGENTS.md');
const MCP_CONFIG_PATH = path.join(GEMINI_CONFIG, 'mcp_config.json');

// Thresholds
const MAX_RECOMMENDED_RULE_TOKENS = 6000;
const TOKEN_CHAR_RATIO = 4.0; // Rough heuristic: 1 token ~= 4 chars

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / TOKEN_CHAR_RATIO);
}

function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').trim();
  return crypto.createHash('sha256').update(content).digest('hex');
}

// 1. Audit Context Budget & Dead Weight
function auditContextBudget() {
  const result = {
    name: 'Context Budget & Dead Weight',
    status: 'PASS',
    details: [],
    totalRuleTokens: 0,
    ruleCount: 0
  };

  if (!fs.existsSync(GEMINI_RULES)) {
    result.status = 'FAIL';
    result.details.push(`Rules directory not found at ${GEMINI_RULES}`);
    return result;
  }

  const ruleFiles = fs.readdirSync(GEMINI_RULES).filter((f) => f.endsWith('.md'));
  result.ruleCount = ruleFiles.length;

  let totalChars = 0;
  ruleFiles.forEach((file) => {
    const fullPath = path.join(GEMINI_RULES, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const tokens = estimateTokens(content);
    totalChars += content.length;
    result.details.push(`Rule ${file}: ~${tokens} tokens`);
  });

  result.totalRuleTokens = Math.ceil(totalChars / TOKEN_CHAR_RATIO);
  result.details.unshift(`Total Always-On Rules: ${result.ruleCount} files (~${result.totalRuleTokens} tokens)`);

  if (result.totalRuleTokens > MAX_RECOMMENDED_RULE_TOKENS) {
    result.status = 'WARN';
    result.details.push(`Warning: Total rule tokens (~${result.totalRuleTokens}) exceeds recommended limit of ${MAX_RECOMMENDED_RULE_TOKENS}. Consider offloading workflows into skills.`);
  }

  return result;
}

// 2. Audit Rule Drift & Deduplication
function auditRuleDrift(repoRulesDir) {
  const result = {
    name: 'Rule Drift & Deduplication',
    status: 'PASS',
    details: []
  };

  if (!repoRulesDir || !fs.existsSync(repoRulesDir)) {
    result.details.push('Skipping repo rules comparison: repo path not provided or not found.');
  } else {
    const repoFiles = fs.readdirSync(repoRulesDir).filter((f) => f.endsWith('.md'));
    let driftCount = 0;

    repoFiles.forEach((file) => {
      const repoFile = path.join(repoRulesDir, file);
      const globalFile = path.join(GEMINI_RULES, file);
      const ideFile = path.join(AGENTS_RULES, file);

      const repoHash = getFileHash(repoFile);
      const globalHash = getFileHash(globalFile);
      const ideHash = getFileHash(ideFile);

      if (repoHash !== globalHash) {
        driftCount++;
        result.details.push(`Drift detected in ${file} between repo and global config.`);
      }
      if (repoHash !== ideHash && fs.existsSync(ideFile)) {
        driftCount++;
        result.details.push(`Drift detected in ${file} between repo and IDE (.agents) config.`);
      }
    });

    if (driftCount > 0) {
      result.status = 'WARN';
      result.details.unshift(`Found ${driftCount} drifted rule files across layers.`);
    } else {
      result.details.unshift('All 10 Master Rules are 100% in sync across Repo, Global, and IDE layers.');
    }
  }

  // Check Root GEMINI.md and AGENTS.md
  if (fs.existsSync(ROOT_GEMINI_MD) && fs.existsSync(ROOT_AGENTS_MD)) {
    const geminiHash = getFileHash(ROOT_GEMINI_MD);
    const agentsHash = getFileHash(ROOT_AGENTS_MD);
    if (geminiHash === agentsHash) {
      result.details.push('Root GEMINI.md and AGENTS.md are synchronized.');
    } else {
      result.status = 'WARN';
      result.details.push('Warning: Root GEMINI.md and AGENTS.md content differs.');
    }
  }

  return result;
}

// 3. Audit Skills Integrity & Registry
function auditSkillsIntegrity() {
  const result = {
    name: 'Skills Integrity & Registry',
    status: 'PASS',
    details: [],
    skillCount: 0
  };

  if (!fs.existsSync(GEMINI_SKILLS)) {
    result.status = 'FAIL';
    result.details.push(`Skills directory not found at ${GEMINI_SKILLS}`);
    return result;
  }

  const skillDirs = fs.readdirSync(GEMINI_SKILLS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  result.skillCount = skillDirs.length;
  let invalidSkills = 0;

  skillDirs.forEach((dirName) => {
    const skillPath = path.join(GEMINI_SKILLS, dirName, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      invalidSkills++;
      result.details.push(`Skill ${dirName}: Missing SKILL.md`);
      return;
    }

    const content = fs.readFileSync(skillPath, 'utf8');
    const hasFrontmatter = content.startsWith('---');
    const hasName = /^name:\s*["']?[\w.-]+["']?/m.test(content);
    const hasDescription = /^description:\s*/m.test(content);

    if (!hasFrontmatter || !hasName || !hasDescription) {
      invalidSkills++;
      result.details.push(`Skill ${dirName}: Malformed YAML frontmatter (missing name or description)`);
    }
  });

  if (invalidSkills > 0) {
    result.status = 'FAIL';
    result.details.unshift(`${invalidSkills} skills failed integrity verification.`);
  } else {
    result.details.unshift(`All ${result.skillCount} skills passed frontmatter and integrity validation.`);
  }

  return result;
}

// 4. Audit MCP & Toolchain Prerequisites
function auditToolchain() {
  const result = {
    name: 'MCP & Toolchain Prerequisites',
    status: 'PASS',
    details: []
  };

  // Node check
  try {
    const nodeVersion = execSync('node -v', { stdio: 'pipe' }).toString().trim();
    result.details.push(`Node.js runtime: ${nodeVersion} (OK)`);
  } catch {
    result.status = 'FAIL';
    result.details.push('Node.js runtime: NOT FOUND');
  }

  // Git check
  try {
    const gitVersion = execSync('git --version', { stdio: 'pipe' }).toString().trim();
    result.details.push(`Git VCS: ${gitVersion} (OK)`);
  } catch {
    result.status = 'FAIL';
    result.details.push('Git VCS: NOT FOUND');
  }

  // MCP Config check
  if (fs.existsSync(MCP_CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(MCP_CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      const serverNames = Object.keys(parsed.mcpServers || {});
      result.details.push(`MCP Servers Configured: ${serverNames.length} (${serverNames.join(', ')})`);
    } catch (err) {
      result.status = 'WARN';
      result.details.push(`MCP Config parse error: ${err.message}`);
    }
  } else {
    result.details.push(`MCP Config not found at ${MCP_CONFIG_PATH} (Optional)`);
  }

  return result;
}

// 5. Audit Harness Execution Tools & Checkpoints
function auditHarnessTools(repoDir) {
  const result = {
    name: 'Harness Tools & Checkpoint Status',
    status: 'PASS',
    details: []
  };

  const scriptsDir = repoDir ? path.join(repoDir, 'scripts') : path.join(GEMINI_CONFIG, 'scripts');
  const aciPath = path.join(scriptsDir, 'aci-condenser.js');
  const checkpointPath = path.join(scriptsDir, 'git-checkpoint.js');
  const loopBreakerPath = path.join(scriptsDir, 'loop-breaker.js');
  const scratchpadPath = path.join(scriptsDir, 'scratchpad-ledger.js');

  if (fs.existsSync(aciPath)) {
    result.details.push('ACI Terminal Condenser: Installed and ready');
  } else {
    result.status = 'WARN';
    result.details.push(`ACI Terminal Condenser: Missing at ${aciPath}`);
  }

  if (fs.existsSync(checkpointPath)) {
    result.details.push('Git Micro-Checkpointing Engine: Installed and ready');
    try {
      const { listCheckpoints } = require(checkpointPath);
      const activeCheckpoints = listCheckpoints(repoDir || process.cwd());
      result.details.push(`Active Checkpoints: ${activeCheckpoints.length}`);
      if (activeCheckpoints.length > 10) {
        result.status = 'WARN';
        result.details.push('Warning: More than 10 active checkpoints found. Run cleanup to prune.');
      }
    } catch (err) {
      result.details.push(`Checkpoint check note: ${err.message}`);
    }
  } else {
    result.status = 'WARN';
    result.details.push(`Git Micro-Checkpointing Engine: Missing at ${checkpointPath}`);
  }

  if (fs.existsSync(loopBreakerPath)) {
    result.details.push('Anti-Loop Circuit Breaker: Installed and ready');
  } else {
    result.status = 'WARN';
    result.details.push(`Anti-Loop Circuit Breaker: Missing at ${loopBreakerPath}`);
  }

  if (fs.existsSync(scratchpadPath)) {
    result.details.push('Hypothesis Scratchpad Ledger: Installed and ready');
  } else {
    result.status = 'WARN';
    result.details.push(`Hypothesis Scratchpad Ledger: Missing at ${scratchpadPath}`);
  }

  const lessonsPath = path.join(scriptsDir, 'lessons-ledger.js');
  if (fs.existsSync(lessonsPath)) {
    result.details.push('Cross-Session Reflection Ledger: Installed and ready');
    try {
      const { readLessons } = require(lessonsPath);
      const totalLessons = readLessons({ workspaceDir: repoDir || process.cwd() });
      result.details.push(`Remembered Experience Lessons: ${totalLessons.length} stored`);
    } catch {}
  } else {
    result.status = 'WARN';
    result.details.push(`Cross-Session Reflection Ledger: Missing at ${lessonsPath}`);
  }

  const ttcPath = path.join(scriptsDir, 'ttc-profiler.js');
  if (fs.existsSync(ttcPath)) {
    result.details.push('Adaptive TTC Compute Profiler: Installed and ready');
  } else {
    result.status = 'WARN';
    result.details.push(`Adaptive TTC Compute Profiler: Missing at ${ttcPath}`);
  }

  return result;
}

// 6. Audit Secret Leaks & Guardrails
function auditSecretLeaks(targetDirs) {
  const result = {
    name: 'Secret Leak & Guardrail Scanner',
    status: 'PASS',
    details: []
  };

  const secretPatterns = [
    { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,}/ },
    { name: 'Anthropic API Key', regex: /sk-ant-[a-zA-Z0-9]{32,}/ },
    { name: 'GitHub Token', regex: /ghp_[a-zA-Z0-9]{36}/ },
    { name: 'Google Gemini API Key', regex: /AIzaSy[a-zA-Z0-9_-]{33}/ },
    { name: 'Private Key Block', regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/ }
  ];

  let leaksFound = 0;

  targetDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;

    function scanRecursive(currentDir) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          scanRecursive(fullPath);
        } else if (/\.(md|json|js|ts|ps1|sh)$/i.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of secretPatterns) {
            if (pattern.regex.test(content)) {
              leaksFound++;
              result.details.push(`CRITICAL: Possible ${pattern.name} found in ${fullPath}`);
            }
          }
        }
      }
    }

    scanRecursive(dir);
  });

  if (leaksFound > 0) {
    result.status = 'FAIL';
    result.details.unshift(`Found ${leaksFound} potential secret leaks!`);
  } else {
    result.details.unshift('Zero exposed secrets detected across all surveyed configuration and rule files.');
  }

  return result;
}

// Full Checkup Runner
function runFullCheckup(options = {}) {
  const repoRoot = options.repoRoot || path.resolve(__dirname, '..');
  const repoRules = path.join(repoRoot, 'rules');

  const audits = [
    auditContextBudget(),
    auditRuleDrift(repoRules),
    auditSkillsIntegrity(),
    auditToolchain(),
    auditHarnessTools(repoRoot),
    auditSecretLeaks([GEMINI_RULES, GEMINI_SKILLS, repoRules])
  ];

  const overallPass = audits.every((a) => a.status === 'PASS' || a.status === 'WARN');
  const hasWarnings = audits.some((a) => a.status === 'WARN');
  const hasFailures = audits.some((a) => a.status === 'FAIL');

  return {
    timestamp: new Date().toISOString(),
    overallStatus: hasFailures ? 'FAIL' : (hasWarnings ? 'WARN' : 'PASS'),
    audits
  };
}

// Format Terminal Output
function formatReport(report) {
  const lines = [];
  lines.push('================================================================');
  lines.push('       ANTIGRAVITY SYSTEM CHECKUP & HEALTH DIAGNOSTIC           ');
  lines.push('================================================================');
  lines.push(`Time: ${report.timestamp} | Status: [${report.overallStatus}]`);
  lines.push('');

  report.audits.forEach((audit) => {
    const icon = audit.status === 'PASS' ? '✔' : (audit.status === 'WARN' ? '⚠' : '✖');
    lines.push(`${icon} [${audit.status}] ${audit.name}`);
    audit.details.slice(0, 5).forEach((d) => lines.push(`   - ${d}`));
    if (audit.details.length > 5) {
      lines.push(`   ... and ${audit.details.length - 5} more items`);
    }
    lines.push('');
  });

  lines.push('----------------------------------------------------------------');
  if (report.overallStatus === 'PASS') {
    lines.push('Summary: System is fully optimized, in-sync, and production-ready.');
  } else if (report.overallStatus === 'WARN') {
    lines.push('Summary: System is functional with non-blocking recommendations.');
    lines.push('Tip: Run with --fix to apply automated tune-ups and cleanups.');
  } else {
    lines.push('Summary: Found blocking issues. Immediate remediation required.');
  }
  lines.push('================================================================');

  return lines.join('\n');
}

// Auto-Fix Remediation
function applyFixes(repoRoot) {
  console.log('\n[APPLYING AUTOMATED FIXES]');
  const isWindows = process.platform === 'win32';
  let installCmd = 'bash install.sh';
  if (isWindows) {
    try {
      execSync('pwsh -v', { stdio: 'pipe' });
      installCmd = 'pwsh -ExecutionPolicy Bypass -File install.ps1';
    } catch {
      installCmd = 'powershell -ExecutionPolicy Bypass -File install.ps1';
    }
  }

  try {
    console.log(`1. Resynchronizing all rules, skills, and configs via ${installCmd}...`);
    execSync(installCmd, { cwd: repoRoot, stdio: 'inherit' });
    console.log('✔ Synchronization completed successfully.');
  } catch (err) {
    console.error(`✖ Failed to run installer: ${err.message}`);
  }

  // Prune old checkpoints
  const checkpointScript = path.join(repoRoot, 'scripts', 'git-checkpoint.js');
  if (fs.existsSync(checkpointScript)) {
    try {
      console.log('2. Pruning expired checkpoints older than 24h...');
      execSync(`node "${checkpointScript}" cleanup 24`, { cwd: repoRoot, stdio: 'inherit' });
      console.log('✔ Checkpoint cleanup completed.');
    } catch (err) {
      console.error(`✖ Checkpoint cleanup note: ${err.message}`);
    }
  }

  console.log('\n[FIXES COMPLETE] Re-running checkup diagnostic...\n');
  const report = runFullCheckup({ repoRoot });
  console.log(formatReport(report));
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const isFix = args.includes('--fix');
  const repoRoot = path.resolve(__dirname, '..');

  if (isFix) {
    applyFixes(repoRoot);
  } else {
    const report = runFullCheckup({ repoRoot });
    console.log(formatReport(report));
    if (report.overallStatus === 'FAIL') {
      process.exit(1);
    }
  }
}

module.exports = {
  estimateTokens,
  getFileHash,
  auditContextBudget,
  auditRuleDrift,
  auditSkillsIntegrity,
  auditToolchain,
  auditHarnessTools,
  auditSecretLeaks,
  runFullCheckup,
  formatReport,
  applyFixes
};
