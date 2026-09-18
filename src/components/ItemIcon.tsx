import React from 'react';
import { ItemDef } from '../types';
import { getBlockSideTexture } from '../game/voxel/TextureAtlas';

interface ItemIconProps {
  item: ItemDef | null | undefined;
  className?: string;
}

export const ItemIcon: React.FC<ItemIconProps> = ({ item, className = 'w-8 h-8' }) => {
  if (!item) return null;

  // 1. Resolve side texture from TextureAtlas if blockId is set
  let iconSrc = '';
  if (item.blockId !== undefined) {
    iconSrc = getBlockSideTexture(item.blockId);
  }
  // 2. Fall back to item's defined icon
  if (!iconSrc) {
    iconSrc = item.icon || '';
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
        className={`${className} object-contain select-none drop-shadow-sm`}
        style={{ imageRendering: 'pixelated' }}
        draggable={false}
      />
    );
  }

  return (
    <span className="text-2xl leading-none select-none">
      {iconSrc || '📦'}
    </span>
  );
};
