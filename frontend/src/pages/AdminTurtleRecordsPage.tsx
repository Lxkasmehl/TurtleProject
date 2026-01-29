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
  Card,
  Image,
  Divider,
  ScrollArea,
  Tabs,
  TextInput,
  Flex,
  Modal,
  Select,
} from '@mantine/core';
import {
  IconPhoto,
  IconCheck,
  IconDatabase,
  IconSearch,
  IconList,
  IconTrash,
  IconMapPin,
} from '@tabler/icons-react';
import { useEffect, useState, useRef } from 'react';
import { useUser } from '../hooks/useUser';
import { useNavigate } from 'react-router-dom';
import {
  getReviewQueue,
  approveReview,
  deleteReviewItem,
  getImageUrl,
  getTurtleSheetsData,
  type ReviewQueueItem,
  updateTurtleSheetsData,
  listAllTurtlesFromSheets,
  listSheets,
  type TurtleSheetsData,
} from '../services/api';
import { notifications } from '@mantine/notifications';
import { TurtleSheetsDataForm, type TurtleSheetsDataFormRef } from '../components/TurtleSheetsDataForm';

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
  /** Names for top-5 candidates (turtle_id -> name from Sheets), loaded when item is selected */
  const [candidateNames, setCandidateNames] = useState<Record<string, string>>({});
  /** Original turtle ID from sheet (turtle_id -> sheet's "id" field), not primary_id */
  const [candidateOriginalIds, setCandidateOriginalIds] = useState<Record<string, string>>({});
  const [loadingCandidateNames, setLoadingCandidateNames] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ReviewQueueItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const sheetsFormRef = useRef<TurtleSheetsDataFormRef>(null);
  // Google Sheets Browser State
  const [allTurtles, setAllTurtles] = useState<TurtleSheetsData[]>([]);
  const [turtlesLoading, setTurtlesLoading] = useState(false);
  const [selectedTurtle, setSelectedTurtle] = useState<TurtleSheetsData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  /** Filter by spreadsheet/location (sheet name). '' = all sheets */
  const [selectedSheetFilter, setSelectedSheetFilter] = useState<string>('');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [sheetsListLoading, setSheetsListLoading] = useState(false);

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
      loadAvailableSheets();
      loadAllTurtles(selectedSheetFilter || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when tab changes; filter changes trigger load from Select onChange
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

  const loadAvailableSheets = async () => {
    setSheetsListLoading(true);
    try {
      const response = await listSheets();
      if (response.success && response.sheets?.length) {
        setAvailableSheets(response.sheets);
      } else {
        setAvailableSheets([]);
      }
    } catch (error) {
      console.error('Error loading sheets list:', error);
      setAvailableSheets([]);
    } finally {
      setSheetsListLoading(false);
    }
  };

  const loadAllTurtles = async (sheetFilter?: string) => {
    const sheetToLoad = sheetFilter !== undefined ? sheetFilter : selectedSheetFilter;
    setTurtlesLoading(true);
    try {
      const response = await listAllTurtlesFromSheets(sheetToLoad || undefined);
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
    const isNewItem = item.request_id !== selectedItem?.request_id;
    setSelectedItem(item);
    setSelectedCandidate(candidateId || null);
    setSheetsData(null);
    setPrimaryId(null);
    if (isNewItem) {
      setCandidateNames({});
      setCandidateOriginalIds({});
    }

    if (candidateId) {
      loadSheetsDataForCandidate(item, candidateId);
    }
    // Load names for all 5 candidates only when switching to a new queue item
    if (isNewItem) loadCandidateNames(item);
  };

  const loadCandidateNames = async (item: ReviewQueueItem) => {
    if (!item.candidates?.length) return;
    setLoadingCandidateNames(true);
    const matchState = item.metadata.state || '';
    const matchLocation = item.metadata.location || '';
    const names: Record<string, string> = {};
    const originalIds: Record<string, string> = {};
    await Promise.all(
      item.candidates.map(async (c) => {
        try {
          let res = await getTurtleSheetsData(c.turtle_id);
          if (!res.exists && matchState && (!res.data || Object.keys(res.data || {}).length <= 3)) {
            try {
              res = await getTurtleSheetsData(c.turtle_id, matchState, matchState, matchLocation);
            } catch {
              // ignore
            }
          }
          if (res.success && res.data) {
            if (res.data.name) names[c.turtle_id] = res.data.name;
            if (res.data.id) originalIds[c.turtle_id] = res.data.id;
          }
        } catch {
          // leave name/id empty
        }
      })
    );
    setCandidateNames(names);
    setCandidateOriginalIds(originalIds);
    setLoadingCandidateNames(false);
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
          if (response.data.name) {
            setCandidateNames((prev) => ({ ...prev, [candidateId]: response.data!.name! }));
          }
          if (response.data.id) {
            setCandidateOriginalIds((prev) => ({ ...prev, [candidateId]: response.data!.id! }));
          }
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

  // Combined: save to sheets and approve match (one button, like AdminTurtleMatchPage)
  const handleSaveAndApprove = async (data: TurtleSheetsData, sheetName: string) => {
    if (!selectedItem || !selectedCandidate) {
      throw new Error('No turtle selected');
    }
    setProcessing(selectedItem.request_id);
    try {
      await handleSaveSheetsData(data, sheetName);
      await approveReview(selectedItem.request_id, {
        match_turtle_id: selectedCandidate,
      });
      notifications.show({
        title: 'Success!',
        message: 'Saved to Sheets and match approved',
        color: 'green',
        icon: <IconCheck size={18} />,
      });
      setQueueItems((prev) => prev.filter((i) => i.request_id !== selectedItem.request_id));
      setSelectedItem(null);
      setSelectedCandidate(null);
      setSheetsData(null);
      setPrimaryId(null);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save and approve',
        color: 'red',
      });
      throw error;
    } finally {
      setProcessing(null);
    }
  };

  const handleCombinedButtonClick = async () => {
    if (sheetsFormRef.current) {
      await sheetsFormRef.current.submit();
    }
  };

  const handleOpenDeleteModal = (item: ReviewQueueItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await deleteReviewItem(itemToDelete.request_id);
      notifications.show({
        title: 'Deleted',
        message: 'Upload removed from review queue',
        color: 'green',
      });
      setQueueItems((prev) => prev.filter((i) => i.request_id !== itemToDelete.request_id));
      if (selectedItem?.request_id === itemToDelete.request_id) {
        setSelectedItem(null);
        setSelectedCandidate(null);
        setSheetsData(null);
        setPrimaryId(null);
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete',
        color: 'red',
      });
    } finally {
      setDeleting(false);
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
        {/* Header – compact */}
        <Paper shadow='sm' p='md' radius='md' withBorder>
          <Group justify='space-between' align='center' wrap='nowrap' gap='md'>
            <div>
              <Title order={2} size='h3'>Turtle Records</Title>
              <Text size='xs' c='dimmed'>Review queue and Google Sheets</Text>
            </div>
            {activeTab === 'queue' && queueItems.length > 0 && (
              <Badge size='md' variant='light' color='orange' leftSection={<IconPhoto size={12} />}>
                {queueItems.length} Pending
              </Badge>
            )}
          </Group>
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
              <>
                {selectedItem ? (
                  <Stack gap='lg' style={{ position: 'relative' }}>
                    <Group justify='space-between' wrap='nowrap'>
                      <Button
                        variant='subtle'
                        leftSection={<IconList size={16} />}
                        size='sm'
                        onClick={() => {
                          setSelectedItem(null);
                          setSelectedCandidate(null);
                          setSheetsData(null);
                          setPrimaryId(null);
                        }}
                      >
                        ← Back to list ({queueItems.length} pending)
                      </Button>
                      <Button
                        variant='subtle'
                        color='red'
                        size='sm'
                        leftSection={<IconTrash size={16} />}
                        onClick={(e) => handleOpenDeleteModal(selectedItem, e)}
                      >
                        Delete this upload
                      </Button>
                    </Group>

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

                    {/* Compare: Uploaded photo (left) vs Top 5 matches (right) – full width, big thumbnails */}
                    <Paper shadow='sm' p='md' radius='md' withBorder>
                      <Grid gutter='lg'>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <Stack gap='xs'>
                            <Text fw={600} size='sm' c='dimmed'>Uploaded Photo</Text>
                            {selectedItem.uploaded_image && (
                              <Image
                                src={getImageUrl(selectedItem.uploaded_image)}
                                alt='Uploaded photo'
                                radius='md'
                                style={{ maxHeight: '320px', objectFit: 'contain', width: '100%' }}
                              />
                            )}
                          </Stack>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 8 }}>
                          <Stack gap='xs'>
                            <Group gap='xs'>
                              <Text fw={600} size='sm' c='dimmed'>Top 5 Matches</Text>
                              {loadingCandidateNames && <Loader size='xs' />}
                            </Group>
                            <Flex gap='sm' wrap='wrap' align='stretch'>
                              {selectedItem.candidates.map((candidate) => (
                                <Card
                                  key={candidate.turtle_id}
                                  shadow='sm'
                                  padding='sm'
                                  radius='md'
                                  withBorder
                                  style={{
                                    flex: '1 1 0',
                                    minWidth: 140,
                                    maxWidth: 220,
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
                                  <Stack gap={6}>
                                    {candidate.image_path ? (
                                      <Image
                                        src={getImageUrl(candidate.image_path)}
                                        alt={`Match ${candidate.rank}`}
                                        radius='sm'
                                        style={{ height: 200, objectFit: 'cover', width: '100%' }}
                                      />
                                    ) : (
                                      <Center style={{ height: 200 }} c='dimmed'>
                                        <IconPhoto size={48} />
                                      </Center>
                                    )}
                                    <Text fw={600} size='sm' lineClamp={1} title={candidateNames[candidate.turtle_id] || candidate.turtle_id}>
                                      {candidateNames[candidate.turtle_id] || candidate.turtle_id}
                                    </Text>
                                    <Text size='xs' c='dimmed'>
                                      ID: {candidateOriginalIds[candidate.turtle_id] ?? candidate.turtle_id} · Score: {candidate.score}
                                    </Text>
                                    <Badge size='sm' variant='light' color='blue'>#{candidate.rank}</Badge>
                                    {selectedCandidate === candidate.turtle_id && (
                                      <IconCheck size={18} color='#228be6' style={{ alignSelf: 'center' }} />
                                    )}
                                  </Stack>
                                </Card>
                              ))}
                            </Flex>
                          </Stack>
                        </Grid.Col>
                      </Grid>
                    </Paper>

                    {selectedCandidate ? (
                      <>
                        <Paper shadow='sm' p='md' radius='md' withBorder>
                          <Text fw={600} size='md' mb='sm'>Google Sheets – selected match</Text>
                          <ScrollArea h={520} type='auto'>
                            <TurtleSheetsDataForm
                              ref={sheetsFormRef}
                              initialData={sheetsData || undefined}
                              sheetName={sheetsData?.sheet_name}
                              state={state}
                              location={location}
                              primaryId={primaryId || undefined}
                              mode={sheetsData ? 'edit' : 'create'}
                              onSave={handleSaveSheetsData}
                              hideSubmitButton
                              onCombinedSubmit={handleSaveAndApprove}
                            />
                          </ScrollArea>
                          <Group justify='flex-end' gap='md' mt='md'>
                            <Button
                              onClick={handleCombinedButtonClick}
                              loading={processing === selectedItem.request_id}
                              disabled={processing === selectedItem.request_id}
                              leftSection={<IconCheck size={16} />}
                            >
                              Save to Sheets & Approve Match
                            </Button>
                          </Group>
                        </Paper>
                      </>
                    ) : (
                      <Paper shadow='sm' p='xl' radius='md' withBorder>
                        <Center py='xl'>
                          <Text size='sm' c='dimmed' ta='center'>
                            Select one of the top 5 matches above to view and edit its Google Sheets data
                          </Text>
                        </Center>
                      </Paper>
                    )}
                  </Stack>
                ) : (
                  /* Pending list prominently in main area */
                  <Paper shadow='sm' p='lg' radius='md' withBorder style={{ overflow: 'hidden' }}>
                    <Stack gap='md' style={{ minWidth: 0 }}>
                      <Text fw={600} size='lg'>Pending Reviews</Text>
                      <Text size='sm' c='dimmed'>
                        Click an item to review matches and approve.
                      </Text>
                      <ScrollArea h={560} type='auto' scrollbars='y'>
                        <Grid gutter='md' style={{ minWidth: 0 }}>
                          {queueItems.map((item) => (
                            <Grid.Col key={item.request_id} span={{ base: 12, sm: 6, md: 4 }}>
                              <Card
                                shadow='sm'
                                padding='md'
                                radius='md'
                                withBorder
                                style={{
                                  cursor: 'pointer',
                                  border: '1px solid #dee2e6',
                                  height: '100%',
                                }}
                                onClick={() => handleItemSelect(item)}
                              >
                                <Stack gap='sm'>
                                  <Group justify='space-between'>
                                    <Badge color='orange' variant='light' size='sm'>Pending</Badge>
                                    <Group gap='xs'>
                                      <Text size='xs' c='dimmed'>{item.metadata.finder || 'Anonymous'}</Text>
                                      <Button
                                        variant='subtle'
                                        color='red'
                                        size='compact-xs'
                                        leftSection={<IconTrash size={14} />}
                                        onClick={(e) => handleOpenDeleteModal(item, e)}
                                        title='Remove from queue (e.g. junk)'
                                      >
                                        Delete
                                      </Button>
                                    </Group>
                                  </Group>
                                  {item.uploaded_image && (
                                    <Image
                                      src={getImageUrl(item.uploaded_image)}
                                      alt='Uploaded'
                                      radius='md'
                                      style={{ maxHeight: 180, objectFit: 'contain' }}
                                    />
                                  )}
                                  <Text size='sm' c='dimmed'>{item.candidates.length} matches</Text>
                                  {item.metadata.state && item.metadata.location && (
                                    <Text size='xs' c='dimmed'>
                                      {item.metadata.state} / {item.metadata.location}
                                    </Text>
                                  )}
                                </Stack>
                              </Card>
                            </Grid.Col>
                          ))}
                        </Grid>
                      </ScrollArea>
                    </Stack>
                  </Paper>
                )}

                <Modal
                  opened={deleteModalOpen}
                  onClose={() => { if (!deleting) { setDeleteModalOpen(false); setItemToDelete(null); } }}
                  title='Remove upload from queue'
                  centered
                >
                  <Stack gap='md'>
                    <Text size='sm' c='dimmed'>
                      This will permanently delete this upload from the review queue. It will not be processed or added to any turtle. Use this for junk or spam only.
                    </Text>
                    <Text size='sm' fw={500}>
                      This cannot be undone.
                    </Text>
                    <Group justify='flex-end' gap='sm'>
                      <Button
                        variant='default'
                        onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                      <Button
                        color='red'
                        leftSection={<IconTrash size={16} />}
                        loading={deleting}
                        onClick={handleConfirmDelete}
                      >
                        Delete from queue
                      </Button>
                    </Group>
                  </Stack>
                </Modal>
              </>
            )}
          </Tabs.Panel>

          {/* Tab 2: Google Sheets Browser */}
          <Tabs.Panel value='sheets' pt='md'>
            <Grid gutter='lg'>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper shadow='sm' p='md' radius='md' withBorder>
                  <Stack gap='md'>
                    <Text fw={500} size='lg'>Search & Filter</Text>
                    <Select
                      label='Location (Spreadsheet)'
                      description={sheetsListLoading ? 'Loading locations…' : selectedSheetFilter ? 'Only turtles from this sheet' : 'All sheets'}
                      placeholder='All locations'
                      leftSection={<IconMapPin size={16} />}
                      value={selectedSheetFilter}
                      onChange={(value) => {
                        const next = value ?? '';
                        setSelectedSheetFilter(next);
                        loadAllTurtles(next || undefined);
                      }}
                      data={[
                        { value: '', label: 'All locations' },
                        ...availableSheets.map((s) => ({ value: s, label: s })),
                      ]}
                      allowDeselect={false}
                      searchable
                      clearable={false}
                      disabled={sheetsListLoading}
                    />
                    <TextInput
                      placeholder='Search by ID, name, species, location...'
                      leftSection={<IconSearch size={16} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button onClick={() => loadAllTurtles()} loading={turtlesLoading} fullWidth>
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
