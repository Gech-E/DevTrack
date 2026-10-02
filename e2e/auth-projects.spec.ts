import { expect, test } from '@playwright/test';

test('user can sign in and open projects', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('demo@devtrack.local');
  await page.locator('#login-password').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/projects/);
  await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
});
