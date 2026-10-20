import {defineConfig, devices} from '@playwright/test';

// E2E sobre el build de producción servido con `vite preview` (modo vista previa DEMO).
export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {baseURL: 'http://localhost:3007', trace: 'retain-on-failure'},
  webServer: {command: 'npx vite preview --port 3007 --strictPort', url: 'http://localhost:3007', reuseExistingServer: true, timeout: 60_000},
  projects: [
    {name: 'desktop', use: {...devices['Desktop Chrome'], viewport: {width: 1280, height: 800}}},
    {name: 'mobile', use: {...devices['Pixel 7'], viewport: {width: 390, height: 844}}},
  ],
});
