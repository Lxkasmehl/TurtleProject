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
  Box,
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
  IconPhoto,
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

  // Get navigation items in the correct order based on role
  const getNavigationItems = () => {
    const items = [...navigationItems];
    if (role === 'admin') {
      // Insert Turtle Records after Home
      items.splice(1, 0, {
        label: 'Turtle Records',
        path: '/admin/turtle-records',
        icon: IconPhoto,
      });
    }
    return items;
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
        location.pathname === item.path ? (role === 'admin' ? 'orange' : 'teal') : undefined
      }
      data-active={location.pathname === item.path ? 'true' : 'false'}
      styles={{
        root: {
          backgroundColor:
            location.pathname === item.path
              ? role === 'admin'
                ? theme.colors.orange[6]
                : theme.colors.teal[6]
              : 'transparent',
          color: location.pathname === item.path ? 'white' : undefined,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          fontWeight: 600,
          '&:hover': {
            transform: location.pathname !== item.path ? 'translateY(-2px)' : undefined,
            backgroundColor:
              location.pathname === item.path
                ? role === 'admin'
                  ? theme.colors.orange[7]
                  : theme.colors.teal[7]
                : role === 'admin'
                ? theme.colors.orange[0]
                : theme.colors.teal[0],
          },
        },
      }}
    >
      {item.label}
    </Button>
  );

  return (
    <AppShell header={{ height: 70 }} padding='md'>
      <AppShell.Header
        style={{
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          backgroundColor:
            colorScheme === 'dark'
              ? 'rgba(26, 31, 30, 0.9)'
              : 'rgba(255, 255, 255, 0.9)',
          borderBottom: `2px solid ${
            role === 'admin'
              ? theme.colors.orange[4]
              : theme.colors.teal[4]
          }`,
          boxShadow: `0 2px 8px ${
            role === 'admin'
              ? 'rgba(255, 146, 43, 0.12)'
              : 'rgba(32, 201, 151, 0.12)'
          }`,
        }}
      >
        <Group h='100%' px='xl' justify='space-between' wrap='nowrap'>
          {/* Left side - Logo with enhanced design */}
          <Group gap='md' wrap='nowrap' style={{ flex: '0 0 auto' }}>
            {/* Logo Icon */}
            <Box
              onClick={() => handleNavigation('/')}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background:
                  role === 'admin'
                    ? 'linear-gradient(135deg, rgba(245, 165, 66, 0.25) 0%, rgba(217, 143, 53, 0.35) 100%)'
                    : 'linear-gradient(135deg, rgba(32, 184, 139, 0.25) 0%, rgba(79, 175, 105, 0.35) 100%)',
                border: role === 'admin'
                  ? '2px solid rgba(245, 165, 66, 0.4)'
                  : '2px solid rgba(32, 184, 139, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  role === 'admin'
                    ? '0 2px 8px rgba(245, 165, 66, 0.2)'
                    : '0 2px 8px rgba(32, 184, 139, 0.2)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) rotate(5deg)';
                e.currentTarget.style.background = role === 'admin'
                  ? 'linear-gradient(135deg, rgba(245, 165, 66, 0.35) 0%, rgba(217, 143, 53, 0.45) 100%)'
                  : 'linear-gradient(135deg, rgba(32, 184, 139, 0.35) 0%, rgba(79, 175, 105, 0.45) 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                e.currentTarget.style.background = role === 'admin'
                  ? 'linear-gradient(135deg, rgba(245, 165, 66, 0.25) 0%, rgba(217, 143, 53, 0.35) 100%)'
                  : 'linear-gradient(135deg, rgba(32, 184, 139, 0.25) 0%, rgba(79, 175, 105, 0.35) 100%)';
              }}
            >
              <Text size='xl' fw={700} style={{ fontSize: '28px' }}>
                🐢
              </Text>
            </Box>

            {/* Title and Badge */}
            <Box>
              <Text
                size='xl'
                fw={800}
                variant='gradient'
                gradient={{
                  from: role === 'admin' ? 'orange.7' : 'teal.7',
                  to: role === 'admin' ? 'red.6' : 'green.6',
                  deg: 45,
                }}
                style={{
                  cursor: 'pointer',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
                onClick={() => handleNavigation('/')}
              >
                TurtleTracker
              </Text>
              <Badge
                data-testid='role-badge'
                color={role === 'admin' ? 'orange' : 'teal'}
                variant='light'
                leftSection={
                  role === 'admin' ? (
                    <IconShield size={12} />
                  ) : (
                    <IconUser size={12} />
                  )
                }
                size='sm'
                style={{
                  marginTop: 2,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.65rem',
                }}
              >
                {role === 'admin' ? 'Admin' : 'Community'}
              </Badge>
            </Box>
          </Group>

          {/* Center - Desktop Navigation */}
          {!isMobile && (
            <Group gap='xs' style={{ flex: '1 1 auto', justifyContent: 'center' }}>
              {getNavigationItems().map((item) => (
                <NavButton key={item.path} item={item} />
              ))}
            </Group>
          )}

          {/* Right side - Login, Theme Toggle, Mobile Menu */}
          <Group gap='sm' wrap='nowrap' style={{ flex: '0 0 auto' }}>
            {/* Desktop Login Link */}
            {!isMobile && (
              <Button
                variant='subtle'
                leftSection={<IconLogin size={16} />}
                onClick={() => handleNavigation('/login')}
                color={
                  location.pathname === '/login'
                    ? role === 'admin'
                      ? 'orange'
                      : 'teal'
                    : undefined
                }
                styles={{
                  root: {
                    backgroundColor:
                      location.pathname === '/login'
                        ? role === 'admin'
                          ? theme.colors.orange[6]
                          : theme.colors.teal[6]
                        : 'transparent',
                    color: location.pathname === '/login' ? 'white' : undefined,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontWeight: 600,
                    '&:hover': {
                      transform:
                        location.pathname !== '/login' ? 'translateY(-2px)' : undefined,
                      backgroundColor:
                        location.pathname === '/login'
                          ? role === 'admin'
                            ? theme.colors.orange[7]
                            : theme.colors.teal[7]
                          : role === 'admin'
                          ? theme.colors.orange[0]
                          : theme.colors.teal[0],
                    },
                  },
                }}
              >
                Login
              </Button>
            )}

            {/* Color Scheme Toggle */}
            <ActionIcon
              variant='subtle'
              onClick={() => toggleColorScheme()}
              size='lg'
              color={role === 'admin' ? 'orange' : 'teal'}
              style={{
                transition: 'all 0.2s ease',
              }}
              styles={{
                root: {
                  '&:hover': {
                    transform: 'rotate(180deg)',
                    backgroundColor:
                      role === 'admin'
                        ? theme.colors.orange[1]
                        : theme.colors.teal[1],
                  },
                },
              }}
            >
              {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>

            {/* Mobile Burger Menu */}
            {isMobile && (
              <Burger
                data-testid='mobile-menu-button'
                opened={opened}
                onClick={toggle}
                size='sm'
                color={
                  role === 'admin'
                    ? theme.colors.orange[6]
                    : theme.colors.teal[6]
                }
              />
            )}
          </Group>
        </Group>
      </AppShell.Header>

      {/* Mobile Drawer */}
      <Drawer
        opened={opened}
        onClose={close}
        position='right'
        size='xs'
        styles={{
          content: {
            backdropFilter: 'blur(16px)',
            backgroundColor:
              colorScheme === 'dark'
                ? 'rgba(26, 31, 30, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
          },
          header: {
            borderBottom: `2px solid ${
              role === 'admin'
                ? theme.colors.orange[3]
                : theme.colors.teal[3]
            }`,
          },
        }}
      >
        <Stack gap='xs' h='90vh' justify='space-between'>
          {/* Main navigation links at top */}
          <Stack gap='xs'>
            {getNavigationItems().map((item) => (
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
                  ? 'orange'
                  : 'teal'
                : undefined
            }
            styles={{
              root: {
                backgroundColor:
                  location.pathname === '/login'
                    ? role === 'admin'
                      ? theme.colors.orange[6]
                      : theme.colors.teal[6]
                    : undefined,
                color: location.pathname === '/login' ? 'white' : undefined,
                transition: 'all 0.3s ease',
                fontWeight: 600,
              },
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