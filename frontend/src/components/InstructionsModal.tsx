import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  Divider,
  Paper,
  List,
  ThemeIcon,
} from '@mantine/core';
import { IconCamera, IconCheck, IconX } from '@tabler/icons-react';
import photoVideo from '../assets/photovideo.mp4';

interface InstructionsModalProps {
  opened: boolean;
  onClose: () => void;
}

export function InstructionsModal({ opened, onClose }: InstructionsModalProps) {
  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title="Photo Submission Instructions" 
      size="1200px" 
      centered
      styles={{
        title: { fontSize: '1.75rem', fontWeight: 700 },
        body: { fontSize: '1rem' },
      }}
    >
      <Stack gap="lg">
        {/* Video */}
        <Paper
          withBorder
          p="md"
          style={{
            aspectRatio: '16/9',
            overflow: 'hidden',
          }}
        >
          <video 
            controls 
            style={{ 
              width: '100%', 
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000'
            }}
          >
            <source src={photoVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </Paper>

        <Divider />

        {/* Instructions Section */}
        <Stack gap="md">
          <Group gap="sm">
            <IconCamera size={28} />
            <Text size="1.5rem" fw={700}>How to Photograph a Turtle's Plastron</Text>
          </Group>
          
          <Text size="lg" style={{ lineHeight: 1.6 }}>
            The plastron is the bottom shell of a turtle. Follow these guidelines to capture clear, identifiable photos:
          </Text>
        </Stack>

        {/* Step by Step Instructions */}
        <Stack gap="lg" mt="md">
          <Paper withBorder p="xl" style={{ borderLeftWidth: 4, borderLeftColor: 'var(--mantine-color-teal-6)' }}>
            <Group align="flex-start" gap="xl">
              <ThemeIcon size={60} radius="xl" variant="filled" color="teal">
                <Text size="xl" fw={700}>1</Text>
              </ThemeIcon>
              <Stack gap="sm" style={{ flex: 1 }}>
                <Text size="lg" fw={700}>Positioning</Text>
                <Text size="lg" style={{ lineHeight: 1.6 }}>
                  Gently turn the turtle over or hold it carefully to expose the plastron. Ensure the turtle is safe and comfortable during the process.
                </Text>
              </Stack>
            </Group>
          </Paper>

          <Paper withBorder p="xl" style={{ borderLeftWidth: 4, borderLeftColor: 'var(--mantine-color-cyan-6)' }}>
            <Group align="flex-start" gap="xl">
              <ThemeIcon size={60} radius="xl" variant="filled" color="cyan">
                <Text size="xl" fw={700}>2</Text>
              </ThemeIcon>
              <Stack gap="sm" style={{ flex: 1 }}>
                <Text size="lg" fw={700}>Lighting</Text>
                <Text size="lg" style={{ lineHeight: 1.6 }}>
                  Use natural lighting when possible. Avoid harsh shadows or reflections. The pattern should be clearly visible.
                </Text>
              </Stack>
            </Group>
          </Paper>

          <Paper withBorder p="xl" style={{ borderLeftWidth: 4, borderLeftColor: 'var(--mantine-color-teal-6)' }}>
            <Group align="flex-start" gap="xl">
              <ThemeIcon size={60} radius="xl" variant="filled" color="teal">
                <Text size="xl" fw={700}>3</Text>
              </ThemeIcon>
              <Stack gap="sm" style={{ flex: 1 }}>
                <Text size="lg" fw={700}>Camera Angle</Text>
                <Text size="lg" style={{ lineHeight: 1.6 }}>
                  Position your camera directly above and parallel to the plastron. Keep the entire shell in frame with minimal distortion.
                </Text>
              </Stack>
            </Group>
          </Paper>

          <Paper withBorder p="xl" style={{ borderLeftWidth: 4, borderLeftColor: 'var(--mantine-color-cyan-6)' }}>
            <Group align="flex-start" gap="xl">
              <ThemeIcon size={60} radius="xl" variant="filled" color="cyan">
                <Text size="xl" fw={700}>4</Text>
              </ThemeIcon>
              <Stack gap="sm" style={{ flex: 1 }}>
                <Text size="lg" fw={700}>Focus & Clarity</Text>
                <Text size="lg" style={{ lineHeight: 1.6 }}>
                  Ensure the photo is sharp and in focus. The scutes (shell plates) and any unique markings should be clearly visible for identification.
                </Text>
              </Stack>
            </Group>
          </Paper>

          <Paper withBorder p="xl" style={{ borderLeftWidth: 4, borderLeftColor: 'var(--mantine-color-teal-6)' }}>
            <Group align="flex-start" gap="xl">
              <ThemeIcon size={60} radius="xl" variant="filled" color="teal">
                <Text size="xl" fw={700}>5</Text>
              </ThemeIcon>
              <Stack gap="sm" style={{ flex: 1 }}>
                <Text size="lg" fw={700}>Background</Text>
                <Text size="lg" style={{ lineHeight: 1.6 }}>
                  Use a plain, contrasting background to make the turtle stand out. Avoid busy patterns or similar colors to the shell.
                </Text>
              </Stack>
            </Group>
          </Paper>
        </Stack>

        {/* Best Practices */}
        <Paper withBorder p="xl" style={{ backgroundColor: 'var(--mantine-color-teal-9)' }}>
          <Stack gap="md">
            <Group gap="sm">
              <IconCheck size={28} />
              <Text size="1.25rem" fw={700}>Best Practices</Text>
            </Group>
            <List size="lg" spacing="md" withPadding styles={{ itemWrapper: { lineHeight: 1.6 } }}>
              <List.Item>Clean the plastron gently if it's dirty to reveal pattern details</List.Item>
              <List.Item>Take multiple photos from slightly different angles</List.Item>
              <List.Item>Include a scale reference (like a ruler) if possible</List.Item>
              <List.Item>Handle turtles with care and return them safely to their habitat</List.Item>
            </List>
          </Stack>
        </Paper>

        {/* Footer Button */}
        <Group justify="flex-end" mt="lg">
          <Button size="lg" onClick={onClose} leftSection={<IconX size={20} />}>
            Got it! Let's upload
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}