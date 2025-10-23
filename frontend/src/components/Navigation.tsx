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
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconSun,
  IconMoon,
  IconHome,
  IconInfoCircle,
  IconMail,
} from '@tabler/icons-react';

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
      color={location.pathname === item.path ? 'green' : undefined}
      style={{
        backgroundColor:
          location.pathname === item.path ? theme.colors.green[6] : 'transparent',
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
          <Text
            size='lg'
            fw={700}
            style={{ cursor: 'pointer' }}
            onClick={() => handleNavigation('/')}
          >
            Turtle Project
          </Text>

          <Group>
            {/* Desktop Navigation */}
            {!isMobile && (
              <Group gap='xs'>
                {navigationItems.map((item) => (
                  <NavButton key={item.path} item={item} />
                ))}
              </Group>
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
        <Stack gap='xs'>
          {navigationItems.map((item) => (
            <NavButton key={item.path} item={item} variant='light' />
          ))}
        </Stack>
      </Drawer>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
