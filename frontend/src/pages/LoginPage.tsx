import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Alert,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconMail,
  IconLock,
  IconBrandGoogle,
  IconAlertCircle,
  IconCheck,
  IconUser,
} from '@tabler/icons-react';
import {
  login as apiLogin,
  register as apiRegister,
  getGoogleAuthUrl,
  getCurrentUser,
  setToken,
} from '../services/api';
import { useUser } from '../hooks/useUser';

export default function LoginPage(): React.JSX.Element {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: setUserLogin, isLoggedIn } = useUser();
  const hasProcessedOAuth = useRef(false);
  const hasRedirected = useRef(false);

  // Handle Google OAuth callback
  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessedOAuth.current) return;

    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');
    const nameParam = searchParams.get('name');
    const roleParam = searchParams.get('role');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(
        errorParam === 'auth_failed'
          ? 'Google authentication failed. Please try again.'
          : 'An error occurred. Please try again.'
      );
      // Clean URL
      window.history.replaceState({}, '', '/login');
      hasProcessedOAuth.current = true;
      return;
    }

    if (token && emailParam && roleParam) {
      hasProcessedOAuth.current = true;
      setToken(token);
      setUserLogin({
        id: 0, // Will be fetched from API
        email: emailParam,
        name: nameParam || null,
        role: roleParam as 'community' | 'admin',
      });

      // Fetch full user data
      getCurrentUser()
        .then((user) => {
          setUserLogin(user);
          notifications.show({
            title: 'Successfully logged in! 🎉',
            message: `Welcome back, ${user.name || user.email}!`,
            color: 'green',
            icon: <IconCheck size={18} />,
          });
          navigate('/');
        })
        .catch((err) => {
          console.error('Failed to fetch user:', err);
          setError('Failed to load user data');
          hasProcessedOAuth.current = false; // Allow retry
        });

      // Clean URL
      window.history.replaceState({}, '', '/login');
    }
    // Only depend on searchParams to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Redirect if already logged in (but not during OAuth processing)
  useEffect(() => {
    if (isLoggedIn && !hasProcessedOAuth.current && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Registration
        const response = await apiRegister({ email, password, name: name || undefined });
        setUserLogin(response.user);
        notifications.show({
          title: 'Account created successfully! 🎉',
          message: `Welcome, ${response.user.name || response.user.email}!`,
          color: 'green',
          icon: <IconCheck size={18} />,
        });
        navigate('/');
      } else {
        // Login
        const response = await apiLogin({ email, password });
        setUserLogin(response.user);
        notifications.show({
          title: 'Successfully logged in! 🎉',
          message: `Welcome back, ${response.user.name || response.user.email}!`,
          color: 'green',
          icon: <IconCheck size={18} />,
        });
        navigate('/');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : isSignUp
          ? 'Registration failed'
          : 'Login failed';
      setError(errorMessage);
      notifications.show({
        title: isSignUp ? 'Registration failed' : 'Login failed',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleAuthUrl();
  };

  return (
    <Container size='sm' py='xl'>
      <Paper shadow='sm' p='xl' radius='md'>
        <Stack gap='md'>
          <Title order={2} ta='center'>
            {isSignUp ? 'Sign Up' : 'Login'}
          </Title>
          <Text c='dimmed' ta='center' size='sm'>
            {isSignUp
              ? 'Create a new account to get started'
              : 'Sign in to your account to continue'}
          </Text>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} title='Error' color='red'>
              {error}
            </Alert>
          )}

          <Divider
            label={isSignUp ? 'Create Account' : 'Or with Email'}
            labelPosition='center'
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <Stack gap='md'>
              {isSignUp && (
                <TextInput
                  label='Name'
                  placeholder='Your name (optional)'
                  leftSection={<IconUser size={16} />}
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                  disabled={loading}
                />
              )}

              <TextInput
                label='Email'
                placeholder='your@email.com'
                leftSection={<IconMail size={16} />}
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                required
                type='email'
                disabled={loading}
              />

              <PasswordInput
                label='Password'
                placeholder='Your password'
                leftSection={<IconLock size={16} />}
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                required
                disabled={loading}
              />

              <Button
                fullWidth
                size='md'
                type='submit'
                disabled={!email || !password || loading}
                leftSection={loading ? <Loader size={16} /> : undefined}
              >
                {loading
                  ? isSignUp
                    ? 'Creating account...'
                    : 'Logging in...'
                  : isSignUp
                  ? 'Sign Up'
                  : 'Sign In'}
              </Button>
            </Stack>
          </form>

          <Divider label='Or' labelPosition='center' />

          <Button
            fullWidth
            size='md'
            variant='outline'
            leftSection={<IconBrandGoogle size={18} />}
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
          </Button>

          <Divider />

          <Group justify='center'>
            <Text size='sm' c='dimmed'>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text
                component='span'
                c='blue'
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Text>
            </Text>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
