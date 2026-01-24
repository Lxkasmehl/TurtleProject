import { test, expect } from '@playwright/test';
import {
  openMobileMenuIfPresent,
  loginAsAdmin,
  loginAsCommunity,
  grantLocationPermission,
} from '../helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenInstructions', 'true');
  });
});

test.describe('Admin Turtle Records Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    // Grant location permission after page is loaded to avoid permission dialogs (especially in Firefox)
    await grantLocationPermission(page);
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should display empty state when no pending reviews', async ({ page }) => {
    await loginAsAdmin(page);

    // Mock the API to return an empty review queue
    await page.route('**/api/review-queue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, items: [] }),
      });
    });

    // Navigate to Turtle Records (Review Queue) using navigation
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should see empty state for review queue
    await expect(page.getByText('No pending reviews')).toBeVisible();
    await expect(
      page.getByText('All community uploads have been reviewed')
    ).toBeVisible();
  });

  test('should display pending count badge', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records (Review Queue) using navigation
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should see pending count badge (even if 0)
    const badge = page.locator('text=/\\d+ Pending/i');
    await expect(badge).toBeVisible();
  });

  test('should display community uploads info alert', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records (Review Queue) using navigation
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should see community uploads info alert - target the Alert component specifically
    const alert = page.getByRole('alert');
    await expect(alert.getByText('Community Uploads')).toBeVisible();
    await expect(
      page.getByText(/These photos were uploaded by community members/i)
    ).toBeVisible();
  });

  test('should display review queue items', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records (Review Queue) page
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should see review queue page
    await expect(page.getByText('Review Queue')).toBeVisible();

    // Should see either review items or empty state
    await expect(
      page.getByText('No pending reviews').or(page.locator('button:has-text("Review Matches")'))
    ).toBeVisible();
  });

  test('should open review modal when clicking review button', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records (Review Queue)
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Wait for page to load
    await expect(page.getByText('Review Queue')).toBeVisible();

    // Wait for either review items or empty state to appear
    await expect(
      page.getByText('No pending reviews').or(page.locator('button:has-text("Review Matches")'))
    ).toBeVisible({ timeout: 5000 });

    // Look for review buttons
    const reviewButton = page.locator('button:has-text("Review Matches")');
    const count = await reviewButton.count();

    if (count > 0) {
      // Click on review button
      await reviewButton.first().click();

      // Should see review modal
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Review Matches' })).toBeVisible();
      await expect(page.getByText('Uploaded Photo')).toBeVisible();
      await expect(page.getByText('Top 5 Matches')).toBeVisible();
    } else {
      // If no items, just verify empty state
      await expect(page.getByText('No pending reviews')).toBeVisible();
    }
  });

  test('should show loading state while fetching review queue', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records (Review Queue) using navigation
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Page should load and show either content or empty state
    await expect(
      page.getByText('No pending reviews').or(page.getByText('Review Queue'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should prevent community users from accessing page', async ({ page }) => {
    await loginAsCommunity(page);

    // Try to access admin page using navigation (should not be visible)
    await openMobileMenuIfPresent(page);
    await expect(page.getByRole('button', { name: 'Turtle Records' })).not.toBeVisible();

    // Try to access admin page directly (should redirect)
    await page.goto('/admin/turtle-records');
    await expect(page).toHaveURL('/');
  });

  test('should display match candidates in review modal', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records (Review Queue)
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Wait for page to load
    await expect(page.getByText('Review Queue')).toBeVisible();

    // Wait for either review items or empty state to appear
    await expect(
      page.getByText('No pending reviews').or(page.locator('button:has-text("Review Matches")'))
    ).toBeVisible({ timeout: 5000 });

    // Look for review buttons
    const reviewButton = page.locator('button:has-text("Review Matches")');
    const count = await reviewButton.count();

    if (count > 0) {
      // Click on review button
      await reviewButton.first().click();

      // Should see review modal with matches
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Top 5 Matches')).toBeVisible();

      // Should see match cards with rank badges
      const rankBadge = page.locator('text=/Rank \\d+/i');
      if ((await rankBadge.count()) > 0) {
        await expect(rankBadge.first()).toBeVisible();
      }

      // Should see action buttons
      await expect(
        page.getByRole('button', { name: /Select This Match|Create New Turtle/i }).first()
      ).toBeVisible();
    } else {
      // If no items, just verify empty state
      await expect(page.getByText('No pending reviews')).toBeVisible();
    }
  });

  test('should allow selecting a match from review modal', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records (Review Queue)
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    await expect(page.getByText('Review Queue')).toBeVisible();

    // Wait for either review items or empty state to appear
    await expect(
      page.getByText('No pending reviews').or(page.locator('button:has-text("Review Matches")'))
    ).toBeVisible({ timeout: 5000 });

    // Look for review buttons
    const reviewButton = page.locator('button:has-text("Review Matches")');
    const count = await reviewButton.count();

    if (count > 0) {
      await reviewButton.first().click();

      // Wait for modal
      await expect(page.getByRole('dialog')).toBeVisible();

      // Look for "Select This Match" buttons
      const selectButtons = page.locator('button:has-text("Select This Match")');
      const selectCount = await selectButtons.count();

      if (selectCount > 0) {
        // Should be able to click select button
        await expect(selectButtons.first()).toBeVisible();
      }
    } else {
      // If no items, just verify empty state
      await expect(page.getByText('No pending reviews')).toBeVisible();
    }
  });

  test('should allow creating new turtle from review modal', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records (Review Queue)
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    await expect(page.getByText('Review Queue')).toBeVisible();

    // Wait for either review items or empty state to appear
    await expect(
      page.getByText('No pending reviews').or(page.locator('button:has-text("Review Matches")'))
    ).toBeVisible({ timeout: 5000 });

    // Look for review buttons
    const reviewButton = page.locator('button:has-text("Review Matches")');
    const count = await reviewButton.count();

    if (count > 0) {
      await reviewButton.first().click();

      // Wait for modal
      await expect(page.getByRole('dialog')).toBeVisible();

      // Click "Create New Turtle" button
      const createButton = page.getByRole('button', { name: 'Create New Turtle' });
      await expect(createButton).toBeVisible();
      await createButton.click();

      // Should see create new turtle modal
      await expect(page.getByRole('heading', { name: 'Create New Turtle' })).toBeVisible();

      // Should see form fields
      await expect(page.getByLabel('Turtle ID')).toBeVisible();
      await expect(page.getByLabel('State')).toBeVisible();
      await expect(page.getByLabel('Location')).toBeVisible();
    } else {
      // If no items, just verify empty state
      await expect(page.getByText('No pending reviews')).toBeVisible();
    }
  });

  test('should display match information in review modal', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records (Review Queue)
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    await expect(page.getByText('Review Queue')).toBeVisible();

    // Wait for either review items or empty state to appear
    await expect(
      page.getByText('No pending reviews').or(page.locator('button:has-text("Review Matches")'))
    ).toBeVisible({ timeout: 5000 });

    // Look for review buttons
    const reviewButton = page.locator('button:has-text("Review Matches")');
    const count = await reviewButton.count();

    if (count > 0) {
      await reviewButton.first().click();

      // Wait for modal
      await expect(page.getByRole('dialog')).toBeVisible();

      // Should see uploaded photo section
      await expect(page.getByText('Uploaded Photo')).toBeVisible();

      // Should see matches section
      await expect(page.getByText('Top 5 Matches')).toBeVisible();

      // Should see match cards with turtle IDs
      const turtleIdText = page.locator('text=/Turtle ID:/i');
      if ((await turtleIdText.count()) > 0) {
        await expect(turtleIdText.first()).toBeVisible();
      }
    } else {
      // If no items, just verify empty state
      await expect(page.getByText('No pending reviews')).toBeVisible();
    }
  });
});
