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
 * Helper function to login as admin using real authentication
 * Uses environment variables for test credentials:
 * - E2E_ADMIN_EMAIL (default: admin@test.com)
 * - E2E_ADMIN_PASSWORD (default: testpassword123)
 */
export const loginAsAdmin = async (page: Page) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@test.com';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'testpassword123';

  // Navigate to login page
  await page.goto('/login');

  // Fill in email and password
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);

  // Submit the form
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for successful login - check for navigation to home page or success notification
  await page.waitForURL('/', { timeout: 10000 });

  // Verify we're logged in as admin by checking the role badge
  const badge = page.getByTestId('role-badge');
  await expect(badge).toHaveText(/Admin/);
};

/**
 * Helper function to login as community member using real authentication
 * Uses environment variables for test credentials:
 * - E2E_COMMUNITY_EMAIL (default: community@test.com)
 * - E2E_COMMUNITY_PASSWORD (default: testpassword123)
 */
export const loginAsCommunity = async (page: Page) => {
  const communityEmail = process.env.E2E_COMMUNITY_EMAIL || 'community@test.com';
  const communityPassword = process.env.E2E_COMMUNITY_PASSWORD || 'testpassword123';

  // Navigate to login page
  await page.goto('/login');

  // Fill in email and password
  await page.getByLabel('Email').fill(communityEmail);
  await page.getByLabel('Password').fill(communityPassword);

  // Submit the form
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for successful login - check for navigation to home page or success notification
  await page.waitForURL('/', { timeout: 10000 });

  // Verify we're logged in as community by checking the role badge
  const badge = page.getByTestId('role-badge');
  await expect(badge).toHaveText(/Community/);
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

/**
 * Helper function to grant location permission before uploading photos
 * This prevents the browser from showing a location permission dialog
 * which blocks tests, especially in Firefox
 *
 * Note: Location permission is requested when uploading a photo, not when opening the page.
 * This function should be called:
 * 1. In beforeEach to set up the permission
 * 2. Right before uploading a photo to ensure it's set correctly
 */
export const grantLocationPermission = async (page: Page) => {
  // Get the current page URL to set permission for the correct origin
  const url = page.url();
  let origin: string | undefined;

  // Try to extract origin from URL, but handle invalid URLs gracefully
  try {
    if (url && url !== 'about:blank' && url.startsWith('http')) {
      origin = new URL(url).origin;
    }
  } catch (error) {
    // URL is invalid, will grant permission without origin restriction
    origin = undefined;
  }

  // Grant geolocation permission with the correct origin
  if (origin) {
    await page.context().grantPermissions(['geolocation'], { origin });
  } else {
    // If no URL is available yet or URL is invalid, grant permission without origin restriction
    await page.context().grantPermissions(['geolocation']);
  }

  // Set up a dialog handler to automatically accept any permission dialogs
  // This is a fallback in case the permission wasn't set correctly
  // Note: This handler will be called for any dialog, so it's safe to accept
  page.once('dialog', async (dialog) => {
    // Accept any dialogs (permission requests, alerts, etc.)
    await dialog.accept();
  });

  // Mock the geolocation API directly in the page context to avoid permission dialogs
  // This works even if the page is already loaded
  // IMPORTANT: We must mock it to return immediately WITHOUT calling the real API
  // to prevent browser permission dialogs from appearing
  await page.evaluate(() => {
    if (navigator.geolocation) {
      // Override getCurrentPosition to immediately provide a location
      // WITHOUT calling the real API - this prevents permission dialogs
      navigator.geolocation.getCurrentPosition = function (
        success: PositionCallback,
        _error?: PositionErrorCallback,
        _options?: PositionOptions
      ) {
        // Immediately provide a default location without calling the real API
        // This prevents the browser from showing a permission dialog
        const defaultPosition = {
          coords: {
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: function () {
              return {
                latitude: this.latitude,
                longitude: this.longitude,
                accuracy: this.accuracy,
                altitude: this.altitude,
                altitudeAccuracy: this.altitudeAccuracy,
                heading: this.heading,
                speed: this.speed,
              };
            },
          },
          timestamp: Date.now(),
          toJSON: function () {
            return {
              coords: this.coords.toJSON(),
              timestamp: this.timestamp,
            };
          },
        } as GeolocationPosition;

        // Use setTimeout to make it async but return immediately
        // This prevents permission dialogs from blocking the test
        setTimeout(() => {
          success(defaultPosition);
        }, 0);
      };
    }
  });
};

/**
 * Helper function to click the "Upload Photo" button
 * IMPORTANT: Make sure to call grantLocationPermission() BEFORE calling this function
 * to prevent browser permission dialogs from blocking the test.
 * The grantLocationPermission() function mocks the geolocation API to prevent dialogs.
 */
export const clickUploadPhotoButton = async (page: Page) => {
  // Simply click the button - the permission should already be granted via grantLocationPermission()
  // and the geolocation API should be mocked to prevent dialogs
  await page.getByRole('button', { name: 'Upload Photo' }).click();
};
