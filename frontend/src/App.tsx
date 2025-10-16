import { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Image,
  Button,
  Stack,
  Center,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import type { FileWithPath, FileRejection } from '@mantine/dropzone';
import { IconUpload, IconX, IconPhoto } from '@tabler/icons-react';

function App(): React.JSX.Element {
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDrop = (acceptedFiles: FileWithPath[]): void => {
    setFiles(acceptedFiles);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = (): void => {
    setFiles([]);
    setPreview(null);
  };

  return (
    <Container size='sm' py='xl'>
      <Paper shadow='sm' p='xl' radius='md'>
        <Stack gap='lg'>
          <Center>
            <Title order={1}>Image Upload</Title>
          </Center>

          <Text size='sm' c='dimmed' ta='center'>
            Upload an image to display it
          </Text>

          <Dropzone
            onDrop={handleDrop}
            onReject={(files: FileRejection[]) => console.log('rejected files', files)}
            maxSize={5 * 1024 * 1024} // 5MB
            accept={{
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
            }}
            multiple={false}
          >
            <Group justify='center' gap='xl' mih={220} style={{ pointerEvents: 'none' }}>
              <Dropzone.Accept>
                <IconUpload size='3.2rem' stroke={1.5} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size='3.2rem' stroke={1.5} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto size='3.2rem' stroke={1.5} />
              </Dropzone.Idle>

              <div>
                <Text size='xl' inline>
                  Drag an image here or click to select
                </Text>
                <Text size='sm' c='dimmed' inline mt={7}>
                  Supported formats: PNG, JPG, JPEG, GIF, WEBP (max. 5MB)
                </Text>
              </div>
            </Group>
          </Dropzone>

          {preview && (
            <Stack gap='md'>
              <Title order={3}>Preview:</Title>
              <Image
                src={preview}
                alt='Uploaded image'
                radius='md'
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <Button
                color='red'
                variant='light'
                onClick={handleRemove}
                leftSection={<IconX size={16} />}
              >
                Remove image
              </Button>
            </Stack>
          )}

          {files.length > 0 && (
            <Text size='sm' c='dimmed'>
              Selected file: {files[0].name} ({(files[0].size / 1024 / 1024).toFixed(2)}{' '}
              MB)
            </Text>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}

export default App;
