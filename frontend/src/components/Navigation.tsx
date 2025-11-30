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
import { useMemo } from 'react';
import {
  IconSun,
  IconMoon,
  IconHome,
  IconInfoCircle,
  IconMail,
  IconLogin,
  IconLogout,
  IconUser,
  IconShield,
  IconPhoto,
  IconUsers,
} from '@tabler/icons-react';
import { useUser } from '../hooks/useUser';
import { logout as apiLogout } from '../services/api';
import { notifications } from '@mantine/notifications';

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
  const { role, isLoggedIn, user, logout: setUserLogout } = useUser();

  // Get navigation items in the correct order based on role
  const getNavigationItems = () => {
    const items = [...navigationItems];
    if (role === 'admin') {
      // Insert admin items after Home
      items.splice(1, 0, {
        label: 'Turtle Records',
        path: '/admin/turtle-records',
        icon: IconPhoto,
      });
      items.splice(2, 0, {
        label: 'User Management',
        path: '/admin/users',
        icon: IconUsers,
      });
    }
    return items;
  };

  // Calculate dynamic breakpoint based on navbar content
  const dynamicBreakpoint = useMemo(() => {
    const baseBreakpoint = 1000;
    const itemCount = role === 'admin' ? 5 : 3;
    const itemAdjustment = (itemCount - 3) * 167;
    const userName = user?.name || user?.email || '';
    const userNameLength = userName.length;
    const userNameAdjustment = Math.max(0, (userNameLength - 15) * 11);
    return baseBreakpoint + itemAdjustment + userNameAdjustment;
  }, [role, user?.name, user?.email]);

  const showDrawer = useMediaQuery(`(max-width: ${dynamicBreakpoint}px)`);

  const handleNavigation = (path: string) => {
    navigate(path);
    close();
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
      setUserLogout();
      notifications.show({
        title: 'Successfully logged out',
        message: 'You have been logged out successfully.',
        color: 'blue',
      });
      navigate('/');
      close();
    } catch (error) {
      console.error('Logout error:', error);
      setUserLogout();
      navigate('/');
      close();
    }
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
        <Group
          h='100%'
          px='xl'
          gap='md'
          wrap='nowrap'
          justify='space-between'
          style={{
            overflow: 'hidden',
            width: '100%',
          }}
        >
          {/* Left side - Logo with enhanced design */}
          <Group gap='md' wrap='nowrap' style={{ flexShrink: 0 }}>
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
          {!showDrawer && (
            <Group
              gap='xs'
              style={{
                flex: 1,
                minWidth: 0,
                justifyContent: 'center',
                flexWrap: 'nowrap',
              }}
            >
              {getNavigationItems().map((item) => (
                <NavButton key={item.path} item={item} />
              ))}
            </Group>
          )}

          {/* Right side - Login/Logout, Theme Toggle, Mobile Menu */}
          <Group gap='sm' style={{ flexShrink: 0 }}>
            {/* Desktop Login/Logout Link */}
            {!showDrawer && (
              <>
                {isLoggedIn ? (
                  <Group gap='xs' style={{ flexWrap: 'nowrap', minWidth: 0 }}>
                    {user && (
                      <Text
                        size='sm'
                        c='dimmed'
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flexShrink: 1,
                          minWidth: 0,
                        }}
                        title={user.name || user.email}
                      >
                        {user.name || user.email}
                      </Text>
                    )}
                    <Button
                      variant='subtle'
                      leftSection={<IconLogout size={16} />}
                      onClick={handleLogout}
                      color={role === 'admin' ? 'orange' : 'teal'}
                      style={{ flexShrink: 0 }}
                      styles={{
                        root: {
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          fontWeight: 600,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            backgroundColor:
                              role === 'admin'
                                ? theme.colors.orange[0]
                                : theme.colors.teal[0],
                          },
                        },
                      }}
                    >
                      Logout
                    </Button>
                  </Group>
                ) : (
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
              </>
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

            {/* Burger Menu */}
            {showDrawer && (
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

          {/* Login/Logout link pushed to bottom */}
          {isLoggedIn ? (
            <Stack gap='xs'>
              {user && (
                <Text size='sm' c='dimmed' ta='center' p='xs'>
                  {user.name || user.email}
                </Text>
              )}
              <Button
                variant='light'
                leftSection={<IconLogout size={16} />}
                onClick={handleLogout}
                color={role === 'admin' ? 'orange' : 'teal'}
                styles={{
                  root: {
                    transition: 'all 0.3s ease',
                    fontWeight: 600,
                  },
                }}
              >
                Logout
              </Button>
            </Stack>
          ) : (
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
          )}
        </Stack>
      </Drawer>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}