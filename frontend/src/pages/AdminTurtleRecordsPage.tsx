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
  Collapse,
  Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPhoto,
  IconClock,
  IconFile,
  IconX,
  IconInfoCircle,
  IconMapPin,
  IconChevronDown,
  IconChevronUp,
  IconRecycle,
} from '@tabler/icons-react';
import { useEffect, useState, useMemo } from 'react';
import {
  getAllUploadedPhotos,
  getDuplicatePhotosByImageId,
  type UploadedPhoto,
} from '../services/mockBackend';
import { useUser } from '../hooks/useUser';
import { useNavigate } from 'react-router-dom';

interface PhotoGroup {
  representative: UploadedPhoto; // The first/oldest photo in the group
  photos: UploadedPhoto[]; // All photos in this group
  isDuplicate: boolean; // Whether this group has duplicates
}

export default function AdminTurtleRecordsPage() {
  const { role } = useUser();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<UploadedPhoto | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  // Group photos by duplicate hash
  const photoGroups = useMemo<PhotoGroup[]>(() => {
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

  const toggleGroup = (imageId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

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
            {photoGroups.map((group) => (
              <Grid.Col
                key={group.representative.imageId}
                span={{ base: 12, md: 6, lg: 4 }}
              >
                <Card shadow='sm' padding='md' radius='md' withBorder>
                  <Stack gap='md'>
                    {/* Main Photo with Info */}
                    <Group gap='md' align='flex-start' wrap='nowrap'>
                      <Image
                        src={group.representative.preview}
                        alt={group.representative.fileName}
                        width={120}
                        height={120}
                        fit='cover'
                        radius='md'
                        style={{ cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => handlePhotoClick(group.representative)}
                      />
                      <Stack gap='xs' style={{ flex: 1, minWidth: 0 }}>
                        <Group justify='space-between' align='flex-start' wrap='nowrap'>
                          <Text
                            size='sm'
                            fw={500}
                            lineClamp={2}
                            title={group.representative.fileName}
                            style={{ flex: 1 }}
                          >
                            {group.representative.fileName}
                          </Text>
                          {group.isDuplicate && (
                            <Badge
                              color='green'
                              variant='light'
                              size='sm'
                              leftSection={<IconRecycle size={12} />}
                            >
                              {group.photos.length}×
                            </Badge>
                          )}
                        </Group>
                        <Group gap='xs' wrap='wrap'>
                          <Badge
                            size='xs'
                            variant='light'
                            color='gray'
                            leftSection={<IconFile size={10} />}
                          >
                            {formatFileSize(group.representative.fileSize)}
                          </Badge>
                          <Badge
                            size='xs'
                            variant='light'
                            color='blue'
                            leftSection={<IconClock size={10} />}
                          >
                            {group.representative.uploadDate}
                          </Badge>
                          {group.representative.location && (
                            <Badge
                              size='xs'
                              variant='light'
                              color='teal'
                              leftSection={<IconMapPin size={10} />}
                            >
                              Location
                            </Badge>
                          )}
                        </Group>
                        {group.representative.location && (
                          <Text size='xs' c='dimmed' lineClamp={1}>
                            {formatLocation(group.representative)}
                          </Text>
                        )}
                      </Stack>
                    </Group>

                    {/* Duplicate Photos */}
                    {group.isDuplicate && (
                      <>
                        <Divider />
                        <Stack gap='xs'>
                          <Button
                            variant='light'
                            size='xs'
                            leftSection={
                              expandedGroups.has(group.representative.imageId) ? (
                                <IconChevronUp size={14} />
                              ) : (
                                <IconChevronDown size={14} />
                              )
                            }
                            onClick={() => toggleGroup(group.representative.imageId)}
                            fullWidth
                          >
                            <Group
                              gap='xs'
                              justify='space-between'
                              style={{ width: '100%' }}
                            >
                              <Text size='xs' fw={500}>
                                {group.photos.length - 1} Additional Sighting
                                {group.photos.length - 1 > 1 ? 's' : ''}
                              </Text>
                              <Badge color='green' variant='light' size='xs'>
                                {group.photos.length} Total
                              </Badge>
                            </Group>
                          </Button>

                          <Collapse in={expandedGroups.has(group.representative.imageId)}>
                            <Stack gap='xs' mt='xs'>
                              {group.photos.slice(1).map((photo) => (
                                <Card
                                  key={photo.imageId}
                                  shadow='xs'
                                  padding='xs'
                                  radius='md'
                                  withBorder
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handlePhotoClick(photo)}
                                >
                                  <Group gap='sm' align='flex-start' wrap='nowrap'>
                                    <Image
                                      src={photo.preview}
                                      alt={photo.fileName}
                                      width={60}
                                      height={60}
                                      fit='cover'
                                      radius='md'
                                      style={{ flexShrink: 0 }}
                                    />
                                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                                      <Text size='xs' fw={500} lineClamp={1}>
                                        {photo.fileName}
                                      </Text>
                                      <Group gap='xs' wrap='wrap'>
                                        <Badge size='xs' variant='light' color='blue'>
                                          {photo.uploadDate}
                                        </Badge>
                                        {photo.location && (
                                          <Badge
                                            size='xs'
                                            variant='light'
                                            color='teal'
                                            leftSection={<IconMapPin size={8} />}
                                          >
                                            {photo.location.address ? 'Loc' : 'Coords'}
                                          </Badge>
                                        )}
                                      </Group>
                                      {photo.location && (
                                        <Text size='xs' c='dimmed' lineClamp={1}>
                                          {formatLocation(photo)}
                                        </Text>
                                      )}
                                    </Stack>
                                  </Group>
                                </Card>
                              ))}
                            </Stack>
                          </Collapse>

                          <Button
                            variant='subtle'
                            size='xs'
                            leftSection={<IconRecycle size={12} />}
                            onClick={() =>
                              navigate(
                                `/admin/turtle-match/${group.representative.imageId}`
                              )
                            }
                            fullWidth
                          >
                            View All {group.photos.length} Sightings
                          </Button>
                        </Stack>
                      </>
                    )}
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

            {/* Location Info */}
            {selectedPhoto.location && (
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
                    {formatLocation(selectedPhoto)}
                  </Text>
                  {selectedPhoto.location.accuracy && (
                    <Text size='xs' c='dimmed' pl='md'>
                      Accuracy: ±{Math.round(selectedPhoto.location.accuracy)} meters
                    </Text>
                  )}
                  {getGoogleMapsUrl(selectedPhoto) && (
                    <Button
                      component='a'
                      href={getGoogleMapsUrl(selectedPhoto) || undefined}
                      target='_blank'
                      rel='noopener noreferrer'
                      variant='light'
                      size='sm'
                      leftSection={<IconMapPin size={14} />}
                      fullWidth
                    >
                      View on Google Maps
                    </Button>
                  )}
                </Stack>
              </>
            )}

            {!selectedPhoto.location && (
              <>
                <Divider />
                <Alert color='gray' radius='md'>
                  <Text size='xs' c='dimmed'>
                    Location information not available for this photo
                  </Text>
                </Alert>
              </>
            )}

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
