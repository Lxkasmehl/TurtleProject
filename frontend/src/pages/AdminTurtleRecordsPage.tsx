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
  Table,
  TextInput,
  Button,
  ScrollArea,
  LoadingOverlay,
  Box,
  Divider,
  Image,
  Card,
  Radio,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconPhoto, 
  IconInfoCircle, 
  IconTrash, 
  IconDeviceFloppy,
  IconArrowRight,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// --- IMPORTS ---
import { getAccessibleImageUrl, BACKEND_IP } from '../utils/imageUtils'; // <--- NEW IMPORT
import { getAllUploadedPhotos, type UploadedPhoto } from '../services/mockBackend';
import { useUser } from '../hooks/useUser';
import { usePhotoGroups } from '../hooks/usePhotoGroups';
import { TurtleService } from '../services/turtleService';
import type { TurtleRecord } from '../types/turtle';

import { PhotoDetailModal } from '../components/PhotoDetailModal';
import { PhotoGroupCard } from '../components/PhotoGroupCard';

// --- TYPES ---
interface PotentialMatch {
  turtle_id: number;
  biology_id: string; 
  gender: string;
  location: string;
  distance: number;
  image_url: string;
}

interface QueueItem {
  turtle_id: number; 
  image_url: string;
  date_uploaded: string;
  matches: PotentialMatch[];
}

