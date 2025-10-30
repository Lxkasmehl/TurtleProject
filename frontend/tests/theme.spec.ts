import { test, expect } from '@playwright/test';

const openMobileMenuIfPresent = async (page: any) => {
  const burger = page.getByTestId('mobile-menu-button');
  if (await burger.isVisible()) {
    await burger.click();
  }
};

test.describe('Theme Switching Tests', () => {
  test('should switch between Community and Admin roles and verify theme changes', async ({
    page,
  }) => {
    await page.goto('/');

    // Start as Community - verify badge text and color
    const badge = page.getByTestId('role-badge');
    await expect(badge).toHaveText(/Community/);

    // Verify badge has blue color (Community theme)
    const badgeStyleCommunity = await badge.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
      };
    });
    // Mantine blue badge should have blue background
    expect(badgeStyleCommunity.backgroundColor).not.toBe('transparent');

    // Navigate to Home page to see active navigation button without reloading
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Home' }).click();
    const homeButton = page.getByRole('button', { name: 'Home' });

    // Verify the button is active (should have data-active attribute)
    await expect(homeButton).toHaveAttribute('data-active', 'true');

    // Get the background color of the active Home button (should be blue for Community)
    const homeButtonStyleCommunity = await homeButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    const blueColorCommunity = homeButtonStyleCommunity;

    // Navigate to login page via header button to preserve state
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Login' }).click();

    // Switch to Admin
    await page.getByRole('button', { name: 'Admin' }).click();
    await expect(badge).toHaveText(/Admin/);
    await expect(page.getByText('Current view: admin')).toBeVisible();

    // Verify badge color changed (should have red styling for Admin)
    const badgeStyleAdmin = await badge.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
      };
    });
    // Badge should have changed (red theme for Admin)
    expect(badgeStyleAdmin.backgroundColor).not.toBe('transparent');

    // Navigate to Home via header button to verify navigation button color changed
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Home' }).click();
    const homeButtonAdmin = page.getByRole('button', { name: 'Home' });

    // Verify the button is active
    await expect(homeButtonAdmin).toHaveAttribute('data-active', 'true');

    // Get the background color of the active Home button (should be red for Admin)
    const homeButtonStyleAdmin = await homeButtonAdmin.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Verify the color actually changed from blue to red
    expect(homeButtonStyleAdmin).not.toBe(blueColorCommunity);

    // Switch back to Community (navigate to login via header button)
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('button', { name: 'Community Member' }).click();
    await expect(badge).toHaveText(/Community/);
    await expect(page.getByText('Current view: community')).toBeVisible();

    // Verify badge color changed back to Community theme
    const badgeStyleCommunityAgain = await badge.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
      };
    });
    expect(badgeStyleCommunityAgain.backgroundColor).not.toBe('transparent');

    // Verify navigation button color changed back to blue (navigate via header button)
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Home' }).click();
    const homeButtonCommunityAgain = page.getByRole('button', { name: 'Home' });

    // Verify the button is active
    await expect(homeButtonCommunityAgain).toHaveAttribute('data-active', 'true');
  });
});
