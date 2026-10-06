import * as THREE from 'three';
import { BlockType, InventorySlot, ItemDef } from '../../types';
import { soundManager } from '../audio/SoundFX';
import { EntityManager } from '../entities/EntityManager';
import { raycastEntityHit } from '../entities/EntityHitboxPhysics';
import { PlayerController } from '../player/PlayerController';
import { PlayerPhysics } from '../player/PlayerPhysics';
import { ExplorationSystem } from '../systems/ExplorationSystem';
import { getItemForBlock, ITEM_REGISTRY, isDoorItem } from '../systems/ItemRegistry';
import { DroppedItemManager } from '../entities/DroppedItemManager';
import { breakDependentBlocks } from '../voxel/DependentBlockSystem';
import {
  BLOCK_DEFS,
  isFlintBlock,
  isLeavesBlock,
  isLogBlock,
  isPlantBlock,
  isPlankBlock,
  isShrubBlock,
  isStoneOrOre,
  isWaterBlock,
  isDoorBlock,
  isDoorBottom,
  isDoorTop,
  isDoorOpen,
  getDoorOppositeStateBlock,
  getDoorTopForBottom
} from '../voxel/Blocks';
import { VoxelWorld } from '../voxel/VoxelWorld';
import { CHUNK_H } from '../voxel/ChunkConstants';
import { getMinedBlockReplacement } from '../voxel/WaterFlora';
import { isCropBlock, getCropInfo, CROP_BLOCK_IDS, CROP_BLOCK_BUNDLES } from '../farming/CropBlocks';
import {
  CROP_SEED_ITEMS,
  CROP_FOOD_ITEMS,
  getMatureCropDrops,
  getWildPlantDrops,
  getWildSeaCabbageDrops,
  getWiltedPlantDrops
} from '../farming/CropItems';

export interface InteractionHandlerCallbacks {
  getHotbar: () => InventorySlot[];
  getSelectedHotbarIndex: () => number;
  getInventory?: () => InventorySlot[];
  onSelectHotbar: (index: number) => void;
  onUpdateHotbar: (hotbar: InventorySlot[]) => void;
  onUpdateInventory?: (inventory: InventorySlot[]) => void;
  onOpenInventory: () => void;
  onOpenStation?: (
    stationId: 'inventory' | 'tool_crafter' | 'stone_bench' | 'furnace' | 'forge' | 'heater' | 'cooler',
    coords?: { x: number; y: number; z: number }
  ) => void;
  onOpenBestiary: () => void;
  onOpenSettings?: () => void;
  onPause?: () => void;
  onDiscoveryBanner: (banner: { title: string; subtitle: string } | null) => void;
  onPointerLockChange: (isLocked: boolean) => void;
  onMiningProgress?: (progress: number) => void;
  getPlayer: () => PlayerController | null;
  getWorld: () => VoxelWorld | null;
  getEntityManager: () => EntityManager | null;
  getDroppedItemManager?: () => DroppedItemManager | null;
  getExplorationSystem: () => ExplorationSystem;
  isPaused?: () => boolean;
}

interface MiningTarget {
  x: number;
  y: number;
  z: number;
  block: BlockType;
}

export class InteractionHandler {
  private dom: HTMLElement;
  private callbacks: InteractionHandlerCallbacks;

  // Mining state
  private isMouseDown: boolean = false;
  private isMining: boolean = false;
  private currentMiningBlock: MiningTarget | null = null;
  private miningTimer: number = 0;
  private miningDuration: number = 1.0;
  private miningStartTime: number = 0;
  private particleIntervalTimer: number = 0;
  private lostTargetTimer: number = 0;
  private pendingTarget: MiningTarget | null = null;
  private pendingTargetTimer: number = 0;
  private wasPointerLocked: boolean = false;

