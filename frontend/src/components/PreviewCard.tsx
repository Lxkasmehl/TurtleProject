import {
  Card,
  Stack,
  Group,
  Image,
  Button,
  Text,
  Badge,
  Alert,
  Progress,
  Center,
  Loader,
} from '@mantine/core';
import { Transition } from '@mantine/core';
import {
  IconCheck,
  IconAlertCircle,
  IconCloudUpload,
  IconTrash,
  IconClock,
  IconSparkles,
} from '@tabler/icons-react';
import type { FileWithPath } from '@mantine/dropzone';

interface PreviewCardProps {
  preview: string | null;
  files: FileWithPath[];
  uploadState: 'idle' | 'uploading' | 'success' | 'error';
  uploadProgress: number;
  uploadResponse: string | null;
  imageId: string | null;
  isDuplicate: boolean;
  previousUploadDate: string | null;
  isGettingLocation: boolean;
  role?: string;
  onUpload: () => void;
  onRemove: () => void;
}

export function PreviewCard({
  preview,
  files,
  uploadState,
  uploadProgress,
  uploadResponse,
  imageId,
  isDuplicate,
  previousUploadDate,
  isGettingLocation,
  role,
  onUpload,
  onRemove,
}: PreviewCardProps) {
  if (!preview) return null;

  return (
    <Transition mounted={true} transition='fade' duration={300} timingFunction='ease'>
      {(styles) => (
        <Card shadow='xs' padding='md' radius='md' withBorder style={styles}>
          <Stack gap='md'>
            <Group justify='space-between' align='center'>
              <Text size='lg' fw={500}>
                Preview
              </Text>
              {uploadState === 'success' && (
                <Badge color='green' leftSection={<IconCheck size={14} />} size='lg'>
                  Successfully Uploaded
                </Badge>
              )}
              {uploadState === 'error' && (
                <Badge color='red' leftSection={<IconAlertCircle size={14} />} size='lg'>
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
                File: {files[0].name} ({(files[0].size / 1024 / 1024).toFixed(2)} MB)
              </Text>
            )}

            {uploadState === 'uploading' && (
              <Stack gap='xs' data-testid='upload-progress'>
                <Group justify='space-between'>
                  <Text size='sm' fw={500}>
                    {isGettingLocation ? 'Getting location...' : 'Uploading...'}
                  </Text>
                  <Text size='sm' c='dimmed'>
                    {uploadProgress}%
                  </Text>
                </Group>
                <Progress value={uploadProgress} size='lg' radius='xl' animated />
                <Center>
                  <Loader size='sm' />
                </Center>
                {isGettingLocation && (
                  <Text size='xs' c='dimmed' ta='center'>
                    Please allow location access to track turtle sightings
                  </Text>
                )}
              </Stack>
            )}

            {uploadState === 'success' && uploadResponse && (
              <Alert
                data-testid='upload-success-alert'
                icon={isDuplicate ? <IconClock size={18} /> : <IconCheck size={18} />}
                title={isDuplicate ? 'Duplicate Photo Detected' : 'Upload Successful!'}
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
                      onClick={onUpload}
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
                    onClick={onRemove}
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
  );
}
