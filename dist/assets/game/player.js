import * as THREE from 'three';

export const LANE_WIDTH = 2.2;
export const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

export class Player {
  constructor(scene, texLib) {
    this.scene = scene;
    this.texLib = texLib;
    this.group = new THREE.Group();
    this.rigRoot = new THREE.Group();
    this.group.add(this.rigRoot);

    // State pergerakan 3 jalur (100% mempertahankan mekanik inti)
    this.currentLane = 1;
    this.targetX = LANES[1];
    this.y = 0;
    this.velocityY = 0;
    this.gravity = -34;
    this.baseJumpForce = 12.8;

    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 0.68;

    this.landCompress = 0;
    this.stumbleTimer = 0;
    this.isCaught = false;
    this.runCycle = 0;
    this.stepPhase = 0;

    // Bobot transisi animasi halus & fisika pegas lateral (Fluid Animation Blending)
    this.jumpBlend = 0;
    this.slideBlend = 0;
    this.laneBank = 0;
    this.laneVelX = 0;
    this.dodgeTimer = 0;
    this.dodgeDir = 0;
    this.glanceClock = 0;

    // Power-up flags
    this.hasSuperJump = false;
    this.hasTurbo = false;
    this.hasMagnet = false;

    this.buildHumanoidStudent();
    this.scene.add(this.group);
  }

