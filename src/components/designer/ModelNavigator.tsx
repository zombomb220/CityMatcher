import { useDesigner, type DesignerSelection } from '../../context/DesignerContext';
import { BuildingType } from '../../types';
import { ChevronRight, ChevronDown, Package, Settings, Home, FileText } from 'lucide-react';
import { useState } from 'react';

// TreeNode helper
const TreeNode = ({
    label,
    level = 0,
    isSelected,
    onClick,
    icon,
    children
}: {
    label: string,
    level?: number,
    isSelected?: boolean,
    onClick?: () => void,
    icon?: React.ReactNode,
    children?: React.ReactNode
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = !!children;

    return (
        <div>
            <div
                className={`flex items-center gap-2 py-1 px-2 cursor-pointer select-none transition-colors border-l-2
                    ${isSelected ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'border-transparent hover:bg-slate-800 text-slate-300'}
                `}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onClick) onClick();
                    if (hasChildren && !onClick) setIsExpanded(!isExpanded);
                }}
            >
                {hasChildren && (
                    <div
                        role="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="p-0.5 hover:text-white"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                )}
                {!hasChildren && <span className="w-[14px]"></span>}

                {icon && <span className="opacity-70">{icon}</span>}
                <span className="text-sm">{label}</span>
            </div>
            {isExpanded && children && (
                <div>{children}</div>
            )}
        </div>
    );
};

export function ModelNavigator() {
    const { gameData, selection, setSelection } = useDesigner();

    const isSelected = (s: DesignerSelection) => {
        if (!selection) return false;
        if (s.type === 'global' && selection.type === 'global') return true;
        if (s.type === 'startingCity' && selection.type === 'startingCity') return true;
        if (s.type === 'building' && selection.type === 'building') {
            return s.buildingType === selection.buildingType && s.tier === selection.tier;
        }
        if (s.type === 'blueprint' && selection.type === 'blueprint') {
            return s.id === selection.id;
        }
        return false;
    };

    return (
        <div className="flex flex-col gap-1 py-4">
            <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">City Config</h3>

            {/* Global Settings */}
            <TreeNode
                label="Global Settings"
                isSelected={isSelected({ type: 'global' })}
                onClick={() => setSelection({ type: 'global' })}
                icon={<Settings size={14} />}
            />

            {/* Starting City */}
            <TreeNode
                label="Starting City"
                isSelected={isSelected({ type: 'startingCity' })}
                onClick={() => setSelection({ type: 'startingCity' })}
                icon={<Home size={14} />}
            />

            {/* Status Effects */}
            <TreeNode
                label="Status Effects"
                isSelected={isSelected({ type: 'statusEffects' })}
                onClick={() => setSelection({ type: 'statusEffects' })}
                icon={<Settings size={14} />} // Using Settings icon for now, or Sparkles if available
            />

            <div className="h-px bg-slate-800 my-2 mx-4" />

            {/* Building Types */}
            <TreeNode label="Building Types" icon={<Package size={14} />}>
                {Object.values(BuildingType).map((type) => (
                    <TreeNode key={type} label={type} level={1}>
                        {[1, 2, 3].map(tier => (
                            <TreeNode
                                key={tier}
                                label={`Tier ${tier}`}
                                level={2}
                                isSelected={isSelected({ type: 'building', buildingType: type, tier })}
                                onClick={() => setSelection({ type: 'building', buildingType: type, tier })}
                            />
                        ))}
                    </TreeNode>
                ))}
            </TreeNode>

            {/* Blueprints */}
            <TreeNode label="Blueprints" icon={<FileText size={14} />}>
                {Object.values(gameData.blueprints).map((bp) => (
                    <TreeNode
                        key={bp.id}
                        label={bp.name || bp.id}
                        level={1}
                        isSelected={isSelected({ type: 'blueprint', id: bp.id })}
                        onClick={() => setSelection({ type: 'blueprint', id: bp.id })}
                    />
                ))}
            </TreeNode>
        </div>
    );
}
