import React, { useState, useEffect } from 'react';
import { ItemDef } from '../types';
import { getItemIcon } from '../game/systems/ItemRegistry';
import { getBlockSideTexture, onAtlasTexturesReady } from '../game/voxel/TextureAtlas';
import { BLOCK_DEFS } from '../game/voxel/Blocks';

interface ItemIconProps {
  item: ItemDef | null | undefined;
  className?: string;
}

export const ItemIcon: React.FC<ItemIconProps> = ({ item, className = 'w-8 h-8' }) => {
  // Re-render when texture atlas textures become ready
  const [, setAtlasTick] = useState(0);

  useEffect(() => {
    return onAtlasTexturesReady(() => {
      setAtlasTick((t) => t + 1);
    });
  }, []);

  if (!item) return null;

  // 1. Resolve from ItemRegistry helper
  let iconSrc = getItemIcon(item);

  // 2. Fall back to side texture from TextureAtlas if blockId is set
  if (!iconSrc && item.blockId !== undefined) {
    iconSrc = getBlockSideTexture(item.blockId);
  }

  const isImage =
    iconSrc.startsWith('data:image') ||
    iconSrc.startsWith('/') ||
    iconSrc.startsWith('http') ||
    iconSrc.endsWith('.png') ||
    iconSrc.endsWith('.webp');

  if (isImage) {
    return (
      <img
        src={iconSrc}
        alt={item.name}
        className={`${className} object-contain select-none pointer-events-none drop-shadow-sm`}
        style={{ imageRendering: 'pixelated' }}
        draggable={false}
      />
    );
  }

  // 3. Fallback for block items: render stylized pixel cube face in block's native tone
  if (item.blockId !== undefined) {
    const blockDef = BLOCK_DEFS[item.blockId];
    const fallbackColor = blockDef?.color || '#78716c';
    return (
      <div
        className={`${className} rounded-xs border border-white/20 shadow-inner flex items-center justify-center pointer-events-none`}
        style={{ backgroundColor: fallbackColor }}
      >
        <div className="w-1/2 h-1/2 bg-white/10 rounded-xs" />
      </div>
    );
  }

  return (
    <span className="text-xl leading-none select-none pointer-events-none font-mono text-zinc-300 font-bold">
      {item.name ? item.name[0] : '•'}
    </span>
  );
};
