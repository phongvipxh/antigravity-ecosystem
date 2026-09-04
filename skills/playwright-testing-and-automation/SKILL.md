---
name: playwright-testing-and-automation
description: >-
  Comprehensive guide and runbook for Playwright browser automation, E2E UI testing,
  and dynamic web exploration. Use this skill when the user asks to test web applications,
  automate browser interactions, write end-to-end (E2E) tests, verify responsive UI layouts,
  take screenshots, or debug client-side web application behavior.
---

# Playwright Browser Automation & E2E Testing

Playwright (by Microsoft) enables fast, reliable, and headless web automation across Chromium, Firefox, and WebKit. This skill teaches the agent how to leverage Playwright both as an E2E testing framework and via Playwright MCP for live interactive browser testing.

## 1. When to Use Playwright

- **E2E & UI Verification**: Verifying that web pages, SPAs (React, Next.js, Vue, Svelte, Angular), and forms function correctly end-to-end.
- **Client-Side JS & Dynamic Content**: Accessing, rendering, and testing pages that require JavaScript execution, authentication cookies, or SPA routing (which standard HTTP fetchers like `read_url_content` cannot render).
- **Visual & Layout Inspection**: Taking full-page or element screenshots to verify responsive layouts, CSS styles, and visual regressions.
- **Console & Network Diagnostics**: Capturing browser console errors (`console.error`), uncaught JavaScript exceptions, and failed HTTP requests (4xx/5xx).

## 2. Best Practices for Writing Playwright Tests

### A. Resilient Locator Strategies (Accessibility-First)
Never use brittle CSS paths (e.g. `div > div.col-md-4 > span > input`). Use user-facing accessibility locators:

```typescript
// ✅ RECOMMENDED: Role and text locators matching user perception
await page.getByRole('button', { name: 'Đăng nhập' }).click();
await page.getByLabel('Email').fill('user@example.com');
await page.getByPlaceholder('Nhập mật khẩu').fill('secret123');
await page.getByTestId('submit-order').click();

// ❌ ANTI-PATTERN: Brittle CSS selectors
await page.locator('.btn-primary.submit-btn-2').click();
```

### B. Auto-Waiting over Hardcoded Delays
Playwright automatically waits for elements to be actionable (visible, enabled, stable). **Never use `page.waitForTimeout(5000)`**.

```typescript
// ✅ Good: Assertions with built-in auto-retry
await expect(page.getByText('Thành công')).toBeVisible({ timeout: 10000 });
await expect(page).toHaveURL(/.*dashboard/);

// ❌ Bad: Hardcoded sleeps
await page.waitForTimeout(3000);
```

### C. Testing Local Development Servers
When testing local projects (Vite, Next.js, Express):
1. Start the dev server in the background (or verify it is already running at e.g. `http://localhost:3000` or `http://localhost:5173`).
2. Run targeted test:
   ```powershell
   npx playwright test tests/e2e/login.spec.ts
   ```
3. Inspect traces or failure screenshots if an assertion fails.

## 3. Playwright MCP Server Integration

With the `@playwright/mcp` server configured in Antigravity:
- The agent can navigate directly to URLs (`browser_navigate`).
- Take element or full-page snapshots (`browser_screenshot`).
- Click, type, hover, select options, and inspect browser console logs in real time.
- Verify that frontend changes render without runtime errors.
