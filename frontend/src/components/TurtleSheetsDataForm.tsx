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
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconInfoCircle, IconCheck, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { TurtleSheetsData } from '../services/api';
import { listSheets } from '../services/api';

interface TurtleSheetsDataFormProps {
  initialData?: TurtleSheetsData;
  sheetName?: string; // Selected sheet name
  state?: string;
  location?: string;
  primaryId?: string;
  onSave: (data: TurtleSheetsData, sheetName: string) => Promise<void>;
  onCancel?: () => void;
  mode: 'create' | 'edit';
}

export function TurtleSheetsDataForm({
  initialData,
  sheetName: initialSheetName,
  state,
  location,
  primaryId,
  onSave,
  onCancel,
  mode,
}: TurtleSheetsDataFormProps) {
  const [formData, setFormData] = useState<TurtleSheetsData>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>(initialSheetName || '');
  const [loadingSheets, setLoadingSheets] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
    if (initialSheetName) {
      setSelectedSheetName(initialSheetName);
    }
  }, [initialData, initialSheetName]);

  useEffect(() => {
    // Load available sheets on mount
    const loadSheets = async () => {
      setLoadingSheets(true);
      try {
        const response = await listSheets();
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
        console.error('Failed to load sheets:', error);
        notifications.show({
          title: 'Warning',
          message: 'Failed to load available sheets',
          color: 'yellow',
        });
      } finally {
        setLoadingSheets(false);
      }
    };

    loadSheets();
  }, [initialSheetName]);

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
      await onSave(formData, selectedSheetName);
      notifications.show({
        title: 'Success!',
        message: `Turtle data ${mode === 'create' ? 'created' : 'updated'} successfully`,
        color: 'green',
        icon: <IconCheck size={18} />,
      });
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

  return (
    <Paper shadow='sm' p='xl' radius='md' withBorder>
      <Stack gap='lg'>
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
                label='Sheet / Location *'
                placeholder='Select a sheet'
                data={availableSheets}
                value={selectedSheetName}
                onChange={(value) => setSelectedSheetName(value || '')}
                required
                description='Select the Google Sheets tab where this turtle data should be stored'
                error={!selectedSheetName ? 'Sheet selection is required' : undefined}
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

          {/* Row 5: Location */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='General Location'
              placeholder='General location'
              value={formData.general_location || state || ''}
              onChange={(e) => handleChange('general_location', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label='Location'
              placeholder='Specific location'
              value={formData.location || location || ''}
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

          {/* Row 7: More Checkboxes */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Select
              label='DNA Extracted?'
              placeholder='Yes/No'
              data={['Yes', 'No']}
              value={formData.dna_extracted || ''}
              onChange={(value) => handleChange('dna_extracted', value || '')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label='iButton Last Set'
              placeholder='Date'
              value={formData.ibutton_last_set || ''}
              onChange={(e) => handleChange('ibutton_last_set', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
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

        <Group justify='flex-end' gap='md' mt='md'>
          {onCancel && (
            <Button variant='light' onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmit} loading={loading}>
            {mode === 'create' ? 'Create' : 'Update'} Turtle Data
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
