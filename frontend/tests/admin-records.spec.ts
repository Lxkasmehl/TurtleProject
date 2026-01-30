import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsCommunity, navClick, openMobileMenu } from './fixtures';

test.describe('Admin Turtle Records (Review Queue)', () => {
  test('Admin sieht Turtle Records in der Nav', async ({ page }) => {
    await loginAsAdmin(page);
    await openMobileMenu(page);
    await expect(page.getByRole('button', { name: 'Turtle Records' })).toBeVisible();
  });

  test('Community sieht Turtle Records nicht', async ({ page }) => {
    await loginAsCommunity(page);
    await openMobileMenu(page);
    await expect(page.getByRole('button', { name: 'Turtle Records' })).not.toBeVisible();
  });

  test('Turtle Records öffnet Review Queue', async ({ page }) => {
    await loginAsAdmin(page);
    await navClick(page, 'Turtle Records');
    await expect(page).toHaveURL('/admin/turtle-records');
    await expect(page.getByRole('tab', { name: /Review Queue/ })).toBeVisible();
  });

  test('Leere Queue: "No pending reviews" oder Pending-Badge sichtbar', async ({
    page,
  }) => {
    await page.route('**/api/review-queue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, items: [] }),
      });
    });

    await loginAsAdmin(page);
    await navClick(page, 'Turtle Records');

    const emptyOrBadge = page
      .getByText('No pending reviews')
      .or(page.locator('text=/\\d+ Pending/i'));
    await expect(emptyOrBadge).toBeVisible({ timeout: 5000 });
  });

  test('Review-Button öffnet Modal wenn Einträge da', async ({ page }) => {
    await loginAsAdmin(page);
    await navClick(page, 'Turtle Records');
    await expect(page.getByRole('tab', { name: /Review Queue/ })).toBeVisible();

    const reviewBtn = page.locator('button:has-text("Review Matches")');
    const count = await reviewBtn.count();
    if (count > 0) {
      await reviewBtn.first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Review Matches' })).toBeVisible();
    } else {
      await expect(page.getByText('No pending reviews')).toBeVisible();
    }
  });
});
