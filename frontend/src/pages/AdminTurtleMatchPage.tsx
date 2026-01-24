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
  Image,
  Card,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { IconPhoto, IconCheck, IconArrowLeft, IconPlus} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import {
  type TurtleMatch,
  getImageUrl,
  approveReview,
  updateTurtleSheetsData,
  type TurtleSheetsData,
} from '../services/api';
import { notifications } from '@mantine/notifications';
import { TurtleSheetsDataForm } from '../components/TurtleSheetsDataForm';

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
  const [sheetsData, setSheetsData] = useState<TurtleSheetsData | null>(null);
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    const loadMatchData = () => {
      setLoading(true);
      try {
        if (imageId) {
          const stored = localStorage.getItem(`match_${imageId}`);
          if (stored) {
            const data: MatchData = JSON.parse(stored);
            setMatchData(data);
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

  const handleSelectMatch = async (turtleId: string) => {
    setSelectedMatch(turtleId);
    // Initialize with turtle ID - user will select sheet and fill in data
    setSheetsData({
      id: turtleId,
    });
    setPrimaryId(turtleId);
  };

  const handleSaveSheetsData = async (data: TurtleSheetsData, sheetName: string) => {
    if (!selectedMatch) {
      throw new Error('No turtle selected');
    }

    const match = matchData?.matches.find((m) => m.turtle_id === selectedMatch);
    if (!match) {
      throw new Error('Match not found');
    }

    const locationParts = match.location.split('/');
    const state = locationParts.length >= 1 ? locationParts[0] : '';
    const location = locationParts.length >= 2 ? locationParts.slice(1).join('/') : '';
    const currentPrimaryId = primaryId || selectedMatch;

    await updateTurtleSheetsData(currentPrimaryId, {
      sheet_name: sheetName,
      state,
      location,
      turtle_data: data,
    });

    setSheetsData(data);
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

      localStorage.removeItem(`match_${imageId}`);

      notifications.show({
        title: 'Success!',
        message: 'Match confirmed successfully',
        color: 'green',
        icon: <IconCheck size={18} />,
      });

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

  const handleCreateNewTurtle = async () => {
    // This will be handled in a new view/modal for creating new turtles
    // For now, navigate or show a form
    notifications.show({
      title: 'Info',
      message: 'New turtle creation will be implemented',
      color: 'blue',
    });
  };

  if (role !== 'admin') {
    return null;
  }

  const selectedMatchData = selectedMatch
    ? matchData?.matches.find((m) => m.turtle_id === selectedMatch)
    : null;

  const locationParts = selectedMatchData?.location.split('/') || [];
  const state = locationParts[0] || '';
  const location = locationParts.slice(1).join('/') || '';

  return (
    <Container size='xl' py='xl'>
      <Stack gap='lg'>
        {/* Header */}
        <Paper shadow='sm' p='xl' radius='md' withBorder>
          <Group justify='space-between' align='center'>
            <Group gap='md'>
              <Button
                variant='light'
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate('/')}
              >
                Back
              </Button>
              <div>
                <Title order={1}>Turtle Match Review 🐢</Title>
                <Text size='sm' c='dimmed' mt='xs'>
                  Select a match and review/edit turtle data
                </Text>
              </div>
            </Group>
            <Badge size='lg' variant='light' color='blue'>
              {matchData?.matches.length || 0} Matches
            </Badge>
          </Group>
        </Paper>

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
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleCreateNewTurtle}
                >
                  Create New Turtle
                </Button>
              </Stack>
            </Center>
          </Paper>
        ) : (
          <Grid gutter='lg'>
            {/* Left Column: Uploaded Image & Matches */}
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Stack gap='md'>
                {/* Uploaded Image */}
                <Paper shadow='sm' p='md' radius='md' withBorder>
                  <Stack gap='sm'>
                    <Text fw={500} size='lg'>Uploaded Photo</Text>
                    <Image
                      src={
                        matchData.uploaded_image_path
                          ? getImageUrl(matchData.uploaded_image_path)
                          : ''
                      }
                      alt='Uploaded photo'
                      radius='md'
                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                    />
                  </Stack>
                </Paper>

                {/* Matches List */}
                <Paper shadow='sm' p='md' radius='md' withBorder>
                  <Stack gap='md'>
                    <Text fw={500} size='lg'>
                      Top 5 Matches
                    </Text>
                    <ScrollArea h={400}>
                      <Stack gap='sm'>
                        {matchData.matches.map((match, index) => (
                          <Card
                            key={`${match.turtle_id}-${index}`}
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
                            <Stack gap='xs'>
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
                                  style={{ maxHeight: '120px', objectFit: 'contain' }}
                                />
                              )}
                            </Stack>
                          </Card>
                        ))}
                      </Stack>
                    </ScrollArea>
                  </Stack>
                </Paper>
              </Stack>
            </Grid.Col>

            {/* Right Column: Selected Match Details & Sheets Data */}
            <Grid.Col span={{ base: 12, md: 7 }}>
              {selectedMatch && selectedMatchData ? (
                <Stack gap='md'>
                  {/* Selected Match Info */}
                  <Paper shadow='sm' p='md' radius='md' withBorder>
                    <Stack gap='sm'>
                      <Group justify='space-between'>
                        <Text fw={500} size='lg'>
                          Selected Match
                        </Text>
                        <Badge color='blue' size='lg'>
                          {matchData.matches.findIndex((m) => m.turtle_id === selectedMatch) + 1}
                        </Badge>
                      </Group>
                      <Divider />
                      <Grid>
                        <Grid.Col span={6}>
                          <Text size='sm' c='dimmed'>Turtle ID</Text>
                          <Text fw={500}>{selectedMatch}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size='sm' c='dimmed'>Location</Text>
                          <Text fw={500}>{selectedMatchData.location}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size='sm' c='dimmed'>Distance</Text>
                          <Text fw={500}>{selectedMatchData.distance.toFixed(4)}</Text>
                        </Grid.Col>
                        {primaryId && (
                          <Grid.Col span={6}>
                            <Text size='sm' c='dimmed'>Primary ID</Text>
                            <Text fw={500}>{primaryId}</Text>
                          </Grid.Col>
                        )}
                      </Grid>
                    </Stack>
                  </Paper>

                  {/* Google Sheets Data Form */}
                  <Paper shadow='sm' p='md' radius='md' withBorder>
                    <ScrollArea h={600}>
                      <TurtleSheetsDataForm
                        initialData={sheetsData || undefined}
                        sheetName={sheetsData?.sheet_name}
                        state={state}
                        location={location}
                        primaryId={primaryId || undefined}
                        mode={sheetsData ? 'edit' : 'create'}
                        onSave={handleSaveSheetsData}
                      />
                    </ScrollArea>
                  </Paper>

                  {/* Action Buttons */}
                  <Paper shadow='sm' p='md' radius='md' withBorder>
                    <Group justify='flex-end' gap='md'>
                      <Button variant='light' onClick={() => navigate('/')} disabled={processing}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleConfirmMatch}
                        disabled={!selectedMatch || processing}
                        loading={processing}
                        leftSection={<IconCheck size={16} />}
                      >
                        Confirm Match
                      </Button>
                    </Group>
                  </Paper>
                </Stack>
              ) : (
                <Paper shadow='sm' p='xl' radius='md' withBorder>
                  <Center py='xl'>
                    <Stack gap='md' align='center'>
                      <IconPhoto size={64} stroke={1.5} style={{ opacity: 0.3 }} />
                      <Text size='lg' c='dimmed' ta='center'>
                        Select a match to view details
                      </Text>
                      <Text size='sm' c='dimmed' ta='center'>
                        Click on any match from the list to see turtle data and Google Sheets information
                      </Text>
                    </Stack>
                  </Center>
                </Paper>
              )}
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
