import * as THREE from 'three';
import { BlockType } from '../../types';
import { soundManager } from '../audio/SoundFX';
import { BLOCK_DEFS, isStoneOrOre } from '../voxel/Blocks';
import { VoxelWorld } from '../voxel/VoxelWorld';
import { isWaterOrWaterlogged } from '../voxel/WaterFlora';
import { getWaterFlowVector } from '../voxel/FluidSimulation';
import { GrapplingHook } from './GrapplingHook';
import { PlayerPhysics } from './PlayerPhysics';
import { RaycastHit, VoxelRaycaster } from './VoxelRaycaster';

export type { RaycastHit } from './VoxelRaycaster';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public world: VoxelWorld;
  public pos: THREE.Vector3;
  public vel: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  public pitch: number = 0;
  public yaw: number = 0;
  public isThirdPerson: boolean = false;
  public isFlying: boolean = false;
  public isGrounded: boolean = false;
  public isInWater: boolean = false;
  public isHoldingLiquidContainer: boolean = false;

  public health: number = 20;
  public maxHealth: number = 20;
  public stamina: number = 100;
  public maxStamina: number = 100;

  // Subsystems
  public raycaster: VoxelRaycaster;
  public grapplingHook: GrapplingHook;

  // Key states
  public keys: Record<string, boolean> = {};
  public isPaused: boolean = false;
  private stepTimer: number = 0;
  private lastGroundBlock: number = -1;
  private keydownHandler: (e: KeyboardEvent) => void;
  private keyupHandler: (e: KeyboardEvent) => void;

  public static readonly WIDTH = PlayerPhysics.WIDTH;
  public static readonly HEIGHT = PlayerPhysics.HEIGHT;
  public static readonly EYE_HEIGHT = PlayerPhysics.EYE_HEIGHT;

  public resetKeys() {
    this.keys = {};
    this.vel.set(0, 0, 0);
  }

  constructor(camera: THREE.PerspectiveCamera, world: VoxelWorld) {
    this.camera = camera;
    this.world = world;

    // Start player at actual terrain surface — scan from high Y down so we never start in the void
    const startX = 8.5;
    const startZ = 8.5;
    let startY = 200;
    while (startY > 2 && this.world.getBlock(Math.floor(startX), startY, Math.floor(startZ)) === BlockType.AIR) {
      startY--;
    }
    // Spawn 2 blocks above detected surface; minimum Y=80 so player never appears underground or in void
    this.pos = new THREE.Vector3(startX, Math.max(80, startY + 2.5), startZ);

    this.raycaster = new VoxelRaycaster(this.world.scene);
    this.grapplingHook = new GrapplingHook(this.world.scene);

    this.keydownHandler = (e: KeyboardEvent) => {
      if (this.isPaused) {
        this.keys = {};
        return;
      }
      this.keys[e.code] = true;
      if (e.code === 'KeyV') {
        this.isThirdPerson = !this.isThirdPerson;
      }
      if (e.code === 'KeyF') {
        this.isFlying = !this.isFlying;
        this.vel.set(0, 0, 0);
      }
    };

    this.keyupHandler = (e: KeyboardEvent) => {
      if (this.isPaused) {
        this.keys = {};
        return;
      }
      this.keys[e.code] = false;
    };

    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
  }

  public get targetedBlock(): RaycastHit | null {
    return this.raycaster.targetedBlock;
  }

  public onMouseMove(movementX: number, movementY: number) {
    if (this.isPaused) return;
    const sens = 0.0022;
    this.yaw -= movementX * sens;
    this.pitch -= movementY * sens;
    const maxPitch = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  public update(delta: number) {
    // 1. Water check
    const footY = Math.floor(this.pos.y);
    const chestY = Math.floor(this.pos.y + 1.0);
    const footBlock = this.world.getBlock(Math.floor(this.pos.x), footY, Math.floor(this.pos.z));
    const chestBlock = this.world.getBlock(Math.floor(this.pos.x), chestY, Math.floor(this.pos.z));
    this.isInWater =
      footBlock === BlockType.LAVA ||
      chestBlock === BlockType.LAVA ||
      isWaterOrWaterlogged(footBlock, footY) ||
      isWaterOrWaterlogged(chestBlock, chestY);

    const isClimbingVine =
      BLOCK_DEFS[footBlock]?.climbable ||
      BLOCK_DEFS[chestBlock]?.climbable;

    // 2. Movement vectors
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
    }

    const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    let moveSpeed = isSprinting ? 9.5 : 5.8;
    if (this.isInWater) moveSpeed *= 0.6;
    if (this.isFlying) moveSpeed = isSprinting ? 18.0 : 10.0;

    // 3. Grappling Hook or Creative Flight or Gravity Physics
    const isPullingGrapple = this.grapplingHook.update(this.pos, this.vel);

    if (!isPullingGrapple) {
      if (this.isFlying) {
        this.vel.x = moveDir.x * moveSpeed;
        this.vel.z = moveDir.z * moveSpeed;
        if (this.keys['Space']) this.vel.y = moveSpeed;
        else if (this.keys['ShiftLeft'] || this.keys['KeyC']) this.vel.y = -moveSpeed;
        else this.vel.y = 0;
      } else {
        if (moveDir.lengthSq() > 0) {
          // Snappy, uniform walking & sprinting speed (approaches target in ~0.03s, eliminating micro-stutter when rotating camera)
          const blend = Math.min(1.0, 36.0 * delta);
          this.vel.x += (moveDir.x * moveSpeed - this.vel.x) * blend;
          this.vel.z += (moveDir.z * moveSpeed - this.vel.z) * blend;
        } else {
          // Smooth deceleration to stop
          if (this.isGrounded) {
            const stopBlend = Math.min(1.0, 36.0 * delta);
            this.vel.x += (0 - this.vel.x) * stopBlend;
            this.vel.z += (0 - this.vel.z) * stopBlend;
            if (Math.abs(this.vel.x) < 0.05) this.vel.x = 0;
            if (Math.abs(this.vel.z) < 0.05) this.vel.z = 0;
          } else {
            this.vel.x *= Math.pow(0.2, delta * 20);
            this.vel.z *= Math.pow(0.2, delta * 20);
          }
        }

        if (this.isInWater) {
          const isDivingDown = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyC'];
          const isSwimmingForward = this.keys['KeyW'] || this.keys['ArrowUp'];

          if (isDivingDown) {
            // Rapid dive downwards
            this.vel.y = -7.5;
          } else if (isSwimmingForward && this.pitch < -0.12) {
            // Swimming forward while pitched down directs momentum rapidly downwards
            const forwardDiveSpeed = Math.sin(this.pitch) * moveSpeed * 1.8;
            this.vel.y = Math.min(this.vel.y, forwardDiveSpeed);
          } else if (this.keys['Space']) {
            this.vel.y = 4.2;
          } else {
            this.vel.y -= 7.0 * delta;
          }

          // Flowing water push: slow but present current pushing player in flow direction
          const flow = getWaterFlowVector(this.world, this.pos.x, this.pos.y, this.pos.z);
          if (flow.x !== 0 || flow.z !== 0 || flow.y !== 0) {
            const pushSpeed = 1.35;
            this.vel.x += flow.x * pushSpeed * 3.2 * delta;
            this.vel.z += flow.z * pushSpeed * 3.2 * delta;
            if (flow.y < 0) {
              this.vel.y += flow.y * 2.2 * delta;
            }
          }

          if (moveDir.lengthSq() === 0) {
            this.vel.x *= Math.pow(0.1, delta * 5);
            this.vel.z *= Math.pow(0.1, delta * 5);
          }
        } else if (isClimbingVine) {
          if (this.keys['Space']) {
            this.vel.y = 4.0;
          } else if (this.keys['ShiftLeft'] || this.keys['KeyC']) {
            this.vel.y = -3.5;
          } else {
            // Clinging / gentle slide down vines
            this.vel.y = Math.max(-1.8, this.vel.y * 0.7 - 5.0 * delta);
          }
        } else {
          this.vel.y -= 26.0 * delta;
          if (this.isGrounded && this.keys['Space']) {
            this.vel.y = 8.8;
            this.isGrounded = false;
            soundManager.playJump();
          }
        }
      }
    }

    // 4. Collision resolution
    const collisionResult = PlayerPhysics.moveWithCollision(
      this.pos,
      this.vel,
      delta,
      this.isGrounded,
      this.isFlying,
      this.world
    );
    this.isGrounded = collisionResult.isGrounded;

    // 5. Walking & Footstep Sounds
    // Rules:
    // - Walk Sand - When walking on sand
    // - Walk Grass - When walking on grass
    // - Walk Stone - When walking on stone
    // - Walk - when walking on anything else
    // Stops as soon as the player stops moving!
    const horizontalSpeed = Math.hypot(this.vel.x, this.vel.z);
    const isMoving = this.isGrounded && !this.isFlying && (moveDir.lengthSq() > 0 || horizontalSpeed > 0.4);

    if (isMoving && !this.isInWater) {
      const groundType = this.world.getBlock(
        Math.floor(this.pos.x),
        Math.floor(this.pos.y - 0.2),
        Math.floor(this.pos.z)
      );
      const isSand =
        groundType === BlockType.SAND ||
        groundType === BlockType.SANDSTONE ||
        BLOCK_DEFS[groundType]?.soundType === 'sand';
      const isGrass =
        groundType === BlockType.GRASS ||
        groundType === BlockType.AETHER_GRASS ||
        BLOCK_DEFS[groundType]?.soundType === 'organic';
      const isStone =
        isStoneOrOre(groundType) ||
        BLOCK_DEFS[groundType]?.soundType === 'rocky' ||
        groundType === BlockType.STONE ||
        groundType === BlockType.COBBLESTONE ||
        groundType === BlockType.LIMESTONE ||
        groundType === BlockType.VOID_STONE ||
        groundType === BlockType.CHALK;

      const surface = isSand ? 'sand' : isGrass ? 'grass' : isStone ? 'stone' : 'other';
      soundManager.updateWalkSound(true, surface);
    } else {
      soundManager.updateWalkSound(false, 'other');

      // Water footsteps if wading in shallow water while grounded
      if (this.isInWater && this.isGrounded && moveDir.lengthSq() > 0) {
        this.stepTimer += delta * 1.5;
        if (this.stepTimer >= 1.0) {
          this.stepTimer = 0;
          soundManager.playStep('water');
        }
      } else {
        this.stepTimer = 0;
      }
    }

    // 6. Camera Position & View Sync
    this.updateCamera();

    // 7. Raycast Block Targeting
    this._eyeOrigin.set(this.pos.x, this.pos.y + PlayerPhysics.EYE_HEIGHT, this.pos.z);
    this.raycaster.update(this._eyeOrigin, this.yaw, this.pitch, this.world, 6.0, this.isHoldingLiquidContainer);
  }

  private _eyeOrigin = new THREE.Vector3();
  private _camDir = new THREE.Vector3();
  private _targetCamPos = new THREE.Vector3();

  public updateCamera() {
    const eyeX = this.pos.x;
    const eyeY = this.pos.y + PlayerPhysics.EYE_HEIGHT;
    const eyeZ = this.pos.z;

    if (!this.isThirdPerson) {
      // Direct 1:1 eye position in first-person eliminates frame-rate dependent lerp judder
      this.camera.position.set(eyeX, eyeY, eyeZ);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
      this.camera.rotation.z = 0;
    } else {
      const dist = 3.8;
      this._camDir.set(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      );

      this._targetCamPos.set(
        eyeX - this._camDir.x * dist,
        eyeY - this._camDir.y * dist,
        eyeZ - this._camDir.z * dist
      );
      this.camera.position.lerp(this._targetCamPos, 0.85);
      this.camera.lookAt(eyeX, eyeY - 0.2, eyeZ);
    }
  }

  public fireGrapple() {
    if (this.targetedBlock && this.targetedBlock.hit) {
      const target = new THREE.Vector3(
        this.targetedBlock.x + 0.5,
        this.targetedBlock.y + 0.5,
        this.targetedBlock.z + 0.5
      );
      this.grapplingHook.fire(target);
    }
  }

  public bounceUpward(strength: number = 14.0) {
    this.vel.y = strength;
    this.isGrounded = false;
  }

  public destroy() {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    this.raycaster.destroy(this.world.scene);
    this.grapplingHook.destroy(this.world.scene);
  }
}
