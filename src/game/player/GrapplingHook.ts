import * as THREE from 'three';
import { soundManager } from '../audio/SoundFX';

export class GrapplingHook {
  public isGrappling: boolean = false;
  public target: THREE.Vector3 | null = null;
  public line: THREE.Line;
  private lineGeo: THREE.BufferGeometry;
  private lineMat: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, linewidth: 3 });
    this.line = new THREE.Line(this.lineGeo, this.lineMat);
    this.line.visible = false;
    scene.add(this.line);
  }

  public fire(targetPos: THREE.Vector3) {
    this.target = targetPos.clone();
    this.isGrappling = true;
    soundManager.playLaser();
  }

  public cancel() {
    this.isGrappling = false;
    this.line.visible = false;
  }

  public update(playerPos: THREE.Vector3, playerVel: THREE.Vector3): boolean {
    if (!this.isGrappling || !this.target) {
      this.line.visible = false;
      return false;
    }

    const pullDir = new THREE.Vector3().subVectors(this.target, playerPos);
    const dist = pullDir.length();

    if (dist < 1.5) {
      this.cancel();
      return false;
    }

    pullDir.normalize();
    playerVel.copy(pullDir.multiplyScalar(18.0));

    // Update visual cable
    this.line.visible = true;
    const positions = this.line.geometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, playerPos.x, playerPos.y + 0.8, playerPos.z);
    positions.setXYZ(1, this.target.x, this.target.y, this.target.z);
    positions.needsUpdate = true;

    return true;
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.line);
    this.lineGeo.dispose();
    this.lineMat.dispose();
  }
}
