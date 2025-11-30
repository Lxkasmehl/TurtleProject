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
  ActionIcon,
  LoadingOverlay,
  Box,
  Divider
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconPhoto, 
  IconInfoCircle, 
  IconTrash, 
  IconFileSpreadsheet, 
  IconDeviceFloppy,
  IconArrowRight 
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// --- Services & Hooks ---
import { getAllUploadedPhotos, type UploadedPhoto } from '../services/mockBackend';
import { useUser } from '../hooks/useUser';
import { usePhotoGroups } from '../hooks/usePhotoGroups';
import { TurtleService } from '../services/turtleService';
import type { TurtleRecord } from '../types/turtle';

// --- Components ---
import { PhotoDetailModal } from '../components/PhotoDetailModal';
import { PhotoGroupCard } from '../components/PhotoGroupCard';

// --- SIMULATED QUEUE ---
const DUMMY_QUEUE_IDS = ['T101', 'T102', 'T103', 'T104', 'T105'];

export default function AdminTurtleRecordsPage() {
  const { role } = useUser();
  const navigate = useNavigate();
  
  // --- STATE: Photo Gallery ---
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<UploadedPhoto | null>(null);
  const [photoModalOpened, { open: openPhotoModal, close: closePhotoModal }] = useDisclosure(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // --- STATE: Data Table (Active Record) ---
  const [records, setRecords] = useState<TurtleRecord[]>([]); // Will only hold 0 or 1 record
  const [recordsLoading, setRecordsLoading] = useState(false);
  // Removed currentTurtleId and lookupStatus
  
  // --- NEW STATE: Queue Management ---
  const [idQueue, setIdQueue] = useState<string[]>(DUMMY_QUEUE_IDS);


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

    // Initial load is now simpler since we don't load all sheet data
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

  // --- LOGIC: Data Table ---
  const handleFieldChange = (index: number, field: keyof TurtleRecord, value: string) => {
    const updated = [...records];
    updated[index] = { ...updated[index], [field]: value };
    setRecords(updated);
  };

  // --- NEW LOGIC: Fetch Next ID from Queue ---
  const fetchNextTurtle = () => {
    if (idQueue.length === 0) {
      alert('The queue is empty. No new records to process.');
      setRecords([]);
      return;
    }
    
    setRecordsLoading(true);

    // 1. Pop the next ID off the queue
    const [nextId, ...restOfQueue] = idQueue;
    setIdQueue(restOfQueue);
    
    // 2. Create a new shell record with the fetched ID (since we only process NEW queue items)
    const newRecord: TurtleRecord = {
        id: nextId, 
        originalSite: '', name: '', sex: '', 
        dateLastSeen: '', lastFoundBy: '', locationDescription: '', 
        recaptureHistory: '', dateFirstFound: '', health: '', 
        dateLastBehavior: '', generalNotes: ''
    };
    
    // Simulate a small delay for "queue processing"
    setTimeout(() => {
        setRecords([newRecord]);
        setRecordsLoading(false);
    }, 500);
  };


  const deleteRow = (index: number) => {
    if (window.confirm('Are you sure you want to DISCARD this record from the queue?')) {
      // Clear the current record from the display
      setRecords([]);
    }
  };

  const handleSaveRecords = async () => {
    // This function is now purely for saving a draft locally (e.g., in case of interruption)
    setRecordsLoading(true);
    await TurtleService.saveRecords(records);
    setRecordsLoading(false);
    alert('Record saved successfully as a local draft!'); 
  };
    
    const confirmRecord = async (recordToConfirm: TurtleRecord) => {
        if (!window.confirm(`Are you sure you want to CONFIRM and finalize record ID: ${recordToConfirm.id}? This will PUSH this NEW record to Google Sheets.`)) {
            return;
        }
        
        try {
            setRecordsLoading(true); 
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            
            console.log("Simulating API call to append NEW data to Google Sheets:", recordToConfirm);
            
            alert(`Record ${recordToConfirm.id} successfully CONFIRMED and submitted to Google Sheets.`);

            // Clear the current record after processing
            setRecords([]);

        } catch (error) {
            console.error("Confirmation failed:", error);
            alert("Confirmation failed. Check console for details.");
        } finally {
            setRecordsLoading(false);
        }
    };

  // 1. Initialize the photo grouping hook
  const photoGroups = usePhotoGroups(photos);

  // 2. Handle clicking a photo card
  const handlePhotoClick = (photo: UploadedPhoto) => {
    setSelectedPhoto(photo);
    openPhotoModal();
  };

  // 3. Handle toggling the photo groups
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

  // --- RENDER: Table Rows ---
  const activeRecord = records[0];

  const tableRows = activeRecord ? (
    <Table.Tr key={activeRecord.id}>
      
      {/* Primary Fields */}
      <Table.Td>
        <TextInput value={activeRecord.id} readOnly variant="filled" placeholder="ID" size="xs" styles={{ input: { cursor: 'default' } }}/>
      </Table.Td>
      <Table.Td><TextInput value={activeRecord.originalSite} onChange={(e) => handleFieldChange(0, 'originalSite', e.target.value)} variant="unstyled" placeholder="Site" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.name} onChange={(e) => handleFieldChange(0, 'name', e.target.value)} variant="unstyled" placeholder="Name" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.sex} onChange={(e) => handleFieldChange(0, 'sex', e.target.value)} variant="unstyled" placeholder="Sex" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.dateLastSeen} onChange={(e) => handleFieldChange(0, 'dateLastSeen', e.target.value)} variant="unstyled" placeholder="Date" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.lastFoundBy} onChange={(e) => handleFieldChange(0, 'lastFoundBy', e.target.value)} variant="unstyled" placeholder="Finder" size="xs" /></Table.Td>
      
      {/* Other Fields */}
      <Table.Td><TextInput value={activeRecord.locationDescription} onChange={(e) => handleFieldChange(0, 'locationDescription', e.target.value)} variant="unstyled" placeholder="Location Desc" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.recaptureHistory} onChange={(e) => handleFieldChange(0, 'recaptureHistory', e.target.value)} variant="unstyled" placeholder="Recap History" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.dateFirstFound} onChange={(e) => handleFieldChange(0, 'dateFirstFound', e.target.value)} variant="unstyled" placeholder="First Found" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.health} onChange={(e) => handleFieldChange(0, 'health', e.target.value)} variant="unstyled" placeholder="Health" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.dateLastBehavior} onChange={(e) => handleFieldChange(0, 'dateLastBehavior', e.target.value)} variant="unstyled" placeholder="Last Behavior" size="xs" /></Table.Td>
      <Table.Td><TextInput value={activeRecord.generalNotes} onChange={(e) => handleFieldChange(0, 'generalNotes', e.target.value)} variant="unstyled" placeholder="Notes" size="xs" /></Table.Td>


      {/* Action Buttons (Confirm and Delete) */}
      <Table.Td>
          <Group wrap="nowrap" gap={4}>
            <ActionIcon 
                color="green" 
                variant="subtle" 
                size="sm" 
                onClick={() => confirmRecord(activeRecord)}
            > 
                <IconFileSpreadsheet size={16} /> 
            </ActionIcon>
            <ActionIcon color="red" variant="subtle" size="sm" onClick={() => deleteRow(0)}> 
                <IconTrash size={16} />
            </ActionIcon>
          </Group>
      </Table.Td>
    </Table.Tr>
  ) : (
    <Table.Tr><Table.Td colSpan={13}><Center p="md"><Text c="dimmed">Click "Fetch Next Turtle" to load a new record from the queue.</Text></Center></Table.Td></Table.Tr>
  );

  if (role !== 'admin') return null;

  return (
    <Container size='xl' py='xl'>
      <Stack gap='lg'>
        
        {/* --- HEADER --- */}
        <Group justify='space-between' align='center'>
          <div>
            <Title order={1}>Turtle Administration</Title>
            <Text size='sm' c='dimmed'>
              Process new field data records for insertion into Google Sheets.
            </Text>
          </div>
        </Group>

        {/* --- DATA TABLE --- */}
        <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group justify='space-between' align='center' mb="md">
                <Title order={3} c="green.9">Field Data Processing Queue</Title>
                <Badge size='lg' variant='filled' color={idQueue.length > 0 ? 'red' : 'gray'}>
                    {idQueue.length} Pending Records
                </Badge>
            </Group>

            {/* FETCH NEXT BUTTON */}
            <Button 
                leftSection={<IconArrowRight size={16}/>} 
                onClick={fetchNextTurtle} 
                loading={recordsLoading}
                disabled={idQueue.length === 0}
                color="blue"
                fullWidth
                mb="md"
            >
                Fetch Next Turtle ({idQueue[0] || 'N/A'})
            </Button>
            
            {/* Action Buttons */}
            <Group justify="flex-end" mb="md" mt="md">
                <Button 
                    leftSection={<IconDeviceFloppy size={16}/>} 
                    color="teal" 
                    onClick={handleSaveRecords} 
                    loading={recordsLoading}
                    disabled={!activeRecord}
                >
                    Save Changes (Local Draft)
                </Button>
            </Group>

            <Box pos="relative">
                <LoadingOverlay visible={recordsLoading} zIndex={10} overlayProps={{ radius: "sm", blur: 2 }} />
                <ScrollArea h={400} type="auto" offsetScrollbars>
                    <Table stickyHeader highlightOnHover verticalSpacing="sm" withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th w={80}>ID</Table.Th>
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
                                <Table.Th w={50}>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{tableRows}</Table.Tbody>
                    </Table>
                </ScrollArea>
            </Box>
        </Paper>

        <Divider my="lg" label="Uploaded Photos Gallery" labelPosition="center" />

        {/* --- PHOTO GALLERY --- */}
        <Paper shadow='sm' p='xl' radius='md' withBorder>
           <Group justify='space-between' align='center' mb="md">
              <Title order={3}>Recent Uploads</Title>
               <Badge size='lg' variant='light' color='blue' leftSection={<IconPhoto size={14} />}>
                 {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
               </Badge>
           </Group>

           <Alert icon={<IconInfoCircle size={18} />} title='Photo Quality Notice' color='blue' radius='md' mb="md">
            <Text size='sm'>
              Photos are low quality because we are using <Text component='span' fw={500}>mock storage</Text>.
            </Text>
          </Alert>

          {photosLoading ? (
            <Center py='xl'><Loader size='lg' /></Center>
          ) : photos.length === 0 ? (
            <Center py='xl'>
              <Stack gap='md' align='center'>
                <IconPhoto size={64} stroke={1.5} style={{ opacity: 0.3 }} />
                <Text size='lg' c='dimmed'>No photos uploaded yet</Text>
              </Stack>
            </Center>
          ) : (
            <Grid gutter='md'>
              {photoGroups.map((group) => (
                <Grid.Col key={group.representative.imageId} span={{ base: 12, md: 6, lg: 4 }}>
                  <PhotoGroupCard
                    group={group}
                    isExpanded={expandedGroups.has(group.representative.imageId)}
                    onToggle={() => toggleGroup(group.representative.imageId)}
                    onPhotoClick={handlePhotoClick}
                  />
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