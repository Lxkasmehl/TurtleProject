import { test, expect } from '@playwright/test';
import { openMobileMenuIfPresent, loginAsAdmin, loginAsCommunity } from '../helpers';

test.describe('Admin Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 720 });
  });

  test('should show Turtle Records link only for admin users', async ({ page }) => {
    // Start logged out - default role is community, should not see Turtle Records link
    await page.goto('/');
    await openMobileMenuIfPresent(page);
    await expect(page.getByRole('button', { name: 'Turtle Records' })).not.toBeVisible();

    // Log in as admin
    await loginAsAdmin(page);

    // Should now see Turtle Records link
    await openMobileMenuIfPresent(page);
    await expect(page.getByRole('button', { name: 'Turtle Records' })).toBeVisible();
  });

  test('should navigate to Turtle Records page as admin', async ({ page }) => {
    await loginAsAdmin(page);

    // Click Turtle Records link using navigation
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should be on Turtle Records page
    await expect(page).toHaveURL('/admin/turtle-records');
    await expect(page.locator('h1')).toContainText('Turtle Records');
  });

  test('should redirect community users away from admin pages', async ({ page }) => {
    await loginAsCommunity(page);

    // Try to access admin page directly
    await page.goto('/admin/turtle-records');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should show Turtle Records link in desktop navigation for admin', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Should see Turtle Records in desktop navigation
    await expect(page.getByRole('button', { name: 'Turtle Records' })).toBeVisible();
  });

  test('should show Turtle Records link in mobile navigation for admin', async ({
    page,
  }) => {
    // Set mobile viewport first
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsAdmin(page);

    // Open mobile menu
    await page.getByTestId('mobile-menu-button').click();

    // Should see Turtle Records in mobile navigation
    await expect(page.getByRole('button', { name: 'Turtle Records' })).toBeVisible();
  });
});
