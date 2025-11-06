import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Helper function to open mobile menu if it exists
 */
export const openMobileMenuIfPresent = async (page: Page) => {
  const burger = page.getByTestId('mobile-menu-button');
  if (await burger.isVisible()) {
    await burger.click();
  }
};

/**
 * Helper function to navigate using the navigation bar (preserves state)
 */
export const navigateUsingNav = async (page: Page, pageName: string) => {
  await openMobileMenuIfPresent(page);
  await page.getByRole('button', { name: pageName }).click();
};

/**
 * Helper function to login as admin and navigate to home using navigation
 */
export const loginAsAdmin = async (page: Page) => {
  // Navigate to login page
  await page.goto('/login');

  // Click Admin button to switch to admin role
  // Note: Admin button is on the page itself, not in mobile menu
  await page.getByRole('button', { name: 'Admin' }).click();

  // Verify admin role is set
  await expect(page.getByText('Current view: admin')).toBeVisible();

  // Navigate to home using navigation (preserves state)
  await navigateUsingNav(page, 'Home');
};

/**
 * Helper function to login as community member and navigate to home using navigation
 */
export const loginAsCommunity = async (page: Page) => {
  // Navigate to login page
  await page.goto('/login');

  // Click Community Member button to switch to community role
  // Note: Community Member button is on the page itself, not in mobile menu
  await page.getByRole('button', { name: 'Community Member' }).click();

  // Verify community role is set
  await expect(page.getByText('Current view: community')).toBeVisible();

  // Navigate to home using navigation (preserves state)
  await navigateUsingNav(page, 'Home');
};

/**
 * Helper function to navigate to a URL using client-side navigation (preserves Redux state)
 * This uses window.history.pushState to avoid page reload and preserve state
 */
export const navigateTo = async (page: Page, path: string) => {
  await page.evaluate((url) => {
    // Use history API to change URL without reload
    window.history.pushState({}, '', url);
    // Dispatch popstate event to trigger React Router
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);

  // Wait for navigation to complete
  await page.waitForTimeout(200);
};
