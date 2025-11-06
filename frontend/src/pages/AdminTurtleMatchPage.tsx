import {
  Container,
  Title,
  Text,
  Stack,
  Grid,
  Group,
  Badge,
  Paper,
  Center,
  Loader,
  Button,
  Alert,
} from '@mantine/core';
import { IconPhoto, IconCheck, IconArrowLeft, IconRecycle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDuplicatePhotosByImageId, type UploadedPhoto } from '../services/mockBackend';
import { useUser } from '../hooks/useUser';
import { PhotoCard } from '../components/PhotoCard';

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

  const handlePhotoClick = (photo: UploadedPhoto) => {
    // Could open a modal here if needed
    console.log('Photo clicked:', photo);
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
                <Stack gap='xs'>
                  {index === 0 && (
                    <Badge color='green' leftSection={<IconCheck size={12} />} size='lg'>
                      Most Recent
                    </Badge>
                  )}
                  <PhotoCard
                    photo={photo}
                    onPhotoClick={handlePhotoClick}
                    showViewAllButton={false}
                  />
                </Stack>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