  // Event handlers
  private handlePointerLockChange: () => void;
  private handleMouseDown: (e: MouseEvent) => void;
  private handleMouseUp: (e: MouseEvent) => void;
  private handleMouseMove: (e: MouseEvent) => void;
  private handleWheel: (e: WheelEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleContextMenu: (e: MouseEvent) => void;

  constructor(dom: HTMLElement, callbacks: InteractionHandlerCallbacks) {
    this.dom = dom;
    this.callbacks = callbacks;

    this.handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === this.dom;
      const previouslyLocked = this.wasPointerLocked;
      this.wasPointerLocked = isLocked;
      this.callbacks.onPointerLockChange(isLocked);

      if (!isLocked) {
        this.resetMining();
        // If pointer lock was lost while actively in gameplay (e.g. Escape key consumed by browser), trigger pause!
        if (previouslyLocked && !this.callbacks.isPaused?.()) {
          this.callbacks.onPause?.();
        }
      }
    };

    this.handleMouseDown = (e: MouseEvent) => {
      if (this.callbacks.isPaused?.()) return;

      const player = this.callbacks.getPlayer();
      const world = this.callbacks.getWorld();
      const entityManager = this.callbacks.getEntityManager();
      const explorationSystem = this.callbacks.getExplorationSystem();

      // Allow opening Workstations with right-click even if pointer is not currently locked
      if (
        e.button === 2 &&
        player?.targetedBlock?.hit &&
        (player.targetedBlock.block === BlockType.TOOL_CRAFTER ||
          player.targetedBlock.block === BlockType.STONE_BENCH ||
          player.targetedBlock.block === BlockType.FURNACE ||
          player.targetedBlock.block === BlockType.FORGE ||
          player.targetedBlock.block === BlockType.HEATER ||
          player.targetedBlock.block === BlockType.COOLER)
      ) {
        e.preventDefault();
        soundManager.playChime(440);
        const { x, y, z, block } = player.targetedBlock;
        const stationType =
          block === BlockType.HEATER
            ? 'heater'
            : block === BlockType.COOLER
            ? 'cooler'
            : block === BlockType.FORGE
            ? 'forge'
            : block === BlockType.FURNACE
            ? 'furnace'
            : block === BlockType.STONE_BENCH
            ? 'stone_bench'
            : 'tool_crafter';
        if (this.callbacks.onOpenStation) {
          this.callbacks.onOpenStation(stationType, { x, y, z });
        } else {
          this.callbacks.onOpenInventory();
        }
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        return;
      }

      // Allow toggling doors with right-click even if pointer is not locked
      if (
        e.button === 2 &&
        player?.targetedBlock?.hit &&
        isDoorBlock(player.targetedBlock.block)
      ) {
        e.preventDefault();
        const { x, y, z, block } = player.targetedBlock;
        const isTop = isDoorTop(block);
        const partnerY = isTop ? y - 1 : y + 1;
        const partnerBlock = world ? world.getBlock(x, partnerY, z) : BlockType.AIR;

        const newSelf = getDoorOppositeStateBlock(block);
        const newPartner = isDoorBlock(partnerBlock) ? getDoorOppositeStateBlock(partnerBlock) : partnerBlock;

        if (world) {
          world.setBlock(x, y, z, newSelf);
          if (isDoorBlock(partnerBlock)) {
            world.setBlock(x, partnerY, z, newPartner);
          }
        }

        const wasOpen = isDoorOpen(block);
        soundManager.playDoor(!wasOpen);
        return;
      }

      if (document.pointerLockElement !== this.dom) {
        try {
          const p = this.dom.requestPointerLock() as unknown as Promise<void> | undefined;
          if (p && typeof p.catch === 'function') {
            p.catch(() => {});
          }
        } catch {
          // Ignore
        }
        return;
      }

      if (!player || !world || !entityManager) return;

      const hotbar = this.callbacks.getHotbar();
      const selectedIndex = this.callbacks.getSelectedHotbarIndex();
      const activeSlot = hotbar[selectedIndex];
      const activeItem = activeSlot?.item;

      // 1. Raycast for entities
      const eyeOrigin = new THREE.Vector3(player.pos.x, player.pos.y + PlayerPhysics.EYE_HEIGHT, player.pos.z);
      const lookDir = new THREE.Vector3(
        -Math.sin(player.yaw) * Math.cos(player.pitch),
        Math.sin(player.pitch),
        -Math.cos(player.yaw) * Math.cos(player.pitch)
      ).normalize();

      const blockDist = (player.targetedBlock && player.targetedBlock.hit)
        ? eyeOrigin.distanceTo(new THREE.Vector3(
            player.targetedBlock.x + 0.5,
            player.targetedBlock.y + 0.5,
            player.targetedBlock.z + 0.5
          ))
        : Infinity;

      const entityHit = raycastEntityHit(
        eyeOrigin,
        lookDir,
        entityManager.entities.values(),
        4.5,
        blockDist
      );

      const clickedEntityId: string | null = entityHit ? entityHit.entityId : null;

      if (e.button === 0) {
        // LEFT CLICK: Attack entity or start mining block
        this.isMouseDown = true;

        if (clickedEntityId) {
          const ent = entityManager.entities.get(clickedEntityId);
          if (ent) {
            const dmg = activeItem?.damage || 5;
            ent.state.health -= dmg;
            ent.state.vy = 4.0;
            soundManager.playBlockBreak();
            entityManager.addParticle(ent.state.x, ent.state.y + 0.6, ent.state.z, 0xff1744, 10, 0.8);
            if (ent.state.health <= 0) {
              soundManager.playChime(300);
              entityManager.removeEntity(clickedEntityId);
            }
          }
          return;
        }

        // Start mining if aiming at block
        if (player.targetedBlock && player.targetedBlock.hit) {
          this.startMining(player.targetedBlock, activeItem);
        }
      } else if (e.button === 2) {
        // RIGHT CLICK: Interact with workstation or place block
        e.preventDefault();

        if (player.targetedBlock && player.targetedBlock.hit) {
          const { x, y, z, nx, ny, nz, block } = player.targetedBlock;

          // If clicking Black Rock on limestone, right-click breaks it off dropping flint!
          if (isFlintBlock(block)) {
            world.setBlock(x, y, z, BlockType.AIR);
            soundManager.playStep('stone');
            soundManager.playBlockBreak();
            const flintItem = ITEM_REGISTRY['flint'] || getItemForBlock(block);
            const droppedItemManager = this.callbacks.getDroppedItemManager?.();
            if (flintItem) {
              if (droppedItemManager) {
                droppedItemManager.spawnItem(flintItem, x + 0.5, y + 0.3, z + 0.5);
              } else {
                this.addItemToPlayer(flintItem, 1);
              }
            }
            entityManager.addParticle(x + 0.5, y + 0.5, z + 0.5, 0x222222, 10, 0.6);
            explorationSystem.stats.blocksMined++;

            // Break dependent blocks
            breakDependentBlocks(world, x, y, z, (dx, dy, dz, depBlock) => {
              soundManager.playStep('stone');
              soundManager.playBlockBreak();
              const depItem = isFlintBlock(depBlock)
                ? (ITEM_REGISTRY['flint'] || getItemForBlock(depBlock))
                : getItemForBlock(depBlock);
              if (droppedItemManager) {
                droppedItemManager.spawnItem(depItem, dx + 0.5, dy + 0.3, dz + 0.5);
              } else {
                this.addItemToPlayer(depItem, 1);
              }
              entityManager.addParticle(dx + 0.5, dy + 0.5, dz + 0.5, 0x222222, 8, 0.5);
            });
            return;
          }

          // If clicking Limestone on an exposed face with a Black Rock attached, break off the Black Rock!
          if (block === BlockType.LIMESTONE) {
            const adjBlock = world.getBlock(x + nx, y + ny, z + nz);
            if (isFlintBlock(adjBlock)) {
              world.setBlock(x + nx, y + ny, z + nz, BlockType.AIR);
              soundManager.playStep('stone');
              soundManager.playBlockBreak();
              const flintItem = ITEM_REGISTRY['flint'] || getItemForBlock(adjBlock);
              const droppedItemManager = this.callbacks.getDroppedItemManager?.();
              if (flintItem) {
                if (droppedItemManager) {
                  droppedItemManager.spawnItem(flintItem, x + nx + 0.5, y + ny + 0.3, z + nz + 0.5);
                } else {
                  this.addItemToPlayer(flintItem, 1);
                }
              }
              entityManager.addParticle(x + nx + 0.5, y + ny + 0.5, z + nz + 0.5, 0x222222, 10, 0.6);
              explorationSystem.stats.blocksMined++;
              return;
            }
          }

          // If clicking a door, toggle it open or closed with smooth audio!
          if (isDoorBlock(block)) {
            const isTop = isDoorTop(block);
            const partnerY = isTop ? y - 1 : y + 1;
            const partnerBlock = world.getBlock(x, partnerY, z);

            const newSelf = getDoorOppositeStateBlock(block);
            const newPartner = isDoorBlock(partnerBlock) ? getDoorOppositeStateBlock(partnerBlock) : partnerBlock;

            world.setBlock(x, y, z, newSelf);
            if (isDoorBlock(partnerBlock)) {
              world.setBlock(x, partnerY, z, newPartner);
            }

            const wasOpen = isDoorOpen(block);
            soundManager.playDoor(!wasOpen);
            return;
          }

          // If clicking a Workstation, open its dedicated UI!
          if (
            block === BlockType.TOOL_CRAFTER ||
            block === BlockType.STONE_BENCH ||
            block === BlockType.FURNACE ||
            block === BlockType.FORGE ||
            block === BlockType.HEATER ||
            block === BlockType.COOLER
          ) {
            if (document.pointerLockElement) {
              document.exitPointerLock();
            }
            soundManager.playChime(440);
            const stationType =
              block === BlockType.HEATER
                ? 'heater'
                : block === BlockType.COOLER
                ? 'cooler'
                : block === BlockType.FORGE
                ? 'forge'
                : block === BlockType.FURNACE
                ? 'furnace'
                : block === BlockType.STONE_BENCH
                ? 'stone_bench'
                : 'tool_crafter';
            if (this.callbacks.onOpenStation) {
              this.callbacks.onOpenStation(stationType, { x, y, z });
            } else {
              this.callbacks.onOpenInventory();
            }
            return;
          }

          // 1. Right-click harvesting mature crops & perennial crops
          const cropInfo = getCropInfo(block);
          const isWildSeaCabbage = block === CROP_BLOCK_IDS.WILD_SEA_CABBAGE;

          if (isWildSeaCabbage || (cropInfo && (cropInfo.stage === 'mature' || cropInfo.crop.needs.regrows))) {
            const droppedItemManager = this.callbacks.getDroppedItemManager?.();
            soundManager.playStep('foliage');
            soundManager.playChime(520);
            entityManager.addParticle(x + 0.5, y + 0.5, z + 0.5, 0x4ade80, 12, 0.6);

            const soilBelow = world.getBlock(x, y - 1, z);
            const isCultivated = soilBelow === BlockType.FARMLAND || soilBelow === BlockType.SAND_FARMLAND;

            let dropsResult = isWildSeaCabbage
              ? getWildSeaCabbageDrops()
              : isCultivated
                ? getMatureCropDrops(cropInfo!.crop.id)
                : getWildPlantDrops(cropInfo!.crop.id);

            for (const d of dropsResult.items) {
              if (droppedItemManager) {
                droppedItemManager.spawnItem(d.item, x + 0.5, y + 0.4, z + 0.5);
              } else {
                this.addItemToPlayer(d.item, d.count);
              }
            }

            // Perennial crop handling: Strawberries, Asparagus, Rhubarb, Grapes, Blueberries, Horseradish
            // Regrows: reverts to stage 2 (growing) instead of destroying the plant!
            if (cropInfo && cropInfo.crop.needs.regrows) {
              const bundle = CROP_BLOCK_BUNDLES.get(cropInfo.crop.id);
              if (bundle) {
                world.setBlock(x, y, z, bundle.growing);
              }
            } else {
              world.setBlock(x, y, z, BlockType.AIR);
              // If crop restores soil (Beans, Chickpeas), till soil below
              if (cropInfo && cropInfo.crop.needs.restoresSoil) {
                world.setBlock(x, y - 1, z, BlockType.FARMLAND);
              }
              // If 2 blocks tall (Corn, Sugarcane, Sunflower), also clear top
              const above = world.getBlock(x, y + 1, z);
              if (
                above === CROP_BLOCK_IDS.CORN_TOP ||
                above === CROP_BLOCK_IDS.SUGARCANE_TOP ||
                above === CROP_BLOCK_IDS.SUNFLOWER_TOP
              ) {
                world.setBlock(x, y + 1, z, BlockType.AIR);
              }
            }
            explorationSystem.stats.blocksMined++;
            return;
          }

          // 2. Eating food items
          if (activeItem && activeItem.type === 'food') {
            soundManager.playStep('organic');
            soundManager.playChime(600);
            entityManager.addParticle(player.pos.x, player.pos.y + 1.2, player.pos.z, 0x22c55e, 8, 0.4);

            const newHotbar = hotbar.map(s => ({ ...s }));
            if (newHotbar[selectedIndex].count > 1) {
              newHotbar[selectedIndex].count--;
            } else {
              newHotbar[selectedIndex].item = null;
              newHotbar[selectedIndex].count = 0;
            }
            this.callbacks.onUpdateHotbar(newHotbar);
            return;
          }

          // 3. Planting seeds: MUST be tilled ground (Farmland or Sand Farmland), not any ground!
          if (activeItem && activeItem.id.endsWith('_seed')) {
            const cropId = activeItem.id.replace('_seed', '');
            const bundle = CROP_BLOCK_BUNDLES.get(cropId);
            if (bundle) {
              const placeX = ny === 1 ? x : x + nx;
              const placeY = ny === 1 ? y + 1 : y + ny;
              const placeZ = ny === 1 ? z : z + nz;

              const targetCurrent = world.getBlock(placeX, placeY, placeZ);
              if (targetCurrent === BlockType.AIR || targetCurrent === BlockType.WATER) {
                const soilBlock = world.getBlock(placeX, placeY - 1, placeZ);
                const isTilled = soilBlock === BlockType.FARMLAND || soilBlock === BlockType.SAND_FARMLAND;

                // Validate if soil is adequate for planting: MUST be tilled ground
                if (isTilled) {
                  // For crops requiring desert sand specifically, ensure the tilled ground is Sand Farmland
                  if (bundle.crop.needs.desertSandOnly && soilBlock !== BlockType.SAND_FARMLAND) {
                    return;
                  }

                  world.setBlock(placeX, placeY, placeZ, bundle.sprout);
                  soundManager.playStep('earth');
                  soundManager.playChime(480);
                  entityManager.addParticle(placeX + 0.5, placeY + 0.2, placeZ + 0.5, 0x84cc16, 10, 0.4);
                  explorationSystem.stats.blocksPlaced++;

                  const newHotbar = hotbar.map(s => ({ ...s }));
                  if (newHotbar[selectedIndex].count > 1) {
                    newHotbar[selectedIndex].count--;
                  } else {
                    newHotbar[selectedIndex].item = null;
                    newHotbar[selectedIndex].count = 0;
                  }
                  this.callbacks.onUpdateHotbar(newHotbar);
                  return;
                }
              }
            }
            // Seeds can only be planted on tilled ground; return to prevent placing as a regular block
            return;
          }

          // Right-click ground with a Hoe: Till the ground into Farmland / Sand Farmland!
          const isHoe = activeItem && (activeItem.toolType === 'hoe' || activeItem.id.endsWith('_hoe'));
          if (isHoe) {
            // Shrubs must never be tilled or removed when right clicking with a hoe
            if (isShrubBlock(block)) {
              return;
            }

            let targetX = x;
            let targetY = y;
            let targetZ = z;
            let targetBlock = block;

            // If player targeted a non-shrub plant or top snow resting on ground, check the ground beneath it
            if (isPlantBlock(block) || (block >= BlockType.TOPSNOW_1 && block <= BlockType.TOPSNOW_5)) {
              const below = world.getBlock(x, y - 1, z);
              if (isShrubBlock(below)) {
                return;
              }
              if (
                below === BlockType.GRASS ||
                below === BlockType.DIRT ||
                below === BlockType.MYCELIUM ||
                below === BlockType.AETHER_GRASS ||
                below === BlockType.SAND
              ) {
                targetY = y - 1;
                targetBlock = below;
              }
            }

            const isSoilTillable =
              targetBlock === BlockType.GRASS ||
              targetBlock === BlockType.DIRT ||
              targetBlock === BlockType.MYCELIUM ||
              targetBlock === BlockType.AETHER_GRASS;

            const isSandTillable = targetBlock === BlockType.SAND;

            if (isSoilTillable || isSandTillable) {
              const above = world.getBlock(targetX, targetY + 1, targetZ);
              // Shrubs resting on top must never be tilled or removed
              if (isShrubBlock(above)) {
                return;
              }

              const defAbove = BLOCK_DEFS[above];

              // Cannot till if obstructed by a solid block overhead
              if (!defAbove?.solid) {
                // If there is a non-shrub plant or top snow on top of the ground, clear it and drop it
                if (isPlantBlock(above) || (above >= BlockType.TOPSNOW_1 && above <= BlockType.TOPSNOW_5)) {
                  world.setBlock(targetX, targetY + 1, targetZ, BlockType.AIR);
                  const plantDrop = getItemForBlock(above);
                  if (plantDrop) {
                    const droppedItemManager = this.callbacks.getDroppedItemManager?.();
                    if (droppedItemManager) {
                      droppedItemManager.spawnItem(plantDrop, targetX + 0.5, targetY + 1.2, targetZ + 0.5);
                    } else {
                      this.addItemToPlayer(plantDrop, 1);
                    }
                  }
                  soundManager.playStep('foliage');
                }

                if (isSandTillable) {
                  // Till sand into unique Sand Farmland!
                  world.setBlock(targetX, targetY, targetZ, BlockType.SAND_FARMLAND);
                  soundManager.playStep('sand');
                  soundManager.playDigChip('sand');
                  entityManager.addParticle(targetX + 0.5, targetY + 1.05, targetZ + 0.5, 0xd2b48c, 10, 0.4);
                } else {
                  // Till soil into Farmland!
                  world.setBlock(targetX, targetY, targetZ, BlockType.FARMLAND);
                  soundManager.playStep('earth');
                  soundManager.playDigChip('earth');
                  entityManager.addParticle(targetX + 0.5, targetY + 1.05, targetZ + 0.5, 0x5c4033, 10, 0.4);
                }
                explorationSystem.stats.blocksPlaced++;

                // Apply 1 tool durability damage to the hoe
                if (activeItem.durability !== undefined) {
                  const currentHotbar = this.callbacks.getHotbar();
                  const updatedHotbar = currentHotbar.map((s) => ({ ...s }));
                  const curSlot = updatedHotbar[selectedIndex];
                  if (curSlot && curSlot.item) {
                    const currentDurability = (curSlot.item.durability ?? activeItem.durability) - 1;
                    if (currentDurability <= 0) {
                      soundManager.playBlockBreak();
                      curSlot.item = null;
                      curSlot.count = 0;
                    } else {
                      curSlot.item = {
                        ...curSlot.item,
                        durability: currentDurability
                      };
                    }
                    this.callbacks.onUpdateHotbar(updatedHotbar);
                  }
                }
                return;
              }
            }
          }

          // Placing Flint: can only be placed on a solid block with player collision
          const isFlintItem = activeItem?.id === 'flint' || (activeItem?.blockId !== undefined && isFlintBlock(activeItem.blockId));
          if (isFlintItem) {
            const targetDef = BLOCK_DEFS[block];
            if (!targetDef || !targetDef.solid) {
              return; // Must be a solid block with player collision
            }

            const px = x + nx;
            const py = y + ny;
            const pz = z + nz;

            const targetCurrent = world.getBlock(px, py, pz);
            if (targetCurrent !== BlockType.AIR && targetCurrent !== BlockType.WATER) {
              return;
            }

            // Pick a random variant (BLACK_ROCK, BLACK_ROCK_1, 2, 3, 4)
            const flintVariants = [
              BlockType.BLACK_ROCK,
              BlockType.BLACK_ROCK_1,
              BlockType.BLACK_ROCK_2,
              BlockType.BLACK_ROCK_3,
              BlockType.BLACK_ROCK_4
            ];
            const chosenVariant = flintVariants[Math.floor(Math.random() * flintVariants.length)];

            world.setBlock(px, py, pz, chosenVariant);
            soundManager.playStep('stone');
            explorationSystem.stats.blocksPlaced++;

            // Deduct 1 from hotbar
            const newHotbar = hotbar.map((s) => ({ ...s }));
            if (newHotbar[selectedIndex].count > 1) {
              newHotbar[selectedIndex].count--;
            } else {
              newHotbar[selectedIndex].item = null;
              newHotbar[selectedIndex].count = 0;
            }
            this.callbacks.onUpdateHotbar(newHotbar);
            return;
          }

          // Water Bucket Placement
          if (activeItem?.id === 'water_bucket') {
            const px = x + nx;
            const py = y + ny;
            const pz = z + nz;
            world.setBlock(px, py, pz, BlockType.WATER);
            soundManager.playStep('water');
            explorationSystem.stats.blocksPlaced++;

            const newHotbar = hotbar.map((s) => ({ ...s }));
            if (newHotbar[selectedIndex].count > 1) {
              newHotbar[selectedIndex].count--;
              this.addItemToPlayer(ITEM_REGISTRY['empty_bucket'] || { id: 'empty_bucket', name: 'Empty Bucket', type: 'utility', icon: '/ItemSprites/EmptyBucket.png', maxStack: 16 }, 1);
            } else {
              newHotbar[selectedIndex].item = ITEM_REGISTRY['empty_bucket'] || null;
              newHotbar[selectedIndex].count = 1;
            }
            this.callbacks.onUpdateHotbar(newHotbar);
            return;
          }

          // Empty Bucket Scooping
          if (activeItem?.id === 'empty_bucket') {
            let scoopX = x;
            let scoopY = y;
            let scoopZ = z;
            if (!isWaterBlock(world.getBlock(scoopX, scoopY, scoopZ))) {
              scoopX = x + nx;
              scoopY = y + ny;
              scoopZ = z + nz;
            }
            if (isWaterBlock(world.getBlock(scoopX, scoopY, scoopZ))) {
              world.setBlock(scoopX, scoopY, scoopZ, BlockType.AIR);
              soundManager.playStep('water');

              const newHotbar = hotbar.map((s) => ({ ...s }));
              if (newHotbar[selectedIndex].count > 1) {
                newHotbar[selectedIndex].count--;
                this.addItemToPlayer(ITEM_REGISTRY['water_bucket'] || { id: 'water_bucket', name: 'Water Bucket', type: 'utility', blockId: BlockType.WATER, icon: '/ItemSprites/WaterBucket.png', maxStack: 16 }, 1);
              } else {
                newHotbar[selectedIndex].item = ITEM_REGISTRY['water_bucket'] || null;
                newHotbar[selectedIndex].count = 1;
              }
              this.callbacks.onUpdateHotbar(newHotbar);
              return;
            }
          }

          // Otherwise place block
          if (activeItem?.blockId !== undefined) {
            const px = x + nx;
            const py = y + ny;
            const pz = z + nz;

            // Handle 2-block tall door placement
            if (isDoorItem(activeItem) || isDoorBottom(activeItem.blockId)) {
              if (py + 1 < CHUNK_H) {
                const bBottom = world.getBlock(px, py, pz);
                const bTop = world.getBlock(px, py + 1, pz);
                if (
                  (bBottom === BlockType.AIR || isPlantBlock(bBottom)) &&
                  (bTop === BlockType.AIR || isPlantBlock(bTop))
                ) {
                  const bottomBlock = activeItem.blockId;
                  const topBlock = getDoorTopForBottom(bottomBlock);

                  world.setBlock(px, py, pz, bottomBlock);
                  world.setBlock(px, py + 1, pz, topBlock);

                  soundManager.playStep('wood');
                  explorationSystem.stats.blocksPlaced++;

                  const newHotbar = hotbar.map((s) => ({ ...s }));
                  if (newHotbar[selectedIndex].count > 1) {
                    newHotbar[selectedIndex].count--;
                  } else {
                    newHotbar[selectedIndex].item = null;
                    newHotbar[selectedIndex].count = 0;
                  }
                  this.callbacks.onUpdateHotbar(newHotbar);
                  return;
                }
              }
              return;
            }

            // Prevent placing block inside player AABB
            const playerBox = new THREE.Box3(
              new THREE.Vector3(player.pos.x - 0.3, player.pos.y, player.pos.z - 0.3),
              new THREE.Vector3(player.pos.x + 0.3, player.pos.y + 1.8, player.pos.z + 0.3)
            );
            const blockBox = new THREE.Box3(
              new THREE.Vector3(px, py, pz),
              new THREE.Vector3(px + 1, py + 1, pz + 1)
            );

            if (!playerBox.intersectsBox(blockBox)) {
              world.setBlock(px, py, pz, activeItem.blockId);
              soundManager.playBlockPlace(BLOCK_DEFS[activeItem.blockId]?.soundType);
              explorationSystem.stats.blocksPlaced++;

              // Deduct 1 from hotbar
              const newHotbar = hotbar.map((s) => ({ ...s }));
              if (newHotbar[selectedIndex].count > 1) {
                newHotbar[selectedIndex].count--;
              } else {
                newHotbar[selectedIndex].item = null;
                newHotbar[selectedIndex].count = 0;
              }
              this.callbacks.onUpdateHotbar(newHotbar);
            }
          }
        }
      }
    };

    this.handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        this.isMouseDown = false;
        this.resetMining();
      }
    };

    this.handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === this.dom) {
        const player = this.callbacks.getPlayer();
        if (player) {
          player.onMouseMove(e.movementX, e.movementY);
        }
      }
    };

    this.handleWheel = (e: WheelEvent) => {
      const selectedIndex = this.callbacks.getSelectedHotbarIndex();
      if (e.deltaY > 0) {
        this.callbacks.onSelectHotbar((selectedIndex + 1) % 9);
      } else {
        this.callbacks.onSelectHotbar((selectedIndex + 8) % 9);
      }
    };

    this.handleKeyDown = (e: KeyboardEvent) => {
      if (this.callbacks.isPaused?.()) return;

      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.callbacks.onPause?.();
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        return;
      }
      if (e.code === 'KeyE') {
        this.callbacks.onOpenStation ? this.callbacks.onOpenStation('inventory') : this.callbacks.onOpenInventory();
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
      if (e.code === 'KeyB') {
        this.callbacks.onOpenBestiary();
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
      if (e.code === 'KeyO') {
        this.callbacks.onOpenSettings?.();
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
      if (e.code === 'KeyQ') {
        const player = this.callbacks.getPlayer();
        const droppedItemManager = this.callbacks.getDroppedItemManager?.();
        const selectedIndex = this.callbacks.getSelectedHotbarIndex();
        const hotbar = this.callbacks.getHotbar();
        const currentSlot = hotbar[selectedIndex];

        if (player && currentSlot && currentSlot.item && currentSlot.count > 0) {
          const itemToDrop = currentSlot.item;

          // Deduct 1 from hotbar
          const newHotbar = hotbar.map((s) => ({ ...s }));
          if (newHotbar[selectedIndex].count > 1) {
            newHotbar[selectedIndex].count--;
          } else {
            newHotbar[selectedIndex].item = null;
            newHotbar[selectedIndex].count = 0;
          }
          this.callbacks.onUpdateHotbar(newHotbar);

          // Calculate forward toss direction
          const eyeY = player.pos.y + 1.4;
          const lookDir = new THREE.Vector3(
            -Math.sin(player.yaw) * Math.cos(player.pitch),
            Math.sin(player.pitch),
            -Math.cos(player.yaw) * Math.cos(player.pitch)
          ).normalize();

          const spawnX = player.pos.x + lookDir.x * 0.45;
          const spawnY = eyeY + lookDir.y * 0.45;
          const spawnZ = player.pos.z + lookDir.z * 0.45;

          const tossVel = new THREE.Vector3(
            lookDir.x * 4.5,
            lookDir.y * 3.2 + 1.2,
            lookDir.z * 4.5
          );

          if (droppedItemManager) {
            droppedItemManager.spawnItem(itemToDrop, spawnX, spawnY, spawnZ, 1, tossVel, -0.6);
          }
          soundManager.playItemDrop(itemToDrop);
        }
      }

      if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        const slotIdx = parseInt(e.code.replace('Digit', '')) - 1;
        this.callbacks.onSelectHotbar(slotIdx);
      }
    };

    this.handleContextMenu = (e: MouseEvent) => e.preventDefault();

    // Attach listeners
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.dom.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('wheel', this.handleWheel);
    window.addEventListener('keydown', this.handleKeyDown);
    this.dom.addEventListener('contextmenu', this.handleContextMenu);
  }

  /**
   * Calculates the required mining time in seconds based on block type and active tool.
   */
  private calculateMiningDuration(block: BlockType, tool: ItemDef | null | undefined): number {
    const def = BLOCK_DEFS[block];
    const hardness = def ? def.hardness : 1.0;

    // Fast breaking for zero-hardness flora
    if (hardness <= 0.05) return 0.15;

    let baseDuration = Math.max(0.4, hardness * 1.3);
    let toolEfficiency = 1.0;

    if (tool && tool.type === 'tool') {
      const tType = tool.toolType;
      const speed = tool.speed || 2.0;

      if (isStoneOrOre(block)) {
        if (tType === 'pickaxe') {
          if (block === BlockType.IRON_ORE || block === BlockType.GOLD_ORE) {
            // Wooden pickaxes (tier 1) cannot harvest iron/gold ore and mine them much more slowly
            if ((tool.tier ?? 1) < 2 || tool.id === 'wooden_pickaxe') {
              toolEfficiency = 0.45;
            } else {
              toolEfficiency = speed * 0.65;
            }
          } else {
            toolEfficiency = speed;
          }
        } else {
          // Ineffective tool against stone
          toolEfficiency = 0.5;
        }
      } else if (
        isLogBlock(block) ||
        isPlankBlock(block) ||
        block === BlockType.TOOL_CRAFTER ||
        block === BlockType.STONE_BENCH ||
        block === BlockType.FURNACE ||
        block === BlockType.FORGE
      ) {
        if (tType === 'axe' || tType === 'pickaxe') {
          toolEfficiency = speed;
        } else {
          toolEfficiency = 1.0;
        }
      } else if (
        block === BlockType.GRASS ||
        block === BlockType.DIRT ||
        block === BlockType.FARMLAND ||
        block === BlockType.SAND_FARMLAND ||
        block === BlockType.SAND ||
        block === BlockType.SNOW ||
        block === BlockType.BEACH_GRAVEL
      ) {
        if (tType === 'shovel' || (tType === 'hoe' && (block === BlockType.FARMLAND || block === BlockType.SAND_FARMLAND || block === BlockType.GRASS || block === BlockType.DIRT || block === BlockType.SAND))) {
          toolEfficiency = speed * 1.5;
        } else {
          toolEfficiency = 1.0;
        }
      } else if (
        isPlantBlock(block) ||
        isLeavesBlock(block)
      ) {
        if (tType === 'hoe') {
          toolEfficiency = speed * 2.0;
        }
      }
    } else {
      // Bare hands: stone takes much longer
      if (isStoneOrOre(block)) {
        toolEfficiency = 0.4;
      }
    }

    return Math.max(0.15, baseDuration / toolEfficiency);
  }

  /**
   * Begins mining a targeted block.
   */
  private startMining(target: { x: number; y: number; z: number; block: BlockType }, tool: ItemDef | null | undefined) {
    this.isMining = true;
    this.currentMiningBlock = {
      x: target.x,
      y: target.y,
      z: target.z,
      block: target.block
    };
    this.miningTimer = 0;
    this.miningStartTime = performance.now();
    this.particleIntervalTimer = 0;
    this.lostTargetTimer = 0;
    this.pendingTarget = null;
    this.pendingTargetTimer = 0;
    this.miningDuration = this.calculateMiningDuration(target.block, tool);
    this.callbacks.onMiningProgress?.(0);
  }

  /**
   * Resets active mining state and notifies HUD.
   */
  private resetMining() {
    this.isMining = false;
    this.currentMiningBlock = null;
    this.miningTimer = 0;
    this.particleIntervalTimer = 0;
    this.lostTargetTimer = 0;
    this.pendingTarget = null;
    this.pendingTargetTimer = 0;
    this.callbacks.onMiningProgress?.(0);
  }

  /**
   * Adds an item stack to the player's hotbar or backpack.
   * Accepts an optional baseHotbar to chain durability and drop mutations atomically.
   */
  public addItemToPlayer(item: ItemDef, count: number = 1, baseHotbar?: InventorySlot[]): boolean {
    const hotbar = baseHotbar || this.callbacks.getHotbar();
    const newHotbar = hotbar.map((s) => ({ ...s }));

    // 1. Try stacking in hotbar
    for (const slot of newHotbar) {
      if (slot.item?.id === item.id && slot.count < item.maxStack) {
        const canAdd = Math.min(count, item.maxStack - slot.count);
        slot.count += canAdd;
        count -= canAdd;
        if (count <= 0) {
          this.callbacks.onUpdateHotbar(newHotbar);
          return true;
        }
      }
    }

    // 2. Try empty slot in hotbar
    for (const slot of newHotbar) {
      if (!slot.item) {
        slot.item = item;
        slot.count = count;
        this.callbacks.onUpdateHotbar(newHotbar);
        return true;
      }
    }

    // Update hotbar if partial was added
    this.callbacks.onUpdateHotbar(newHotbar);

    // 3. Try backpack / inventory
    if (this.callbacks.getInventory && this.callbacks.onUpdateInventory) {
      const inventory = this.callbacks.getInventory();
      const newInventory = inventory.map((s) => ({ ...s }));

      for (const slot of newInventory) {
        if (slot.item?.id === item.id && slot.count < item.maxStack) {
          const canAdd = Math.min(count, item.maxStack - slot.count);
          slot.count += canAdd;
          count -= canAdd;
          if (count <= 0) {
            this.callbacks.onUpdateInventory(newInventory);
            return true;
          }
        }
      }

      for (const slot of newInventory) {
        if (!slot.item) {
          slot.item = item;
          slot.count = count;
          this.callbacks.onUpdateInventory(newInventory);
          return true;
        }
      }

      this.callbacks.onUpdateInventory(newInventory);
    }

    return true;
  }

  /**
   * Evaluates if a block drops when broken by the active tool.
   * User Rules:
   * - "logs can be broken by anything and drop, same with grass and dirt, stones require pickaxes."
   * - "When breaking a block with the right tool, you get that block, the blocks texture uses its texture from the side in your inventory, when you break Redwood log, you get a redwood log, not just any log"
   */
  private shouldBlockDrop(block: BlockType, tool: ItemDef | null | undefined): boolean {
    if (block === BlockType.BLACK_ROCK || block === BlockType.CHALK || block === BlockType.BEACH_GRAVEL) {
      return true;
    }
    if (block === BlockType.IRON_ORE || block === BlockType.GOLD_ORE) {
      // Gold ore and iron ore do not drop with a wooden pickaxe (requires Stone Pickaxe tier 2 or higher)
      return Boolean(
        tool &&
        tool.type === 'tool' &&
        tool.toolType === 'pickaxe' &&
        (tool.tier ?? 1) >= 2 &&
        tool.id !== 'wooden_pickaxe'
      );
    }
    if (isStoneOrOre(block)) {
      return tool?.type === 'tool' && tool.toolType === 'pickaxe';
    }
    if (block === BlockType.SAND) {
      return tool?.type === 'tool' && tool.toolType === 'shovel';
    }
    // Logs, planks, workstations, grass, dirt, plants drop regardless of tool
    return true;
  }

  /**
   * Called every frame from the main game loop in GameCanvas.
   */
  public update(delta: number) {
    const player = this.callbacks.getPlayer();
    const world = this.callbacks.getWorld();
    const entityManager = this.callbacks.getEntityManager();
    const explorationSystem = this.callbacks.getExplorationSystem();

    if (!player || !world || !entityManager) {
      if (this.isMining) this.resetMining();
      return;
    }

    const hotbar = this.callbacks.getHotbar();
    const selectedIndex = this.callbacks.getSelectedHotbarIndex();
    const activeSlot = hotbar[selectedIndex];
    const activeItem = activeSlot?.item;

    // Check if player is holding left mouse button down
    if (!this.isMouseDown) {
      if (this.isMining) this.resetMining();
      return;
    }

    const targeted = player.targetedBlock;

    if (!this.isMining) {
      if (targeted && targeted.hit) {
        this.startMining(targeted, activeItem);
      }
    } else if (this.currentMiningBlock) {
      const { x, y, z, block } = this.currentMiningBlock;

      // 1. Verify block is still valid in the world
      const currentInWorld = world.getBlock(x, y, z);
      if (currentInWorld === BlockType.AIR || currentInWorld !== block) {
        this.resetMining();
        if (targeted && targeted.hit) {
          this.startMining(targeted, activeItem);
        }
        return;
      }

      // 2. Reach distance check
      const blockCenter = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
      if (player.pos.distanceTo(blockCenter) > 6.5) {
        this.resetMining();
        return;
      }

      // 3. Stable crosshair tracking with grace period for edge slips
      if (targeted && targeted.hit) {
        if (targeted.x === x && targeted.y === y && targeted.z === z) {
          this.lostTargetTimer = 0;
          this.pendingTarget = null;
          this.pendingTargetTimer = 0;
        } else {
          // Crosshair moved to a different block
          if (!this.pendingTarget || this.pendingTarget.x !== targeted.x || this.pendingTarget.y !== targeted.y || this.pendingTarget.z !== targeted.z) {
            this.pendingTarget = { x: targeted.x, y: targeted.y, z: targeted.z, block: targeted.block };
            this.pendingTargetTimer = 0;
          } else {
            this.pendingTargetTimer += delta;
            // Only switch to the new block if intentionally held on it for > 0.22s
            if (this.pendingTargetTimer > 0.22) {
              this.startMining(this.pendingTarget, activeItem);
              return;
            }
          }
        }
      } else {
        // Crosshair momentarily off block (into air or edge)
        this.lostTargetTimer += delta;
        if (this.lostTargetTimer > 0.28) {
          this.resetMining();
          return;
        }
      }
    }

    // Process active mining progress
    if (this.isMining && this.currentMiningBlock) {
      const { x, y, z, block } = this.currentMiningBlock;

      // Real-time duration progression ensures mining speed is constant and unaffected by delta fluctuations
      const now = performance.now();
      const realElapsed = (now - this.miningStartTime) / 1000;
      this.miningTimer = realElapsed;
      this.particleIntervalTimer += delta;

      const progress = Math.min(1.0, this.miningTimer / this.miningDuration);
      this.callbacks.onMiningProgress?.(progress);

      // Periodic chipping particles & sound ticks while digging
      const def = BLOCK_DEFS[block];
      const sType = (def?.soundType || 'rocky');

      if (this.particleIntervalTimer >= 0.22) {
        this.particleIntervalTimer = 0;
        soundManager.playDigChip(sType);
        const pColor = def?.color ? parseInt(def.color.replace('#', '0x'), 16) : 0xcccccc;
        entityManager.addParticle(x + 0.5, y + 0.5, z + 0.5, pColor, 3, 0.4);
      }

      // Block finished breaking!
      if (progress >= 1.0) {
        soundManager.playBlockBreak(sType);

        const def = BLOCK_DEFS[block];
        const pColor = def?.color ? parseInt(def.color.replace('#', '0x'), 16) : 0xffffff;
        entityManager.addParticle(x + 0.5, y + 0.5, z + 0.5, pColor, 12, 0.8);

        // Prepare updated hotbar copy
        const currentHotbar = this.callbacks.getHotbar();
        const updatedHotbar = currentHotbar.map((s) => ({ ...s }));

        // Apply tool durability damage first
        let durabilityModified = false;
        if (activeItem && activeItem.type === 'tool' && activeItem.durability !== undefined) {
          const curSlot = updatedHotbar[selectedIndex];
          if (curSlot && curSlot.item) {
            durabilityModified = true;
            const currentDurability = (curSlot.item.durability ?? activeItem.durability) - 1;
            if (currentDurability <= 0) {
              soundManager.playBlockBreak();
              curSlot.item = null;
              curSlot.count = 0;
            } else {
              curSlot.item = {
                ...curSlot.item,
                durability: currentDurability
              };
            }
          }
        }

        // Check if breaking a crop block
        if (isCropBlock(block)) {
          let dropsResult;
          if (block === CROP_BLOCK_IDS.WILD_SEA_CABBAGE) {
            dropsResult = getWildSeaCabbageDrops();
          } else {
            const cropInfo = getCropInfo(block);
            if (cropInfo) {
              if (cropInfo.stage === 'mature') {
                const soilBelow = world.getBlock(x, y - 1, z);
                const isCultivated = soilBelow === BlockType.FARMLAND || soilBelow === BlockType.SAND_FARMLAND;
                dropsResult = isCultivated
                  ? getMatureCropDrops(cropInfo.crop.id)
                  : getWildPlantDrops(cropInfo.crop.id);
              } else if (cropInfo.stage === 'wilted') {
                dropsResult = getWiltedPlantDrops(cropInfo.crop.id);
              } else {
                dropsResult = { items: [{ item: CROP_SEED_ITEMS[cropInfo.crop.id] || getItemForBlock(block), count: 1 }] };
              }
            } else {
              dropsResult = { items: [{ item: getItemForBlock(block), count: 1 }] };
            }
          }

          const droppedItemManager = this.callbacks.getDroppedItemManager?.();
          for (const d of dropsResult.items) {
            if (droppedItemManager) {
              droppedItemManager.spawnItem(d.item, x + 0.5, y + 0.3, z + 0.5);
            } else {
              this.addItemToPlayer(d.item, d.count, updatedHotbar);
            }
          }

          // If crop restores soil (Beans, Chickpeas), till soil below
          const cropInfo = getCropInfo(block);
          if (cropInfo && cropInfo.crop.needs.restoresSoil) {
            world.setBlock(x, y - 1, z, BlockType.FARMLAND);
          }
          // If 2 blocks tall, break partner top/bottom
          const aboveB = world.getBlock(x, y + 1, z);
          if (aboveB === CROP_BLOCK_IDS.CORN_TOP || aboveB === CROP_BLOCK_IDS.SUGARCANE_TOP || aboveB === CROP_BLOCK_IDS.SUNFLOWER_TOP) {
            world.setBlock(x, y + 1, z, BlockType.AIR);
          }
          const belowB = world.getBlock(x, y - 1, z);
          if (isCropBlock(belowB)) {
            world.setBlock(x, y - 1, z, BlockType.AIR);
          }

          world.setBlock(x, y, z, BlockType.AIR);
          explorationSystem.stats.blocksMined++;
          soundManager.playStep('foliage');
          entityManager.addParticle(x + 0.5, y + 0.4, z + 0.5, 0x4ade80, 10, 0.5);
          if (durabilityModified) {
            this.callbacks.onUpdateHotbar(updatedHotbar);
          }
          return;
        }

        // Check if block drops according to tool requirements
        if (this.shouldBlockDrop(block, activeItem)) {
          let itemToGive: ItemDef;
          if (isFlintBlock(block)) {
            itemToGive = ITEM_REGISTRY['flint'] || getItemForBlock(block);
          } else if (block === BlockType.BEACH_GRAVEL) {
            itemToGive = ITEM_REGISTRY['flint'] || getItemForBlock(block);
          } else if (block === BlockType.FARMLAND) {
            itemToGive = ITEM_REGISTRY['dirt'] || getItemForBlock(BlockType.DIRT);
          } else if (block === BlockType.SAND_FARMLAND) {
            itemToGive = ITEM_REGISTRY['sand'] || getItemForBlock(BlockType.SAND);
          } else if (block === BlockType.CHALK) {
            // breaking chalk drops chalk, with 25% chance to drop flint instead
            if (Math.random() < 0.25) {
              itemToGive = ITEM_REGISTRY['flint'] || getItemForBlock(block);
            } else {
              itemToGive = ITEM_REGISTRY['chalk'] || getItemForBlock(block);
            }
          } else {
            itemToGive = getItemForBlock(block);
          }

          // Drop as miniature spinning item in the world
          const droppedItemManager = this.callbacks.getDroppedItemManager?.();
          if (droppedItemManager) {
            droppedItemManager.spawnItem(itemToGive, x + 0.5, y + 0.3, z + 0.5);
          } else {
            this.addItemToPlayer(itemToGive, 1, updatedHotbar);
          }
        } else if (durabilityModified) {
          // If block doesn't drop, still commit the durability damage to hotbar
          this.callbacks.onUpdateHotbar(updatedHotbar);
        }

        // Replace block in world
        const replacementBlock = getMinedBlockReplacement(block, y);
        world.setBlock(x, y, z, replacementBlock);
        explorationSystem.stats.blocksMined++;

        // If a door was broken, also break its partner half
        if (isDoorBlock(block)) {
          const partnerY = isDoorTop(block) ? y - 1 : y + 1;
          const partnerBlock = world.getBlock(x, partnerY, z);
          if (isDoorBlock(partnerBlock)) {
            world.setBlock(x, partnerY, z, BlockType.AIR);
          }
        }

        // Break any dependent blocks that were staying on or attached to this block
        const droppedItemManager = this.callbacks.getDroppedItemManager?.();
        breakDependentBlocks(world, x, y, z, (dx, dy, dz, depBlock) => {
          soundManager.playStep('stone');
          soundManager.playBlockBreak();
          const depItem = isFlintBlock(depBlock)
            ? (ITEM_REGISTRY['flint'] || getItemForBlock(depBlock))
            : getItemForBlock(depBlock);
          if (droppedItemManager) {
            droppedItemManager.spawnItem(depItem, dx + 0.5, dy + 0.3, dz + 0.5);
          } else {
            this.addItemToPlayer(depItem, 1);
          }
          entityManager.addParticle(dx + 0.5, dy + 0.5, dz + 0.5, 0x222222, 8, 0.5);
        });

        // Reset mining
        this.resetMining();

        // If player is still holding down left-click, will automatically target the next block on next frame
      }
    }
  }

  public destroy() {
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.dom.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.dom.removeEventListener('contextmenu', this.handleContextMenu);
  }
}
