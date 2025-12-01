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
  Alert,
  Button,
  Card,
  Image,
  Modal,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPhoto, IconInfoCircle, IconCheck, IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useUser } from '../hooks/useUser';
import { useNavigate } from 'react-router-dom';
import {
  getReviewQueue,
  approveReview,
  getImageUrl,
  type ReviewQueueItem,
} from '../services/api';
import { notifications } from '@mantine/notifications';

export default function AdminTurtleRecordsPage() {
  const { role } = useUser();
  const navigate = useNavigate();
  const [queueItems, setQueueItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [newTurtleModalOpen, setNewTurtleModalOpen] = useState(false);
  const [newTurtleData, setNewTurtleData] = useState({
    state: '',
    location: '',
    turtleId: '',
  });

  useEffect(() => {
    // Check if user is admin
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    // Load review queue
    const loadQueue = async () => {
      setLoading(true);
      try {
        const response = await getReviewQueue();
        setQueueItems(response.items);
      } catch (error) {
        console.error('Error loading review queue:', error);
        notifications.show({
          title: 'Error',
          message: error instanceof Error ? error.message : 'Failed to load review queue',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    loadQueue();

    // Refresh every 30 seconds
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, [role, navigate]);

  const handleItemClick = (item: ReviewQueueItem) => {
    setSelectedItem(item);
    open();
  };

  const handleApproveMatch = async (item: ReviewQueueItem, turtleId: string) => {
    setProcessing(item.request_id);
    try {
      await approveReview(item.request_id, {
        match_turtle_id: turtleId,
      });

      notifications.show({
        title: 'Success!',
        message: 'Match approved successfully',
        color: 'green',
        icon: <IconCheck size={18} />,
      });

      // Remove from queue
      setQueueItems((prev) => prev.filter((i) => i.request_id !== item.request_id));
      close();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to approve match',
        color: 'red',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleCreateNew = async (item: ReviewQueueItem) => {
    if (!item) return;

    // Pre-fill location data if available
    if (item.metadata.state && item.metadata.location) {
      setNewTurtleData({
        state: item.metadata.state,
        location: item.metadata.location,
        turtleId: '',
      });
    } else {
      setNewTurtleData({
        state: '',
        location: '',
        turtleId: '',
      });
    }

    // Open the modal for creating new turtle
    setSelectedItem(item);
    setNewTurtleModalOpen(true);
  };

  const handleCreateNewTurtle = async () => {
    if (!selectedItem) return;

    if (!newTurtleData.state || !newTurtleData.location || !newTurtleData.turtleId) {
      notifications.show({
        title: 'Error',
        message: 'Please fill in all fields',
        color: 'red',
      });
      return;
    }

    setProcessing(selectedItem.request_id);
    try {
      // Create new location string in format "State/Location"
      const newLocation = `${newTurtleData.state}/${newTurtleData.location}`;

      await approveReview(selectedItem.request_id, {
        new_location: newLocation,
        new_turtle_id: newTurtleData.turtleId,
        uploaded_image_path: selectedItem.uploaded_image,
      });

      notifications.show({
        title: 'Success!',
        message: `New turtle ${newTurtleData.turtleId} created successfully`,
        color: 'green',
        icon: <IconCheck size={18} />,
      });

      // Remove from queue
      setQueueItems((prev) =>
        prev.filter((i) => i.request_id !== selectedItem.request_id)
      );
      close();
      setNewTurtleModalOpen(false);

      // Reset form
      setNewTurtleData({
        state: '',
        location: '',
        turtleId: '',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create new turtle',
        color: 'red',
      });
    } finally {
      setProcessing(null);
    }
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
                <Title order={1}>Review Queue</Title>
                <Text size='sm' c='dimmed' mt='xs'>
                  Review community uploads and confirm turtle matches
                </Text>
              </div>
              <Group gap='sm'>
                <Badge
                  size='lg'
                  variant='light'
                  color='orange'
                  leftSection={<IconPhoto size={14} />}
                >
                  {queueItems.length} Pending
                </Badge>
              </Group>
            </Group>
          </Stack>
        </Paper>

        {/* Info Alert */}
        <Alert
          icon={<IconInfoCircle size={18} />}
          title='Community Uploads'
          color='blue'
          radius='md'
        >
          <Text size='sm'>
            These photos were uploaded by community members. Review each one and select
            the best match from the top 5 candidates, or create a new turtle if none
            match.
          </Text>
        </Alert>

        {loading ? (
          <Center py='xl'>
            <Loader size='lg' />
          </Center>
        ) : queueItems.length === 0 ? (
          <Paper shadow='sm' p='xl' radius='md' withBorder>
            <Center py='xl'>
              <Stack gap='md' align='center'>
                <IconPhoto size={64} stroke={1.5} style={{ opacity: 0.3 }} />
                <Text size='lg' c='dimmed' ta='center'>
                  No pending reviews
                </Text>
                <Text size='sm' c='dimmed' ta='center'>
                  All community uploads have been reviewed
                </Text>
              </Stack>
            </Center>
          </Paper>
        ) : (
          <Grid gutter='md'>
            {queueItems.map((item) => (
              <Grid.Col key={item.request_id} span={{ base: 12, md: 6, lg: 4 }}>
                <Card shadow='sm' padding='lg' radius='md' withBorder>
                  <Stack gap='md'>
                    <Group justify='space-between'>
                      <Badge color='orange' variant='light'>
                        Pending Review
                      </Badge>
                      <Text size='xs' c='dimmed'>
                        {item.metadata.finder || 'Anonymous'}
                      </Text>
                    </Group>

                    {item.uploaded_image && (
                      <Image
                        src={getImageUrl(item.uploaded_image)}
                        alt='Uploaded photo'
                        radius='md'
                        style={{
                          maxHeight: '200px',
                          objectFit: 'contain',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleItemClick(item)}
                      />
                    )}

                    <Text size='sm' c='dimmed'>
                      {item.candidates.length} matches found
                    </Text>

                    <Button
                      fullWidth
                      variant='light'
                      onClick={() => handleItemClick(item)}
                    >
                      Review Matches
                    </Button>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>

      {/* Review Modal */}
      <Modal opened={opened} onClose={close} title='Review Matches' size='xl' centered>
        {selectedItem && (
          <Stack gap='lg'>
            {/* Uploaded Image */}
            <Paper p='md' radius='md' withBorder>
              <Stack gap='sm'>
                <Text fw={500}>Uploaded Photo</Text>
                <Group justify='space-between' align='flex-start'>
                  <div>
                    <Text size='xs' c='dimmed'>
                      By: {selectedItem.metadata.finder || 'Anonymous'}
                    </Text>
                    {selectedItem.metadata.state && selectedItem.metadata.location && (
                      <Text size='xs' c='dimmed' mt={4}>
                        Location: {selectedItem.metadata.state} /{' '}
                        {selectedItem.metadata.location}
                      </Text>
                    )}
                  </div>
                </Group>
                {selectedItem.uploaded_image && (
                  <Image
                    src={getImageUrl(selectedItem.uploaded_image)}
                    alt='Uploaded photo'
                    radius='md'
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                  />
                )}
              </Stack>
            </Paper>

            {/* Matches */}
            <Paper p='md' radius='md' withBorder>
              <Stack gap='md'>
                <Text fw={500} size='lg'>
                  Top 5 Matches (Select the best one)
                </Text>
                <Grid gutter='md'>
                  {selectedItem.candidates.map((candidate, index) => (
                    <Grid.Col
                      key={`${candidate.turtle_id}-${index}`}
                      span={{ base: 12, md: 6 }}
                    >
                      <Card
                        shadow='sm'
                        padding='md'
                        radius='md'
                        withBorder
                        style={{ cursor: 'pointer' }}
                      >
                        <Stack gap='sm'>
                          <Group justify='space-between'>
                            <Badge color='blue' size='lg'>
                              Rank {candidate.rank}
                            </Badge>
                            <Text size='xs' c='dimmed'>
                              Score: {candidate.score}
                            </Text>
                          </Group>
                          <Text fw={500}>Turtle ID: {candidate.turtle_id}</Text>
                          {candidate.image_path && (
                            <Image
                              src={getImageUrl(candidate.image_path)}
                              alt={`Match ${candidate.rank}`}
                              radius='md'
                              style={{ maxHeight: '150px', objectFit: 'contain' }}
                            />
                          )}
                          <Button
                            size='sm'
                            fullWidth
                            onClick={() =>
                              handleApproveMatch(selectedItem, candidate.turtle_id)
                            }
                            loading={processing === selectedItem.request_id}
                            disabled={processing === selectedItem.request_id}
                          >
                            Select This Match
                          </Button>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              </Stack>
            </Paper>

            {/* Actions */}
            <Group justify='flex-end'>
              <Button variant='light' onClick={close}>
                Cancel
              </Button>
              <Button
                variant='outline'
                leftSection={<IconPlus size={16} />}
                onClick={() => handleCreateNew(selectedItem)}
                disabled={processing === selectedItem.request_id}
              >
                Create New Turtle
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Create New Turtle Modal */}
      <Modal
        opened={newTurtleModalOpen}
        onClose={() => {
          setNewTurtleModalOpen(false);
          setNewTurtleData({
            state: '',
            location: '',
            turtleId: '',
          });
        }}
        title='Create New Turtle'
        size='md'
      >
        <Stack gap='md'>
          <Alert color='blue' radius='md'>
            <Text size='sm'>
              Create a new turtle entry for this photo. This will add the turtle to the
              system with the specified location and ID.
            </Text>
            {selectedItem?.metadata.state && selectedItem?.metadata.location && (
              <Text size='xs' c='dimmed' mt='xs'>
                Location pre-filled from upload: {selectedItem.metadata.state} /{' '}
                {selectedItem.metadata.location}
              </Text>
            )}
          </Alert>

          <TextInput
            label='Turtle ID'
            placeholder='e.g., T101, F42'
            description='Format: Letter + Number (e.g., T101, F42)'
            value={newTurtleData.turtleId}
            onChange={(e) =>
              setNewTurtleData({ ...newTurtleData, turtleId: e.target.value })
            }
            required
          />

          <TextInput
            label='State'
            placeholder='e.g., Kansas, Nebraska'
            value={newTurtleData.state}
            onChange={(e) =>
              setNewTurtleData({ ...newTurtleData, state: e.target.value })
            }
            required
          />

          <TextInput
            label='Location'
            placeholder='e.g., Topeka, Lawrence'
            value={newTurtleData.location}
            onChange={(e) =>
              setNewTurtleData({ ...newTurtleData, location: e.target.value })
            }
            required
          />

          <Group justify='flex-end' gap='md' mt='md'>
            <Button
              variant='light'
              onClick={() => {
                setNewTurtleModalOpen(false);
                setNewTurtleData({
                  state: '',
                  location: '',
                  turtleId: '',
                });
              }}
              disabled={processing === selectedItem?.request_id}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewTurtle}
              loading={processing === selectedItem?.request_id}
              leftSection={<IconPlus size={16} />}
            >
              Create Turtle
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
