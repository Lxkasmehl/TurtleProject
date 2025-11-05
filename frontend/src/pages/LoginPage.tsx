import { useState } from 'react';
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Group,
  Divider,
} from '@mantine/core';
import { IconMail, IconLock } from '@tabler/icons-react';
import ViewSwitcher from '../components/ViewSwitcher';

export default function LoginPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // TODO: Implement login logic
    console.log('Login attempt:', { email, password });
  };

  return (
    <Container size='sm' py='xl'>
      <Paper shadow='sm' p='xl' radius='md'>
        <Stack gap='md'>
          <Title order={2} ta='center'>
            Login
          </Title>
          <Text c='dimmed' ta='center' size='sm'>
            Sign in to your account to continue
          </Text>

          <Divider />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <Stack gap='md'>
              <TextInput
                label='Email'
                placeholder='your@email.com'
                leftSection={<IconMail size={16} />}
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                required
                type='email'
              />

              <PasswordInput
                label='Password'
                placeholder='Your password'
                leftSection={<IconLock size={16} />}
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                required
              />

              <Button fullWidth size='md' type='submit' disabled={!email || !password}>
                Sign In
              </Button>
            </Stack>
          </form>

          <Divider />

          <Group justify='center'>
            <Text size='sm' c='dimmed'>
              Don't have an account?{' '}
              <Text component='span' c='blue' style={{ cursor: 'pointer' }}>
                Sign up
              </Text>
            </Text>
          </Group>
        </Stack>
      </Paper>

      <ViewSwitcher />
    </Container>
  );
}
