/**
 * Turtle Sheets Data Form Component
 * Form for entering/editing turtle data that will be synced to Google Sheets
 */

import {
  Stack,
  TextInput,
  Select,
  Textarea,
  Group,
  Button,
  Alert,
  Text,
  Grid,
  Paper,
  Title,
  Loader,
  Modal,
} from '@mantine/core';
import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { IconInfoCircle, IconCheck, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { TurtleSheetsData } from '../services/api';
import { listSheets, createSheet } from '../services/api';

interface TurtleSheetsDataFormProps {
  initialData?: TurtleSheetsData;
  sheetName?: string; // Selected sheet name
  state?: string;
  location?: string;
  /** Shown as help only (e.g. community-indicated location); not used as form field values */
  hintLocationFromCommunity?: string;
  primaryId?: string;
  onSave: (data: TurtleSheetsData, sheetName: string) => Promise<void>;
  onCancel?: () => void;
  mode: 'create' | 'edit';
  hideSubmitButton?: boolean; // Hide the form's submit button
  onCombinedSubmit?: (data: TurtleSheetsData, sheetName: string) => Promise<void>; // Combined action handler
}

export interface TurtleSheetsDataFormRef {
  submit: () => Promise<void>;
}

export const TurtleSheetsDataForm = forwardRef<TurtleSheetsDataFormRef, TurtleSheetsDataFormProps>(({
  initialData,
  sheetName: initialSheetName,
  hintLocationFromCommunity,
  primaryId,
  onSave,
  onCancel,
  mode,
  hideSubmitButton = false,
  onCombinedSubmit,
  // state/location accepted for API compatibility but not used as form values – use hintLocationFromCommunity for display
}, ref) => {
  const [formData, setFormData] = useState<TurtleSheetsData>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>(initialSheetName || '');
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [showCreateSheetModal, setShowCreateSheetModal] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [creatingSheet, setCreatingSheet] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
    if (initialSheetName) {
      setSelectedSheetName(initialSheetName);
    }
  }, [initialData, initialSheetName]);

  useEffect(() => {
    // Load available sheets on mount with timeout
    let cancelled = false;
    
    const loadSheets = async () => {
      setLoadingSheets(true);
      
      try {
        // listSheets() now has built-in timeout (10 seconds)
        const response = await listSheets(10000);
        
        // Check if component was unmounted
        if (cancelled) {
          return;
        }
        
        if (response.success && response.sheets) {
          const sheets = response.sheets;
          setAvailableSheets(sheets);
          // If no sheet is selected and sheets are available, select the first one
          setSelectedSheetName((current) => {
            if (!current && !initialSheetName && sheets.length > 0) {
              return sheets[0];
            }
            return current;
          });
        }
      } catch (error) {
        // Check if component was unmounted
        if (cancelled) {
          return;
        }
        
        console.error('Failed to load sheets:', error);
        // Don't show error notification - just log it
        // The form can still work without sheets list (user can type sheet name)
        setAvailableSheets([]);
      } finally {
        if (!cancelled) {
          setLoadingSheets(false);
        }
      }
    };

    loadSheets();
    
    // Cleanup: cancel if component unmounts
    return () => {
      cancelled = true;
    };
  }, [initialSheetName]);

  const handleCreateNewSheet = async (sheetName: string) => {
    if (!sheetName || !sheetName.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a sheet name',
        color: 'red',
      });
      return;
    }

    setCreatingSheet(true);
    try {
      const response = await createSheet({ sheet_name: sheetName.trim() });
      if (response.success) {
        // Reload sheets list
        const sheetsResponse = await listSheets();
        if (sheetsResponse.success && sheetsResponse.sheets) {
          setAvailableSheets(sheetsResponse.sheets);
        }
        // Select the newly created sheet
        setSelectedSheetName(sheetName.trim());
        setShowCreateSheetModal(false);
        setNewSheetName('');
        notifications.show({
          title: 'Success',
          message: `Sheet "${sheetName}" created successfully`,
          color: 'green',
        });
      } else {
        throw new Error(response.error || 'Failed to create sheet');
      }
    } catch (error) {
      console.error('Error creating sheet:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create sheet',
        color: 'red',
      });
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleChange = (field: keyof TurtleSheetsData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    // No validation needed - Primary ID is auto-generated
    setErrors(newErrors);
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedSheetName) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a sheet',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    if (!validate()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fix the errors in the form',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    setLoading(true);
    try {
      // Use combined submit handler if provided, otherwise use normal onSave
      if (onCombinedSubmit) {
        await onCombinedSubmit(formData, selectedSheetName);
      } else {
        await onSave(formData, selectedSheetName);
        notifications.show({
          title: 'Success!',
          message: `Turtle data ${mode === 'create' ? 'created' : 'updated'} successfully`,
          color: 'green',
          icon: <IconCheck size={18} />,
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save turtle data',
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Expose submit method via ref
  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
  }));

  return (
    <Paper shadow='sm' p='xl' radius='md' withBorder style={{ position: 'relative' }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
              {mode === 'create' ? 'Creating' : 'Updating'} turtle data...
            </Text>
          </Stack>
        </div>
      )}
      <Stack gap='lg' style={{ opacity: loading ? 0.3 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
        <div>
          <Title order={3}>Turtle Data - Google Sheets</Title>
          <Text size='sm' c='dimmed' mt='xs'>
            {mode === 'create'
              ? 'Enter turtle data to add to Google Sheets'
              : 'Edit turtle data in Google Sheets'}
          </Text>
          {primaryId && (
            <Text size='sm' c='dimmed' mt='xs'>
              Primary ID: <strong>{primaryId}</strong>
            </Text>
          )}
        </div>

        <Alert icon={<IconInfoCircle size={18} />} color='blue' radius='md'>
          <Text size='sm'>
            This data will be synced to Google Sheets. Primary ID is automatically generated.
          </Text>
        </Alert>

        <Grid gutter='md'>
          {/* Sheet Selection */}
          <Grid.Col span={12}>
            {loadingSheets ? (
              <Group gap='sm'>
                <Loader size='sm' />
                <Text size='sm' c='dimmed'>Loading available sheets...</Text>
              </Group>
            ) : (
              <Select
                label='Sheet / Location'
                placeholder='Select a sheet or create new'
                data={[...availableSheets, { value: '__create_new__', label: '+ Create New Sheet' }]}
                value={selectedSheetName}
                onChange={(value) => {
                  if (value === '__create_new__') {
                    setShowCreateSheetModal(true);
                    setSelectedSheetName('');
                  } else {
                    setSelectedSheetName(value || '');
                  }
                }}
                required
                description='Select the Google Sheets tab where this turtle data should be stored'
                error={!selectedSheetName ? 'Sheet selection is required' : undefined}
                searchable
              />
            )}
          </Grid.Col>
          {/* Row 1: ID Fields */}
          {primaryId && (
            <Grid.Col span={12}>
              <TextInput
                label='Primary ID'
                value={primaryId}
                disabled
                description='Automatically generated unique identifier'
              />
            </Grid.Col>
          )}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='ID'
              placeholder='Original ID'
              value={formData.id || ''}
              onChange={(e) => handleChange('id', e.target.value)}
              description='Original turtle ID (may not be unique across sheets)'
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='ID2 (random sequence)'
              placeholder='Secondary ID'
              value={formData.id2 || ''}
              onChange={(e) => handleChange('id2', e.target.value)}
            />
          </Grid.Col>

          {/* Row 2: Transmitter Fields */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='Transmitter ID'
              placeholder='Transmitter ID'
              value={formData.transmitter_id || ''}
              onChange={(e) => handleChange('transmitter_id', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='Transmitter Type'
              placeholder='Transmitter type'
              value={formData.transmitter_type || ''}
              onChange={(e) => handleChange('transmitter_type', e.target.value)}
            />
          </Grid.Col>

          {/* Row 3: Basic Info */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label='Name'
              placeholder='Turtle name'
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Select
              label='Sex'
              placeholder='Select sex'
              data={['F', 'M', 'J', 'U']}
              value={formData.sex || ''}
              onChange={(value) => handleChange('sex', value || '')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label='Species'
              placeholder='Species'
              value={formData.species || ''}
              onChange={(e) => handleChange('species', e.target.value)}
            />
          </Grid.Col>

          {/* Row 4: Dates */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='Date 1st Found'
              placeholder='YYYY-MM-DD'
              value={formData.date_1st_found || ''}
              onChange={(e) => handleChange('date_1st_found', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='Dates Refound'
              placeholder='Comma-separated dates'
              value={formData.dates_refound || ''}
              onChange={(e) => handleChange('dates_refound', e.target.value)}
            />
          </Grid.Col>

          {/* Row 5: Location – only form values; community location shown as hint only when provided */}
          {hintLocationFromCommunity && (
            <Grid.Col span={12}>
              <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />} title="Community member indicated">
                <Text size="sm">Location: {hintLocationFromCommunity} (for reference only; not pre-filled)</Text>
              </Alert>
            </Grid.Col>
          )}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='General Location'
              placeholder='General location'
              value={formData.general_location ?? ''}
              onChange={(e) => handleChange('general_location', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='Location'
              placeholder='Specific location'
              value={formData.location ?? ''}
              onChange={(e) => handleChange('location', e.target.value)}
            />
          </Grid.Col>

          {/* Row 6: Checkboxes as Selects */}
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label='Pit?'
              placeholder='Yes/No'
              data={['Yes', 'No']}
              value={formData.pit || ''}
              onChange={(value) => handleChange('pit', value || '')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label='Pic in 2024 Archive?'
              placeholder='Yes/No'
              data={['Yes', 'No']}
              value={formData.pic_in_2024_archive || ''}
              onChange={(value) => handleChange('pic_in_2024_archive', value || '')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label='Adopted?'
              placeholder='Yes/No'
              data={['Yes', 'No']}
              value={formData.adopted || ''}
              onChange={(value) => handleChange('adopted', value || '')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label='iButton?'
              placeholder='Yes/No'
              data={['Yes', 'No']}
              value={formData.ibutton || ''}
              onChange={(value) => handleChange('ibutton', value || '')}
            />
          </Grid.Col>

          {/* Row 7: More Checkboxes + Last Assay Date */}
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label='DNA Extracted?'
              placeholder='Yes/No'
              data={['Yes', 'No']}
              value={formData.dna_extracted || ''}
              onChange={(value) => handleChange('dna_extracted', value || '')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label='iButton Last Set'
              placeholder='Date'
              value={formData.ibutton_last_set || ''}
              onChange={(e) => handleChange('ibutton_last_set', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label='Last Assay Date'
              placeholder='YYYY-MM-DD'
              value={formData.last_assay_date || ''}
              onChange={(e) => handleChange('last_assay_date', e.target.value)}
              description='Date last brought in for assays'
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label='Transmitter Lifespan'
              placeholder='Lifespan'
              value={formData.transmitter_lifespan || ''}
              onChange={(e) => handleChange('transmitter_lifespan', e.target.value)}
            />
          </Grid.Col>

          {/* Row 8: Transmitter Dates */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='Transmitter On Date'
              placeholder='Date'
              value={formData.transmitter_on_date || ''}
              onChange={(e) => handleChange('transmitter_on_date', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='Radio Replace Date'
              placeholder='Date'
              value={formData.radio_replace_date || ''}
              onChange={(e) => handleChange('radio_replace_date', e.target.value)}
            />
          </Grid.Col>

          {/* Row 9: Additional Fields */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='Transmitter Put On By'
              placeholder='Name'
              value={formData.transmitter_put_on_by || ''}
              onChange={(e) => handleChange('transmitter_put_on_by', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='OLD Frequencies'
              placeholder='Frequencies'
              value={formData.old_frequencies || ''}
              onChange={(e) => handleChange('old_frequencies', e.target.value)}
            />
          </Grid.Col>

          {/* Row 10: Notes */}
          <Grid.Col span={12}>
            <Textarea
              label='Notes'
              placeholder='Additional notes'
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              minRows={3}
            />
          </Grid.Col>
        </Grid>

        {!hideSubmitButton && (
          <Group justify='flex-end' gap='md' mt='md'>
            {onCancel && (
              <Button variant='light' onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSubmit} loading={loading}>
              {mode === 'create' ? 'Create' : 'Update'} Turtle Data
            </Button>
          </Group>
        )}
      </Stack>

      {/* Modal for creating new sheet */}
      <Modal
        opened={showCreateSheetModal}
        onClose={() => {
          setShowCreateSheetModal(false);
          setNewSheetName('');
        }}
        title='Create New Sheet'
      >
        <Stack gap='md'>
          <Text size='sm' c='dimmed'>
            Create a new Google Sheets tab with all required headers.
          </Text>
          <TextInput
            label='Sheet Name'
            placeholder='Enter sheet name (e.g., Location A)'
            value={newSheetName}
            onChange={(e) => setNewSheetName(e.target.value)}
            required
          />
          <Group justify='flex-end' gap='md'>
            <Button
              variant='subtle'
              onClick={() => {
                setShowCreateSheetModal(false);
                setNewSheetName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleCreateNewSheet(newSheetName)}
              loading={creatingSheet}
              disabled={!newSheetName.trim() || creatingSheet}
            >
              Create Sheet
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
});
