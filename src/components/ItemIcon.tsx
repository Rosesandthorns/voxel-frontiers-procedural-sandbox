import {pixelItemIcon} from '../game/systems/PixelItemIcons';
import {toolLifetime} from '../game/systems/ToolDurability';

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

      <span className={`${className} relative inline-block`} title={item.durability!==undefined?`${item.name} · ${item.durability}/${toolLifetime(item)} durability`:item.name}><img

        src={iconSrc}
        onError={e=>{const fallback=pixelItemIcon(item);if(e.currentTarget.src!==fallback)e.currentTarget.src=fallback;}}

        alt={item.name}

        title={item.foodState==='stale'?item.name+' — stale (less filling)':item.preserved?item.name+' — does not spoil':item.type==='food'?item.name+' — perishable':item.name}

        className={`w-full h-full object-contain select-none pointer-events-none drop-shadow-sm`}

        style={{ imageRendering: 'pixelated' }}

        draggable={false}

      />{item.durability!==undefined&&<span className="absolute bottom-0 left-0 w-full h-1 bg-black/80"><span className="block h-full" style={{width:Math.min(100,100*item.durability/toolLifetime(item))+'%',background:item.durability/toolLifetime(item)<.2?'#ce624b':'#8bab61'}}/></span>}</span>

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
