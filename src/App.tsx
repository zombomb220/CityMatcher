
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GamePage } from './pages/GamePage';
import { DesignerPage } from './pages/DesignerPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/designer" element={<DesignerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
