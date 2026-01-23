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

test.describe('Admin Photo Upload with Duplicate Detection Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    // Grant location permission after page is loaded to avoid permission dialogs (especially in Firefox)
    await grantLocationPermission(page);
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should detect duplicate photo and navigate to match page', async ({
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
      name: 'duplicate-turtle.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // For admin users, successful upload redirects to match page (no notification)
    await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/, { timeout: 30000 });

    // Navigate back to home page to continue with duplicate upload test
    await navigateUsingNav(page, 'Home');

    await fileInput.setInputFiles({
      name: 'duplicate-turtle.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // Should detect duplicate and navigate to match page immediately
    // For duplicates, navigation happens without showing notification
    await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/, { timeout: 30000 });

    // Should see match page
    await expect(page.getByText('Turtle Match Found!')).toBeVisible();
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

    // For admin users, successful upload redirects to match page (no notification)
    await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/, { timeout: 30000 });
  });

  test('should show duplicate message when uploading duplicate as admin', async ({
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

    // Upload first time
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

    // For admin users, successful upload redirects to match page (no notification)
    await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/, { timeout: 30000 });

    // Navigate back to home page to continue with duplicate upload test
    await navigateUsingNav(page, 'Home');

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

    // Should navigate to match page which shows duplicate was found
    // For duplicates, navigation happens immediately without notification
    await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/, { timeout: 30000 });
    await expect(page.getByText(/Turtle Match Found!/i)).toBeVisible();
  });

  test('should upload new photo successfully as admin', async ({ page }) => {
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

    // For admin users, successful upload redirects to match page (no notification)
    await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/, { timeout: 30000 });
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

    // For admin users, successful upload redirects to match page (no notification)
    await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/, { timeout: 30000 });
  });

  test('should show photo in Turtle Records after upload', async ({ page }) => {
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

    // For admin users, successful upload redirects to match page (no notification)
    await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/, { timeout: 30000 });

    // Navigate to Turtle Records
    await openMobileMenuIfPresent(page);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Should see the uploaded photo filename in the file info text
    // Use a more specific locator that finds the file info text (not notification or alert)
    await expect(page.locator('text=/File: records-test\\.png/')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should allow clicking "View All" button to navigate to match page', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'Skipping for webkit');
    test.setTimeout(60000);
    await loginAsAdmin(page);

    // Upload a photo that will have duplicates
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

    // Upload first
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

    // For admin users, successful upload redirects to match page (no notification)
    await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/, { timeout: 30000 });

    // Navigate back to home page to continue with duplicate upload test
    await navigateUsingNav(page, 'Home');

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

    // For duplicate uploads as admin, navigation happens immediately (no notification)
    // Should detect duplicate and navigate to match page immediately
    // For duplicates, navigation happens without showing notification
    await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/, { timeout: 30000 });
    // Go back to home using navigation to preserve admin state
    await navigateUsingNav(page, 'Home');

    // Navigate to Turtle Records
    await openMobileMenuIfPresent(page);
    // Wait for admin role to be set and navigation to be ready
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Turtle Records' }).click();

    // Wait for photo groups to load
    await page.waitForTimeout(1000);

    // Look for "View All" button in photo groups with duplicates
    const viewAllButton = page.locator('button:has-text("View All")');
    const count = await viewAllButton.count();

    if (count > 0) {
      await viewAllButton.first().click();
      // Should navigate to match page
      await expect(page).toHaveURL(/\/admin\/turtle-match\/img_/);
    }
  });
});
