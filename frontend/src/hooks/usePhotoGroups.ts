import { useMemo } from 'react';
import { getDuplicatePhotosByImageId, type UploadedPhoto } from '../services/mockBackend';

export interface PhotoGroup {
  representative: UploadedPhoto; // The first/oldest photo in the group
  photos: UploadedPhoto[]; // All photos in this group
  isDuplicate: boolean; // Whether this group has duplicates
}

/**
 * Hook to group photos by duplicate hash
 * @param photos - Array of all photos
 * @returns Array of photo groups
 */
export function usePhotoGroups(photos: UploadedPhoto[]): PhotoGroup[] {
  return useMemo<PhotoGroup[]>(() => {
    const groups: PhotoGroup[] = [];
    const processed = new Set<string>();

    photos.forEach((photo) => {
      if (processed.has(photo.imageId)) return;

      // Get all duplicates for this photo
      const duplicates = getDuplicatePhotosByImageId(photo.imageId);

      // Sort by timestamp (oldest first)
      duplicates.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      // Mark all as processed
      duplicates.forEach((p) => processed.add(p.imageId));

      groups.push({
        representative: duplicates[0], // Oldest photo is representative
        photos: duplicates,
        isDuplicate: duplicates.length > 1,
      });
    });

    // Sort groups by representative's timestamp (newest first)
    groups.sort((a, b) => {
      return (
        new Date(b.representative.timestamp).getTime() -
        new Date(a.representative.timestamp).getTime()
      );
    });

    return groups;
  }, [photos]);
}

