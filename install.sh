#!/usr/bin/env bash
set -e

echo "=================================================="
echo "  Antigravity Agentic Ecosystem - Setup & Deploy  "
echo "=================================================="

GEMINI_CONFIG="$HOME/.gemini/config"
GEMINI_RULES="$GEMINI_CONFIG/rules"
GEMINI_SKILLS="$GEMINI_CONFIG/skills"

# 1. Create Target Directories
echo -e "\n[1/4] Preparing directories..."
mkdir -p "$GEMINI_RULES" "$GEMINI_SKILLS" "$HOME/.claude"

# 2. Copy Rules
echo "[2/4] Deploying 10 Master Rules..."
cp -R rules/* "$GEMINI_RULES/"

# 3. Copy Skills
echo "[3/4] Deploying 18 Autonomous Skills..."
cp -R skills/* "$GEMINI_SKILLS/"

# 4. Copy MCP Configuration
echo "[4/4] Deploying MCP Servers..."
if [ -f "mcp/mcp_config.json" ]; then
    cp -f mcp/mcp_config.json "$GEMINI_CONFIG/mcp_config.json"
fi

# Cross-platform sync
echo -e "\n[Bonus] Syncing cross-platform prompt files..."
if [ -f "cross-platform/CLAUDE.md" ]; then
    cp -f cross-platform/CLAUDE.md "$HOME/.claude/CLAUDE.md"
fi
if [ -f "cross-platform/.cursorrules" ]; then
    cp -f cross-platform/.cursorrules "$HOME/.cursorrules"
fi

echo "=================================================="
echo "  Deployment Successful! All rules & skills active. "
echo "=================================================="


