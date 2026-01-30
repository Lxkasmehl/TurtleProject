import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsCommunity, navClick } from './fixtures';

test.describe('Auth', () => {
  test('Login-Seite zeigt Formular', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('Admin-Login führt zu Home mit Admin-Badge', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('role-badge')).toHaveText(/Admin/);
  });

  test('Community-Login führt zu Home mit Community-Badge', async ({ page }) => {
    await loginAsCommunity(page);
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('role-badge')).toHaveText(/Community/);
  });

  test('Logout führt zurück zur Startseite', async ({ page }) => {
    await loginAsAdmin(page);
    await navClick(page, 'Logout');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Login' }).first()).toBeVisible();
  });

  test('Community wird von Admin-Seiten auf Home umgeleitet', async ({ page }) => {
    await loginAsCommunity(page);
    await page.goto('/admin/turtle-records');
    await expect(page).toHaveURL('/');
    await page.goto('/admin/turtle-match/irgendeine-id');
    await expect(page).toHaveURL('/');
  });
});
