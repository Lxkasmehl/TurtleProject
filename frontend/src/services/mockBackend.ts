/**
 * Mock Backend Service
 * Simulates backend functionality for photo uploads
 * Will be replaced by real backend API later
 */

export interface PhotoLocation {
  latitude: number;
  longitude: number;
  address?: string; // Formatted address from reverse geocoding
  accuracy?: number; // Accuracy in meters
}

export interface UploadedPhoto {
  imageId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  preview: string; // Base64 data URL
  timestamp: string;
  uploadDate: string; // Formatted date
  location?: PhotoLocation; // Optional location data
}

export interface UploadResponse {
  success: boolean;
  message: string;
  imageId?: string;
  timestamp?: string;
  isDuplicate?: boolean;
  previousUploadDate?: string;
  duplicateImageId?: string; // ID of the duplicate photo for navigation
}

export interface UploadError {
  success: false;
  message: string;
  error?: string;
}

// Storage key for uploaded photos
const STORAGE_KEY = 'turtle_project_uploaded_photos';
const MAX_PHOTOS = 100; // Limit number of photos to prevent quota issues

/**
 * Get all uploaded photos from storage
 * @returns Array of uploaded photos
 */
export function getAllUploadedPhotos(): UploadedPhoto[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Compress Base64 image by reducing quality/size
 * For mock purposes, we'll store a smaller preview
 */
function compressPreview(base64: string, maxSize: number = 200): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions to fit within maxSize
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Use lower quality JPEG to reduce size
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressed);
      } else {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

/**
 * Save uploaded photo to storage
 * Limits storage to prevent quota exceeded errors
 * @param photo - The photo to save
 */
async function saveUploadedPhoto(photo: UploadedPhoto): Promise<void> {
  try {
    // Compress preview to reduce storage size
    const compressedPreview = await compressPreview(photo.preview, 200);
    photo.preview = compressedPreview;

    const photos = getAllUploadedPhotos();
    photos.unshift(photo); // Add to beginning (newest first)

    // Keep only the most recent MAX_PHOTOS photos to prevent quota issues
    const limitedPhotos = photos.slice(0, MAX_PHOTOS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedPhotos));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('photoUploaded'));
  } catch (error) {
    // If still quota exceeded, try to save without preview
    console.warn('Storage quota exceeded, saving without preview:', error);
    try {
      const photos = getAllUploadedPhotos();
      const photoWithoutPreview = { ...photo, preview: '' }; // Remove preview
      photos.unshift(photoWithoutPreview);
      const limitedPhotos = photos.slice(0, MAX_PHOTOS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedPhotos));
      window.dispatchEvent(new CustomEvent('photoUploaded'));
    } catch (fallbackError) {
      console.error('Failed to save photo even without preview:', fallbackError);
      // Clear old photos and try again
      try {
        localStorage.removeItem(STORAGE_KEY);
        const photoWithoutPreview = { ...photo, preview: '' };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([photoWithoutPreview]));
        window.dispatchEvent(new CustomEvent('photoUploaded'));
      } catch (finalError) {
        console.error('Completely failed to save photo:', finalError);
      }
    }
  }
}

/**
 * Generate a hash from file for duplicate detection
 * Uses filename + size + type as a simple hash (in real app would use actual file hash)
 */
function generateFileHash(file: File): string {
  return `${file.name}_${file.size}_${file.type}`;
}

/**
 * Check if a photo was already uploaded
 * @param file - The file to check
 * @returns UploadedPhoto if duplicate found, null otherwise
 */
export function checkDuplicatePhoto(file: File): UploadedPhoto | null {
  const photos = getAllUploadedPhotos();
  const fileHash = generateFileHash(file);

  return (
    photos.find((photo) => {
      const photoHash = generateFileHash({
        name: photo.fileName,
        size: photo.fileSize,
        type: photo.fileType,
      } as File);
      return photoHash === fileHash;
    }) || null
  );
}

/**
 * Get all duplicate photos (all versions with the same hash)
 * @param file - The file to find duplicates for
 * @returns Array of all duplicate photos including the current one
 */
export function getAllDuplicatePhotos(file: File): UploadedPhoto[] {
  const photos = getAllUploadedPhotos();
  const fileHash = generateFileHash(file);

  return photos.filter((photo) => {
    const photoHash = generateFileHash({
      name: photo.fileName,
      size: photo.fileSize,
      type: photo.fileType,
    } as File);
    return photoHash === fileHash;
  });
}

