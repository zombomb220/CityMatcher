import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GamePage } from './pages/GamePage';
import { DesignerPage } from './pages/DesignerPage';
import { OperationsPage } from './pages/OperationsPage';


function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Navigate to="/operations" replace />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/grid/:cityId" element={<GamePage />} />
        <Route path="/designer" element={<DesignerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
