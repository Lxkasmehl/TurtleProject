import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { uploadPhoto, validateFile, getCurrentLocation } from '../services/mockBackend';
import type { FileWithPath } from '@mantine/dropzone';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UsePhotoUploadOptions {
  role?: string;
  onSuccess?: (imageId: string) => void;
}

interface UsePhotoUploadReturn {
  files: FileWithPath[];
  preview: string | null;
  uploadState: UploadState;
  uploadProgress: number;
  uploadResponse: string | null;
  imageId: string | null;
  isDuplicate: boolean;
  previousUploadDate: string | null;
  isGettingLocation: boolean;
  handleDrop: (acceptedFiles: FileWithPath[]) => void;
  handleUpload: () => Promise<void>;
  handleRemove: () => void;
}

export function usePhotoUpload({
  role,
  onSuccess,
}: UsePhotoUploadOptions = {}): UsePhotoUploadReturn {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResponse, setUploadResponse] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [previousUploadDate, setPreviousUploadDate] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  const handleDrop = (acceptedFiles: FileWithPath[]): void => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      // Validation
      const validation = validateFile(file);
      if (!validation.isValid) {
        notifications.show({
          title: 'Invalid File',
          message: validation.error || 'File could not be validated',
          color: 'red',
          icon: <IconAlertCircle size={18} />,
        });
        return;
      }

      setFiles(acceptedFiles);
      setUploadState('idle');
      setUploadResponse(null);
      setImageId(null);
      setIsDuplicate(false);
      setPreviousUploadDate(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (files.length === 0 || !preview) return;

    const file = files[0];
    setUploadState('uploading');
    setUploadProgress(0);
    setUploadResponse(null);

    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Simulate progress animation
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Get location if available (for all users)
      let location = null;
      setIsGettingLocation(true);
      try {
        location = await getCurrentLocation();
        if (!location) {
          console.warn('Location not available or denied by user');
        }
      } catch (error) {
        console.warn('Failed to get location:', error);
      } finally {
        setIsGettingLocation(false);
      }

      // For admin, check for duplicates
      const response = await uploadPhoto(file, role === 'admin', location);

      // Clear interval and set to 100%
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setUploadProgress(100);

      if (response.success) {
        // If duplicate detected and admin, navigate to match page
        if (response.isDuplicate && role === 'admin' && response.duplicateImageId) {
          // Navigate to turtle match page
          navigate(`/admin/turtle-match/${response.duplicateImageId}`);
          return;
        }

        setUploadState('success');
        setUploadResponse(response.message);
        setImageId(response.imageId || null);
        setIsDuplicate(response.isDuplicate || false);
        setPreviousUploadDate(response.previousUploadDate || null);

        if (response.imageId && onSuccess) {
          onSuccess(response.imageId);
        }

        notifications.show({
          title: 'Upload Successful!',
          message: response.message,
          color: 'green',
          icon: <IconCheck size={18} />,
          autoClose: 5000,
        });
      } else {
        throw new Error(response.message);
      }
    } catch (error: unknown) {
      // Clear interval on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setUploadProgress(0);
      setUploadState('error');
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? (error.message as string)
          : 'Upload failed. Please try again.';

      setUploadResponse(errorMessage);

      notifications.show({
        title: 'Upload Failed',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={18} />,
        autoClose: 5000,
      });
    }
  };

  const handleRemove = (): void => {
    setFiles([]);
    setPreview(null);
    setUploadState('idle');
    setUploadProgress(0);
    setUploadResponse(null);
    setImageId(null);
    setIsDuplicate(false);
    setPreviousUploadDate(null);
  };

  return {
    files,
    preview,
    uploadState,
    uploadProgress,
    uploadResponse,
    imageId,
    isDuplicate,
    previousUploadDate,
    isGettingLocation,
    handleDrop,
    handleUpload,
    handleRemove,
  };
}
