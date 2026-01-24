import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  loginAsCommunity,
  grantLocationPermission,
  clickUploadPhotoButton,
} from '../helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenInstructions', 'true');
  });
});

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
      name: 'match-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // Admin is automatically redirected to match page after upload
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });

    // Wait for page to fully load - the header should always be visible
    await expect(page.getByText('Select Best Match', { exact: false })).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText('Review the top 5 matches and select the correct turtle')
    ).toBeVisible();
  });

  test('should display match selection interface', async ({ page }) => {
    await loginAsAdmin(page);

    // Upload a photo
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

    // Admin is automatically redirected to match page after upload
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });

    // Wait for loading to complete - wait for content to appear
    await expect(page.getByText('Select Best Match')).toBeVisible({ timeout: 10000 });
    // Should see either alert with match count or empty state message
    const hasAlert = await page
      .getByText(/The system found.*potential matches/i)
      .isVisible()
      .catch(() => false);
    const hasNoMatches = await page
      .getByText('No matches found')
      .isVisible()
      .catch(() => false);
    expect(hasAlert || hasNoMatches).toBe(true);
  });

  test('should display uploaded photo and matches', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Skipping for webkit');
    test.setTimeout(60000);
    await loginAsAdmin(page);

    // Upload photo
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

    await fileInput.setInputFiles({
      name: 'match-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading (especially important after reload)
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // Admin is automatically redirected to match page after upload
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });

    // Should see match page with uploaded photo
    await expect(page.getByText('Select Best Match')).toBeVisible({ timeout: 10000 });
    
    // Check for uploaded photo section (only visible when matches exist)
    // or empty state message (when no matches)
    const uploadedPhotoText = page.getByText('Uploaded Photo', { exact: true });
    const noMatchesText = page.getByText('No matches found');
    
    const hasUploadedPhoto = await uploadedPhotoText.isVisible().catch(() => false);
    const hasNoMatches = await noMatchesText.isVisible().catch(() => false);
    
    // Should see either the uploaded photo section or the empty state
    expect(hasUploadedPhoto || hasNoMatches).toBe(true);
  });

  test('should display match cards with rank badges', async ({ page }) => {
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

    // Admin is automatically redirected to match page after upload
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });

    // Wait for page to load
    await expect(page.getByText('Select Best Match')).toBeVisible({ timeout: 10000 });

    // Should see either matches with rank badges or empty state
    const rankBadge = page.locator('text=/Rank \\d+/i');
    const noMatchesText = page.getByText('No matches found');
    
    if ((await rankBadge.count()) > 0) {
      await expect(rankBadge.first()).toBeVisible();
    } else {
      await expect(noMatchesText).toBeVisible();
    }
  });

  test('should display empty state when no matches found', async ({ page }) => {
    await loginAsAdmin(page);

    // Upload a photo that likely won't have matches
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'magenta';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    await fileInput.setInputFiles({
      name: 'no-match-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    // Grant location permission before uploading
    await grantLocationPermission(page);

    // Wait for preview card to appear and click upload button
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // Admin is automatically redirected to match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });

    // Wait for page to load - should show empty state
    await expect(page.getByText('Select Best Match')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('No matches found')).toBeVisible();
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

    // Admin is automatically redirected to match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });

    // Wait for page to load - wait for back button to appear
    await expect(page.getByRole('button', { name: 'Back to Upload' })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: 'Back to Upload' }).click();

    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('should prevent community users from accessing page', async ({ page }) => {
    await loginAsCommunity(page);

    // Try to access admin match page
    await page.goto('/admin/turtle-match/test-image-id');

    // Should be redirected to home
    await expect(page).toHaveURL('/');
  });

  test('should display uploaded photo and match cards', async ({ page }) => {
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

    // Admin is automatically redirected to match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });

    // Wait for page to load
    await expect(page.getByText('Select Best Match')).toBeVisible({ timeout: 10000 });

    // Should see uploaded photo section (only visible when matches exist)
    // or empty state message (when no matches)
    const uploadedPhotoText = page.getByText('Uploaded Photo', { exact: true });
    const noMatchesText = page.getByText('No matches found');
    
    const hasUploadedPhoto = await uploadedPhotoText.isVisible().catch(() => false);
    const hasNoMatches = await noMatchesText.isVisible().catch(() => false);
    
    // Should see either the uploaded photo section or the empty state
    expect(hasUploadedPhoto || hasNoMatches).toBe(true);
    
    // Should see either matches section or empty state
    const topMatchesText = page.getByText('Top 5 Matches');
    const hasTopMatches = await topMatchesText.isVisible().catch(() => false);
    expect(hasTopMatches || hasNoMatches).toBe(true);
  });

  test('should allow selecting a match', async ({ page }) => {
    await loginAsAdmin(page);

    // Upload a photo
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'lime';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    await fileInput.setInputFiles({
      name: 'select-match-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    await grantLocationPermission(page);
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // Wait for match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });
    await expect(page.getByText('Select Best Match')).toBeVisible({ timeout: 10000 });

    // Look for match cards
    const matchCard = page.locator('text=/Turtle ID:/i').first();
    if (await matchCard.isVisible().catch(() => false)) {
      // Click on a match card to select it
      await matchCard.click();

      // Should see confirm button enabled
      await expect(page.getByRole('button', { name: 'Confirm Match' })).toBeEnabled();
    } else {
      // If no matches, should see empty state
      await expect(page.getByText('No matches found')).toBeVisible();
    }
  });

  test('should allow creating new turtle', async ({ page }) => {
    await loginAsAdmin(page);

    // Upload a photo
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'coral';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    await fileInput.setInputFiles({
      name: 'new-turtle-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    await grantLocationPermission(page);
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // Wait for match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });
    await expect(page.getByText('Select Best Match')).toBeVisible({ timeout: 10000 });

    // Click "Create New Turtle" button
    const createButton = page.getByRole('button', { name: 'Create New Turtle' });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Should see modal for creating new turtle
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create New Turtle' })).toBeVisible();

    // Should see form fields
    await expect(page.getByLabel('Turtle ID')).toBeVisible();
    await expect(page.getByLabel('State')).toBeVisible();
    await expect(page.getByLabel('Location')).toBeVisible();
  });

  test('should show skip button', async ({ page }) => {
    await loginAsAdmin(page);

    // Upload a photo
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    const filePath = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'indigo';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    await fileInput.setInputFiles({
      name: 'skip-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(filePath.split(',')[1], 'base64'),
    });

    await grantLocationPermission(page);
    await page.waitForSelector('button:has-text("Upload Photo")', { timeout: 5000 });
    await clickUploadPhotoButton(page);

    // Wait for match page
    await expect(page).toHaveURL(/\/admin\/turtle-match\/[^/]+/, { timeout: 30000 });
    await expect(page.getByText('Select Best Match')).toBeVisible({ timeout: 10000 });

    // Should see skip/go back button (Skip when matches exist, Go Back when no matches)
    // Both buttons call the same handleSkip function
    const skipButton = page.getByRole('button', { name: 'Skip' });
    const goBackButton = page.getByRole('button', { name: 'Go Back' });
    
    const hasSkip = await skipButton.isVisible().catch(() => false);
    const hasGoBack = await goBackButton.isVisible().catch(() => false);
    
    expect(hasSkip || hasGoBack).toBe(true);
    
    if (hasSkip) {
      await skipButton.click();
    } else {
      await goBackButton.click();
    }

    // Should navigate back to home
    await expect(page).toHaveURL('/');
  });
});
