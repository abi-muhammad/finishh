import * as THREE from 'three';

export const START_QUOTES = [
  '"Heh! Habis mengembalikan MBG kok malah nongkrong dan jalan-jalan?! Masukin bajunya, sini kamu!"',
  '"PRIIIT! Pak Wahid lihat ya! Habis balikin MBG bukannya masuk kelas malah keluyuran, baju dikeluarin pula!"',
  '"Heh berhenti! Izin ke kamar mandi kok berdua, mana sepatu berwarna dan rambut panjang lagi! Sini!"'
];

export const TEACHER_QUOTES = [
  '"Heh! Itu bajunya dimasukin dulu! Rapi sedikit kenapa, ini sekolah bukan tempat nongkrong!"',
  '"Mata Pak Wahid masih awas ya! Sepatu tidak boleh berwarna, wajib hitam polos!"',
  '"Heh gondrong! Rambut tidak boleh panjang sampai nyentuh kerah dan alis, besok wajib potong!"',
  '"Alasan izin keluar ke kamar mandi kok berdua terus?! Tidak boleh ke kamar mandi berdua, balik kelas!"',
  '"Habis mengembalikan MBG itu langsung masuk kelas! Tidak boleh nongkrong atau jalan-jalan di koridor!"',
  '"Pak Wahid sudah hafal akal-akalanmu! Alasan balikin wadah MBG malah jalan-jalan lewat kantin!"',
  '"Berhenti kamu! Baju dimasukin, sepatu jangan berwarna, jangan pura-pura tidak dengar Pak Wahid!"',
  '"Sudah rambut panjang, keluar kamar mandi berdua, habis balikin MBG malah nongkrong pula! Sini kamu!"'
];

export const GAMEOVER_QUOTES = [
  '"Ketangkap Pak Wahid kan! Sekarang masukin bajunya yang rapi, habis mengembalikan MBG itu dilarang nongkrong atau jalan-jalan!"',
  '"Coba lihat ini: baju belum dimasukin, sepatu berwarna, rambut sudah panjang! Ikut Pak Wahid sekarang juga!"',
  '"Pak Wahid sudah ingatkan berkali-kali: tidak boleh keluar ke kamar mandi berdua, dan habis balikin MBG langsung masuk kelas!"',
  '"Napas Pak Wahid masih kuat ngejar kamu! Besok sepatu wajib hitam tidak boleh berwarna, rambut potong rapi, dan baju dimasukin!"'
];

export class Teacher {
  constructor(scene, texLib) {
    this.scene = scene;
    this.texLib = texLib;
    this.group = new THREE.Group();
    this.rigRoot = new THREE.Group();
    this.group.add(this.rigRoot);

    this.maxDistance = 20;
    this.distance = 12;
    this.runCycle = 0;
    this.velX = 0;
    this.bankZ = 0;
    this.shoutGestureTimer = 0;
    this.quoteBag = [];

    this.buildHumanoidTeacher();
    this.scene.add(this.group);
  }

