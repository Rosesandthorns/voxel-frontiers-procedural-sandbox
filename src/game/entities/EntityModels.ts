import * as THREE from 'three';
import { EntitySpecies } from '../../types';
import {
  buildRedwoodFoxModel,
  buildCardinalModel,
  buildSalmonModel,
  animateRedwoodFox,
  animateCardinal,
  animateSalmon,
} from './MinecraftMobFactory';

export interface EntityMeshGroup extends THREE.Group {
  species: EntitySpecies;
  animTime: number;
  parts: Record<string, THREE.Object3D>;
}

export class EntityModelFactory {
  // Shared materials for entity rendering
  private static materials: Record<string, THREE.MeshLambertMaterial> = {};

  private static getMaterial(color: number, emissive: number = 0, opacity: number = 1): THREE.MeshLambertMaterial {
    const key = `${color}_${emissive}_${opacity}`;
    if (!this.materials[key]) {
      this.materials[key] = new THREE.MeshLambertMaterial({
        color,
        emissive,
        transparent: opacity < 1,
        opacity
      });
    }
    return this.materials[key];
  }

  public static createEntityModel(species: EntitySpecies): EntityMeshGroup {
    const group = new THREE.Group() as EntityMeshGroup;
    group.species = species;
    group.animTime = Math.random() * 10;
    group.parts = {};

    switch (species) {
      case EntitySpecies.REDWOOD_FOX:
        buildRedwoodFoxModel(group);
        break;
      case EntitySpecies.CARDINAL:
        buildCardinalModel(group);
        break;
      case EntitySpecies.SALMON:
        buildSalmonModel(group);
        break;
      case EntitySpecies.GLIMMER_FOX:
        this.buildGlimmerFox(group);
        break;
      case EntitySpecies.PUFF_SPORE:
        this.buildPuffSpore(group);
        break;
      case EntitySpecies.PEBBLE_GOLEM:
        this.buildPebbleGolem(group);
        break;
      case EntitySpecies.SOLAR_SPRITE:
        this.buildSolarSprite(group);
        break;
      case EntitySpecies.DUNE_CRAB:
        this.buildDuneCrab(group);
        break;
      case EntitySpecies.VOID_STALKER:
        this.buildVoidStalker(group);
        break;
      case EntitySpecies.MAGMA_SALAMANDER:
        this.buildMagmaSalamander(group);
        break;
      case EntitySpecies.SKY_RAY:
        this.buildSkyRay(group);
        break;
      case EntitySpecies.SPORE_SHROOMLING:
        this.buildSporeShroomling(group);
        break;
      case EntitySpecies.ANCIENT_SENTRY:
        this.buildAncientSentry(group);
        break;
      case EntitySpecies.MIMIC_CHEST:
        this.buildMimicChest(group);
        break;
      case EntitySpecies.CRYSTAL_BASILISK:
        this.buildCrystalBasilisk(group);
        break;
    }

    return group;
  }

