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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPhoto, IconInfoCircle, IconCheck } from '@tabler/icons-react';
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
    console.log(item);
    // For now, we'll skip this - can be implemented later
    notifications.show({
      title: 'Info',
      message: 'Creating new turtle is not yet implemented',
      color: 'blue',
    });
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
                <Text size='xs' c='dimmed'>
                  By: {selectedItem.metadata.finder || 'Anonymous'}
                </Text>
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
              <Button variant='outline' onClick={() => handleCreateNew(selectedItem)}>
                Create New Turtle
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
