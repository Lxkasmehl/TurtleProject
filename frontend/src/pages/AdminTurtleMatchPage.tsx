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
  Image,
  Card,
  Modal,
  TextInput,
} from '@mantine/core';
import { IconPhoto, IconCheck, IconArrowLeft, IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { type TurtleMatch, getImageUrl, approveReview } from '../services/api';
import { notifications } from '@mantine/notifications';

interface MatchData {
  request_id: string;
  uploaded_image_path: string;
  matches: TurtleMatch[];
}

export default function AdminTurtleMatchPage() {
  const { role } = useUser();
  const navigate = useNavigate();
  const { imageId } = useParams<{ imageId: string }>();
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
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

    // Load match data from localStorage (saved during upload)
    const loadMatchData = () => {
      setLoading(true);
      try {
        if (imageId) {
          const stored = localStorage.getItem(`match_${imageId}`);
          if (stored) {
            const data: MatchData = JSON.parse(stored);
            setMatchData(data);
          } else {
            // If not found, show error
            console.error('Match data not found for:', imageId);
          }
        }
      } catch (error) {
        console.error('Error loading match data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMatchData();
  }, [imageId, role, navigate]);

  const handleSelectMatch = (turtleId: string) => {
    setSelectedMatch(turtleId);
  };

  const handleConfirmMatch = async () => {
    if (!selectedMatch || !imageId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a match first',
        color: 'red',
      });
      return;
    }

    if (!matchData?.uploaded_image_path) {
      notifications.show({
        title: 'Error',
        message: 'Missing image path',
        color: 'red',
      });
      return;
    }

    setProcessing(true);
    try {
      await approveReview(imageId, {
        match_turtle_id: selectedMatch,
        uploaded_image_path: matchData.uploaded_image_path,
      });

      // Remove from localStorage
      localStorage.removeItem(`match_${imageId}`);

      notifications.show({
        title: 'Success!',
        message: 'Match confirmed successfully',
        color: 'green',
        icon: <IconCheck size={18} />,
      });

      // Navigate back to home
      navigate('/');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to confirm match',
        color: 'red',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = () => {
    // Navigate back without confirming
    navigate('/');
  };

  const handleCreateNewTurtle = async () => {
    if (!newTurtleData.state || !newTurtleData.location || !newTurtleData.turtleId) {
      notifications.show({
        title: 'Error',
        message: 'Please fill in all fields',
        color: 'red',
      });
      return;
    }

    if (!imageId) {
      notifications.show({
        title: 'Error',
        message: 'Missing request ID',
        color: 'red',
      });
      return;
    }

    setProcessing(true);
    try {
      // Create new location string in format "State/Location"
      const newLocation = `${newTurtleData.state}/${newTurtleData.location}`;

      await approveReview(imageId, {
        new_location: newLocation,
        new_turtle_id: newTurtleData.turtleId,
        uploaded_image_path: matchData?.uploaded_image_path,
      });

      // Remove from localStorage
      localStorage.removeItem(`match_${imageId}`);

      notifications.show({
        title: 'Success!',
        message: `New turtle ${newTurtleData.turtleId} created successfully`,
        color: 'green',
        icon: <IconCheck size={18} />,
      });

      // Navigate back to home
      navigate('/');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create new turtle',
        color: 'red',
      });
    } finally {
      setProcessing(false);
      setNewTurtleModalOpen(false);
    }
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
                  <Title order={1}>Select Best Match 🐢</Title>
                  <Text size='sm' c='dimmed' mt='xs'>
                    Review the top 5 matches and select the correct turtle
                  </Text>
                </div>
              </Group>
              <Badge size='lg' variant='light' color='blue'>
                {matchData?.matches.length || 0} Matches Found
              </Badge>
            </Group>
          </Stack>
        </Paper>

        {/* Info Alert */}
        <Alert title='Select the Best Match' color='blue' radius='md'>
          <Text size='sm'>
            The system found {matchData?.matches.length || 0} potential matches. Please
            review each one and select the turtle that best matches the uploaded photo.
          </Text>
        </Alert>

        {/* Loading State */}
        {loading ? (
          <Center py='xl'>
            <Loader size='lg' />
          </Center>
        ) : !matchData || !matchData.matches || matchData.matches.length === 0 ? (
          <Paper shadow='sm' p='xl' radius='md' withBorder>
            <Center py='xl'>
              <Stack gap='md' align='center'>
                <IconPhoto size={64} stroke={1.5} style={{ opacity: 0.3 }} />
                <Text size='lg' c='dimmed' ta='center'>
                  No matches found
                </Text>
                <Text size='sm' c='dimmed' ta='center'>
                  The uploaded photo could not be matched to any existing turtles
                </Text>
                <Group gap='md'>
                  <Button onClick={handleSkip} variant='light'>
                    Go Back
                  </Button>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setNewTurtleModalOpen(true)}
                  >
                    Create New Turtle
                  </Button>
                </Group>
              </Stack>
            </Center>
          </Paper>
        ) : (
          <>
            {/* Uploaded Image */}
            <Paper shadow='sm' p='md' radius='md' withBorder>
              <Stack gap='sm'>
                <Text fw={500}>Uploaded Photo</Text>
                <Image
                  src={
                    matchData.uploaded_image_path
                      ? getImageUrl(matchData.uploaded_image_path)
                      : ''
                  }
                  alt='Uploaded photo'
                  radius='md'
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
              </Stack>
            </Paper>

            {/* Matches */}
            <Paper shadow='sm' p='md' radius='md' withBorder>
              <Stack gap='md'>
                <Text fw={500} size='lg'>
                  Top 5 Matches (Select the best one)
                </Text>
                <Grid gutter='md'>
                  {matchData.matches.map((match, index) => (
                    <Grid.Col
                      key={`${match.turtle_id}-${index}`}
                      span={{ base: 12, md: 6 }}
                    >
                      <Card
                        shadow='sm'
                        padding='md'
                        radius='md'
                        withBorder
                        style={{
                          cursor: 'pointer',
                          border:
                            selectedMatch === match.turtle_id
                              ? '2px solid #228be6'
                              : '1px solid #dee2e6',
                          backgroundColor:
                            selectedMatch === match.turtle_id ? '#e7f5ff' : 'white',
                        }}
                        onClick={() => handleSelectMatch(match.turtle_id)}
                      >
                        <Stack gap='sm'>
                          <Group justify='space-between'>
                            <Badge
                              color={selectedMatch === match.turtle_id ? 'blue' : 'gray'}
                              size='lg'
                            >
                              Rank {index + 1}
                            </Badge>
                            {selectedMatch === match.turtle_id && (
                              <IconCheck size={20} color='#228be6' />
                            )}
                          </Group>
                          <Text fw={500}>Turtle ID: {match.turtle_id}</Text>
                          <Text size='sm' c='dimmed'>
                            Location: {match.location}
                          </Text>
                          <Text size='sm' c='dimmed'>
                            Distance: {match.distance.toFixed(4)}
                          </Text>
                          {match.file_path && (
                            <Image
                              src={getImageUrl(match.file_path)}
                              alt={`Match ${index + 1}`}
                              radius='md'
                              style={{ maxHeight: '200px', objectFit: 'contain' }}
                            />
                          )}
                        </Stack>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              </Stack>
            </Paper>

            {/* Action Buttons */}
            <Group justify='flex-end' gap='md'>
              <Button variant='light' onClick={handleSkip} disabled={processing}>
                Skip
              </Button>
              <Button
                variant='outline'
                leftSection={<IconPlus size={16} />}
                onClick={() => setNewTurtleModalOpen(true)}
                disabled={processing}
              >
                Create New Turtle
              </Button>
              <Button
                onClick={handleConfirmMatch}
                disabled={!selectedMatch || processing}
                loading={processing}
              >
                Confirm Match
              </Button>
            </Group>
          </>
        )}

        {/* Create New Turtle Modal */}
        <Modal
          opened={newTurtleModalOpen}
          onClose={() => setNewTurtleModalOpen(false)}
          title='Create New Turtle'
          size='md'
        >
          <Stack gap='md'>
            <Alert color='blue' radius='md'>
              <Text size='sm'>
                Create a new turtle entry for this photo. This will add the turtle to the
                system with the specified location and ID.
              </Text>
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
                onClick={() => setNewTurtleModalOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNewTurtle}
                loading={processing}
                leftSection={<IconPlus size={16} />}
              >
                Create Turtle
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
