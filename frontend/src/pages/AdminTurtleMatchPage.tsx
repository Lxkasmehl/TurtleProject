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
  Alert,
  Divider,
} from '@mantine/core';
import {
  IconPhoto,
  IconClock,
  IconFile,
  IconMapPin,
  IconCheck,
  IconArrowLeft,
  IconRecycle,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDuplicatePhotosByImageId, type UploadedPhoto } from '../services/mockBackend';
import { useUser } from '../hooks/useUser';

export default function AdminTurtleMatchPage() {
  const { role } = useUser();
  const navigate = useNavigate();
  const { imageId } = useParams<{ imageId: string }>();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    // Load duplicate photos
    const loadPhotos = () => {
      setLoading(true);
      try {
        if (imageId) {
          const duplicatePhotos = getDuplicatePhotosByImageId(imageId);
          // Sort by timestamp (newest first)
          duplicatePhotos.sort((a, b) => {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });
          setPhotos(duplicatePhotos);
        }
      } catch (error) {
        console.error('Error loading duplicate photos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [imageId, role, navigate]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatLocation = (photo: UploadedPhoto): string => {
    if (!photo.location) return 'Location not available';
    if (photo.location.address) return photo.location.address;
    return `${photo.location.latitude.toFixed(6)}, ${photo.location.longitude.toFixed(
      6
    )}`;
  };

  const getGoogleMapsUrl = (photo: UploadedPhoto): string | null => {
    if (!photo.location) return null;
    return `https://www.google.com/maps?q=${photo.location.latitude},${photo.location.longitude}`;
  };

  if (role !== 'admin') {
    return null;
  }

  return (
    <Container size='xl' py='xl'>
      <Stack gap='lg'>
        {/* Header */}
        <Paper shadow='sm' p='xl' radius='md' withBorder>
          <Stack gap='md'>
            <Group justify='space-between' align='center'>
              <Group gap='md'>
                <Button
                  variant='light'
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => navigate('/')}
                >
                  Back to Upload
                </Button>
                <div>
                  <Title order={1}>Turtle Match Found! 🐢</Title>
                  <Text size='sm' c='dimmed' mt='xs'>
                    This turtle has been sighted multiple times
                  </Text>
                </div>
              </Group>
              <Badge
                size='lg'
                variant='light'
                color='green'
                leftSection={<IconRecycle size={14} />}
              >
                {photos.length} {photos.length === 1 ? 'Sighting' : 'Sightings'}
              </Badge>
            </Group>
          </Stack>
        </Paper>

        {/* Success Alert */}
        <Alert
          icon={<IconCheck size={18} />}
          title='Turtle Identified!'
          color='green'
          radius='md'
        >
          <Text size='sm'>
            This photo matches a turtle that has been previously identified. Below are all
            the sightings of this turtle, including when and where they were uploaded.
          </Text>
        </Alert>

        {/* Loading State */}
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
                  No photos found
                </Text>
                <Text size='sm' c='dimmed' ta='center'>
                  The photo ID could not be found
                </Text>
              </Stack>
            </Center>
          </Paper>
        ) : (
          <Grid gutter='md'>
            {photos.map((photo, index) => (
              <Grid.Col key={photo.imageId} span={{ base: 12, md: 6 }}>
                <Card shadow='sm' padding='lg' radius='md' withBorder>
                  <Stack gap='md'>
                    {/* Photo */}
                    <Card.Section>
                      <Image
                        src={photo.preview || undefined}
                        alt={photo.fileName}
                        height={300}
                        fit='cover'
                        radius='md'
                      />
                    </Card.Section>

                    {/* Badges */}
                    <Group gap='xs'>
                      {index === 0 && (
                        <Badge color='green' leftSection={<IconCheck size={12} />}>
                          Most Recent
                        </Badge>
                      )}
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

                    <Divider />

                    {/* File Info */}
                    <Stack gap='xs'>
                      <Group justify='space-between'>
                        <Text size='sm' fw={500}>
                          File Name:
                        </Text>
                        <Text size='sm' c='dimmed' ta='right'>
                          {photo.fileName}
                        </Text>
                      </Group>
                      <Group justify='space-between'>
                        <Text size='sm' fw={500}>
                          Upload Date:
                        </Text>
                        <Text size='sm' c='dimmed' ta='right'>
                          {photo.uploadDate}
                        </Text>
                      </Group>
                      <Group justify='space-between'>
                        <Text size='sm' fw={500}>
                          Timestamp:
                        </Text>
                        <Text
                          size='sm'
                          c='dimmed'
                          ta='right'
                          style={{ fontFamily: 'monospace' }}
                        >
                          {new Date(photo.timestamp).toLocaleString()}
                        </Text>
                      </Group>
                      <Group justify='space-between'>
                        <Text size='sm' fw={500}>
                          Image ID:
                        </Text>
                        <Text
                          size='sm'
                          c='dimmed'
                          ta='right'
                          style={{ fontFamily: 'monospace' }}
                        >
                          {photo.imageId}
                        </Text>
                      </Group>
                    </Stack>

                    {/* Location Info */}
                    {photo.location && (
                      <>
                        <Divider />
                        <Stack gap='xs'>
                          <Group gap='xs'>
                            <IconMapPin size={16} />
                            <Text size='sm' fw={500}>
                              Location:
                            </Text>
                          </Group>
                          <Text size='sm' c='dimmed' pl='md'>
                            {formatLocation(photo)}
                          </Text>
                          {photo.location.accuracy && (
                            <Text size='xs' c='dimmed' pl='md'>
                              Accuracy: ±{Math.round(photo.location.accuracy)} meters
                            </Text>
                          )}
                          {getGoogleMapsUrl(photo) && (
                            <Button
                              component='a'
                              href={getGoogleMapsUrl(photo) || undefined}
                              target='_blank'
                              rel='noopener noreferrer'
                              variant='light'
                              size='xs'
                              leftSection={<IconMapPin size={14} />}
                              fullWidth
                            >
                              View on Google Maps
                            </Button>
                          )}
                        </Stack>
                      </>
                    )}

                    {!photo.location && (
                      <>
                        <Divider />
                        <Alert color='gray' radius='md'>
                          <Text size='xs' c='dimmed'>
                            Location information not available for this sighting
                          </Text>
                        </Alert>
                      </>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
