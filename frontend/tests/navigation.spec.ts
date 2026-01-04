import { test, expect } from '@playwright/test';
import { openMobileMenuIfPresent } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenInstructions', 'true');
  });
});

test.describe('Navigation Tests', () => {
  test('should navigate between all pages', async ({ page }) => {
    await page.goto('/');

    // Test Home page
    await expect(page.locator('h1')).toContainText(/^(Image|Photo) Upload$/);

    // Navigate to About
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'About' }).click();
    await expect(page).toHaveURL('/about');
    await expect(page.locator('h1')).toContainText('About Turtle Project');

    // Navigate to Contact
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Contact' }).click();
    await expect(page).toHaveURL('/contact');
    await expect(page.locator('h1')).toContainText('Contact Us');

    // Navigate to Login
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h2')).toContainText('Login');

    // Navigate back to Home
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Open mobile menu and navigate
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'About' }).click();

    await expect(page).toHaveURL('/about');
    await expect(page.locator('h1')).toContainText('About Turtle Project');
  });
});