export default function AdminTurtleRecordsPage() {
  const { role } = useUser();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<UploadedPhoto | null>(null);
  const [photoModalOpened, { open: openPhotoModal, close: closePhotoModal }] = useDisclosure(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [records, setRecords] = useState<TurtleRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [currentQueueItem, setCurrentQueueItem] = useState<QueueItem | null>(null);
  const [selectedOptionValue, setSelectedOptionValue] = useState<string | null>(null); 
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null);

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    const loadPhotos = () => {
      setPhotosLoading(true);
      try {
        const allPhotos = getAllUploadedPhotos();
        setPhotos(allPhotos);
      } catch (error) {
        console.error('Error loading photos:', error);
      } finally {
        setPhotosLoading(false);
      }
    };

    loadPhotos();

    const handleStorageChange = () => loadPhotos();
    const handlePhotoUploaded = () => loadPhotos();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('photoUploaded', handlePhotoUploaded);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('photoUploaded', handlePhotoUploaded);
    };
  }, [role, navigate]);

  const handleFieldChange = (index: number, field: keyof TurtleRecord, value: string) => {
    const updated = [...records];
    updated[index] = { ...updated[index], [field]: value };
    setRecords(updated);
  };

  // --- API LOGIC: Fetch Next ---
  const fetchNextTurtle = async () => {
    setRecordsLoading(true);
    setRecords([]); 
    setCurrentQueueItem(null); 
    setSelectedOptionValue(null);
    setActiveUploadId(null); 

    try {
      // Using the variable from utils file
      const response = await fetch(`http://${BACKEND_IP}:8000/api/identify/queue/next/`);
      
      if (!response.ok) {
        if (response.status === 404) {
           alert("Queue is empty! Good job.");
           return;
        }
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data: QueueItem = await response.json();
      setCurrentQueueItem(data);
      setActiveUploadId(data.turtle_id); 

    } catch (error) {
      console.error("Failed to fetch next item:", error);
      alert("Failed to fetch next item. Is the backend running?");
    } finally {
      setRecordsLoading(false);
    }
  };

  // --- LOGIC: Handle Match Selection ---
  const handleConfirmSelection = () => {
    if (!currentQueueItem || !selectedOptionValue) return;

    let finalTurtleId: number; 
    let prefilledData: Partial<TurtleRecord> = {};

    if (selectedOptionValue === 'new') {
        finalTurtleId = currentQueueItem.turtle_id;
        prefilledData = { name: '', sex: '', locationDescription: '' };
    } else {
        const index = parseInt(selectedOptionValue, 10);
        const match = currentQueueItem.matches[index];
        if (!match) return;

        finalTurtleId = match.turtle_id;
        prefilledData = {
            sex: match.gender || '',
            originalSite: match.location || '',
            locationDescription: match.location || '',
        };
    }

    const newRecord: TurtleRecord = {
        id: finalTurtleId.toString(), 
        originalSite: prefilledData.originalSite || '', 
        name: prefilledData.name || '', 
        sex: prefilledData.sex || '', 
        dateLastSeen: new Date().toLocaleDateString(), 
        lastFoundBy: '', 
        locationDescription: prefilledData.locationDescription || '', 
        recaptureHistory: '', 
        dateFirstFound: '', 
        health: '', 
        dateLastBehavior: '', 
        generalNotes: ''
    };

    setRecords([newRecord]);
    setCurrentQueueItem(null); 
  };

  // --- API LOGIC: Resolve/Save ---
  const handleSaveData = async (recordToSave: TurtleRecord) => {
    if (!activeUploadId) {
        alert("Error: No active upload ID found.");
        return;
    }

    if (!window.confirm(`Finalize this record as Turtle ID: ${recordToSave.id}?`)) {
      return;
    }
    
    try {
      setRecordsLoading(true); 
      
      const payload = {
          turtle_id: parseInt(recordToSave.id, 10),
          sex: recordToSave.sex,
          site: recordToSave.originalSite
      };

      console.log(`Sending Review Decision to Backend:`, payload);

      const response = await fetch(`http://${BACKEND_IP}:8000/api/identify/review/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      if (!response.ok) {
          throw new Error(`Backend error: ${response.status}`);
      }
      
      alert(`Success! Upload resolved to Turtle ID: ${recordToSave.id}`);

      setRecords([]); 
      setActiveUploadId(null);

    } catch (error) {
      console.error("Save failed:", error);
      alert("Save failed. Check console.");
    } finally {
      setRecordsLoading(false);
    }
  };

  const deleteRow = (index: number) => {
    if (window.confirm('Discard this record locally?')) {
        setRecords([]);
    }
  };

  const photoGroups = usePhotoGroups(photos);
  const handlePhotoClick = (photo: UploadedPhoto) => { setSelectedPhoto(photo); openPhotoModal(); };
  const toggleGroup = (imageId: string) => setExpandedGroups(prev => { const n = new Set(prev); n.has(imageId) ? n.delete(imageId) : n.add(imageId); return n; });

  // --- RENDER: Table Rows ---
  const activeRecord = records[0];
  const tableRows = activeRecord ? (
    <Table.Tr key={activeRecord.id}>
      <Table.Td>
        <TextInput 
            value={activeRecord.id} 
            readOnly 
            variant="filled" 
            placeholder="PK" 
            size="xs" 
            styles={{ input: { cursor: 'default', fontWeight: 'bold' } }}
        />
      </Table.Td>
      <Table.Td><TextInput value={activeRecord.originalSite} onChange={(e) => handleFieldChange(0, 'originalSite', e.target.value)} variant="unstyled" placeholder="Site" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.name} onChange={(e) => handleFieldChange(0, 'name', e.target.value)} variant="unstyled" placeholder="Name" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.sex} onChange={(e) => handleFieldChange(0, 'sex', e.target.value)} variant="unstyled" placeholder="Sex" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.dateLastSeen} onChange={(e) => handleFieldChange(0, 'dateLastSeen', e.target.value)} variant="unstyled" placeholder="Date" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.lastFoundBy} onChange={(e) => handleFieldChange(0, 'lastFoundBy', e.target.value)} variant="unstyled" placeholder="Finder" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.locationDescription} onChange={(e) => handleFieldChange(0, 'locationDescription', e.target.value)} variant="unstyled" placeholder="Loc Desc" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.recaptureHistory} onChange={(e) => handleFieldChange(0, 'recaptureHistory', e.target.value)} variant="unstyled" placeholder="Recap Hist" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.dateFirstFound} onChange={(e) => handleFieldChange(0, 'dateFirstFound', e.target.value)} variant="unstyled" placeholder="First Found" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.health} onChange={(e) => handleFieldChange(0, 'health', e.target.value)} variant="unstyled" placeholder="Health" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.dateLastBehavior} onChange={(e) => handleFieldChange(0, 'dateLastBehavior', e.target.value)} variant="unstyled" placeholder="Last Behav" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.generalNotes} onChange={(e) => handleFieldChange(0, 'generalNotes', e.target.value)} variant="unstyled" placeholder="Notes" size="xs" /></Table.Td>
    </Table.Tr>
  ) : (
    <Table.Tr><Table.Td colSpan={12}><Center p="md"><Text c="dimmed">No active record. Fetch from queue to begin.</Text></Center></Table.Td></Table.Tr>
  );

  if (role !== 'admin') return null;

  return (
    <Container size='xl' py='xl'>
      <Stack gap='lg'>
        <Group justify='space-between' align='center'>
          <div>
            <Title order={1}>Turtle Administration</Title>
            <Text size='sm' c='dimmed'>Processing Queue & Data Entry</Text>
          </div>
        </Group>

        {currentQueueItem && (
            <Paper shadow="sm" p="md" radius="md" withBorder style={{ borderColor: '#228be6', borderWidth: 2 }}>
                <Title order={3} mb="sm">Identify Turtle Match</Title>
                <Grid>
                    <Grid.Col span={4}>
                        <Card padding="sm" radius="md" withBorder>
                            <Card.Section>
                                <Image 
                                    src={getAccessibleImageUrl(currentQueueItem.image_url)} 
                                    h={300} 
                                    fit="contain" 
                                    alt="Uploaded" 
                                    fallbackSrc="https://placehold.co/400x300?text=Uploaded+Img" 
                                />
                            </Card.Section>
                            <Text fw={500} mt="xs" ta="center">Incoming Upload (ID: {currentQueueItem.turtle_id})</Text>
                            <Text size="xs" c="dimmed" ta="center">{new Date(currentQueueItem.date_uploaded).toLocaleDateString()}</Text>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={8}>
                        <Text fw={500} mb="xs">Select Best Match:</Text>
                        <ScrollArea h={400}>
                            <Radio.Group 
                                value={selectedOptionValue} 
                                onChange={setSelectedOptionValue}
                            >
                                <Stack gap="sm">
                                    {currentQueueItem.matches.map((match, index) => {
                                        const radioValue = index.toString();
                                        const isSelected = selectedOptionValue === radioValue;

                                        return (
                                            <Paper 
                                                key={index} 
                                                withBorder p="sm" radius="md" 
                                                style={{ 
                                                    cursor: 'pointer', 
                                                    backgroundColor: isSelected ? '#e7f5ff' : undefined,
                                                    borderColor: isSelected ? '#228be6' : undefined
                                                }} 
                                                onClick={() => setSelectedOptionValue(radioValue)}
                                            >
                                                <Group align="flex-start" wrap="nowrap">
                                                    <Radio value={radioValue} style={{ marginTop: 8 }} readOnly checked={isSelected} />
                                                    <Image 
                                                        src={getAccessibleImageUrl(match.image_url)} 
                                                        w={100} h={80} 
                                                        radius="sm" 
                                                        fallbackSrc="https://placehold.co/80x60?text=Match" 
                                                    />
                                                    <div>
                                                        <Text fw={700} size="lg">ID: {match.turtle_id} ({match.biology_id || "Unknown"})</Text>
                                                        <Text size="xs" c="dimmed">
                                                            Confidence: {(1 - match.distance).toFixed(2)} | {match.gender} | {match.location}
                                                        </Text>
                                                    </div>
                                                </Group>
                                            </Paper>
                                        );
                                    })}
                                    
                                    <Paper 
                                        withBorder p="sm" radius="md" 
                                        style={{ 
                                            cursor: 'pointer', 
                                            backgroundColor: selectedOptionValue === 'new' ? '#fff9db' : undefined,
                                            borderColor: selectedOptionValue === 'new' ? '#fcc419' : undefined
                                        }} 
                                        onClick={() => setSelectedOptionValue('new')}
                                    >
                                        <Group>
                                            <Radio value="new" readOnly checked={selectedOptionValue === 'new'} />
                                            <Stack gap={0} style={{ flex: 1 }}>
                                                <Text fw={700} c="orange">No Match / New Turtle</Text>
                                                <Text size="xs">
                                                    Use the Upload ID ({currentQueueItem.turtle_id}) as the new primary key.
                                                </Text>
                                            </Stack>
                                        </Group>
                                    </Paper>
                                </Stack>
                            </Radio.Group>
                        </ScrollArea>
                        <Button fullWidth mt="md" size="md" onClick={handleConfirmSelection} disabled={!selectedOptionValue}>
                            Confirm Selection & Edit Data
                        </Button>
                    </Grid.Col>
                </Grid>
            </Paper>
        )}

        <Paper shadow="sm" p="md" radius="md" withBorder style={{ opacity: currentQueueItem ? 0.5 : 1, pointerEvents: currentQueueItem ? 'none' : 'auto' }}>
            {/* TOP BAR: Fetch Button */}
            <Group justify='space-between' align='center' mb="md">
                <Title order={3} c="green.9">Data Entry</Title>
                <Button 
                    leftSection={<IconArrowRight size={16}/>} 
                    onClick={fetchNextTurtle} 
                    loading={recordsLoading}
                    disabled={!!activeRecord || !!currentQueueItem} 
                    color="blue"
                >
                    Fetch Next from Queue
                </Button>
            </Group>

            {/* ACTION BUTTONS: MOVED TO TOP RIGHT & LARGER */}
            <Group justify="flex-end" mb="md" gap="md">
                <Button 
                    color="red" 
                    variant="light" 
                    size="md" // Made larger
                    leftSection={<IconTrash size={20}/>} 
                    onClick={() => deleteRow(0)}
                    disabled={!activeRecord}
                >
                    Discard Record
                </Button>
                <Button 
                    color="teal" 
                    variant="filled" 
                    size="md" // Made larger
                    leftSection={<IconDeviceFloppy size={20}/>} 
                    onClick={() => handleSaveData(activeRecord)}
                    disabled={!activeRecord}
                    loading={recordsLoading}
                >
                    Save Data & Confirm
                </Button>
            </Group>

            <Box pos="relative">
                <LoadingOverlay visible={recordsLoading} zIndex={10} overlayProps={{ radius: "sm", blur: 2 }} />
                <ScrollArea h={300} type="auto" offsetScrollbars>
                    <Table stickyHeader highlightOnHover verticalSpacing="sm" withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th w={80}>Turtle ID</Table.Th> 
                                <Table.Th w={80}>Site</Table.Th>
                                <Table.Th w={100}>Name</Table.Th>
                                <Table.Th w={80}>Sex</Table.Th>
                                <Table.Th w={100}>Last Seen</Table.Th>
                                <Table.Th w={120}>Found By</Table.Th>
                                <Table.Th w={150}>Location Desc</Table.Th>
                                <Table.Th w={150}>Recapture Hist</Table.Th>
                                <Table.Th w={100}>First Found</Table.Th>
                                <Table.Th w={100}>Health</Table.Th>
                                <Table.Th w={100}>Last Behavior</Table.Th>
                                <Table.Th w={150}>General Notes</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{tableRows}</Table.Tbody>
                    </Table>
                </ScrollArea>
            </Box>
        </Paper>

        <Divider my="lg" label="Uploaded Photos Gallery" labelPosition="center" />

        <Paper shadow='sm' p='xl' radius='md' withBorder>
           <Group justify='space-between' align='center' mb="md">
              <Title order={3}>Recent Uploads</Title>
               <Badge size='lg' variant='light' color='blue' leftSection={<IconPhoto size={14} />}>
                 {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
               </Badge>
           </Group>
           <Alert icon={<IconInfoCircle size={18} />} title='Photo Quality Notice' color='blue' radius='md' mb="md">
            <Text size='sm'>Photos are low quality because we are using <Text component='span' fw={500}>mock storage</Text>.</Text>
          </Alert>
          {photosLoading ? ( <Center py='xl'><Loader size='lg' /></Center> ) : photos.length === 0 ? ( <Center py='xl'><Text c='dimmed'>No photos.</Text></Center> ) : (
            <Grid gutter='md'>
              {photoGroups.map((group) => (
                <Grid.Col key={group.representative.imageId} span={{ base: 12, md: 6, lg: 4 }}>
                  <PhotoGroupCard group={group} isExpanded={expandedGroups.has(group.representative.imageId)} onToggle={() => toggleGroup(group.representative.imageId)} onPhotoClick={handlePhotoClick} />
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Paper>
      </Stack>
      <PhotoDetailModal opened={photoModalOpened} onClose={closePhotoModal} photo={selectedPhoto} />
    </Container>
  );
}