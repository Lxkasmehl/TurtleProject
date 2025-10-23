import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

function App(): React.JSX.Element {
  return (
    <Router>
      <Navigation>
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='/about' element={<AboutPage />} />
          <Route path='/contact' element={<ContactPage />} />
        </Routes>
      </Navigation>
    </Router>
  );
}

export default App;
