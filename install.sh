#!/usr/bin/env bash
set -e

echo "=================================================="
echo "  Antigravity Agentic Ecosystem - Setup & Deploy  "
echo "=================================================="

GEMINI_CONFIG="$HOME/.gemini/config"
GEMINI_RULES="$GEMINI_CONFIG/rules"
GEMINI_SKILLS="$GEMINI_CONFIG/skills"
GEMINI_SCRIPTS="$GEMINI_CONFIG/scripts"

# 1. Create Target Directories
echo -e "\n[1/5] Preparing directories..."
mkdir -p "$GEMINI_RULES" "$GEMINI_SKILLS" "$GEMINI_SCRIPTS" "$HOME/.claude"

# 2. Copy Rules
echo "[2/5] Deploying 10 Master Rules..."
cp -R rules/* "$GEMINI_RULES/"

# 3. Copy Skills
echo "[3/5] Deploying 20 Autonomous Skills..."
cp -R skills/* "$GEMINI_SKILLS/"

# 4. Copy Harness Engineering Scripts
echo "[4/5] Deploying Harness Tools (ACI, Checkpoint & System Checkup)..."
cp -R scripts/* "$GEMINI_SCRIPTS/"

# 5. Copy MCP Configuration
echo "[5/5] Deploying MCP Servers..."
if [ -f "mcp/mcp_config.json" ]; then
    cp -f mcp/mcp_config.json "$GEMINI_CONFIG/mcp_config.json"
fi

# 6. Synchronize to .agents Workspace Layer (Antigravity IDE & CLI Priority)
echo -e "\n[IDE Layer] Syncing to .agents for Antigravity IDE..."
mkdir -p "$HOME/.agents/rules" "$HOME/.agents/skills"
cp -R rules/* "$HOME/.agents/rules/"
cp -R skills/* "$HOME/.agents/skills/"

# 7. Cross-platform sync
echo -e "[Cross-Platform] Syncing root GEMINI.md, AGENTS.md, CLAUDE.md, .cursorrules..."
if [ -f "cross-platform/GEMINI.md" ]; then
    cp -f cross-platform/GEMINI.md "$HOME/GEMINI.md"
fi
if [ -f "cross-platform/AGENTS.md" ]; then
    cp -f cross-platform/AGENTS.md "$HOME/AGENTS.md"
fi
if [ -f "cross-platform/CLAUDE.md" ]; then
    cp -f cross-platform/CLAUDE.md "$HOME/.claude/CLAUDE.md"
fi
if [ -f "cross-platform/.cursorrules" ]; then
    cp -f cross-platform/.cursorrules "$HOME/.cursorrules"
fi

echo "=================================================="
echo "  Deployment Successful! All rules & skills active. "
echo "=================================================="


