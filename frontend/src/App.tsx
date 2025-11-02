import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import { store } from './store';
import { useAppSelector } from './store/hooks';
import { communityTheme, adminTheme } from './store/slices/themeSlice';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { role } = useAppSelector((state) => state.user);
  const currentTheme = role === 'admin' ? adminTheme : communityTheme;

  return <MantineProvider theme={currentTheme}>{children}</MantineProvider>;
}

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router>
          <Navigation>
            <Routes>
              <Route path='/' element={<HomePage />} />
              <Route path='/about' element={<AboutPage />} />
              <Route path='/contact' element={<ContactPage />} />
              <Route path='/login' element={<LoginPage />} />
            </Routes>
          </Navigation>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
