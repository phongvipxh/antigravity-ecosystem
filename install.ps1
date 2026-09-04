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
Write-Host "[3/5] Deploying 19 Autonomous Skills..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "skills\*" $GEMINI_SKILLS

# 4. Copy Harness Engineering Scripts
Write-Host "[4/5] Deploying Harness Engineering Tools (ACI & Checkpointing)..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "scripts\*" $GEMINI_SCRIPTS

# 5. Copy MCP Configuration
Write-Host "[5/5] Deploying MCP Servers..." -ForegroundColor Yellow
if (Test-Path "mcp\mcp_config.json") {
    Copy-Item -Force "mcp\mcp_config.json" (Join-Path $GEMINI_CONFIG "mcp_config.json")
}

# Cross-platform sync
Write-Host "`n[Bonus] Syncing cross-platform prompt files..." -ForegroundColor Yellow
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


