import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import '@mantine/core/styles.css';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import { UserProvider } from './hooks/useUser';
import { ThemeProvider } from './contexts/ThemeProvider';

function App(): React.JSX.Element {
  return (
    <UserProvider>
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
    </UserProvider>
  );
}

export default App;