  buildHumanoidTeacher() {
    const shirtSet = this.texLib ? this.texLib.getWhiteShirtSet() : null;
    const pantsSet = this.texLib ? this.texLib.getTrouserFabricSet('#23272f') : null;
    const shadowTex = this.texLib ? this.texLib.getContactShadowTexture() : null;

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd6986c,
      roughness: 0.68,
      metalness: 0.02
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.8,
      metalness: 0.04
    });

    const whiteShirtMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      map: shirtSet ? shirtSet.map : null,
      normalMap: shirtSet ? shirtSet.normalMap : null,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.78,
      metalness: 0.02
    });

    const slacksMat = new THREE.MeshStandardMaterial({
      color: pantsSet ? 0xffffff : 0x23272f,
      map: pantsSet ? pantsSet.map : null,
      roughness: 0.8,
      metalness: 0.03
    });

    const beltMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.42,
      metalness: 0.2
    });

    const buckleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.85
    });

    const dressShoeMat = new THREE.MeshStandardMaterial({
      color: 0x141518,
      roughness: 0.3,
      metalness: 0.15
    });

    const badgeBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35
    });

    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });

    if (shadowTex) {
      this.contactShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 1.1),
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

    // 1. Pinggul & Sabuk
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.92;
    this.rigRoot.add(this.pelvis);

    const pelvisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.215, 0.19, 0.18, 16),
      slacksMat
    );
    pelvisMesh.scale.set(1.08, 1.0, 0.88);
    pelvisMesh.castShadow = true;
    this.pelvis.add(pelvisMesh);

    const beltMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.048, 16),
      beltMat
    );
    beltMesh.scale.set(1.09, 1.0, 0.9);
    beltMesh.position.y = 0.075;
    this.pelvis.add(beltMesh);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.052, 0.025), buckleMat);
    buckle.position.set(0, 0.075, -0.2);
    this.pelvis.add(buckle);

    // 2. Torso Berisi & Kemeja Putih Polos Rapi (Dimasukkan ke Celana)
    this.spine = new THREE.Group();
    this.spine.position.set(0, 0.08, 0);
    this.pelvis.add(this.spine);

    const teacherTorsoProfile = [
      new THREE.Vector2(0.04, 0.0),
      new THREE.Vector2(0.222, 0.05),
      new THREE.Vector2(0.238, 0.19),
      new THREE.Vector2(0.232, 0.34),
      new THREE.Vector2(0.238, 0.45),
      new THREE.Vector2(0.105, 0.53)
    ];
    const torsoMesh = new THREE.Mesh(
      new THREE.LatheGeometry(teacherTorsoProfile, 18),
      whiteShirtMat
    );
    torsoMesh.scale.set(1.06, 1.0, 0.84);
    torsoMesh.position.z = -0.015;
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.spine.add(torsoMesh);

    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.46, 0.015), whiteShirtMat);
    placket.position.set(0, 0.25, -0.205);
    this.spine.add(placket);

    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.095, 0.014), whiteShirtMat);
    pocket.position.set(0.11, 0.34, -0.195);
    const pocketBadge = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.036, 0.018),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 })
    );
    pocketBadge.position.set(0.11, 0.35, -0.2);

    const nameTag = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.034, 0.018), badgeBlackMat);
    nameTag.position.set(-0.115, 0.36, -0.195);
    const nameBorder = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.02), buckleMat);
    nameBorder.position.set(-0.115, 0.36, -0.197);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.026, 8, 16, Math.PI * 1.5),
      whiteShirtMat
    );
    collar.rotation.x = Math.PI / 2 + 0.14;
    collar.rotation.z = -Math.PI * 0.25;
    collar.position.set(0, 0.51, -0.01);

    this.spine.add(pocket, pocketBadge, nameTag, nameBorder, collar);

    // 3. Leher, Kepala Proporsional, Rambut Belah Pinggir Rapi & Kumis Khas Pak Wahid
    this.neckPivot = new THREE.Group();
    this.neckPivot.position.set(0, 0.51, -0.01);
    this.spine.add(this.neckPivot);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.095, 12), skinMat);
    neck.position.y = 0.035;
    this.neckPivot.add(neck);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.165, 0);
    this.neckPivot.add(this.head);

    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.142, 18, 16), skinMat);
    headSphere.scale.set(0.98, 1.05, 0.96);
    headSphere.castShadow = true;
    this.head.add(headSphere);

    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), skinMat);
      ear.scale.set(0.45, 0.95, 0.65);
      ear.position.set(side * 0.136, -0.005, 0.005);
      this.head.add(ear);
    });

    [-0.048, 0.048].forEach((ex) => {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), eyeWhiteMat);
      eyeW.scale.set(1.15, 0.8, 0.55);
      eyeW.position.set(ex, 0.018, -0.126);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), hairMat);
      pupil.position.set(ex, 0.018, -0.134);

      const sternBrow = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.013, 0.015), hairMat);
      sternBrow.position.set(ex, 0.046, -0.13);
      sternBrow.rotation.z = ex < 0 ? -0.18 : 0.18;

      this.head.add(eyeW, pupil, sternBrow);
    });

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), skinMat);
    nose.scale.set(0.95, 1.15, 1.15);
    nose.position.set(0, -0.006, -0.14);
    this.head.add(nose);

    this.mustache = new THREE.Group();
    this.mustache.position.set(0, -0.042, -0.134);
    const mustCenter = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.022, 0.022), hairMat);
    const mustLeft = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.02, 0.02), hairMat);
    mustLeft.position.set(-0.036, -0.006, 0.004);
    mustLeft.rotation.z = 0.28;
    const mustRight = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.02, 0.02), hairMat);
    mustRight.position.set(0.036, -0.006, 0.004);
    mustRight.rotation.z = -0.28;
    this.mustache.add(mustCenter, mustLeft, mustRight);
    this.head.add(this.mustache);

    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.147, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairTop.scale.set(1.0, 1.04, 1.0);
    hairTop.position.set(0, 0.015, 0.01);
    hairTop.rotation.x = -0.18;
    hairTop.castShadow = true;

    const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 10), hairMat);
    hairBack.scale.set(1.05, 0.85, 0.72);
    hairBack.position.set(0, -0.02, 0.055);

    const sideWave = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.08), hairMat);
    sideWave.position.set(0.02, 0.125, -0.065);
    sideWave.rotation.z = -0.12;

    this.head.add(hairTop, hairBack, sideWave);

    // 4. Lengan Kemeja Putih Pendek + Siku & Tangan Berartikulasi
    const createTeacherArm = (side) => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.265, 0.445, 0);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), whiteShirtMat);
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.076, 0.068, 0.19, 12),
        whiteShirtMat
      );
      sleeve.position.y = -0.085;
      sleeve.rotation.z = side * 0.07;
      sleeve.castShadow = true;
      shoulderPivot.add(cap, sleeve);

      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(0, -0.23, 0);

      const upperSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.05, 0.08, 10), skinMat);
      upperSkin.position.y = -0.19;
      shoulderPivot.add(upperSkin, elbowPivot);

      const elbowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), skinMat);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.22, 10), skinMat);
      forearm.position.y = -0.11;
      forearm.castShadow = true;

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 8), skinMat);
      hand.scale.set(0.85, 1.12, 0.95);
      hand.position.set(0, -0.235, -0.01);

      elbowPivot.add(elbowSphere, forearm, hand);
      this.spine.add(shoulderPivot);

      return { shoulderPivot, elbowPivot };
    };

    this.leftArm = createTeacherArm(-1);
    this.rightArm = createTeacherArm(1);

    // 5. Kaki Celana Panjang Kain & Sepatu Pantofel Hitam Berartikulasi Penuh
    const createTeacherLeg = (side) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(side * 0.115, -0.02, 0);

      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.098, 0.08, 0.4, 12),
        slacksMat
      );
      thigh.position.y = -0.2;
      thigh.castShadow = true;
      hipPivot.add(thigh);

      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.4, 0);
      const kneeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.078, 10, 8), slacksMat);
      const calf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.078, 0.066, 0.39, 12),
        slacksMat
      );
      calf.position.y = -0.195;
      calf.castShadow = true;
      kneePivot.add(kneeSphere, calf);

      const anklePivot = new THREE.Group();
      anklePivot.position.set(0, -0.41, 0);

      const shoeBody = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.052, 0.13, 6, 10),
        dressShoeMat
      );
      shoeBody.rotation.x = Math.PI / 2;
      shoeBody.scale.set(1.06, 1.0, 0.82);
      shoeBody.position.set(0, -0.042, -0.04);
      shoeBody.castShadow = true;

      const shoeHeel = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.032, 0.08), dressShoeMat);
      shoeHeel.position.set(0, -0.074, 0.03);

      anklePivot.add(shoeBody, shoeHeel);
      kneePivot.add(anklePivot);
      hipPivot.add(kneePivot);
      this.pelvis.add(hipPivot);

      return { hipPivot, kneePivot, anklePivot };
    };

    this.leftLeg = createTeacherLeg(-1);
    this.rightLeg = createTeacherLeg(1);
  }

  reset() {
    this.distance = 8.5;
    this.runCycle = 0;
    this.velX = 0;
    this.bankZ = 0;
    this.shoutGestureTimer = 1.4;
    this.group.position.set(0.28, 0, 3.6);
    this.group.rotation.set(0, 0, 0);
    this.rigRoot.rotation.set(0, 0, 0);
  }

  onPlayerStumble() {
    this.distance = Math.max(0, this.distance - 7.5);
    this.shoutGestureTimer = 1.5;
    return this.distance <= 0.5;
  }

  onPlayerTurbo() {
    this.distance = Math.min(this.maxDistance, this.distance + 6.0);
  }

  triggerShoutGesture() {
    this.shoutGestureTimer = 1.5;
  }

  getStartQuote() {
    return START_QUOTES[Math.floor(Math.random() * START_QUOTES.length)];
  }

  // Shuffle-bag agar seluruh teguran khas Pak Wahid keluar merata tanpa berulang beruntun
  getRandomQuote() {
    if (this.quoteBag.length === 0) {
      this.quoteBag = [...TEACHER_QUOTES];
      for (let i = this.quoteBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.quoteBag[i], this.quoteBag[j]] = [this.quoteBag[j], this.quoteBag[i]];
      }
    }
    return this.quoteBag.pop();
  }

  getRandomGameOverQuote() {
    return GAMEOVER_QUOTES[Math.floor(Math.random() * GAMEOVER_QUOTES.length)];
  }

  update(dt, playerX, speed, isGameOver = false) {
    if (isGameOver) {
      // Pose Pak Wahid menangkap & menegur siswa secara ekspresif dan luwes
      this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, playerX + 0.78, dt * 7);
      this.group.position.z = THREE.MathUtils.lerp(this.group.position.z, 0.48, dt * 7);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, -2.55, dt * 7);
      this.rigRoot.rotation.set(0, 0, 0);

      this.runCycle += dt * 4.5;
      const breathe = Math.sin(this.runCycle) * 0.018;
      this.pelvis.position.set(0, 0.92 + breathe, 0);
      this.pelvis.rotation.set(0, 0, 0.03);
      this.spine.rotation.set(0.04 + breathe * 0.5, Math.sin(this.runCycle * 0.7) * 0.08, -0.03);

      // Tangan kiri berkacak pinggang, tangan kanan menunjuk-nunjuk menasihati soal baju, sepatu, rambut & MBG
      this.leftArm.shoulderPivot.rotation.set(-0.22, 0.25, -0.52);
      this.leftArm.elbowPivot.rotation.x = 1.38;

      const pointWave = Math.sin(this.runCycle * 2.4);
      this.rightArm.shoulderPivot.rotation.set(1.18 + pointWave * 0.22, -0.12, 0.14);
      this.rightArm.elbowPivot.rotation.x = 0.55 + pointWave * 0.16;

      this.leftLeg.hipPivot.rotation.x = 0.05;
      this.leftLeg.kneePivot.rotation.x = -0.07;
      this.rightLeg.hipPivot.rotation.x = -0.05;
      this.rightLeg.kneePivot.rotation.x = -0.07;

      this.head.rotation.y = Math.sin(this.runCycle * 1.1) * 0.14;
      this.head.rotation.z = Math.sin(this.runCycle * 1.6) * 0.07;
      this.mustache.rotation.z = Math.sin(this.runCycle * 3.8) * 0.05;
      return;
    }

    if (this.shoutGestureTimer > 0) {
      this.shoutGestureTimer = Math.max(0, this.shoutGestureTimer - dt);
    }

    // Pemulihan jarak aman perlahan saat pemain lari tanpa menabrak
    this.distance = Math.min(this.maxDistance, this.distance + dt * 0.95);

    const targetZ = 1.35 + (this.distance / this.maxDistance) * 5.0;
    const lateralOffset = playerX > 0.2 ? -0.34 : 0.34;
    const targetX = playerX + lateralOffset * (1 - this.distance / 28);

    // Pegas teredam halus (smooth spring) saat Pak Wahid mengikuti perpindahan jalur siswa
    const springK = 42;
    const damping = 11.5;
    const accelX = (targetX - this.group.position.x) * springK - this.velX * damping;
    this.velX += accelX * dt;
    this.group.position.x += this.velX * dt;
    this.group.position.z = THREE.MathUtils.lerp(this.group.position.z, targetZ, Math.min(1, dt * 6));
    this.group.rotation.y = -this.velX * 0.045;

    this.bankZ = THREE.MathUtils.lerp(this.bankZ, -this.velX * 0.042, Math.min(1, dt * 10));
    this.rigRoot.rotation.z = this.bankZ;

    // Siklus Lari Mengejar Organik & Luwes (Kurva kontinu mulus tanpa patahan robotik)
    const strideFreq = Math.max(6.0, speed * 0.82);
    this.runCycle += dt * strideFreq;
    const p = this.runCycle;
    const sinP = Math.sin(p);
    const cosP = Math.cos(p);

    // Ayunan vertikal pinggul sinusoidal mulus (2x frekuensi langkah) + transfer tumpuan berat badan kiri-kanan
    const smoothBounce = (1 - Math.cos(2 * p)) * 0.028;
    this.pelvis.position.set(-cosP * 0.028, 0.915 + smoothBounce, 0);
    this.pelvis.rotation.set(Math.sin(2 * p) * 0.02, -sinP * 0.105, cosP * 0.055);

    // Postur tubuh condong maju mengejar dengan kontraposto bahu alami berlawanan pinggul
    const breatheCycle = Math.sin(p * 0.5) * 0.015;
    this.spine.rotation.x = -0.19 - Math.sin(2 * p - 0.3) * 0.025 + breatheCycle;
    this.spine.rotation.y = sinP * 0.22;
    this.spine.rotation.z = -cosP * 0.05;

    // Kurva sendi paha-lutut-pergelangan kaki biomekanis:
    // Saat cos(phase) > 0 kaki mengayun maju (lutut terangkat mulus); saat cos(phase) < 0 kaki menumpu mendorong lantai
    const calcSmoothLeg = (phase) => {
      const s = Math.sin(phase);
      const swingLift = 0.5 + 0.5 * Math.cos(phase + 0.15);
      const stanceCushion = 0.5 + 0.5 * Math.cos(phase - Math.PI);
      const hipX = s * 0.68 + 0.06;
      const kneeFlex = 0.11 + 1.12 * (swingLift * swingLift) + 0.14 * (stanceCushion * stanceCushion * stanceCushion);
      const kneeX = -kneeFlex;
      const ankleX = 0.2 * Math.sin(phase + 0.4) - 0.08 * swingLift;
      return { hipX, kneeX, ankleX };
    };

    const lLeg = calcSmoothLeg(p);
    const rLeg = calcSmoothLeg(p + Math.PI);

    this.leftLeg.hipPivot.rotation.x = lLeg.hipX;
    this.leftLeg.kneePivot.rotation.x = lLeg.kneeX;
    this.leftLeg.anklePivot.rotation.x = lLeg.ankleX;

    this.rightLeg.hipPivot.rotation.x = rLeg.hipX;
    this.rightLeg.kneePivot.rotation.x = rLeg.kneeX;
    this.rightLeg.anklePivot.rotation.x = rLeg.ankleX;

    // Ayunan lengan menyilang alami dengan sedikit jeda fase siku (follow-through)
    const lArmPhase = -sinP;
    const lArmForward = Math.max(0, lArmPhase);
    const lElbowLag = -Math.sin(p - 0.35);
    this.leftArm.shoulderPivot.rotation.set(
      lArmPhase * 0.72 + 0.05,
      -lArmForward * 0.2,
      -0.13 - lArmForward * 0.04
    );
    this.leftArm.elbowPivot.rotation.x = 0.98 + (lElbowLag * 0.5 + 0.5) * 0.46;

    const rArmPhase = sinP;
    const rArmForward = Math.max(0, rArmPhase);
    const rElbowLag = Math.sin(p - 0.35);
    const shoutBlend = Math.min(1, this.shoutGestureTimer * 2.2);

    // Saat Pak Wahid berteriak menegur, tangan kanan menunjuk tegas ke arah siswa sambil berlari!
    const runRightShoulderX = rArmPhase * 0.72 + 0.08;
    const shoutRightShoulderX = 1.42 + Math.sin(p * 1.5) * 0.18;
    this.rightArm.shoulderPivot.rotation.set(
      THREE.MathUtils.lerp(runRightShoulderX, shoutRightShoulderX, shoutBlend),
      THREE.MathUtils.lerp(rArmForward * 0.2, 0.14, shoutBlend),
      THREE.MathUtils.lerp(0.13 + rArmForward * 0.04, 0.1, shoutBlend)
    );
    this.rightArm.elbowPivot.rotation.x = THREE.MathUtils.lerp(
      1.0 + (rElbowLag * 0.5 + 0.5) * 0.46,
      0.45,
      shoutBlend
    );

    // Kepala mengikuti ritme lari secara organik (phase lag lembut)
    this.head.rotation.x = 0.15 + Math.sin(2 * p - 0.4) * 0.025;
    this.head.rotation.y = -this.spine.rotation.y * 0.65;
    this.head.rotation.z = -this.spine.rotation.z * 0.4;
    this.mustache.rotation.z = sinP * 0.035;
  }
}
