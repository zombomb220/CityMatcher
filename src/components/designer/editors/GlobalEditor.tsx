import { useDesigner } from '../../../context/DesignerContext';

export function GlobalEditor() {
    const { gameData, updateGameData } = useDesigner();

    const handleChange = (field: keyof typeof gameData, value: number) => {
        updateGameData({
            ...gameData,
            [field]: value
        });
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-emerald-400 border-b border-slate-800 pb-2">Global Settings</h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-lg">
                    <label className="block text-slate-400 text-xs uppercase font-bold mb-2">Initial Money</label>
                    <input
                        type="number"
                        value={gameData.initialMoney}
                        onChange={(e) => handleChange('initialMoney', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                </div>

                <div className="bg-slate-900 p-4 rounded-lg">
                    <label className="block text-slate-400 text-xs uppercase font-bold mb-2">Grid Size</label>
                    <input
                        type="number"
                        value={gameData.gridSize}
                        onChange={(e) => handleChange('gridSize', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-lg">
                <label className="block text-slate-400 text-xs uppercase font-bold mb-2">Spawn Weights</label>
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(gameData.spawnWeights).map(([type, weight]) => (
                        <div key={type as string} className="flex items-center justify-between bg-slate-800 p-2 rounded">
                            <span className="text-sm text-slate-300">{type}</span>
                            <input
                                type="number"
                                step="0.05"
                                value={weight}
                                onChange={(e) => {
                                    const newWeights = { ...gameData.spawnWeights, [type]: parseFloat(e.target.value) || 0 };
                                    updateGameData({ ...gameData, spawnWeights: newWeights });
                                }}
                                className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-right text-xs"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
