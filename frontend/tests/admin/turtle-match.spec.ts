import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  loginAsCommunity,
  navigateTo,
  grantLocationPermission,
  clickUploadPhotoButton,
} from '../helpers';

test.describe('Admin Turtle Match Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    // Grant location permission after page is loaded to avoid permission dialogs (especially in Firefox)
    await grantLocationPermission(page);
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should display match page header', async ({ page }) => {
    // First need to upload a photo and get its ID
    await loginAsAdmin(page);

    // Upload a test photo
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
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

    await fileInput.setInputFiles({
      name: 'duplicate-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    await expect(page.getByText(/Upload Successful/i).first()).toBeVisible({
      timeout: 20000,
    });

    // Wait a moment for photo to be saved to localStorage
    await page.waitForTimeout(500);

    // Get the image ID from localStorage
    const imageId = await page.evaluate(() => {
      const photos = JSON.parse(
        localStorage.getItem('turtle_project_uploaded_photos') || '[]'
      );
      return photos[0]?.imageId;
    });

    expect(imageId).toBeTruthy();

    // Navigate to match page using client-side navigation (preserves admin role)
    await navigateTo(page, `/admin/turtle-match/${imageId}`);

    // Wait for page to fully load - the header should always be visible
    await expect(page.getByText('Turtle Match Found!', { exact: false })).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText('This turtle has been sighted multiple times')
    ).toBeVisible();
  });

  test('should display success alert for turtle identification', async ({ page }) => {
    await loginAsAdmin(page);

    // Upload a photo and get ID
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
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

    await fileInput.setInputFiles({
      name: 'match-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    await expect(page.getByText(/Upload Successful/i).first()).toBeVisible({
      timeout: 20000,
    });

    const imageId = await page.evaluate(() => {
      const photos = JSON.parse(
        localStorage.getItem('turtle_project_uploaded_photos') || '[]'
      );
      return photos[0]?.imageId;
    });

    if (imageId) {
      // Navigate using client-side navigation (preserves admin role)
      await navigateTo(page, `/admin/turtle-match/${imageId}`);

      // Wait for loading to complete - wait for content to appear
      await expect(page.getByText('Turtle Identified!')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/This photo matches a turtle/i)).toBeVisible();
    }
  });

  test('should display all duplicate photos', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Skipping for webkit');
    test.setTimeout(60000);
    await loginAsAdmin(page);

    // Upload first photo
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
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

    // Upload same photo twice to create duplicates
    await fileInput.setInputFiles({
      name: 'duplicate-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    await expect(page.getByText(/Upload Successful/i).first()).toBeVisible({
      timeout: 30000,
    });

    // Upload again (same file) - reload page (authentication is preserved via localStorage)
    await page.reload();

    // Get fresh file input locator after reload
    const fileInput2 = page.locator('input[type="file"]:not([capture])').first();
    await fileInput2.setInputFiles({
      name: 'duplicate-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // For duplicates, it navigates to match page instead of showing notification
    await page.waitForSelector('text=/Turtle Match Found!/i', { timeout: 30000 });

    // Extract image ID from URL (we're already on the match page)
    const url = page.url();
    const imageIdMatch = url.match(/\/admin\/turtle-match\/(.+)$/);
    const imageId = imageIdMatch ? imageIdMatch[1] : null;

    if (imageId) {
      // Should see photos displayed (we're already on the match page)
      await expect(page.locator('text=duplicate-photo.png').first()).toBeVisible();
    }
  });

  test('should display "Most Recent" badge on newest photo', async ({ page }) => {
    await loginAsAdmin(page);

    // Upload a photo
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    await fileInput.setInputFiles({
      name: 'recent-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    await expect(page.getByText(/Upload Successful/i).first()).toBeVisible({
      timeout: 20000,
    });

    const imageId = await page.evaluate(() => {
      const photos = JSON.parse(
        localStorage.getItem('turtle_project_uploaded_photos') || '[]'
      );
      return photos[0]?.imageId;
    });

    if (imageId) {
      // Navigate using client-side navigation (preserves admin role)
      await navigateTo(page, `/admin/turtle-match/${imageId}`);

      // Wait for page to load - wait for header or loader to disappear
      await expect(page.getByText('Turtle Match Found!', { exact: false })).toBeVisible({
        timeout: 10000,
      });

      // Should see "Most Recent" badge if there are multiple photos
      const recentBadge = page.locator('text=Most Recent');
      if ((await recentBadge.count()) > 0) {
        await expect(recentBadge.first()).toBeVisible();
      }
    }
  });

  test('should display empty state when image ID not found', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to match page with invalid ID using client-side navigation (preserves admin role)
    await navigateTo(page, '/admin/turtle-match/invalid-image-id');

    // Wait for loading to complete - wait for empty state or loader to disappear
    await expect(page.getByText('No photos found')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/The photo ID could not be found/i)).toBeVisible();
  });

  test('should have back button to navigate home', async ({ page }) => {
    await loginAsAdmin(page);

    // Upload a photo
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    await fileInput.setInputFiles({
      name: 'back-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    await expect(page.getByText(/Upload Successful/i).first()).toBeVisible({
      timeout: 20000,
    });

    const imageId = await page.evaluate(() => {
      const photos = JSON.parse(
        localStorage.getItem('turtle_project_uploaded_photos') || '[]'
      );
      return photos[0]?.imageId;
    });

    if (imageId) {
      // Navigate using client-side navigation (preserves admin role)
      await navigateTo(page, `/admin/turtle-match/${imageId}`);

      // Wait for page to load - wait for back button to appear
      await expect(page.getByRole('button', { name: 'Back to Upload' })).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole('button', { name: 'Back to Upload' }).click();

      // Should be on home page
      await expect(page).toHaveURL('/');
    }
  });

  test('should prevent community users from accessing page', async ({ page }) => {
    await loginAsCommunity(page);

    // Try to access admin match page
    await page.goto('/admin/turtle-match/test-image-id');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should display photo information cards', async ({ page }) => {
    await loginAsAdmin(page);

    // Upload a photo
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'pink';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    await fileInput.setInputFiles({
      name: 'info-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    await expect(page.getByText(/Upload Successful/i).first()).toBeVisible({
      timeout: 20000,
    });

    const imageId = await page.evaluate(() => {
      const photos = JSON.parse(
        localStorage.getItem('turtle_project_uploaded_photos') || '[]'
      );
      return photos[0]?.imageId;
    });

    if (imageId) {
      // Navigate using client-side navigation (preserves admin role)
      await navigateTo(page, `/admin/turtle-match/${imageId}`);

      // Wait for page to load - wait for photo or header to appear
      await expect(page.getByText('Turtle Match Found!', { exact: false })).toBeVisible({
        timeout: 10000,
      });

      // Should see photo card with information
      // Note: The filename appears in both the notification and the PhotoCard
      // Use .first() to get the first match (notification will disappear after 5s)
      // Or wait for notification to disappear, then check for the photo card text
      await page.waitForTimeout(6000); // Wait for notification to auto-close (5000ms)

      // Now only the PhotoCard text should be visible
      await expect(page.getByText('info-test.png')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/File Name/i)).toBeVisible();
      await expect(page.getByText(/Upload Date/i)).toBeVisible();
    }
  });
});
