import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Center,
  Button,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import type { FileRejection, FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconUpload,
  IconX,
  IconPhoto,
  IconAlertCircle,
  IconCamera,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useRef, useState, useEffect } from 'react';
import { validateFile } from '../services/mockBackend';
import { useUser } from '../hooks/useUser';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { PreviewCard } from '../components/PreviewCard';
import { InstructionsModal } from '../components/InstructionsModal';

export default function HomePage() {
  const { role } = useUser();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [instructionsOpened, setInstructionsOpened] = useState(false);

  // Auto-open instructions on first visit
  useEffect(() => {
    const hasSeenInstructions = localStorage.getItem('hasSeenInstructions');
    if (!hasSeenInstructions) {
      setInstructionsOpened(true);
    }
  }, []);

  const {
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
  } = usePhotoUpload({ role });

  const handleDropWithValidation = (acceptedFiles: FileWithPath[]): void => {
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

      handleDrop(acceptedFiles);
    }
  };

  const handleReject = (rejectedFiles: FileRejection[]): void => {
    const rejection = rejectedFiles[0];
    let message = 'File could not be accepted';

    if (rejection.errors[0]?.code === 'file-too-large') {
      message = 'File is too large. Maximum: 5MB';
    } else if (rejection.errors[0]?.code === 'file-invalid-type') {
      message = 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WEBP';
    }

    notifications.show({
      title: 'Upload Rejected',
      message,
      color: 'orange',
      icon: <IconAlertCircle size={18} />,
    });
  };

  const handleCameraClick = (): void => {
    cameraInputRef.current?.click();
  };

  const handleFileSelectClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleCameraChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert File to FileWithPath for consistency
      const fileWithPath = Object.assign(file, { path: file.name }) as FileWithPath;
      handleDropWithValidation([fileWithPath]);
    }
    // Reset input so the same file can be selected again
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert File to FileWithPath for consistency
      const fileWithPath = Object.assign(file, { path: file.name }) as FileWithPath;
      handleDropWithValidation([fileWithPath]);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Container size='sm' py='xl'>
      <Paper shadow='sm' p='xl' radius='md' withBorder>
        <Stack gap='lg'>
          <Center>
            <Stack gap='xs' align='center' style={{ width: '100%' }}>
              <Group justify='space-between' style={{ width: '100%' }}>
                <div style={{ flex: 1 }} /> {/* Spacer for centering */}
                <Title order={1}>Photo Upload</Title>
                <Group style={{ flex: 1 }} justify='flex-end'>
                  <Button
                    variant='light'
                    size='sm'
                    leftSection={<IconInfoCircle size={16} />}
                    onClick={() => setInstructionsOpened(true)}
                  >
                    View Instructions
                  </Button>
                </Group>
              </Group>
              <Text size='sm' c='dimmed' ta='center'>
                Upload a photo to save it in the backend
              </Text>
            </Stack>
          </Center>

          {/* Hidden file inputs for mobile */}
          <input
            ref={cameraInputRef}
            type='file'
            accept='image/*'
            capture='environment'
            style={{ display: 'none' }}
            onChange={handleCameraChange}
            disabled={uploadState === 'uploading'}
          />
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
            disabled={uploadState === 'uploading'}
          />

          {isMobile ? (
            <Stack gap='md'>
              <Button
                size='lg'
                leftSection={<IconCamera size={20} />}
                onClick={handleCameraClick}
                disabled={uploadState === 'uploading'}
                fullWidth
              >
                Take Photo
              </Button>
              <Button
                size='lg'
                variant='light'
                leftSection={<IconPhoto size={20} />}
                onClick={handleFileSelectClick}
                disabled={uploadState === 'uploading'}
                fullWidth
              >
                Upload Photo
              </Button>
              <Text size='sm' c='dimmed' ta='center' mt='xs'>
                Supported formats: PNG, JPG, JPEG, GIF, WEBP (max. 5MB)
              </Text>
            </Stack>
          ) : (
            <Dropzone
              onDrop={handleDropWithValidation}
              onReject={handleReject}
              maxSize={5 * 1024 * 1024} // 5MB
              accept={{
                'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
              }}
              multiple={false}
              disabled={uploadState === 'uploading'}
            >
              <Group
                justify='center'
                gap='xl'
                mih={220}
                style={{ pointerEvents: 'none' }}
              >
                <Dropzone.Accept>
                  <IconUpload size='3.2rem' stroke={1.5} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size='3.2rem' stroke={1.5} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconPhoto size='3.2rem' stroke={1.5} />
                </Dropzone.Idle>

                <div>
                  <Text size='xl' inline ta='center'>
                    Drop photo here or click to select
                  </Text>
                  <Text
                    size='sm'
                    c='dimmed'
                    inline
                    mt={7}
                    ta='center'
                    style={{ display: 'block' }}
                  >
                    Supported formats: PNG, JPG, JPEG, GIF, WEBP (max. 5MB)
                  </Text>
                </div>
              </Group>
            </Dropzone>
          )}

          <PreviewCard
            preview={preview}
            files={files}
            uploadState={uploadState}
            uploadProgress={uploadProgress}
            uploadResponse={uploadResponse}
            imageId={imageId}
            isDuplicate={isDuplicate}
            previousUploadDate={previousUploadDate}
            isGettingLocation={isGettingLocation}
            role={role}
            onUpload={handleUpload}
            onRemove={handleRemove}
          />
        </Stack>
      </Paper>

      <InstructionsModal
        opened={instructionsOpened}
        onClose={() => setInstructionsOpened(false)}
      />
    </Container>
  );
}