/**
 * Get all duplicate photos by image ID
 * @param imageId - The image ID to find duplicates for
 * @returns Array of all duplicate photos
 */
export function getDuplicatePhotosByImageId(imageId: string): UploadedPhoto[] {
  const photos = getAllUploadedPhotos();
  const photo = photos.find((p) => p.imageId === imageId);
  if (!photo) return [];

  const fileHash = generateFileHash({
    name: photo.fileName,
    size: photo.fileSize,
    type: photo.fileType,
  } as File);

  return photos.filter((p) => {
    const pHash = generateFileHash({
      name: p.fileName,
      size: p.fileSize,
      type: p.fileType,
    } as File);
    return pHash === fileHash;
  });
}

/**
 * Get current geolocation
 * @returns Promise with location data or null if unavailable
 */
export function getCurrentLocation(): Promise<PhotoLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: PhotoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        // Try to get address from reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.display_name) {
              location.address = data.display_name;
            }
          }
        } catch (error) {
          console.warn('Failed to get address from reverse geocoding:', error);
        }

        resolve(location);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Simulates a photo upload to the backend
 * @param file - The image file to upload
 * @param checkDuplicate - Whether to check for duplicates (for admin)
 * @param location - Optional location data (will be fetched if not provided)
 * @returns Promise with upload response or error
 */
export async function uploadPhoto(
  file: File,
  checkDuplicate: boolean = false,
  location?: PhotoLocation | null
): Promise<UploadResponse | UploadError> {
  // Simulate network latency (1-3 seconds)
  // Latency can vary based on file size
  const baseDelay = 1000;
  const sizeDelay = Math.min(file.size / 10000, 1000); // Max 1s additional based on size
  const randomDelay = Math.random() * 1000;
  const delay = baseDelay + sizeDelay + randomDelay;

  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      // Simulate occasional errors (5% error rate)
      const errorChance = Math.random();

      if (errorChance < 0.05) {
        // Simulate error
        reject({
          success: false,
          message: 'Upload failed',
          error: 'Network error or server unreachable',
        });
        return;
      }

      // Check for duplicate if requested (admin mode)
      let duplicatePhoto: UploadedPhoto | null = null;
      if (checkDuplicate) {
        duplicatePhoto = checkDuplicatePhoto(file);
      }

      // Create preview from file
      const preview = await new Promise<string>((resolvePreview) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolvePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });

      const now = new Date();
      const timestamp = now.toISOString();
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Format date for display
      const formattedDate = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Save photo to storage
      const uploadedPhoto: UploadedPhoto = {
        imageId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        preview,
        timestamp,
        uploadDate: formattedDate,
        location: location || undefined, // Save location if provided
      };

      if (!duplicatePhoto) {
        // New photo - save it (async, but we don't wait)
        saveUploadedPhoto(uploadedPhoto).catch((error) => {
          console.error('Failed to save photo to storage:', error);
        });
      } else {
        // Duplicate photo - also save it with new location/timestamp
        // This allows tracking multiple sightings of the same turtle
        uploadedPhoto.location = location || duplicatePhoto.location || undefined;
        saveUploadedPhoto(uploadedPhoto).catch((error) => {
          console.error('Failed to save duplicate photo to storage:', error);
        });
      }

      // Prepare response
      if (duplicatePhoto) {
        // Photo was already uploaded - return the first duplicate's ID for navigation
        resolve({
          success: true,
          message: `Turtle match found! This photo was already uploaded on ${duplicatePhoto.uploadDate}`,
          imageId: duplicatePhoto.imageId, // Return the first duplicate's ID
          timestamp: duplicatePhoto.timestamp,
          isDuplicate: true,
          previousUploadDate: duplicatePhoto.uploadDate,
          duplicateImageId: duplicatePhoto.imageId, // ID for navigation to match page
        });
      } else {
        // New photo
        resolve({
          success: true,
          message: `Great! Photo "${file.name}" successfully uploaded and saved in the backend`,
          imageId,
          timestamp,
          isDuplicate: false,
        });
      }
    }, delay);
  });
}

/**
 * Validates the file before upload
 * @param file - The file to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File is too large. Maximum: ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    };
  }

  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WEBP',
    };
  }

  return { isValid: true };
}
