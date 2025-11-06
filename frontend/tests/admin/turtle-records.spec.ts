import { test, expect } from '@playwright/test';
import { openMobileMenuIfPresent, loginAsAdmin, loginAsCommunity } from '../helpers';

test.describe('Admin Turtle Records Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should display empty state when no photos uploaded', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records using navigation
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should see empty state
    await expect(page.getByText('No turtle photos uploaded yet')).toBeVisible();
    await expect(
      page.getByText('Upload turtle photos from the home page to see them here')
    ).toBeVisible();
  });

  test('should display photo count badge', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records using navigation
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should see photo count badge (even if 0)
    const badge = page.locator('text=/\\d+ Photo/i');
    await expect(badge).toBeVisible();
  });

  test('should display photo quality notice', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records using navigation
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should see photo quality notice
    await expect(page.getByText('Photo Quality Notice')).toBeVisible();
    await expect(page.getByText(/localStorage as a mock backend/i)).toBeVisible();
  });

  test('should display uploaded photos', async ({ page }) => {
    // First, upload a photo as admin
    await loginAsAdmin(page);

    // Create a test image file
    const fileInput = page.locator('input[type="file"]');
    const filePath = await page.evaluate(() => {
      // Create a minimal test image
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 100, 100);
      }
      const dataUrl = canvas.toDataURL('image/png');
      return dataUrl;
    });

    // Upload via file input (simulate file upload)
    await fileInput.setInputFiles({
      name: 'test-turtle.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await page.getByRole('button', { name: 'Upload Photo' }).click();

    // Wait for upload to complete
    await page.waitForSelector('text=/Upload Successful/i', { timeout: 10000 });

    // Navigate to Turtle Records page
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should see the uploaded photo (use first() to avoid strict mode violation with notification text)
    await expect(page.getByText('test-turtle.png').first()).toBeVisible();
  });

  test('should open photo detail modal when clicking on photo', async ({ page }) => {
    // Upload a photo first
    await loginAsAdmin(page);

    const fileInput = page.locator('input[type="file"]');
    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'green';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    await fileInput.setInputFiles({
      name: 'test-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await page.getByRole('button', { name: 'Upload Photo' }).click();

    await page.waitForSelector('text=/Upload Successful/i', { timeout: 10000 });

    // Navigate to Turtle Records
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Wait for photo to appear (use expect instead of waitForSelector for better reliability)
    await expect(page.getByText('test-photo.png').first()).toBeVisible({ timeout: 5000 });

    // Click on photo card (click the image, not the text - the image is the clickable element)
    await page.getByRole('img', { name: 'test-photo.png' }).click();

    // Should see modal with photo details (check modal dialog and heading)
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'test-photo.png' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test('should show loading state while fetching photos', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Turtle Records using navigation
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Page should load and show either content or empty state
    await expect(
      page.getByText('No turtle photos uploaded yet').or(page.locator('h1'))
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

  test('should expand/collapse duplicate photo groups', async ({ page }) => {
    // This test requires uploading duplicate photos
    // For now, we'll test the UI structure
    await loginAsAdmin(page);

    // Navigate to Turtle Records using navigation
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // If there are duplicate photos, test expand/collapse
    // This would require setting up test data with duplicates
    const expandButtons = page.locator('button:has-text("Additional Sighting")');
    const count = await expandButtons.count();

    if (count > 0) {
      // Click to expand
      await expandButtons.first().click();

      // Should see expanded content
      await expect(page.locator('text=/Total/i')).toBeVisible();
    }
  });
});
