import { Button, Group, Text, Paper, Stack } from '@mantine/core';
import { IconUser, IconShield } from '@tabler/icons-react';
import { useUser } from '../hooks/useUser';

export default function ViewSwitcher() {
  const { role, setRole } = useUser();

  return (
    <Paper shadow='xs' p='md' radius='md' mt='lg'>
      <Stack gap='sm'>
        <Text size='sm' fw={500} ta='center' c='dimmed'>
          Prototype View Switcher
        </Text>
        <Group justify='center' gap='xs'>
          <Button
            variant={role === 'community' ? 'filled' : 'outline'}
            color={role === 'community' ? 'blue' : 'gray'}
            leftSection={<IconUser size={16} />}
            onClick={() => setRole('community')}
            size='sm'
          >
            Community Member
          </Button>
          <Button
            variant={role === 'admin' ? 'filled' : 'outline'}
            color={role === 'admin' ? 'red' : 'gray'}
            leftSection={<IconShield size={16} />}
            onClick={() => setRole('admin')}
            size='sm'
          >
            Admin
          </Button>
        </Group>
        <Text size='xs' ta='center' c='dimmed'>
          Current view:{' '}
          <Text component='span' fw={500}>
            {role}
          </Text>
        </Text>
      </Stack>
    </Paper>
  );
}
