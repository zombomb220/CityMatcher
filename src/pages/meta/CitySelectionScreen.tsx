import React, { useState } from 'react';
import { useMetaStore } from '../../store/metaStore';
import { MetaMap } from '../../components/meta/MetaMap';
import { LeftSidebar, RightSidebar } from '../../components/meta/MetaSidebars';

export const CitySelectionScreen: React.FC = () => {
    const metaStore = useMetaStore();
    const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

    const selectedConfig = selectedCityId ? metaStore.getCityConfig(selectedCityId) || null : null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            overflow: 'hidden',
            fontFamily: 'Inter, sans-serif'
        }}>
            <MetaMap
                onSelectNode={setSelectedCityId}
                activeNodeId={selectedCityId}
            />

            <LeftSidebar />

            <RightSidebar selectedNode={selectedConfig} />
        </div>
    );
};
