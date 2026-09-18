import * as THREE from 'three';

export interface RenderableParticle {
  pos: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public instancedMesh: THREE.InstancedMesh;
  private dummy: THREE.Object3D;
  private geometry: THREE.BoxGeometry;
  private material: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, maxParticles: number = 300) {
    this.geometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    this.material = new THREE.MeshBasicMaterial();
    this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, maxParticles);
    this.instancedMesh.count = 0;
    scene.add(this.instancedMesh);

    this.dummy = new THREE.Object3D();
  }

  public update(particles: RenderableParticle[]) {
    const count = Math.min(particles.length, this.instancedMesh.instanceMatrix.count);
    this.instancedMesh.count = count;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      this.dummy.position.copy(p.pos);
      const scale = p.size * Math.max(0, 1 - p.life / p.maxLife);
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.instancedMesh);
    this.geometry.dispose();
    this.material.dispose();
    this.instancedMesh.dispose();
  }
}
