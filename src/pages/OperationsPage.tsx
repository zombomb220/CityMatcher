import React, { useState } from 'react';
import { MetaMap } from '../components/meta/MetaMap';
import { LeftSidebar } from '../components/meta/MetaSidebars'; // Re-export needed
import { RightSidebar } from '../components/meta/MetaSidebars'; // Re-export needed
import { useNavigate } from 'react-router-dom';

/*
  Operations Page (formerly CitySelectionScreen/OverworldPage)
  - Renders the Galaxy Map
  - Handles navigation to the Grid page (/grid/:cityId)
*/
export const OperationsPage: React.FC = () => {
    const navigate = useNavigate();
    const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

    const handleEnterCity = (cityId: string) => {
        // Navigate to the Grid page with the city ID
        navigate(`/grid/${cityId}`);
    };

    return (
        <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
            {/* 1. The Map (Background Layer) */}
            <MetaMap
                onSelectNode={setSelectedCityId}
                activeNodeId={selectedCityId}
            />

            {/* 2. UI Overlay Layer (Pointer events pass through unless hitting UI elements) */}
            <div className="absolute inset-0 pointer-events-none">

                {/* Left Sidebar: Global Stats */}
                <div className="pointer-events-auto">
                    <LeftSidebar />
                </div>

                {/* Right Sidebar: Selected City Details */}
                <div className="pointer-events-auto">
                    <RightSidebar
                        selectedCityId={selectedCityId}
                        onEnterCity={handleEnterCity}
                        onClose={() => setSelectedCityId(null)}
                    />
                </div>
            </div>
        </div>
    );
};
