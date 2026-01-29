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
  Divider,
  ScrollArea,
  Tabs,
  TextInput,
} from '@mantine/core';
import {
  IconPhoto,
  IconInfoCircle,
  IconCheck,
  IconDatabase,
  IconSearch,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useUser } from '../hooks/useUser';
import { useNavigate } from 'react-router-dom';
import {
  getReviewQueue,
  approveReview,
  getImageUrl,
  getTurtleSheetsData,
  type ReviewQueueItem,
  updateTurtleSheetsData,
  listAllTurtlesFromSheets,
  type TurtleSheetsData,
} from '../services/api';
import { notifications } from '@mantine/notifications';
import { TurtleSheetsDataForm } from '../components/TurtleSheetsDataForm';

export default function AdminTurtleRecordsPage() {
  const { role } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('queue');
  
  // Review Queue State
  const [queueItems, setQueueItems] = useState<ReviewQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [sheetsData, setSheetsData] = useState<TurtleSheetsData | null>(null);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [loadingTurtleData, setLoadingTurtleData] = useState(false);

  // Google Sheets Browser State
  const [allTurtles, setAllTurtles] = useState<TurtleSheetsData[]>([]);
  const [turtlesLoading, setTurtlesLoading] = useState(false);
  const [selectedTurtle, setSelectedTurtle] = useState<TurtleSheetsData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    if (activeTab === 'queue') {
      loadQueue();
      const interval = setInterval(loadQueue, 30000);
      return () => clearInterval(interval);
    } else if (activeTab === 'sheets') {
      loadAllTurtles();
    }
  }, [role, navigate, activeTab]);

  const loadQueue = async () => {
    setQueueLoading(true);
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
      setQueueLoading(false);
    }
  };

  const loadAllTurtles = async () => {
    setTurtlesLoading(true);
    try {
      const response = await listAllTurtlesFromSheets(undefined);
      if (response.success) {
        setAllTurtles(response.turtles);
      }
    } catch (error) {
      console.error('Error loading turtles:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to load turtles',
        color: 'red',
      });
    } finally {
      setTurtlesLoading(false);
    }
  };

  const handleItemSelect = (item: ReviewQueueItem, candidateId?: string) => {
    setSelectedItem(item);
    setSelectedCandidate(candidateId || null);
    setSheetsData(null);
    setPrimaryId(null);

    if (candidateId) {
      loadSheetsDataForCandidate(item, candidateId);
    }
  };

  const loadSheetsDataForCandidate = async (item: ReviewQueueItem, candidateId: string) => {
    setLoadingTurtleData(true);

    const matchState = item.metadata.state || '';
    const matchLocation = item.metadata.location || '';

    try {
      let response = await getTurtleSheetsData(candidateId);

      if (!response.exists && matchState && (!response.data || Object.keys(response.data).length <= 3)) {
        try {
          response = await getTurtleSheetsData(candidateId, matchState, matchState, matchLocation);
        } catch {
          // Ignore, use first response
        }
      }

      if (response.success && response.data) {
        const hasRealData =
          response.exists ||
          !!(
            response.data.name ||
            response.data.species ||
            response.data.sex ||
            response.data.transmitter_id ||
            response.data.sheet_name ||
            response.data.date_1st_found ||
            response.data.notes ||
            Object.keys(response.data).length > 3
          );

        if (hasRealData) {
          setSheetsData(response.data);
          setPrimaryId(response.data.primary_id || candidateId);
        } else {
          setPrimaryId(candidateId);
          setSheetsData({
            id: candidateId,
            general_location: matchState || '',
            location: matchLocation || '',
          });
        }
      } else {
        setPrimaryId(candidateId);
        setSheetsData({
          id: candidateId,
          general_location: matchState || '',
          location: matchLocation || '',
        });
      }
    } catch {
      setPrimaryId(candidateId);
      setSheetsData({
        id: candidateId,
        general_location: matchState || '',
        location: matchLocation || '',
      });
    } finally {
      setLoadingTurtleData(false);
    }
  };


  const handleSaveSheetsData = async (data: TurtleSheetsData, sheetName: string) => {
    if (!selectedItem || !selectedCandidate) {
      throw new Error('No turtle selected');
    }

    const state = selectedItem.metadata.state || '';
    const location = selectedItem.metadata.location || '';
    const currentPrimaryId = primaryId || selectedCandidate;

    await updateTurtleSheetsData(currentPrimaryId, {
      sheet_name: sheetName,
      state,
      location,
      turtle_data: data,
    });

    setSheetsData(data);
  };

  const handleSaveTurtleFromBrowser = async (data: TurtleSheetsData, sheetName: string) => {
    if (!selectedTurtle) {
      throw new Error('No turtle selected');
    }

    const primaryId = selectedTurtle.primary_id || selectedTurtle.id;
    const state = selectedTurtle.general_location || '';
    const location = selectedTurtle.location || '';

    if (!primaryId) {
      throw new Error('Missing primary ID');
    }

    await updateTurtleSheetsData(primaryId, {
      sheet_name: sheetName,
      state,
      location,
      turtle_data: data,
    });

    // Reload turtles
    await loadAllTurtles();
    setSelectedTurtle({ ...data, primary_id: primaryId, sheet_name: sheetName });
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

      setQueueItems((prev) => prev.filter((i) => i.request_id !== item.request_id));
      
      if (selectedItem?.request_id === item.request_id) {
        setSelectedItem(null);
        setSelectedCandidate(null);
        setSheetsData(null);
        setPrimaryId(null);
      }
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

  if (role !== 'admin') {
    return null;
  }

  const filteredTurtles = allTurtles.filter((turtle) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      turtle.id?.toLowerCase().includes(query) ||
      turtle.name?.toLowerCase().includes(query) ||
      turtle.species?.toLowerCase().includes(query) ||
      turtle.location?.toLowerCase().includes(query) ||
      turtle.general_location?.toLowerCase().includes(query)
    );
  });

  const state = selectedItem?.metadata.state || '';
  const location = selectedItem?.metadata.location || '';

  return (
    <Container size='xl' py='xl'>
      <Stack gap='lg'>
        {/* Header */}
        <Paper shadow='sm' p='xl' radius='md' withBorder>
          <Stack gap='md'>
            <Group justify='space-between' align='center'>
              <div>
                <Title order={1}>Turtle Records</Title>
                <Text size='sm' c='dimmed' mt='xs'>
                  Review queue and manage turtle data in Google Sheets
                </Text>
              </div>
              {activeTab === 'queue' && (
                <Badge size='lg' variant='light' color='orange' leftSection={<IconPhoto size={14} />}>
                  {queueItems.length} Pending
                </Badge>
              )}
            </Group>
          </Stack>
        </Paper>

        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'queue')}>
          <Tabs.List>
            <Tabs.Tab value='queue' leftSection={<IconPhoto size={16} />}>
              Review Queue ({queueItems.length})
            </Tabs.Tab>
            <Tabs.Tab value='sheets' leftSection={<IconDatabase size={16} />}>
              Google Sheets Browser
            </Tabs.Tab>
          </Tabs.List>

          {/* Tab 1: Review Queue */}
          <Tabs.Panel value='queue' pt='md'>
            <Alert icon={<IconInfoCircle size={18} />} title='Community Uploads' color='blue' radius='md' mb='md'>
              <Text size='sm'>
                These photos were uploaded by community members. Select an item to review matches and
                manage turtle data in Google Sheets.
              </Text>
            </Alert>

            {queueLoading ? (
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
                  </Stack>
                </Center>
              </Paper>
            ) : (
              <Grid gutter='lg'>
                <Grid.Col span={{ base: 12, md: 5 }}>
                  <Paper shadow='sm' p='md' radius='md' withBorder>
                    <Stack gap='md'>
                      <Text fw={500} size='lg'>Pending Reviews</Text>
                      <ScrollArea h={700}>
                        <Stack gap='md'>
                          {queueItems.map((item) => (
                            <Card
                              key={item.request_id}
                              shadow='sm'
                              padding='md'
                              radius='md'
                              withBorder
                              style={{
                                cursor: 'pointer',
                                border:
                                  selectedItem?.request_id === item.request_id
                                    ? '2px solid #228be6'
                                    : '1px solid #dee2e6',
                                backgroundColor:
                                  selectedItem?.request_id === item.request_id ? '#e7f5ff' : 'white',
                              }}
                              onClick={() => handleItemSelect(item)}
                            >
                              <Stack gap='sm'>
                                <Group justify='space-between'>
                                  <Badge color='orange' variant='light'>Pending</Badge>
                                  <Text size='xs' c='dimmed'>{item.metadata.finder || 'Anonymous'}</Text>
                                </Group>
                                {item.uploaded_image && (
                                  <Image
                                    src={getImageUrl(item.uploaded_image)}
                                    alt='Uploaded photo'
                                    radius='md'
                                    style={{ maxHeight: '150px', objectFit: 'contain' }}
                                  />
                                )}
                                <Text size='sm' c='dimmed'>{item.candidates.length} matches found</Text>
                                {item.metadata.state && item.metadata.location && (
                                  <Text size='xs' c='dimmed'>
                                    Location: {item.metadata.state} / {item.metadata.location}
                                  </Text>
                                )}
                              </Stack>
                            </Card>
                          ))}
                        </Stack>
                      </ScrollArea>
                    </Stack>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 7 }}>
                  {selectedItem ? (
                    <Stack gap='md' style={{ position: 'relative' }}>
                      {loadingTurtleData && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            borderRadius: 'var(--mantine-radius-md)',
                          }}
                        >
                          <Stack align='center' gap='md'>
                            <Loader size='xl' />
                            <Text size='lg' fw={500}>
                              Loading turtle data…
                            </Text>
                          </Stack>
                        </div>
                      )}
                      <Paper shadow='sm' p='md' radius='md' withBorder>
                        <Stack gap='sm'>
                          <Text fw={500} size='lg'>Uploaded Photo</Text>
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

                      <Paper shadow='sm' p='md' radius='md' withBorder>
                        <Stack gap='md'>
                          <Text fw={500} size='lg'>Top 5 Matches</Text>
                          <ScrollArea h={200}>
                            <Stack gap='sm'>
                              {selectedItem.candidates.map((candidate) => (
                                <Card
                                  key={candidate.turtle_id}
                                  shadow='sm'
                                  padding='sm'
                                  radius='md'
                                  withBorder
                                  style={{
                                    cursor: 'pointer',
                                    border:
                                      selectedCandidate === candidate.turtle_id
                                        ? '2px solid #228be6'
                                        : '1px solid #dee2e6',
                                    backgroundColor:
                                      selectedCandidate === candidate.turtle_id ? '#e7f5ff' : 'white',
                                  }}
                                  onClick={() => handleItemSelect(selectedItem, candidate.turtle_id)}
                                >
                                  <Group justify='space-between'>
                                    <Group gap='sm'>
                                      <Badge color='blue' size='sm'>Rank {candidate.rank}</Badge>
                                      <div>
                                        <Text fw={500} size='sm'>Turtle ID: {candidate.turtle_id}</Text>
                                        <Text size='xs' c='dimmed'>Score: {candidate.score}</Text>
                                      </div>
                                    </Group>
                                    {selectedCandidate === candidate.turtle_id && (
                                      <IconCheck size={20} color='#228be6' />
                                    )}
                                  </Group>
                                </Card>
                              ))}
                            </Stack>
                          </ScrollArea>
                        </Stack>
                      </Paper>

                      {selectedCandidate ? (
                    <Paper shadow='sm' p='md' radius='md' withBorder>
                      <ScrollArea h={300}>
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
                  ) : (
                        <Paper shadow='sm' p='xl' radius='md' withBorder>
                          <Center py='xl'>
                            <Text size='sm' c='dimmed' ta='center'>
                              Select a match candidate to view and edit Google Sheets data
                            </Text>
                          </Center>
                        </Paper>
                      )}

                      {selectedCandidate && (
                        <Paper shadow='sm' p='md' radius='md' withBorder>
                          <Group justify='flex-end' gap='md'>
                            <Button
                              onClick={() => handleApproveMatch(selectedItem, selectedCandidate)}
                              loading={processing === selectedItem.request_id}
                              disabled={processing === selectedItem.request_id}
                              leftSection={<IconCheck size={16} />}
                            >
                              Approve Match
                            </Button>
                          </Group>
                        </Paper>
                      )}
                    </Stack>
                  ) : (
                    <Paper shadow='sm' p='xl' radius='md' withBorder>
                      <Center py='xl'>
                        <Text size='sm' c='dimmed' ta='center'>
                          Select an item to review
                        </Text>
                      </Center>
                    </Paper>
                  )}
                </Grid.Col>
              </Grid>
            )}
          </Tabs.Panel>

          {/* Tab 2: Google Sheets Browser */}
          <Tabs.Panel value='sheets' pt='md'>
            <Grid gutter='lg'>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper shadow='sm' p='md' radius='md' withBorder>
                  <Stack gap='md'>
                    <Text fw={500} size='lg'>Search & Filter</Text>
                    <TextInput
                      placeholder='Search by ID, name, species, location...'
                      leftSection={<IconSearch size={16} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button onClick={loadAllTurtles} loading={turtlesLoading} fullWidth>
                      Refresh
                    </Button>
                    <Divider />
                    <Text size='sm' c='dimmed'>
                      {filteredTurtles.length} of {allTurtles.length} turtles
                    </Text>
                    <ScrollArea h={600}>
                      <Stack gap='xs'>
                        {filteredTurtles.map((turtle, index) => (
                          <Card
                            key={`${turtle.primary_id || turtle.id || 'turtle'}-${index}-${turtle.sheet_name || ''}`}
                            shadow='sm'
                            padding='sm'
                            radius='md'
                            withBorder
                            style={{
                              cursor: 'pointer',
                              border:
                                selectedTurtle?.primary_id === (turtle.primary_id || turtle.id)
                                  ? '2px solid #228be6'
                                  : '1px solid #dee2e6',
                              backgroundColor:
                                selectedTurtle?.primary_id === (turtle.primary_id || turtle.id)
                                  ? '#e7f5ff'
                                  : 'white',
                            }}
                            onClick={() => setSelectedTurtle(turtle)}
                          >
                            <Stack gap={4}>
                              {/* Name - most prominent */}
                              {turtle.name ? (
                                <Text fw={600} size='md' c='blue'>
                                  {turtle.name}
                                </Text>
                              ) : (
                                <Text fw={500} size='sm' c='dimmed' fs='italic'>
                                  No name
                                </Text>
                              )}
                              
                              {/* Location and Species */}
                              <Stack gap={2}>
                                {turtle.location && (
                                  <Text size='sm' fw={500}>
                                    📍 {turtle.location}
                                  </Text>
                                )}
                                {turtle.species && (
                                  <Text size='sm' c='dimmed'>
                                    🐢 {turtle.species}
                                  </Text>
                                )}
                              </Stack>
                              
                              {/* IDs - smaller, at the bottom */}
                              <Stack gap={2} mt='xs'>
                                {turtle.primary_id && (
                                  <Text size='xs' c='dimmed'>
                                    Primary ID: <strong>{turtle.primary_id}</strong>
                                  </Text>
                                )}
                                {turtle.id && turtle.id !== turtle.primary_id && (
                                  <Text size='xs' c='dimmed'>
                                    ID: {turtle.id}
                                  </Text>
                                )}
                                {!turtle.primary_id && !turtle.id && (
                                  <Text size='xs' c='red' fs='italic'>
                                    No ID
                                  </Text>
                                )}
                              </Stack>
                            </Stack>
                          </Card>
                        ))}
                      </Stack>
                    </ScrollArea>
                  </Stack>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 8 }}>
                {selectedTurtle ? (
                  <Paper shadow='sm' p='md' radius='md' withBorder>
                    <ScrollArea h={700}>
                      <TurtleSheetsDataForm
                        initialData={selectedTurtle}
                        sheetName={selectedTurtle.sheet_name}
                        state={selectedTurtle.general_location || ''}
                        location={selectedTurtle.location || ''}
                        primaryId={selectedTurtle.primary_id || selectedTurtle.id || undefined}
                        mode='edit'
                        onSave={handleSaveTurtleFromBrowser}
                      />
                    </ScrollArea>
                  </Paper>
                ) : (
                  <Paper shadow='sm' p='xl' radius='md' withBorder>
                    <Center py='xl'>
                      <Stack gap='md' align='center'>
                        <IconDatabase size={64} stroke={1.5} style={{ opacity: 0.3 }} />
                        <Text size='lg' c='dimmed' ta='center'>
                          Select a turtle to edit
                        </Text>
                        <Text size='sm' c='dimmed' ta='center'>
                          Choose a turtle from the list to view and edit its Google Sheets data
                        </Text>
                      </Stack>
                    </Center>
                  </Paper>
                )}
              </Grid.Col>
            </Grid>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
