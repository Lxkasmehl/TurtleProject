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
  // Admin view has more items, long usernames take more space
  // Higher breakpoint = drawer appears earlier (at larger screen width)
  const dynamicBreakpoint = useMemo(() => {
    const baseBreakpoint = 1000; // Base breakpoint for customer view with normal name

    // Calculate item count based on role
    const itemCount = role === 'admin' ? 5 : 3; // Admin has 2 extra items

    // Admin has 2 extra items, increase breakpoint by ~167px per extra item
    // This makes drawer appear earlier when there are more nav items
    // Target: Admin with normal name should be around 1000 + 333 = 1333px
    const itemAdjustment = (itemCount - 3) * 167;

    // Long usernames/emails take more space
    const userName = user?.name || user?.email || '';
    const userNameLength = userName.length;
    // Increase breakpoint by ~11px per character over 15 characters
    // This makes drawer appear earlier when username is long
    const userNameAdjustment = Math.max(0, (userNameLength - 15) * 11);

    // Calculate final breakpoint (higher = drawer appears at larger screen width)
    return baseBreakpoint + itemAdjustment + userNameAdjustment;
  }, [role, user?.name, user?.email]);

  // Use dynamic breakpoint to show drawer when there's not enough space
  // This skips the icon-only step and goes directly to drawer
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
      // Still logout locally even if API call fails
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
        location.pathname === item.path ? (role === 'admin' ? 'red' : 'blue') : undefined
      }
      data-active={location.pathname === item.path ? 'true' : 'false'}
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
        <Group
          h='100%'
          px='md'
          gap='md'
          wrap='nowrap'
          justify='space-between'
          style={{
            overflow: 'hidden',
            width: '100%',
          }}
        >
          {/* Left side - Logo */}
          <Group gap='sm' style={{ flexShrink: 0 }}>
            <Text
              size='lg'
              fw={700}
              style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={() => handleNavigation('/')}
            >
              Turtle Project
            </Text>
            <Badge
              data-testid='role-badge'
              color={role === 'admin' ? 'red' : 'blue'}
              leftSection={
                role === 'admin' ? <IconShield size={12} /> : <IconUser size={12} />
              }
              size='sm'
              style={{ flexShrink: 0 }}
            >
              {role === 'admin' ? 'Admin' : 'Community'}
            </Badge>
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
          <Group gap='xs' style={{ flexShrink: 0 }}>
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
                      color={role === 'admin' ? 'red' : 'blue'}
                      style={{ flexShrink: 0 }}
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
              </>
            )}

            {/* Color Scheme Toggle */}
            <ActionIcon variant='subtle' onClick={() => toggleColorScheme()} size='lg'>
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>

            {/* Burger Menu - shown when drawer should be used */}
            {showDrawer && (
              <Burger
                data-testid='mobile-menu-button'
                opened={opened}
                onClick={toggle}
                size='sm'
              />
            )}
          </Group>
        </Group>
      </AppShell.Header>

      {/* Mobile Drawer */}
      <Drawer opened={opened} onClose={close} position='right' size='xs'>
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
                color={role === 'admin' ? 'red' : 'blue'}
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
          )}
        </Stack>
      </Drawer>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
