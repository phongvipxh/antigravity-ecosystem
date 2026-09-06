# Antigravity Ecosystem - Windows PowerShell 1-Click Installer
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Antigravity Agentic Ecosystem - Setup & Deploy  " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$HOME_DIR = $env:USERPROFILE
$GEMINI_CONFIG = Join-Path $HOME_DIR ".gemini\config"
$GEMINI_RULES = Join-Path $GEMINI_CONFIG "rules"
$GEMINI_SKILLS = Join-Path $GEMINI_CONFIG "skills"
$GEMINI_SCRIPTS = Join-Path $GEMINI_CONFIG "scripts"

# 1. Create Target Directories
Write-Host "`n[1/5] Preparing directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $GEMINI_RULES | Out-Null
New-Item -ItemType Directory -Force -Path $GEMINI_SKILLS | Out-Null
New-Item -ItemType Directory -Force -Path $GEMINI_SCRIPTS | Out-Null

# 2. Copy Rules
Write-Host "[2/5] Deploying 10 Master Rules..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "rules\*" $GEMINI_RULES

# 3. Copy Skills
Write-Host "[3/5] Deploying 22 Autonomous Skills..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "skills\*" $GEMINI_SKILLS

# 4. Copy Harness Engineering Scripts
Write-Host "[4/5] Deploying Harness Tools (ACI, Checkpoint & System Checkup)..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "scripts\*" $GEMINI_SCRIPTS

# 5. Copy MCP Configuration
Write-Host "[5/5] Deploying MCP Servers..." -ForegroundColor Yellow
if (Test-Path "mcp\mcp_config.json") {
    Copy-Item -Force "mcp\mcp_config.json" (Join-Path $GEMINI_CONFIG "mcp_config.json")
    $CURSOR_DIR = Join-Path $HOME_DIR ".cursor"
    if (Test-Path $CURSOR_DIR) {
        Copy-Item -Force "mcp\mcp_config.json" (Join-Path $CURSOR_DIR "mcp.json")
    }
    # Direct sync to Antigravity 2.0 and Antigravity IDE surfaces
    $AGY_APP_DIR = Join-Path $HOME_DIR ".gemini\antigravity"
    if (Test-Path $AGY_APP_DIR) {
        Copy-Item -Force "mcp\mcp_config.json" (Join-Path $AGY_APP_DIR "mcp_config.json")
    }
    $AGY_IDE_DIR = Join-Path $HOME_DIR ".gemini\antigravity-ide"
    if (Test-Path $AGY_IDE_DIR) {
        Copy-Item -Force "mcp\mcp_config.json" (Join-Path $AGY_IDE_DIR "mcp_config.json")
    }
}

# 6. Synchronize to .agents Workspace Layer (Antigravity IDE & CLI Priority)
Write-Host "`n[IDE Layer] Syncing to .agents for Antigravity IDE..." -ForegroundColor Yellow
$AGENTS_DIR = Join-Path $HOME_DIR ".agents"
$AGENTS_RULES = Join-Path $AGENTS_DIR "rules"
$AGENTS_SKILLS = Join-Path $AGENTS_DIR "skills"
$AGENTS_SCRIPTS = Join-Path $AGENTS_DIR "scripts"
New-Item -ItemType Directory -Force -Path $AGENTS_RULES | Out-Null
New-Item -ItemType Directory -Force -Path $AGENTS_SKILLS | Out-Null
New-Item -ItemType Directory -Force -Path $AGENTS_SCRIPTS | Out-Null
Copy-Item -Recurse -Force "rules\*" $AGENTS_RULES
Copy-Item -Recurse -Force "skills\*" $AGENTS_SKILLS
Copy-Item -Recurse -Force "scripts\*" $AGENTS_SCRIPTS
if (Test-Path "mcp\mcp_config.json") {
    Copy-Item -Force "mcp\mcp_config.json" (Join-Path $AGENTS_DIR "mcp_config.json")
}

# 7. Cross-platform sync
Write-Host "[Cross-Platform] Syncing root GEMINI.md, AGENTS.md, CLAUDE.md, .cursorrules..." -ForegroundColor Yellow
if (Test-Path "cross-platform\GEMINI.md") {
    Copy-Item -Force "cross-platform\GEMINI.md" (Join-Path $HOME_DIR "GEMINI.md")
    Copy-Item -Force "cross-platform\GEMINI.md" (Join-Path $HOME_DIR ".gemini\GEMINI.md")
}
if (Test-Path "cross-platform\AGENTS.md") {
    Copy-Item -Force "cross-platform\AGENTS.md" (Join-Path $HOME_DIR "AGENTS.md")
}
$CLAUDE_DIR = Join-Path $HOME_DIR ".claude"
if (Test-Path "cross-platform\CLAUDE.md") {
    New-Item -ItemType Directory -Force -Path $CLAUDE_DIR | Out-Null
    Copy-Item -Force "cross-platform\CLAUDE.md" (Join-Path $CLAUDE_DIR "CLAUDE.md")
}
if (Test-Path "cross-platform\.cursorrules") {
    Copy-Item -Force "cross-platform\.cursorrules" (Join-Path $HOME_DIR ".cursorrules")
}

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "  Deployment Successful! All rules & skills active. " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green


