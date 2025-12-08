import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RawMediasoupFlow from './pages/RawMediasoupFlow';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/mediasoup_overview" element={<RawMediasoupFlow />} />
    </Routes>
  );
}

export default App;
