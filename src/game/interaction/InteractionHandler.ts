import * as THREE from 'three';
import { BlockType, InventorySlot, ItemDef } from '../../types';
import { soundManager } from '../audio/SoundFX';
import { EntityManager } from '../entities/EntityManager';
import { raycastEntityHit } from '../entities/EntityHitboxPhysics';
import { PlayerController } from '../player/PlayerController';
import { PlayerPhysics } from '../player/PlayerPhysics';
import { ExplorationSystem } from '../systems/ExplorationSystem';
import { getItemForBlock } from '../systems/ItemRegistry';
import { BLOCK_DEFS, isLogBlock, isPlankBlock, isStoneOrOre } from '../voxel/Blocks';
import { VoxelWorld } from '../voxel/VoxelWorld';
import { getMinedBlockReplacement } from '../voxel/WaterFlora';

export interface InteractionHandlerCallbacks {
  getHotbar: () => InventorySlot[];
  getSelectedHotbarIndex: () => number;
  getInventory?: () => InventorySlot[];
  onSelectHotbar: (index: number) => void;
  onUpdateHotbar: (hotbar: InventorySlot[]) => void;
  onUpdateInventory?: (inventory: InventorySlot[]) => void;
  onOpenInventory: () => void;
  onOpenStation?: (stationId: 'inventory' | 'tool_crafter') => void;
  onOpenBestiary: () => void;
  onOpenSettings?: () => void;
  onDiscoveryBanner: (banner: { title: string; subtitle: string } | null) => void;
  onPointerLockChange: (isLocked: boolean) => void;
  onMiningProgress?: (progress: number) => void;
  getPlayer: () => PlayerController | null;
  getWorld: () => VoxelWorld | null;
  getEntityManager: () => EntityManager | null;
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
  private particleIntervalTimer: number = 0;

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
      this.callbacks.onPointerLockChange(document.pointerLockElement === this.dom);
      if (document.pointerLockElement !== this.dom) {
        this.resetMining();
      }
    };

    this.handleMouseDown = (e: MouseEvent) => {
      if (this.callbacks.isPaused?.()) return;

      if (document.pointerLockElement !== this.dom) {
        this.dom.requestPointerLock();
        return;
      }

      const player = this.callbacks.getPlayer();
      const world = this.callbacks.getWorld();
      const entityManager = this.callbacks.getEntityManager();
      const explorationSystem = this.callbacks.getExplorationSystem();

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

          // If clicking a Tool Crafter workstation, open Tool Crafter UI!
          if (block === BlockType.TOOL_CRAFTER) {
            if (document.pointerLockElement) {
              document.exitPointerLock();
            }
            soundManager.playChime(440);
            if (this.callbacks.onOpenStation) {
              this.callbacks.onOpenStation('tool_crafter');
            } else {
              this.callbacks.onOpenInventory();
            }
            return;
          }

          // Otherwise place block
          if (activeItem?.blockId !== undefined) {
            const px = x + nx;
            const py = y + ny;
            const pz = z + nz;

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
              soundManager.playBlockPlace();
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

      if (e.code === 'KeyE') {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        this.callbacks.onOpenStation ? this.callbacks.onOpenStation('inventory') : this.callbacks.onOpenInventory();
      }
      if (e.code === 'KeyB') {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        this.callbacks.onOpenBestiary();
      }
      if (e.code === 'KeyO') {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        this.callbacks.onOpenSettings?.();
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
          toolEfficiency = speed;
        } else {
          // Ineffective tool against stone
          toolEfficiency = 0.5;
        }
      } else if (isLogBlock(block) || isPlankBlock(block) || block === BlockType.TOOL_CRAFTER) {
        if (tType === 'axe') {
          toolEfficiency = speed;
        } else {
          toolEfficiency = 1.0;
        }
      } else if (
        block === BlockType.GRASS ||
        block === BlockType.DIRT ||
        block === BlockType.SAND ||
        block === BlockType.SNOW
      ) {
        if (tType === 'shovel') {
          toolEfficiency = speed;
        } else {
          toolEfficiency = 1.0;
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
    this.particleIntervalTimer = 0;
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
    this.callbacks.onMiningProgress?.(0);
  }

  /**
   * Adds an item stack to the player's hotbar or backpack.
   * Accepts an optional baseHotbar to chain durability and drop mutations atomically.
   */
  private addItemToPlayer(item: ItemDef, count: number = 1, baseHotbar?: InventorySlot[]): boolean {
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
          soundManager.playChime(600);
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
        soundManager.playChime(600);
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
            soundManager.playChime(600);
            return true;
          }
        }
      }

      for (const slot of newInventory) {
        if (!slot.item) {
          slot.item = item;
          slot.count = count;
          this.callbacks.onUpdateInventory(newInventory);
          soundManager.playChime(600);
          return true;
        }
      }

      this.callbacks.onUpdateInventory(newInventory);
    }

    soundManager.playChime(600);
    return true;
  }

  /**
   * Evaluates if a block drops when broken by the active tool.
   * User Rules:
   * - "logs can be broken by anything and drop, same with grass and dirt, stones require pickaxes."
   * - "When breaking a block with the right tool, you get that block, the blocks texture uses its texture from the side in your inventory, when you break Redwood log, you get a redwood log, not just any log"
   */
  private shouldBlockDrop(block: BlockType, tool: ItemDef | null | undefined): boolean {
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
    if (this.isMouseDown) {
      const targeted = player.targetedBlock;
      if (targeted && targeted.hit) {
        // If not currently mining or aiming at a different block, switch mining target
        if (
          !this.isMining ||
          !this.currentMiningBlock ||
          this.currentMiningBlock.x !== targeted.x ||
          this.currentMiningBlock.y !== targeted.y ||
          this.currentMiningBlock.z !== targeted.z
        ) {
          this.startMining(targeted, activeItem);
        }
      } else {
        if (this.isMining) this.resetMining();
      }
    } else {
      if (this.isMining) this.resetMining();
      return;
    }

    // Process active mining progress
    if (this.isMining && this.currentMiningBlock) {
      const { x, y, z, block } = this.currentMiningBlock;

      this.miningTimer += delta;
      this.particleIntervalTimer += delta;

      const progress = Math.min(1.0, this.miningTimer / this.miningDuration);
      this.callbacks.onMiningProgress?.(progress);

      // Periodic chipping particles & sound ticks while digging
      if (this.particleIntervalTimer >= 0.22) {
        this.particleIntervalTimer = 0;
        soundManager.playStep('stone');
        const def = BLOCK_DEFS[block];
        const pColor = def?.color ? parseInt(def.color.replace('#', '0x'), 16) : 0xcccccc;
        entityManager.addParticle(x + 0.5, y + 0.5, z + 0.5, pColor, 3, 0.4);
      }

      // Block finished breaking!
      if (progress >= 1.0) {
        soundManager.playBlockBreak();

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

        // Check if block drops according to tool requirements
        if (this.shouldBlockDrop(block, activeItem)) {
          const itemToGive = getItemForBlock(block);
          // Pass updatedHotbar so the drop goes into the hotbar containing the damaged tool
          this.addItemToPlayer(itemToGive, 1, updatedHotbar);
        } else if (durabilityModified) {
          // If block doesn't drop, still commit the durability damage to hotbar
          this.callbacks.onUpdateHotbar(updatedHotbar);
        }

        // Replace block in world
        const replacementBlock = getMinedBlockReplacement(block, y);
        world.setBlock(x, y, z, replacementBlock);
        explorationSystem.stats.blocksMined++;

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
