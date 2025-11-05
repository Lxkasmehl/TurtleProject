import {
  Container,
  Title,
  Text,
  Stack,
  Grid,
  Card,
  Image,
  Group,
  Badge,
  Paper,
  Center,
  Loader,
  Button,
  Modal,
  ScrollArea,
  Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPhoto,
  IconClock,
  IconFile,
  IconX,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { getAllUploadedPhotos, type UploadedPhoto } from '../services/mockBackend';
import { useUser } from '../hooks/useUser';
import { useNavigate } from 'react-router-dom';

export default function AdminTurtleRecordsPage() {
  const { role } = useUser();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<UploadedPhoto | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  useEffect(() => {
    // Check if user is admin
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    // Load all photos
    const loadPhotos = () => {
      setLoading(true);
      try {
        const allPhotos = getAllUploadedPhotos();
        setPhotos(allPhotos);
      } catch (error) {
        console.error('Error loading photos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();

    // Listen for storage changes (when new photos are uploaded from other tabs)
    const handleStorageChange = () => {
      loadPhotos();
    };

    // Listen for custom event (for same-tab updates)
    const handlePhotoUploaded = () => {
      loadPhotos();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('photoUploaded', handlePhotoUploaded);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('photoUploaded', handlePhotoUploaded);
    };
  }, [role, navigate]);

  const handlePhotoClick = (photo: UploadedPhoto) => {
    setSelectedPhoto(photo);
    open();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (role !== 'admin') {
    return null;
  }

  return (
    <Container size='xl' py='xl'>
      <Stack gap='lg'>
        <Paper shadow='sm' p='xl' radius='md' withBorder>
          <Stack gap='md'>
            <Group justify='space-between' align='center'>
              <div>
                <Title order={1}>Turtle Records</Title>
                <Text size='sm' c='dimmed' mt='xs'>
                  View all uploaded turtle photos and track turtle sightings
                </Text>
              </div>
              <Group gap='sm'>
                <Badge
                  size='lg'
                  variant='light'
                  color='red'
                  leftSection={<IconPhoto size={14} />}
                >
                  {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
                </Badge>
              </Group>
            </Group>
          </Stack>
        </Paper>

        {/* Info Alert about low quality photos */}
        <Alert
          icon={<IconInfoCircle size={18} />}
          title='Photo Quality Notice'
          color='blue'
          radius='md'
        >
          <Text size='sm'>
            The photos are displayed in low quality because this application is currently
            using{' '}
            <Text component='span' fw={500}>
              localStorage as a mock backend
            </Text>
            . Since there is no real backend yet, the storage space in localStorage is
            limited and not sufficient to store photos in high quality. Once a real
            backend is implemented, the photos will be stored with full quality.
          </Text>
        </Alert>

        {loading ? (
          <Center py='xl'>
            <Loader size='lg' />
          </Center>
        ) : photos.length === 0 ? (
          <Paper shadow='sm' p='xl' radius='md' withBorder>
            <Center py='xl'>
              <Stack gap='md' align='center'>
                <IconPhoto size={64} stroke={1.5} style={{ opacity: 0.3 }} />
                <Text size='lg' c='dimmed' ta='center'>
                  No turtle photos uploaded yet
                </Text>
                <Text size='sm' c='dimmed' ta='center'>
                  Upload turtle photos from the home page to see them here
                </Text>
              </Stack>
            </Center>
          </Paper>
        ) : (
          <Grid gutter='md'>
            {photos.map((photo) => (
              <Grid.Col key={photo.imageId} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                <Card
                  shadow='sm'
                  padding='lg'
                  radius='md'
                  withBorder
                  style={{ cursor: 'pointer', height: '100%' }}
                  onClick={() => handlePhotoClick(photo)}
                >
                  <Card.Section>
                    <Image
                      src={photo.preview}
                      alt={photo.fileName}
                      height={200}
                      fit='cover'
                      radius='md'
                    />
                  </Card.Section>

                  <Stack gap='xs' mt='md'>
                    <Text size='sm' fw={500} lineClamp={1} title={photo.fileName}>
                      {photo.fileName}
                    </Text>
                    <Group gap='xs'>
                      <Badge
                        size='xs'
                        variant='light'
                        color='gray'
                        leftSection={<IconFile size={10} />}
                      >
                        {formatFileSize(photo.fileSize)}
                      </Badge>
                      <Badge
                        size='xs'
                        variant='light'
                        color='blue'
                        leftSection={<IconClock size={10} />}
                      >
                        {photo.uploadDate}
                      </Badge>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>

      {/* Photo Detail Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title={selectedPhoto?.fileName}
        size='xl'
        centered
      >
        {selectedPhoto && (
          <Stack gap='md'>
            <Image
              src={selectedPhoto.preview}
              alt={selectedPhoto.fileName}
              radius='md'
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            <ScrollArea h={200}>
              <Stack gap='sm'>
                <Group justify='space-between'>
                  <Text size='sm' fw={500}>
                    File Name:
                  </Text>
                  <Text size='sm' c='dimmed'>
                    {selectedPhoto.fileName}
                  </Text>
                </Group>
                <Group justify='space-between'>
                  <Text size='sm' fw={500}>
                    File Size:
                  </Text>
                  <Text size='sm' c='dimmed'>
                    {formatFileSize(selectedPhoto.fileSize)}
                  </Text>
                </Group>
                <Group justify='space-between'>
                  <Text size='sm' fw={500}>
                    File Type:
                  </Text>
                  <Text size='sm' c='dimmed'>
                    {selectedPhoto.fileType}
                  </Text>
                </Group>
                <Group justify='space-between'>
                  <Text size='sm' fw={500}>
                    Image ID:
                  </Text>
                  <Text size='sm' c='dimmed' style={{ fontFamily: 'monospace' }}>
                    {selectedPhoto.imageId}
                  </Text>
                </Group>
                <Group justify='space-between' align='flex-start'>
                  <Text size='sm' fw={500}>
                    Upload Date:
                  </Text>
                  <Text size='sm' c='dimmed' ta='right'>
                    {selectedPhoto.uploadDate}
                  </Text>
                </Group>
                <Group justify='space-between'>
                  <Text size='sm' fw={500}>
                    Timestamp:
                  </Text>
                  <Text size='sm' c='dimmed' style={{ fontFamily: 'monospace' }}>
                    {new Date(selectedPhoto.timestamp).toLocaleString()}
                  </Text>
                </Group>
              </Stack>
            </ScrollArea>
            <Group justify='flex-end' mt='md'>
              <Button variant='light' onClick={close} leftSection={<IconX size={16} />}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
