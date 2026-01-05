import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GamePage } from './pages/GamePage';
import { DesignerPage } from './pages/DesignerPage';
import { CitySelectionScreen } from './pages/meta/CitySelectionScreen';
import { RunSummaryScreen } from './pages/meta/RunSummaryScreen';
import { useGameStore } from './store/gameStore';

const MainMenuWrapper = () => {
  const activeCityId = useGameStore(state => state.activeCityId);
  const gameState = useGameStore(state => state.gameState);

  if (!activeCityId) {
    return <CitySelectionScreen />;
  }

  if (gameState === 'completed') {
    return <RunSummaryScreen />;
  }

  return <GamePage />;
};

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<MainMenuWrapper />} />
        <Route path="/designer" element={<DesignerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
