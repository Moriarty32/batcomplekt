const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', headless: true },
  webServer: { command: 'node server.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
  reporter: 'list',
});