  buildHumanoidStudent() {
    const shirtSet = this.texLib ? this.texLib.getStudentShirtSet() : null;
    const pantsSet = this.texLib ? this.texLib.getTrouserFabricSet('#58677c') : null;
    const shadowTex = this.texLib ? this.texLib.getContactShadowTexture() : null;

    // Material PBR Realistis
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xdca074,
      roughness: 0.68,
      metalness: 0.02
    });

    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xa85d4c,
      roughness: 0.62
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x16181d,
      roughness: 0.82,
      metalness: 0.04
    });

    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25
    });

    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.2
    });

    // Seragam Siswa SMA Indonesia: Kemeja Putih Keabu-abuan (Roughness kain realistis)
    const shirtMat = new THREE.MeshStandardMaterial({
      color: shirtSet ? 0xffffff : 0xf4f6fa,
      map: shirtSet ? shirtSet.map : null,
      normalMap: shirtSet ? shirtSet.normalMap : null,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.82,
      metalness: 0.02
    });

    // Celana Panjang Sekolah Abu-abu SMA (Jelas Berbeda Nilai & Warnanya dengan Kemeja)
    const trousersMat = new THREE.MeshStandardMaterial({
      color: pantsSet ? 0xffffff : 0x58677c,
      map: pantsSet ? pantsSet.map : null,
      roughness: 0.82,
      metalness: 0.02
    });

    const beltMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.45,
      metalness: 0.28
    });

    // Tas Sekolah Ransel Hitam Arang Realistis
    const backpackMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c22,
      roughness: 0.84,
      metalness: 0.04
    });

    const zipperMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.35,
      metalness: 0.75
    });

    // Sepatu Sekolah Hitam & Kaos Kaki Putih
    const sockMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.75
    });

    const shoeCanvasMat = new THREE.MeshStandardMaterial({
      color: 0x141518,
      roughness: 0.86
    });

    const shoeSoleMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.55
    });

    // Bayangan Kontak di Lantai
    if (shadowTex) {
      this.contactShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.95),
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false
        })
      );
      this.contactShadow.rotation.x = -Math.PI / 2;
      this.contactShadow.position.y = 0.012;
      this.group.add(this.contactShadow);
    }

    // ==================== HIERARKI SKELETAL HUMANOID (~1.68m) ====================
    // 1. Pelvis / Pinggul (Tinggi dasar 0.90m dari lantai)
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.9;
    this.rigRoot.add(this.pelvis);

    const hipsMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.165, 0.15, 0.16, 14),
      trousersMat
    );
    hipsMesh.scale.set(1.08, 1, 0.78);
    hipsMesh.castShadow = true;
    this.pelvis.add(hipsMesh);

    const beltMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.168, 0.168, 0.042, 14),
      beltMat
    );
    beltMesh.scale.set(1.09, 1, 0.79);
    beltMesh.position.y = 0.065;
    this.pelvis.add(beltMesh);

    // 2. Spine & Torso (Badan Kemeja Putih Seragam SMA)
    this.spine = new THREE.Group();
    this.spine.position.y = 0.07;
    this.pelvis.add(this.spine);

    const torsoPoints = [
      new THREE.Vector2(0.172, -0.035),
      new THREE.Vector2(0.162, 0.06),
      new THREE.Vector2(0.166, 0.2),
      new THREE.Vector2(0.194, 0.36),
      new THREE.Vector2(0.206, 0.46),
      new THREE.Vector2(0.09, 0.51)
    ];
    const torsoGeo = new THREE.LatheGeometry(torsoPoints, 18);
    this.chestMesh = new THREE.Mesh(torsoGeo, shirtMat);
    this.chestMesh.scale.set(1.06, 1.0, 0.68);
    this.chestMesh.castShadow = true;
    this.chestMesh.receiveShadow = true;
    this.spine.add(this.chestMesh);

    // Kerah Kemeja Putih Lipat
    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.088, 0.022, 8, 14, Math.PI * 1.45),
      shirtMat
    );
    collarRing.rotation.x = Math.PI / 2 + 0.15;
    collarRing.rotation.z = -Math.PI * 0.22;
    collarRing.position.set(0, 0.49, 0.01);
    this.spine.add(collarRing);

    // Placket & Kancing Dada Depan
    const placketMesh = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.46, 0.015), shirtMat);
    placketMesh.position.set(0, 0.23, -0.145);
    this.spine.add(placketMesh);

    // 3. Tas Ransel Sekolah Hitam Detail + Tali Bahu Melingkari Pundak
    this.backpack = new THREE.Group();
    this.backpack.position.set(0, 0.27, 0.155);

    const bagBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), backpackMat);
    bagBody.castShadow = true;
    const bagTopArch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.15, 12, 1, false, 0, Math.PI),
      backpackMat
    );
    bagTopArch.rotation.z = Math.PI / 2;
    bagTopArch.rotation.y = Math.PI / 2;
    bagTopArch.position.y = 0.2;

    const bagPocket = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.21, 0.055), backpackMat);
    bagPocket.position.set(0, -0.07, 0.09);
    bagPocket.castShadow = true;

    const bagZipper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.014, 0.06), zipperMat);
    bagZipper.position.set(0, 0.03, 0.092);

    this.backpack.add(bagBody, bagTopArch, bagPocket, bagZipper);
    this.spine.add(this.backpack);

    // Tali Ransel Kiri & Kanan di Pundak Depan-Atas
    [-0.125, 0.125].forEach((sx) => {
      const strapTop = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.03, 0.22), backpackMat);
      strapTop.position.set(sx, 0.47, 0.01);
      const strapFront = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.025), backpackMat);
      strapFront.position.set(sx, 0.3, -0.118);
      strapFront.rotation.x = 0.08;
      this.spine.add(strapTop, strapFront);
    });

    // 4. Leher, Kepala Proporsional, Wajah Detail & Rambut Alami
    this.neckPivot = new THREE.Group();
    this.neckPivot.position.set(0, 0.49, -0.01);
    this.spine.add(this.neckPivot);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.066, 0.1, 12), skinMat);
    neckMesh.position.y = 0.04;
    this.neckPivot.add(neckMesh);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.165, 0);
    this.neckPivot.add(this.head);

    // Bentuk kepala manusia oval proporsional dengan rahang halus
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.132, 18, 16), skinMat);
    cranium.scale.set(0.92, 1.08, 0.98);
    cranium.castShadow = true;
    this.head.add(cranium);

    // Telinga Kiri & Kanan Proporsional
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), skinMat);
      ear.scale.set(0.45, 0.95, 0.65);
      ear.position.set(side * 0.122, -0.005, 0.005);
      this.head.add(ear);
    });

    // Wajah Menghadap -Z: Mata, Alis, Hidung & Mulut
    [-0.046, 0.046].forEach((ex) => {
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), eyeWhiteMat);
      sclera.scale.set(1.15, 0.85, 0.55);
      sclera.position.set(ex, 0.015, -0.118);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), irisMat);
      iris.scale.set(1, 1, 0.5);
      iris.position.set(ex, 0.015, -0.126);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.009, 0.012), hairMat);
      brow.position.set(ex, 0.042, -0.122);
      brow.rotation.z = ex < 0 ? 0.08 : -0.08;

      this.head.add(sclera, iris, brow);
    });

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.042, 6), skinMat);
    nose.rotation.x = -Math.PI / 2 + 0.25;
    nose.position.set(0, -0.008, -0.134);
    this.head.add(nose);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.01, 0.01), lipMat);
    mouth.position.set(0, -0.052, -0.12);
    this.head.add(mouth);

    // Rambut Anak SMA Indonesia Berlapis Alami (Bukan helm kotak)
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.139, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat
    );
    hairCap.scale.set(0.95, 1.08, 1.02);
    hairCap.position.set(0, 0.012, 0.008);
    hairCap.rotation.x = -0.14;
    hairCap.castShadow = true;
    this.head.add(hairCap);

    // Tengkuk rambut belakang & poni depan natural
    const hairNape = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), hairMat);
    hairNape.scale.set(1.02, 0.85, 0.7);
    hairNape.position.set(0, -0.025, 0.055);
    this.head.add(hairNape);

    [-0.045, 0.0, 0.05].forEach((fx, i) => {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.085, 6), hairMat);
      tuft.position.set(fx, 0.095, -0.105);
      tuft.rotation.x = 2.45;
      tuft.rotation.z = (i - 1) * 0.25;
      this.head.add(tuft);
    });

    // 5. Lengan Berartikulasi Penuh (Bahu -> Lengan Atas Kemeja Putih -> Siku -> Lengan Bawah -> Tangan)
    const createArmChain = (side) => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.225, 0.435, 0);

      // Lengan Kemeja Putih SMA Pendek
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.064, 0.058, 0.17, 12),
        shirtMat
      );
      sleeve.position.y = -0.075;
      sleeve.rotation.z = side * 0.06;
      sleeve.castShadow = true;

      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 10), shirtMat);
      shoulderPivot.add(shoulderCap, sleeve);

      // Siku (Elbow Pivot)
      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(0, -0.22, 0);
      const upperSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.042, 0.09, 10), skinMat);
      upperSkin.position.y = -0.175;
      shoulderPivot.add(upperSkin, elbowPivot);

      const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), skinMat);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.033, 0.21, 10), skinMat);
      forearm.position.y = -0.105;
      forearm.castShadow = true;

      // Telapak Tangan & Ibu Jari
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), skinMat);
      hand.scale.set(0.78, 1.15, 0.95);
      hand.position.set(0, -0.23, -0.008);

      elbowPivot.add(elbowJoint, forearm, hand);
      this.spine.add(shoulderPivot);

      return { shoulderPivot, elbowPivot };
    };

    this.leftArm = createArmChain(-1);
    this.rightArm = createArmChain(1);

    // 6. Kaki Berartikulasi Penuh (Pinggul -> Paha Abu-abu -> Lutut -> Betis -> Kaos Kaki Putih -> Sepatu Hitam)
    const createLegChain = (side) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(side * 0.095, -0.02, 0);

      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.082, 0.066, 0.39, 12),
        trousersMat
      );
      thigh.position.y = -0.195;
      thigh.castShadow = true;
      hipPivot.add(thigh);

      // Lutut (Knee Pivot - Menekuk ke belakang/+Z)
      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.39, 0);
      const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), trousersMat);
      kneePivot.add(kneeJoint);

      const calf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.064, 0.054, 0.36, 12),
        trousersMat
      );
      calf.position.y = -0.18;
      calf.castShadow = true;
      kneePivot.add(calf);

      // Kaos Kaki Putih Sekolah
      const sock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.049, 0.09, 10),
        sockMat
      );
      sock.position.y = -0.375;
      sock.castShadow = true;
      kneePivot.add(sock);

      // Pergelangan Kaki & Sepatu Sekolah Hitam Proporsional (Ujung sepatu menghadap -Z)
      const anklePivot = new THREE.Group();
      anklePivot.position.set(0, -0.4, 0);

      // Sol Sepatu Gelap
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.034, 0.25), shoeSoleMat);
      sole.position.set(0, -0.072, -0.045);
      sole.castShadow = true;

      // Bodi Sepatu Sekolah Hitam
      const shoeUpper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.048, 0.12, 6, 10),
        shoeCanvasMat
      );
      shoeUpper.rotation.x = Math.PI / 2;
      shoeUpper.scale.set(1.02, 1.0, 0.86);
      shoeUpper.position.set(0, -0.036, -0.035);
      shoeUpper.castShadow = true;

      // Ujung Depan Sepatu
      const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.049, 10, 8), shoeCanvasMat);
      toeCap.scale.set(1.0, 0.62, 1.05);
      toeCap.position.set(0, -0.048, -0.13);

      // Tali Sepatu Gelap/Hitam
      [-0.03, -0.06, -0.09].forEach((lz) => {
        const lace = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.008, 0.012), shoeSoleMat);
        lace.position.set(0, -0.002, lz);
        anklePivot.add(lace);
      });

      anklePivot.add(sole, shoeUpper, toeCap);
      kneePivot.add(anklePivot);
      hipPivot.add(kneePivot);
      this.pelvis.add(hipPivot);

      return { hipPivot, kneePivot, anklePivot };
    };

    this.leftLeg = createLegChain(-1);
    this.rightLeg = createLegChain(1);

    // Aura Indikator Power-up di Lantai
    const shieldGeo = new THREE.RingGeometry(0.62, 0.8, 28);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    this.auraRing = new THREE.Mesh(shieldGeo, shieldMat);
    this.auraRing.rotation.x = -Math.PI / 2;
    this.auraRing.position.y = 0.025;
    this.auraRing.visible = false;
    this.group.add(this.auraRing);
  }

  reset() {
    this.currentLane = 1;
    this.targetX = LANES[1];
    this.group.position.set(0, 0, 0);
    this.y = 0;
    this.velocityY = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.landCompress = 0;
    this.stumbleTimer = 0;
    this.isCaught = false;
    this.runCycle = 0;
    this.stepPhase = 0;
    this.jumpBlend = 0;
    this.slideBlend = 0;
    this.laneBank = 0;
    this.laneVelX = 0;
    this.dodgeTimer = 0;
    this.dodgeDir = 0;
    this.glanceClock = 0;
    this.hasSuperJump = false;
    this.hasTurbo = false;
    this.hasMagnet = false;
    this.auraRing.visible = false;

    this.rigRoot.position.set(0, 0, 0);
    this.rigRoot.rotation.set(0, 0, 0);
    this.pelvis.position.set(0, 0.9, 0);
    this.pelvis.rotation.set(0, 0, 0);
    this.spine.rotation.set(0, 0, 0);
    this.neckPivot.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    this.backpack.rotation.set(0, 0, 0);
  }

  moveLeft(audio) {
    if (this.isCaught) return false;
    if (this.currentLane > 0) {
      this.currentLane--;
      this.targetX = LANES[this.currentLane];
      this.dodgeTimer = 0.22;
      this.dodgeDir = -1;
      if (audio) audio.playLaneSwitch();
      return true;
    }
    return false;
  }

  moveRight(audio) {
    if (this.isCaught) return false;
    if (this.currentLane < 2) {
      this.currentLane++;
      this.targetX = LANES[this.currentLane];
      this.dodgeTimer = 0.22;
      this.dodgeDir = 1;
      if (audio) audio.playLaneSwitch();
      return true;
    }
    return false;
  }

  jump(audio) {
    if (this.isCaught) return false;
    if (!this.isJumping) {
      this.isJumping = true;
      this.isSliding = false;
      this.slideTimer = 0;
      const mult = this.hasSuperJump ? 1.28 : 1.0;
      this.velocityY = this.baseJumpForce * mult;
      if (audio) audio.playJump(this.hasSuperJump);
      return true;
    }
    return false;
  }

  slide(audio) {
    if (this.isCaught) return false;
    if (this.isJumping) {
      this.velocityY = -24;
    }
    this.isSliding = true;
    this.slideTimer = this.slideDuration;
    if (audio) audio.playSlide();
    return true;
  }

  triggerStumble() {
    this.stumbleTimer = 0.55;
  }

  setCaught() {
    this.isCaught = true;
    this.isSliding = false;
  }

  getHitbox() {
    const height = this.isSliding ? 0.85 : 1.72;
    const centerY = this.y + height * 0.5;
    return {
      minX: this.group.position.x - 0.34,
      maxX: this.group.position.x + 0.34,
      minY: this.y,
      maxY: this.y + height,
      minZ: this.group.position.z - 0.28,
      maxZ: this.group.position.z + 0.28,
      centerY
    };
  }

  update(dt, speed, audio, teacherDistance = 15, currentZone = 'COURTYARD') {
    // 1. Perpindahan Jalur Pegas Teredam Kritis (Critically-Damped Spring) — responsif namun mengalir mulus tanpa sentakan kaku
    const omega = 23.5; // smoothTime ~0.085s
    const sx = omega * dt;
    const exp = 1 / (1 + sx + 0.48 * sx * sx + 0.235 * sx * sx * sx);
    const changeX = this.group.position.x - this.targetX;
    const tempVel = (this.laneVelX + omega * changeX) * dt;
    this.laneVelX = (this.laneVelX - omega * tempVel) * exp;
    this.group.position.x = this.targetX + (changeX + tempVel) * exp;

    const dx = this.targetX - this.group.position.x;
    const targetBank = THREE.MathUtils.clamp(-this.laneVelX * 0.026 - dx * 0.05, -0.26, 0.26);
    this.laneBank = THREE.MathUtils.lerp(this.laneBank, targetBank, Math.min(1, dt * 14));
    this.rigRoot.rotation.z = this.laneBank;
    this.rigRoot.rotation.y = THREE.MathUtils.clamp(-this.laneVelX * 0.022 - dx * 0.04, -0.24, 0.24);

    if (this.dodgeTimer > 0) {
      this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);
    }

    // 2. State Tertangkap Pak Wahid (Reaksi panik & bernapas organik, tidak mematung kaku)
    if (this.isCaught) {
      this.runCycle += dt * 5.2;
      this.y = 0;
      this.group.position.y = 0;
      const panicBreathe = Math.sin(this.runCycle * 1.4) * 0.016;
      this.pelvis.position.set(0, 0.9 + panicBreathe, 0);
      this.pelvis.rotation.set(0, Math.PI + Math.sin(this.runCycle * 0.7) * 0.06, 0);
      this.spine.rotation.set(0.09 + panicBreathe * 0.8, Math.sin(this.runCycle * 0.9) * 0.08, 0);

      // Tangan memegang kepala panik sambil sedikit gemetar
      const armTremor = Math.sin(this.runCycle * 2.2) * 0.06;
      this.leftArm.shoulderPivot.rotation.set(2.32 + armTremor, 0.12, -0.36);
      this.leftArm.elbowPivot.rotation.x = 1.62;
      this.rightArm.shoulderPivot.rotation.set(2.32 - armTremor, -0.12, 0.36);
      this.rightArm.elbowPivot.rotation.x = 1.62;

      this.leftLeg.hipPivot.rotation.x = 0.05;
      this.leftLeg.kneePivot.rotation.x = -0.1;
      this.rightLeg.hipPivot.rotation.x = -0.05;
      this.rightLeg.kneePivot.rotation.x = -0.1;
      this.neckPivot.rotation.set(0, 0, 0);
      this.head.rotation.set(0.05, Math.sin(this.runCycle * 1.5) * 0.22, Math.sin(this.runCycle) * 0.05);
      return;
    }

    // 3. Fisika Lompatan, Deteksi Collision Atap Baja & Pendaratan Empuk
    const wasInAir = this.isJumping || this.y > 0.02;
    if (this.isJumping || this.y > 0) {
      this.y += this.velocityY * dt;
      this.velocityY += this.gravity * dt;

      // Sistem Collision Atap: Karakter tidak boleh menembus atap/rangka baja ketika melompat!
      let roofLimitY = 999;
      if (currentZone === 'STEEL_PARKING') {
        roofLimitY = 5.15 - 1.72; // Ketinggian bersih bawah kuda-kuda baja 5.15m
      } else if (currentZone === 'CANTEEN') {
        roofLimitY = 4.85 - 1.72; // Ketinggian bersih plafon kantin 4.85m
      }

      if (this.y >= roofLimitY) {
        this.y = roofLimitY;
        if (this.velocityY > 0) {
          this.velocityY = -2.6; // Memantul empuk ke bawah jika menyentuh struktur atap
        }
      }

      if (this.y <= 0) {
        this.y = 0;
        this.velocityY = 0;
        this.isJumping = false;
        if (wasInAir && !this.isSliding) {
          this.landCompress = 0.22;
          if (audio) audio.playStep(true);
        }
      }
    }
    this.rigRoot.position.y = this.y;

    // Bayangan kontak mengecil & memudar proporsional saat melompat tinggi
    if (this.contactShadow) {
      const hScale = Math.max(0.42, 1.0 - this.y * 0.18);
      this.contactShadow.scale.set(hScale, hScale, 1);
      this.contactShadow.material.opacity = Math.max(0.18, 0.9 - this.y * 0.25);
    }

    if (this.landCompress > 0) {
      this.landCompress = Math.max(0, this.landCompress - dt * 1.05);
    }

    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    if (this.stumbleTimer > 0) {
      this.stumbleTimer -= dt;
    }

    // 4. Blending Bobot Animasi Halus (Lari <-> Lompat <-> Meluncur)
    const targetJumpBlend = this.isJumping ? 1.0 : 0.0;
    const targetSlideBlend = this.isSliding && this.y <= 0.08 ? 1.0 : 0.0;
    this.jumpBlend = THREE.MathUtils.lerp(this.jumpBlend, targetJumpBlend, Math.min(1, dt * 14));
    this.slideBlend = THREE.MathUtils.lerp(this.slideBlend, targetSlideBlend, Math.min(1, dt * 15));

    // Kecepatan langkah proporsional terhadap laju lari agar kaki menapak presisi tanpa efek meluncur
    const strideFreq = Math.max(6.4, speed * 0.85);
    this.runCycle += dt * strideFreq;

    const p = this.runCycle;
    const sinP = Math.sin(p);
    const cosP = Math.cos(p);

    // Suara langkah kaki sinkron fase pijakan lantai
    if (!this.isJumping && !this.isSliding && audio) {
      const halfStep = Math.floor(p / Math.PI);
      if (halfStep !== this.stepPhase) {
        this.stepPhase = halfStep;
        audio.playStep(halfStep % 2 === 0);
      }
    }

    // --- POSE DASAR SIKLUS LARI BIOMEKANIS MULUS (Kurva Harmonik Kontinu C∞ Tanpa Patahan Kaku) ---
    // Ayunan vertikal pinggul sinusoidal lembut + lompatan ringan saat berpindah jalur + redaman mendarat
    const runBounce = (1 - Math.cos(2 * p)) * 0.03;
    const dodgeHop =
      !this.isJumping && !this.isSliding && this.dodgeTimer > 0
        ? Math.sin((this.dodgeTimer / 0.22) * Math.PI) * 0.052
        : 0;
    const squatOffset = Math.sin((this.landCompress / 0.22) * Math.PI) * 0.115;

    let pelvisX = -cosP * 0.028 * (1 - this.jumpBlend) * (1 - this.slideBlend);
    let pelvisY = 0.905 + runBounce + dodgeHop - squatOffset;
    let pelvisPitch = Math.sin(2 * p) * 0.024;
    let pelvisYaw = -sinP * 0.115;
    let pelvisRoll = cosP * 0.062;

    // Kontraposto tulang belakang (S-curve bahu mengimbangi ayunan pinggul secara organik)
    let spinePitch = -0.175 - Math.sin(2 * p - 0.3) * 0.028 - squatOffset * 0.65;
    let spineYaw = sinP * 0.24;
    let spineRoll = -cosP * 0.056;

    // Kinematika 3-Sendi Kaki Kiri & Kanan yang Alami:
    // Saat cos(phase) > 0 paha mengayun maju (lutut melipat tinggi mulus); saat cos(phase) < 0 kaki menumpu mendorong lantai ke belakang
    const calcLegAngles = (phase) => {
      const s = Math.sin(phase);
      const swingLift = 0.5 + 0.5 * Math.cos(phase + 0.15);
      const stanceCushion = 0.5 + 0.5 * Math.cos(phase - Math.PI);
      const hipX = s * 0.74 + 0.06 + squatOffset * 0.9;
      const kneeFlex =
        0.12 +
        1.22 * (swingLift * swingLift) +
        0.15 * (stanceCushion * stanceCushion * stanceCushion) +
        squatOffset * 2.1;
      const kneeX = -kneeFlex;
      const ankleX = 0.22 * Math.sin(phase + 0.42) - 0.1 * swingLift;
      return { hipX, kneeX, ankleX };
    };

    const lRun = calcLegAngles(p);
    const rRun = calcLegAngles(p + Math.PI);

    // Ayunan Lengan Menyilang Alami + Jeda Fase Siku (Overlapping Action / Follow-Through)
    const lArmPhase = -sinP;
    const rArmPhase = sinP;
    const lElbowLag = -Math.sin(p - 0.35);
    const rElbowLag = Math.sin(p - 0.35);

    let lShoulderX = lArmPhase * 0.74 + 0.05;
    let rShoulderX = rArmPhase * 0.74 + 0.05;
    let lShoulderY = -Math.max(0, lArmPhase) * 0.22;
    let rShoulderY = Math.max(0, rArmPhase) * 0.22;
    let lShoulderZ = -0.11 - Math.max(0, lArmPhase) * 0.04;
    let rShoulderZ = 0.11 + Math.max(0, rArmPhase) * 0.04;
    let lElbowX = 0.96 + (lElbowLag * 0.5 + 0.5) * 0.52;
    let rElbowX = 0.96 + (rElbowLag * 0.5 + 0.5) * 0.52;

    // --- BLENDING POSE MELOMPAT DINAMIS (Tolakan -> Melayang -> Antisipasi Mendarat) ---
    if (this.jumpBlend > 0.01) {
      const jb = this.jumpBlend;
      const airPhase = THREE.MathUtils.clamp(this.velocityY / 13.0, -1, 1);
      const ascend = Math.max(0, airPhase);
      const descend = Math.max(0, -airPhase);

      pelvisPitch = THREE.MathUtils.lerp(pelvisPitch, -0.08 * ascend + 0.06 * descend, jb);
      pelvisYaw = THREE.MathUtils.lerp(pelvisYaw, -0.08, jb);
      pelvisRoll = THREE.MathUtils.lerp(pelvisRoll, 0, jb);

      spinePitch = THREE.MathUtils.lerp(spinePitch, -0.14 + airPhase * 0.14, jb);
      spineYaw = THREE.MathUtils.lerp(spineYaw, 0.1, jb);
      spineRoll = THREE.MathUtils.lerp(spineRoll, 0, jb);

      // Kaki kanan naik atletis saat tolakan lalu menjulur siap menapak saat turun; kaki kiri melipat dinamis
      const rJumpHip = 0.92 - descend * 0.38;
      const rJumpKnee = -1.05 + descend * 0.68;
      const lJumpHip = -0.38 * ascend + 0.25 * descend;
      const lJumpKnee = -0.75 - (1 - descend) * 0.45;

      lRun.hipX = THREE.MathUtils.lerp(lRun.hipX, lJumpHip, jb);
      lRun.kneeX = THREE.MathUtils.lerp(lRun.kneeX, lJumpKnee, jb);
      lRun.ankleX = THREE.MathUtils.lerp(lRun.ankleX, -0.18 + descend * 0.25, jb);

      rRun.hipX = THREE.MathUtils.lerp(rRun.hipX, rJumpHip, jb);
      rRun.kneeX = THREE.MathUtils.lerp(rRun.kneeX, rJumpKnee, jb);
      rRun.ankleX = THREE.MathUtils.lerp(rRun.ankleX, 0.15 - descend * 0.22, jb);

      lShoulderX = THREE.MathUtils.lerp(lShoulderX, 0.55 + airPhase * 0.5, jb);
      rShoulderX = THREE.MathUtils.lerp(rShoulderX, 0.35 + airPhase * 0.5, jb);
      lShoulderY = THREE.MathUtils.lerp(lShoulderY, 0.08, jb);
      rShoulderY = THREE.MathUtils.lerp(rShoulderY, -0.08, jb);
      lShoulderZ = THREE.MathUtils.lerp(lShoulderZ, -0.32 - (1 - Math.abs(airPhase)) * 0.12, jb);
      rShoulderZ = THREE.MathUtils.lerp(rShoulderZ, 0.32 + (1 - Math.abs(airPhase)) * 0.12, jb);
      lElbowX = THREE.MathUtils.lerp(lElbowX, 0.95 + descend * 0.25, jb);
      rElbowX = THREE.MathUtils.lerp(rElbowX, 1.05 + descend * 0.25, jb);
    }

    // --- BLENDING POSE MELUNCUR LUWES (Parkour Low-Slide dengan Mikro-Gerak Keseimbangan) ---
    if (this.slideBlend > 0.01) {
      const sb = this.slideBlend;
      const slideWave = Math.sin(p * 1.35) * 0.035;
      pelvisY = THREE.MathUtils.lerp(pelvisY, 0.36 + Math.abs(slideWave) * 0.25, sb);
      pelvisPitch = THREE.MathUtils.lerp(pelvisPitch, 0, sb);
      pelvisYaw = THREE.MathUtils.lerp(pelvisYaw, -0.18, sb);
      pelvisRoll = THREE.MathUtils.lerp(pelvisRoll, 0.08, sb);

      spinePitch = THREE.MathUtils.lerp(spinePitch, 0.8 + slideWave, sb);
      spineYaw = THREE.MathUtils.lerp(spineYaw, 0.26, sb);
      spineRoll = THREE.MathUtils.lerp(spineRoll, -0.08, sb);

      // Kaki kanan menjulur meluncur ke depan (-Z), kaki kiri menekuk menjaga keseimbangan di samping bawah
      rRun.hipX = THREE.MathUtils.lerp(rRun.hipX, 1.28 + slideWave, sb);
      rRun.kneeX = THREE.MathUtils.lerp(rRun.kneeX, -0.16, sb);
      rRun.ankleX = THREE.MathUtils.lerp(rRun.ankleX, -0.22, sb);

      lRun.hipX = THREE.MathUtils.lerp(lRun.hipX, 0.54, sb);
      lRun.kneeX = THREE.MathUtils.lerp(lRun.kneeX, -1.52, sb);
      lRun.ankleX = THREE.MathUtils.lerp(lRun.ankleX, -0.15, sb);

      lShoulderX = THREE.MathUtils.lerp(lShoulderX, -0.52 + slideWave * 1.5, sb);
      rShoulderX = THREE.MathUtils.lerp(rShoulderX, 0.48 - slideWave * 1.5, sb);
      lShoulderY = THREE.MathUtils.lerp(lShoulderY, 0.15, sb);
      rShoulderY = THREE.MathUtils.lerp(rShoulderY, -0.12, sb);
      lShoulderZ = THREE.MathUtils.lerp(lShoulderZ, -0.35, sb);
      rShoulderZ = THREE.MathUtils.lerp(rShoulderZ, 0.28, sb);
      lElbowX = THREE.MathUtils.lerp(lElbowX, 0.82, sb);
      rElbowX = THREE.MathUtils.lerp(rElbowX, 1.08, sb);
    }

    // Terapkan ke seluruh sendi rig karakter
    this.pelvis.position.set(pelvisX, pelvisY, 0);
    this.pelvis.rotation.set(pelvisPitch, pelvisYaw, pelvisRoll);

    this.spine.rotation.x = spinePitch;
    this.spine.rotation.y = spineYaw;

    this.leftLeg.hipPivot.rotation.x = lRun.hipX;
    this.leftLeg.kneePivot.rotation.x = lRun.kneeX;
    this.leftLeg.anklePivot.rotation.x = lRun.ankleX;

    this.rightLeg.hipPivot.rotation.x = rRun.hipX;
    this.rightLeg.kneePivot.rotation.x = rRun.kneeX;
    this.rightLeg.anklePivot.rotation.x = rRun.ankleX;

    this.leftArm.shoulderPivot.rotation.set(lShoulderX, lShoulderY, lShoulderZ);
    this.leftArm.elbowPivot.rotation.x = lElbowX;

    this.rightArm.shoulderPivot.rotation.set(rShoulderX, rShoulderY, rShoulderZ);
    this.rightArm.elbowPivot.rotation.x = rElbowX;

    // Goyangan inersia tas sekolah mengikuti langkah dengan sedikit jeda fase (Secondary Motion)
    const bagLagBounce = (1 - Math.cos(2 * p - 0.55)) * 0.032 * (1 - this.slideBlend);
    this.backpack.rotation.x = bagLagBounce + squatOffset * 0.45;
    this.backpack.rotation.y = -Math.sin(p - 0.4) * 0.04 * (1 - this.slideBlend);
    this.backpack.rotation.z = Math.sin(p - 0.35) * 0.042;

    // Sekilas menoleh panik ke belakang jika Pak Wahid sudah dekat (< 7.2m)
    let glanceYaw = 0;
    if (teacherDistance < 7.2 && !this.isJumping && !this.isSliding && Math.abs(dx) < 0.25) {
      this.glanceClock += dt;
      const cycle = this.glanceClock % 4.6;
      if (cycle > 3.5 && cycle < 4.35) {
        const t = (cycle - 3.5) / 0.85;
        glanceYaw = Math.sin(t * Math.PI) * 0.52;
      }
    }

    // Stabilisasi Leher & Kepala Alami (Tetap fokus ke lorong depan + reaksi saat tersandung)
    if (this.stumbleTimer > 0) {
      const shake = Math.sin(this.stumbleTimer * 28) * 0.22 * (this.stumbleTimer / 0.55);
      this.neckPivot.rotation.set(0.08, 0, shake * 0.4);
      this.head.rotation.set(0.06, shake * 0.5, shake);
      this.spine.rotation.z = spineRoll + shake * 0.45;
    } else {
      const headBob = Math.sin(2 * p - 0.45) * 0.022 * (1 - this.jumpBlend) * (1 - this.slideBlend);
      this.neckPivot.rotation.set(-spinePitch * 0.28, - (pelvisYaw + spineYaw) * 0.35, - (pelvisRoll + spineRoll) * 0.35);
      this.head.rotation.x = -spinePitch * 0.32 + headBob;
      this.head.rotation.y = -(pelvisYaw + spineYaw) * 0.45 - this.laneVelX * 0.015 + glanceYaw;
      this.head.rotation.z = -(pelvisRoll + spineRoll) * 0.4 - this.laneBank * 0.25;
      this.spine.rotation.z = spineRoll;
    }

    // Update cincin aura power-up
    if (this.hasTurbo || this.hasMagnet || this.hasSuperJump) {
      this.auraRing.visible = true;
      this.auraRing.rotation.z += dt * 4;
      if (this.hasTurbo) {
        this.auraRing.material.color.setHex(0x38bdf8);
      } else if (this.hasMagnet) {
        this.auraRing.material.color.setHex(0xfacc15);
      } else {
        this.auraRing.material.color.setHex(0x4ade80);
      }
    } else {
      this.auraRing.visible = false;
    }
  }
}
