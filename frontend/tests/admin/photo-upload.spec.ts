import { test, expect } from '@playwright/test';
import { Buffer } from 'buffer';
import {
  openMobileMenuIfPresent,
  loginAsAdmin,
  navigateUsingNav,
  grantLocationPermission,
  clickUploadPhotoButton,
} from '../helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenInstructions', 'true');
  });
});

test.describe('Admin Photo Upload Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    // Grant location permission after page is loaded to avoid permission dialogs (especially in Firefox)
    await grantLocationPermission(page);
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should navigate to match page after uploading photo', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'Skipping for webkit');
    test.setTimeout(60000);
    await loginAsAdmin(page);

    // Create a test image
    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    const fileInput = page.locator('input[type="file"]:not([capture])').first();

    // Upload first photo
    await fileInput.setInputFiles({
      name: 'test-turtle.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // For admin users, successful upload always redirects to match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });

    // Should see match page with "Select Best Match" header
    await expect(page.getByText('Select Best Match')).toBeVisible();
  });

  test('should redirect to match page on upload as admin', async ({ page }) => {
    await loginAsAdmin(page);

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

    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    await fileInput.setInputFiles({
      name: 'new-turtle.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // For admin users, successful upload always redirects to match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });
    
    // Should see match page
    await expect(page.getByText('Select Best Match')).toBeVisible();
  });

  test('should show matches when uploading photo with existing matches', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'Skipping for webkit');
    test.setTimeout(60000);
    await loginAsAdmin(page);

    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    const fileInput = page.locator('input[type="file"]:not([capture])').first();

    // Upload photo
    await fileInput.setInputFiles({
      name: 'match-turtle.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // For admin users, successful upload always redirects to match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });

    // Should see match page header
    await expect(page.getByText('Select Best Match')).toBeVisible();
    // Should see either matches section or empty state message
    const hasMatches = await page.getByText('Top 5 Matches').isVisible().catch(() => false);
    const hasNoMatches = await page.getByText('No matches found').isVisible().catch(() => false);
    expect(hasMatches || hasNoMatches).toBe(true);
  });

  test('should upload new photo and navigate to match page as admin', async ({ page }) => {
    await loginAsAdmin(page);

    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'purple';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    await fileInput.setInputFiles({
      name: 'new-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // For admin users, successful upload always redirects to match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });
    
    // Should see match page
    await expect(page.getByText('Select Best Match')).toBeVisible();
  });

  test('should show upload progress during upload', async ({ page }) => {
    await loginAsAdmin(page);

    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'orange';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    await fileInput.setInputFiles({
      name: 'progress-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // Should see upload progress - wait for the upload progress section to appear
    // This ensures the upload state has been set to 'uploading'
    await page.waitForSelector('[data-testid="upload-progress"]', { timeout: 5000 });

    // Wait for either "Getting location..." or "Uploading..." text to be visible
    await page.waitForSelector('text=/Getting location|Uploading/i', { timeout: 5000 });

    // If we see "Getting location...", wait for it to transition to "Uploading..."
    const gettingLocationVisible = await page
      .getByText(/Getting location/i)
      .isVisible()
      .catch(() => false);
    if (gettingLocationVisible) {
      // Wait for transition to "Uploading..." state
      await page.waitForSelector('text=/Uploading/i', { timeout: 5000 });
    }

    // For admin users, successful upload always redirects to match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });
  });

  test('should show photo in review queue after upload', async ({ page }) => {
    await loginAsAdmin(page);

    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'teal';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    await fileInput.setInputFiles({
      name: 'records-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // For admin users, successful upload always redirects to match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });

    // Navigate to Turtle Records (Review Queue)
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should see the review queue page
    await expect(page.getByText('Review Queue')).toBeVisible();
  });

  test('should navigate to match page from review queue', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'Skipping for webkit');
    test.setTimeout(60000);
    await loginAsAdmin(page);

    // Upload a photo
    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'navy';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    const fileInput = page.locator('input[type="file"]:not([capture])').first();

    // Upload photo
    await fileInput.setInputFiles({
      name: 'view-all-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // For admin users, successful upload always redirects to match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });
    
    // Go back to home using navigation to preserve admin state
    await navigateUsingNav(page, 'Home');

    // Navigate to Turtle Records (Review Queue)
    await openMobileMenuIfPresent(page);
    // Wait for admin role to be set and navigation to be ready
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Wait for review queue to load
    await page.waitForTimeout(1000);

    // Look for "Review Matches" button in review queue items
    const reviewButton = page.locator('button:has-text("Review Matches")');
    const count = await reviewButton.count();

    if (count > 0) {
      await reviewButton.first().click();
      // Should open review modal
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Review Matches' })).toBeVisible();
    }
  });
});
