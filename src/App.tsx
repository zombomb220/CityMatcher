
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GamePage } from './pages/GamePage';
import { DesignerPage } from './pages/DesignerPage';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/designer" element={<DesignerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
