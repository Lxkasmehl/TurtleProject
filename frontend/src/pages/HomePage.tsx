import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Image,
  Button,
  Stack,
  Center,
  Loader,
  Progress,
  Badge,
  Alert,
  Card,
  Transition,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import type { FileWithPath, FileRejection } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import {
  IconUpload,
  IconX,
  IconPhoto,
  IconCheck,
  IconAlertCircle,
  IconCloudUpload,
  IconTrash,
  IconClock,
  IconSparkles,
} from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import { uploadPhoto, validateFile } from '../services/mockBackend';
import { useUser } from '../hooks/useUser';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function HomePage() {
  const { role } = useUser();
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResponse, setUploadResponse] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [previousUploadDate, setPreviousUploadDate] = useState<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

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
      // For admin, check for duplicates
      const response = await uploadPhoto(file, role === 'admin');

      // Clear interval and set to 100%
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setUploadProgress(100);

      if (response.success) {
        setUploadState('success');
        setUploadResponse(response.message);
        setImageId(response.imageId || null);
        setIsDuplicate(response.isDuplicate || false);
        setPreviousUploadDate(response.previousUploadDate || null);

        const notificationColor = response.isDuplicate ? 'orange' : 'green';
        const notificationTitle = response.isDuplicate
          ? 'Duplicate Photo Detected'
          : 'Upload Successful! 🎉';

        notifications.show({
          title: notificationTitle,
          message: response.message,
          color: notificationColor,
          icon: response.isDuplicate ? <IconClock size={18} /> : <IconCheck size={18} />,
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
            <Stack gap='xs' align='center'>
              <Title order={1}>Photo Upload</Title>
              <Text size='sm' c='dimmed' ta='center'>
                Upload a photo to save it in the backend
              </Text>
            </Stack>
          </Center>

          <Dropzone
            onDrop={handleDrop}
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

          {preview && (
            <Transition
              mounted={true}
              transition='fade'
              duration={300}
              timingFunction='ease'
            >
              {(styles) => (
                <Card shadow='xs' padding='md' radius='md' withBorder style={styles}>
                  <Stack gap='md'>
                    <Group justify='space-between' align='center'>
                      <Title order={3}>Preview</Title>
                      {uploadState === 'success' && (
                        <Badge
                          color='green'
                          leftSection={<IconCheck size={14} />}
                          size='lg'
                        >
                          Successfully Uploaded
                        </Badge>
                      )}
                      {uploadState === 'error' && (
                        <Badge
                          color='red'
                          leftSection={<IconAlertCircle size={14} />}
                          size='lg'
                        >
                          Error
                        </Badge>
                      )}
                    </Group>

                    <Image
                      src={preview}
                      alt='Uploaded photo'
                      radius='md'
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />

                    {files.length > 0 && (
                      <Text size='sm' c='dimmed'>
                        File: {files[0].name} ({(files[0].size / 1024 / 1024).toFixed(2)}{' '}
                        MB)
                      </Text>
                    )}

                    {uploadState === 'uploading' && (
                      <Stack gap='xs'>
                        <Group justify='space-between'>
                          <Text size='sm' fw={500}>
                            Uploading...
                          </Text>
                          <Text size='sm' c='dimmed'>
                            {uploadProgress}%
                          </Text>
                        </Group>
                        <Progress value={uploadProgress} size='lg' radius='xl' animated />
                        <Center>
                          <Loader size='sm' />
                        </Center>
                      </Stack>
                    )}

                    {uploadState === 'success' && uploadResponse && (
                      <Alert
                        icon={
                          isDuplicate ? <IconClock size={18} /> : <IconCheck size={18} />
                        }
                        title={
                          isDuplicate ? 'Duplicate Photo Detected' : 'Upload Successful!'
                        }
                        color={isDuplicate ? 'orange' : 'green'}
                        radius='md'
                      >
                        {uploadResponse}
                        {imageId && (
                          <Text size='xs' c='dimmed' mt='xs'>
                            Image ID: {imageId}
                          </Text>
                        )}
                        {isDuplicate && previousUploadDate && (
                          <Group gap='xs' mt='xs' align='flex-start'>
                            <IconClock size={14} style={{ marginTop: 2 }} />
                            <Text size='xs' c='dimmed'>
                              Previously uploaded on: {previousUploadDate}
                            </Text>
                          </Group>
                        )}
                        {!isDuplicate && role === 'admin' && (
                          <Group gap='xs' mt='xs' align='flex-start'>
                            <IconSparkles size={14} style={{ marginTop: 2 }} />
                            <Text size='xs' c='dimmed'>
                              This is a new photo that has never been uploaded before
                            </Text>
                          </Group>
                        )}
                      </Alert>
                    )}

                    {uploadState === 'error' && uploadResponse && (
                      <Alert
                        icon={<IconAlertCircle size={18} />}
                        title='Upload Failed'
                        color='red'
                        radius='md'
                      >
                        {uploadResponse}
                      </Alert>
                    )}

                    <Group justify='flex-end' gap='sm'>
                      {uploadState !== 'uploading' && (
                        <>
                          {uploadState === 'idle' && (
                            <Button
                              onClick={handleUpload}
                              leftSection={<IconCloudUpload size={18} />}
                              size='md'
                              fullWidth
                            >
                              Upload Photo
                            </Button>
                          )}
                          <Button
                            variant='light'
                            color='red'
                            onClick={handleRemove}
                            leftSection={<IconTrash size={18} />}
                            size='md'
                            fullWidth={uploadState === 'idle'}
                          >
                            {uploadState === 'idle' ? 'Remove' : 'New Photo'}
                          </Button>
                        </>
                      )}
                    </Group>
                  </Stack>
                </Card>
              )}
            </Transition>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
