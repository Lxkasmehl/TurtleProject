import { Container, Paper, Title, Text, Group, Stack, Center, Button } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import type { FileRejection, FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconX, IconPhoto, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { validateFile } from '../services/mockBackend';
import { useUser } from '../hooks/useUser';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { PreviewCard } from '../components/PreviewCard';
import { InstructionsModal } from '../components/InstructionsModal';

export default function HomePage() {
  const { role } = useUser();
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
            <Group justify='center' gap='xl' mih={220} style={{ pointerEvents: 'none' }}>
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