  // 1. GLIMMER FOX
  private static buildGlimmerFox(g: EntityMeshGroup) {
    const orangeMat = this.getMaterial(0xf57c00);
    const whiteMat = this.getMaterial(0xfff3e0);
    const darkMat = this.getMaterial(0x3e2723);
    const glowEyeMat = this.getMaterial(0x00e5ff, 0x00e5ff);

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.9), orangeMat);
    body.position.y = 0.45;
    g.add(body);
    g.parts.body = body;

    // Head
    const head = new THREE.Group();
    head.position.set(0, 0.65, 0.45);
    const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.4), orangeMat);
    head.add(headBox);

    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.25), whiteMat);
    snout.position.set(0, -0.05, 0.25);
    head.add(snout);

    // Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), darkMat);
    nose.position.set(0, -0.02, 0.38);
    head.add(nose);

    // Luminous Eyes
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), glowEyeMat);
    eyeL.position.set(-0.13, 0.06, 0.2);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), glowEyeMat);
    eyeR.position.set(0.13, 0.06, 0.2);
    head.add(eyeL, eyeR);

    // Ears
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.08), darkMat);
    earL.position.set(-0.13, 0.23, -0.05);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.08), darkMat);
    earR.position.set(0.13, 0.23, -0.05);
    head.add(earL, earR);

    g.add(head);
    g.parts.head = head;

    // Bushy Tail
    const tail = new THREE.Group();
    tail.position.set(0, 0.45, -0.45);
    const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.55), orangeMat);
    tailMesh.position.set(0, 0.15, -0.25);
    tailMesh.rotation.x = -0.4;
    const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), whiteMat);
    tailTip.position.set(0, 0.28, -0.48);
    tail.add(tailMesh, tailTip);
    g.add(tail);
    g.parts.tail = tail;

    // Legs
    const legGeo = new THREE.BoxGeometry(0.14, 0.35, 0.14);
    const legFL = new THREE.Mesh(legGeo, darkMat);
    legFL.position.set(-0.18, 0.18, 0.28);
    const legFR = new THREE.Mesh(legGeo, darkMat);
    legFR.position.set(0.18, 0.18, 0.28);
    const legBL = new THREE.Mesh(legGeo, darkMat);
    legBL.position.set(-0.18, 0.18, -0.28);
    const legBR = new THREE.Mesh(legGeo, darkMat);
    legBR.position.set(0.18, 0.18, -0.28);

    g.add(legFL, legFR, legBL, legBR);
    g.parts.legFL = legFL;
    g.parts.legFR = legFR;
    g.parts.legBL = legBL;
    g.parts.legBR = legBR;
  }

  // 2. PUFF SPORE (Trampoline Jumper)
  private static buildPuffSpore(g: EntityMeshGroup) {
    const jellyMat = this.getMaterial(0x80deea, 0x00acc1, 0.85);
    const coreMat = this.getMaterial(0x00e5ff, 0x00e5ff);
    const capMat = this.getMaterial(0xff4081);

    // Main buoyant balloon body
    const body = new THREE.Group();
    body.position.y = 0.8;

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), jellyMat);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), coreMat);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.65, 0.15, 8), capMat);
    cap.position.y = 0.35;

    body.add(sphere, core, cap);

    // Dangling tendrils
    const tendrilMat = this.getMaterial(0x4dd0e1);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), tendrilMat);
      t.position.set(Math.cos(angle) * 0.25, -0.45, Math.sin(angle) * 0.25);
      body.add(t);
      g.parts[`tendril_${i}`] = t;
    }

    g.add(body);
    g.parts.body = body;
  }

  // 3. PEBBLE GOLEM (Stone Camouflage)
  private static buildPebbleGolem(g: EntityMeshGroup) {
    const stoneMat = this.getMaterial(0x757575);
    const darkStoneMat = this.getMaterial(0x424242);
    const crystalEyeMat = this.getMaterial(0x76ff03, 0x76ff03);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.6), stoneMat);
    body.position.y = 0.8;
    g.add(body);
    g.parts.body = body;

    // Head
    const head = new THREE.Group();
    head.position.set(0, 1.35, 0);
    const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), stoneMat);
    const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.06), crystalEyeMat);
    eye1.position.set(-0.14, 0.05, 0.26);
    const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.06), crystalEyeMat);
    eye2.position.set(0.14, 0.05, 0.26);
    head.add(headBox, eye1, eye2);
    g.add(head);
    g.parts.head = head;

    // Heavy Boulder Arms
    const armGeo = new THREE.BoxGeometry(0.3, 0.7, 0.3);
    const armL = new THREE.Mesh(armGeo, darkStoneMat);
    armL.position.set(-0.55, 0.75, 0);
    const armR = new THREE.Mesh(armGeo, darkStoneMat);
    armR.position.set(0.55, 0.75, 0);
    g.add(armL, armR);
    g.parts.armL = armL;
    g.parts.armR = armR;

    // Stubby Stone Legs
    const legGeo = new THREE.BoxGeometry(0.32, 0.45, 0.35);
    const legL = new THREE.Mesh(legGeo, darkStoneMat);
    legL.position.set(-0.24, 0.23, 0);
    const legR = new THREE.Mesh(legGeo, darkStoneMat);
    legR.position.set(0.24, 0.23, 0);
    g.add(legL, legR);
    g.parts.legL = legL;
    g.parts.legR = legR;
  }

  // 4. SOLAR SPRITE / PRISM MOTH
  private static buildSolarSprite(g: EntityMeshGroup) {
    const glowBodyMat = this.getMaterial(0xffeb3b, 0xffd600);
    const wingMat = this.getMaterial(0xff80ab, 0xff4081, 0.8);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), glowBodyMat);
    body.position.y = 0.7;
    g.add(body);
    g.parts.body = body;

    // Fluttering Wings
    const wingGeo = new THREE.BoxGeometry(0.45, 0.04, 0.3);
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-0.3, 0.72, 0);
    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.set(0.3, 0.72, 0);

    g.add(wingL, wingR);
    g.parts.wingL = wingL;
    g.parts.wingR = wingR;
  }

  // 5. DUNE CRAB
  private static buildDuneCrab(g: EntityMeshGroup) {
    const shellMat = this.getMaterial(0xd78a3c);
    const underMat = this.getMaterial(0xffe082);
    const eyeMat = this.getMaterial(0x212121);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.6), shellMat);
    body.position.y = 0.25;
    g.add(body);
    g.parts.body = body;

    // Eyes on stalks
    const stalkL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), eyeMat);
    stalkL.position.set(-0.16, 0.44, 0.28);
    const stalkR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), eyeMat);
    stalkR.position.set(0.16, 0.44, 0.28);
    g.add(stalkL, stalkR);

    // Big Pincers
    const pincerGeo = new THREE.BoxGeometry(0.22, 0.18, 0.35);
    const pincerL = new THREE.Mesh(pincerGeo, underMat);
    pincerL.position.set(-0.45, 0.25, 0.35);
    const pincerR = new THREE.Mesh(pincerGeo, underMat);
    pincerR.position.set(0.45, 0.25, 0.35);
    g.add(pincerL, pincerR);
    g.parts.pincerL = pincerL;
    g.parts.pincerR = pincerR;

    // Scuttling Legs
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1;
      const legIdx = i % 3;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), shellMat);
      leg.position.set(side * 0.42, 0.12, (legIdx - 1) * 0.2);
      g.add(leg);
      g.parts[`leg_${i}`] = leg;
    }
  }

  // 6. VOID STALKER (Shadow Phase Creature)
  private static buildVoidStalker(g: EntityMeshGroup) {
    const shadowMat = this.getMaterial(0x1a0933, 0x311b92, 0.85);
    const voidEyeMat = this.getMaterial(0xdf78ef, 0xe040fb);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 1.2, 6), shadowMat);
    body.position.y = 0.8;
    g.add(body);
    g.parts.body = body;

    // Head with single slit void eye
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), shadowMat);
    head.position.set(0, 1.45, 0);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.06), voidEyeMat);
    eye.position.set(0, 0.05, 0.18);
    head.add(eye);
    g.add(head);
    g.parts.head = head;

    // Wispy floating cloak tendrils
    const wispMat = this.getMaterial(0x4a148c, 0x7b1fa2, 0.6);
    const wisp1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), wispMat);
    wisp1.position.set(-0.25, 0.3, 0);
    const wisp2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), wispMat);
    wisp2.position.set(0.25, 0.3, 0);
    g.add(wisp1, wisp2);
    g.parts.wisp1 = wisp1;
    g.parts.wisp2 = wisp2;
  }

  // 7. MAGMA SALAMANDER (Lava Walker)
  private static buildMagmaSalamander(g: EntityMeshGroup) {
    const lavaMat = this.getMaterial(0xd84315, 0xff5722);
    const basaltScaleMat = this.getMaterial(0x212121);
    const fireEyeMat = this.getMaterial(0xffeb3b, 0xffd600);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 1.1), lavaMat);
    body.position.y = 0.25;
    g.add(body);
    g.parts.body = body;

    // Dorsal Spikes
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), basaltScaleMat);
      spike.position.set(0, 0.22, -0.4 + i * 0.25);
      body.add(spike);
    }

    // Head
    const head = new THREE.Group();
    head.position.set(0, 0.3, 0.65);
    const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.4), basaltScaleMat);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), fireEyeMat);
    eyeL.position.set(-0.16, 0.08, 0.15);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), fireEyeMat);
    eyeR.position.set(0.16, 0.08, 0.15);
    head.add(headBox, eyeL, eyeR);
    g.add(head);
    g.parts.head = head;

    // Tail
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.7), lavaMat);
    tail.position.set(0, 0.25, -0.8);
    g.add(tail);
    g.parts.tail = tail;

    // Splayed Legs
    const legGeo = new THREE.BoxGeometry(0.3, 0.12, 0.2);
    const legFL = new THREE.Mesh(legGeo, basaltScaleMat);
    legFL.position.set(-0.38, 0.12, 0.35);
    const legFR = new THREE.Mesh(legGeo, basaltScaleMat);
    legFR.position.set(0.38, 0.12, 0.35);
    const legBL = new THREE.Mesh(legGeo, basaltScaleMat);
    legBL.position.set(-0.38, 0.12, -0.35);
    const legBR = new THREE.Mesh(legGeo, basaltScaleMat);
    legBR.position.set(0.38, 0.12, -0.35);
    g.add(legFL, legFR, legBL, legBR);
    g.parts.legFL = legFL;
    g.parts.legFR = legFR;
    g.parts.legBL = legBL;
    g.parts.legBR = legBR;
  }

  // 8. SKY RAY (Mountable Celestial Glider)
  private static buildSkyRay(g: EntityMeshGroup) {
    const rayMat = this.getMaterial(0x0288d1, 0x01579b);
    const bellyMat = this.getMaterial(0xb3e5fc, 0x81d4fa);
    const luminescentSpots = this.getMaterial(0x00e5ff, 0x00e5ff);

    // Wide flat ray body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.8), rayMat);
    body.position.y = 1.0;
    g.add(body);
    g.parts.body = body;

    // Glowing underbelly
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 1.4), bellyMat);
    belly.position.set(0, -0.13, 0);
    body.add(belly);

    // Huge Wings
    const wingGeo = new THREE.BoxGeometry(1.6, 0.08, 1.2);
    const wingL = new THREE.Mesh(wingGeo, rayMat);
    wingL.position.set(-1.3, 1.0, 0);
    const wingR = new THREE.Mesh(wingGeo, rayMat);
    wingR.position.set(1.3, 1.0, 0);
    g.add(wingL, wingR);
    g.parts.wingL = wingL;
    g.parts.wingR = wingR;

    // Long Whip Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, 1.8, 4), luminescentSpots);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 1.0, -1.8);
    g.add(tail);
    g.parts.tail = tail;
  }

  // 9. SPORE SHROOMLING
  private static buildSporeShroomling(g: EntityMeshGroup) {
    const stemMat = this.getMaterial(0xf5f5dc);
    const capMat = this.getMaterial(0x9c27b0, 0xba68c8);
    const dotMat = this.getMaterial(0x00e5ff, 0x00e5ff);

    // Little body stem
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.45, 6), stemMat);
    body.position.y = 0.35;
    g.add(body);
    g.parts.body = body;

    // Giant Mushroom Cap Head
    const cap = new THREE.Group();
    cap.position.y = 0.65;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    cap.add(dome);

    // Glowing dots
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), dotMat);
      dot.position.set(Math.cos(angle) * 0.32, 0.15, Math.sin(angle) * 0.32);
      cap.add(dot);
    }
    g.add(cap);
    g.parts.cap = cap;

    // Hopping stubby legs
    const legGeo = new THREE.BoxGeometry(0.12, 0.18, 0.12);
    const legL = new THREE.Mesh(legGeo, stemMat);
    legL.position.set(-0.12, 0.1, 0);
    const legR = new THREE.Mesh(legGeo, stemMat);
    legR.position.set(0.12, 0.1, 0);
    g.add(legL, legR);
    g.parts.legL = legL;
    g.parts.legR = legR;
  }

  // 10. ANCIENT SENTRY DRONE
  private static buildAncientSentry(g: EntityMeshGroup) {
    const bronzeMat = this.getMaterial(0x78909c);
    const goldTrimMat = this.getMaterial(0xffb300);
    const laserEyeMat = this.getMaterial(0xff1744, 0xff1744);

    const body = new THREE.Group();
    body.position.y = 1.2;

    const corePyramid = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 4), bronzeMat);
    corePyramid.rotation.y = Math.PI / 4;
    body.add(corePyramid);

    // Glowing laser eye in center
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), laserEyeMat);
    eye.position.set(0, 0.1, 0.28);
    body.add(eye);
    g.parts.eye = eye;

    // Orbiting kinetic plates
    for (let i = 0; i < 3; i++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.05), goldTrimMat);
      plate.position.set(Math.cos((i * Math.PI * 2) / 3) * 0.6, 0, Math.sin((i * Math.PI * 2) / 3) * 0.6);
      body.add(plate);
      g.parts[`plate_${i}`] = plate;
    }

    g.add(body);
    g.parts.body = body;
  }

  // 11. MIMIC CHEST
  private static buildMimicChest(g: EntityMeshGroup) {
    const woodMat = this.getMaterial(0x8d6e63);
    const toothMat = this.getMaterial(0xffffff);
    const eyeMat = this.getMaterial(0xffeb3b, 0xff1744);

    // Base box
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.38, 0.7), woodMat);
    base.position.y = 0.2;
    g.add(base);
    g.parts.base = base;

    // Hinge lid with sharp wooden teeth!
    const lid = new THREE.Group();
    lid.position.set(0, 0.38, -0.32);

    const lidBox = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.25, 0.72), woodMat);
    lidBox.position.set(0, 0.12, 0.32);
    lid.add(lidBox);

    // Row of teeth
    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), toothMat);
      tooth.rotation.x = Math.PI;
      tooth.position.set(-0.25 + i * 0.12, -0.02, 0.65);
      lidBox.add(tooth);
    }

    // Mischievous eyes inside the mouth
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), eyeMat);
    eye.position.set(0, 0.05, 0.64);
    lidBox.add(eye);

    g.add(lid);
    g.parts.lid = lid;
  }

  // 12. CRYSTAL BASILISK
  private static buildCrystalBasilisk(g: EntityMeshGroup) {
    const amethystMat = this.getMaterial(0x9c27b0, 0xba68c8, 0.9);
    const crystalSpikeMat = this.getMaterial(0xe1bee7, 0xe1bee7);

    // Head
    const head = new THREE.Group();
    head.position.set(0, 0.35, 0.8);
    const headMesh = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 5), amethystMat);
    headMesh.rotation.x = Math.PI / 2;
    head.add(headMesh);
    g.add(head);
    g.parts.head = head;

    // 4 Serpentine segments
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.45 - i * 0.06, 0.3, 0.5), amethystMat);
      seg.position.set(0, 0.25, 0.4 - i * 0.45);
      // Spike on back
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 4), crystalSpikeMat);
      spike.position.set(0, 0.22, 0);
      seg.add(spike);

      g.add(seg);
      g.parts[`seg_${i}`] = seg;
    }
  }

  // Animation updates for limbs and movement
  public static animateEntity(g: EntityMeshGroup, speed: number, delta: number) {
    g.animTime += delta * 4.0;
    const t = g.animTime;

    switch (g.species) {
      case EntitySpecies.REDWOOD_FOX:
        animateRedwoodFox(g, speed, delta);
        break;
      case EntitySpecies.CARDINAL:
        animateCardinal(g, speed, delta);
        break;
      case EntitySpecies.SALMON:
        animateSalmon(g, speed, delta);
        break;
      case EntitySpecies.GLIMMER_FOX: {
        const legSwing = Math.sin(t * 3.5) * 0.6 * Math.min(1, speed + 0.2);
        if (g.parts.legFL) g.parts.legFL.rotation.x = legSwing;
        if (g.parts.legFR) g.parts.legFR.rotation.x = -legSwing;
        if (g.parts.legBL) g.parts.legBL.rotation.x = -legSwing;
        if (g.parts.legBR) g.parts.legBR.rotation.x = legSwing;
        if (g.parts.tail) g.parts.tail.rotation.y = Math.sin(t * 5.0) * 0.4;
        break;
      }
      case EntitySpecies.PUFF_SPORE: {
        // Floating squish & bounce
        const bob = Math.sin(t * 2.0) * 0.15;
        if (g.parts.body) {
          g.parts.body.position.y = 0.8 + bob;
          const squash = 1.0 + Math.sin(t * 3.0) * 0.08;
          g.parts.body.scale.set(1 / squash, squash, 1 / squash);
        }
        break;
      }
      case EntitySpecies.PEBBLE_GOLEM: {
        const swing = Math.sin(t * 2.5) * 0.5 * Math.min(1, speed);
        if (g.parts.legL) g.parts.legL.rotation.x = swing;
        if (g.parts.legR) g.parts.legR.rotation.x = -swing;
        if (g.parts.armL) g.parts.armL.rotation.x = -swing;
        if (g.parts.armR) g.parts.armR.rotation.x = swing;
        break;
      }
      case EntitySpecies.SOLAR_SPRITE: {
        // Fast fluttering wings
        const wingFlap = Math.sin(t * 16.0) * 0.7;
        if (g.parts.wingL) g.parts.wingL.rotation.z = wingFlap;
        if (g.parts.wingR) g.parts.wingR.rotation.z = -wingFlap;
        if (g.parts.body) g.parts.body.position.y = 0.7 + Math.sin(t * 3.0) * 0.12;
        break;
      }
      case EntitySpecies.DUNE_CRAB: {
        // Scuttle pincers
        if (g.parts.pincerL) g.parts.pincerL.rotation.y = Math.sin(t * 4.0) * 0.25;
        if (g.parts.pincerR) g.parts.pincerR.rotation.y = -Math.sin(t * 4.0) * 0.25;
        break;
      }
      case EntitySpecies.SKY_RAY: {
        // Majestic slow wing undulating
        const rayWave = Math.sin(t * 2.2) * 0.35;
        if (g.parts.wingL) g.parts.wingL.rotation.z = rayWave;
        if (g.parts.wingR) g.parts.wingR.rotation.z = -rayWave;
        if (g.parts.tail) g.parts.tail.rotation.x = Math.PI / 2 + Math.sin(t * 1.8) * 0.2;
        break;
      }
      case EntitySpecies.ANCIENT_SENTRY: {
        // Rotating kinetic plates & bobbing
        if (g.parts.body) g.parts.body.position.y = 1.2 + Math.sin(t * 2.5) * 0.15;
        for (let i = 0; i < 3; i++) {
          const plate = g.parts[`plate_${i}`];
          if (plate) {
            const angle = (i * Math.PI * 2) / 3 + t * 1.5;
            plate.position.set(Math.cos(angle) * 0.6, Math.sin(t * 3.0 + i) * 0.08, Math.sin(angle) * 0.6);
          }
        }
        break;
      }
      case EntitySpecies.MIMIC_CHEST: {
        // Chomping teeth when active
        if (g.parts.lid) {
          const chomp = Math.max(0, Math.sin(t * 4.0)) * 0.6;
          g.parts.lid.rotation.x = -chomp;
        }
        break;
      }
      case EntitySpecies.CRYSTAL_BASILISK: {
        // Slithering sine wave
        for (let i = 0; i < 4; i++) {
          const seg = g.parts[`seg_${i}`];
          if (seg) {
            seg.position.x = Math.sin(t * 3.0 - i * 0.8) * 0.18;
          }
        }
        break;
      }
    }
  }
}
