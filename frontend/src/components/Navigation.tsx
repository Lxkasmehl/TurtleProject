import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  Text,
  Drawer,
  Stack,
  Button,
  useMantineTheme,
  useMantineColorScheme,
  ActionIcon,
  Badge,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconSun,
  IconMoon,
  IconHome,
  IconInfoCircle,
  IconMail,
  IconLogin,
  IconUser,
  IconShield,
} from '@tabler/icons-react';
import { useUser } from '../hooks/useUser';

interface NavigationProps {
  children: React.ReactNode;
}

const navigationItems = [
  { label: 'Home', path: '/', icon: IconHome },
  { label: 'About', path: '/about', icon: IconInfoCircle },
  { label: 'Contact', path: '/contact', icon: IconMail },
];

export default function Navigation({ children }: NavigationProps) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMantineTheme();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { role } = useUser();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const handleNavigation = (path: string) => {
    navigate(path);
    close();
  };

  const NavButton = ({
    item,
    variant = 'subtle',
  }: {
    item: (typeof navigationItems)[0];
    variant?: 'subtle' | 'light';
  }) => (
    <Button
      variant={variant}
      leftSection={<item.icon size={16} />}
      onClick={() => handleNavigation(item.path)}
      color={
        location.pathname === item.path ? (role === 'admin' ? 'red' : 'blue') : undefined
      }
      style={{
        backgroundColor:
          location.pathname === item.path
            ? role === 'admin'
              ? theme.colors.red[6]
              : theme.colors.blue[6]
            : 'transparent',
        color: location.pathname === item.path ? 'white' : undefined,
        transition: 'all 0.2s ease',
      }}
    >
      {item.label}
    </Button>
  );

  return (
    <AppShell header={{ height: 60 }} padding='md'>
      <AppShell.Header>
        <Group h='100%' px='md' justify='space-between'>
          {/* Left side - Logo */}
          <Group gap='sm'>
            <Text
              size='lg'
              fw={700}
              style={{ cursor: 'pointer' }}
              onClick={() => handleNavigation('/')}
            >
              Turtle Project
            </Text>
            <Badge
              color={role === 'admin' ? 'red' : 'blue'}
              leftSection={
                role === 'admin' ? <IconShield size={12} /> : <IconUser size={12} />
              }
              size='sm'
            >
              {role === 'admin' ? 'Admin' : 'Community'}
            </Badge>
          </Group>

          {/* Center - Desktop Navigation */}
          {!isMobile && (
            <Group gap='xs'>
              {navigationItems.map((item) => (
                <NavButton key={item.path} item={item} />
              ))}
            </Group>
          )}

          {/* Right side - Login, Theme Toggle, Mobile Menu */}
          <Group>
            {/* Desktop Login Link */}
            {!isMobile && (
              <Button
                variant='subtle'
                leftSection={<IconLogin size={16} />}
                onClick={() => handleNavigation('/login')}
                color={
                  location.pathname === '/login'
                    ? role === 'admin'
                      ? 'red'
                      : 'blue'
                    : undefined
                }
                style={{
                  backgroundColor:
                    location.pathname === '/login'
                      ? role === 'admin'
                        ? theme.colors.red[6]
                        : theme.colors.blue[6]
                      : 'transparent',
                  color: location.pathname === '/login' ? 'white' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                Login
              </Button>
            )}

            {/* Color Scheme Toggle */}
            <ActionIcon variant='subtle' onClick={() => toggleColorScheme()} size='lg'>
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>

            {/* Mobile Burger Menu */}
            {isMobile && <Burger opened={opened} onClick={toggle} size='sm' />}
          </Group>
        </Group>
      </AppShell.Header>

      {/* Mobile Drawer */}
      <Drawer opened={opened} onClose={close} position='right' size='xs'>
        <Stack gap='xs' h='90vh' justify='space-between'>
          {/* Main navigation links at top */}
          <Stack gap='xs'>
            {navigationItems.map((item) => (
              <NavButton key={item.path} item={item} variant='light' />
            ))}
          </Stack>

          {/* Login link pushed to bottom */}
          <Button
            variant='light'
            leftSection={<IconLogin size={16} />}
            onClick={() => handleNavigation('/login')}
            color={
              location.pathname === '/login'
                ? role === 'admin'
                  ? 'red'
                  : 'blue'
                : undefined
            }
            style={{
              backgroundColor:
                location.pathname === '/login'
                  ? role === 'admin'
                    ? theme.colors.red[6]
                    : theme.colors.blue[6]
                  : undefined,
              color: location.pathname === '/login' ? 'white' : undefined,
              transition: 'all 0.2s ease',
            }}
          >
            Login
          </Button>
        </Stack>
      </Drawer>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
