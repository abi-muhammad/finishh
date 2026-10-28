import * as THREE from 'three';
import {
  createSharedPropMaterials,
  createRealisticMotorcycle,
  createCanteenTableSet,
  createCanteenStallCounter,
  createTropicalTree,
  createSchoolPottedPlant,
  createPalmTree,
  createTreePlanter,
  createCourtyardCar,
  createSchoolTrashBin,
  createOpenSteelRoofTrussModule
} from './props.js';

export const SEGMENT_LENGTH = 20;
export const SEGMENT_COUNT = 8;
export const CORRIDOR_WIDTH = 8.4; // 3 jalur pemain di -2.2, 0, +2.2 tetap 100% kompatibel

// Alur 4 Area Sesuai Denah Map Gambar Referensi:
// 1. Halaman Sekolah -> 2. Parkiran Motor Baja Ringan -> 3. Kantin -> 4. Koridor Kelas 11 A1, 11 A2, 11 A3
export const ZONE_SEQUENCE = [
  'COURTYARD',           // Area 1: Halaman Sekolah (Foto 1)
  'COURTYARD',
  'STEEL_PARKING',       // Area 2: Parkiran Motor Baja Ringan Terbuka (Foto 2)
  'STEEL_PARKING',
  'CANTEEN',             // Area 3: Kantin Sekolah (Foto 3)
  'CANTEEN',
  'CLASSROOM_CORRIDOR',  // Area 4: Koridor Kelas 11 A1, 11 A2, 11 A3 (Foto 4)
  'CLASSROOM_CORRIDOR'
];

const MOTOR_COLORS = [0xb91c1c, 0x18181b, 0x1d4ed8, 0xf8fafc, 0x334155, 0x991b1b];
const CAR_COLORS = ['black', 'silver', 'white', 'black'];
const CLASS_NAMES = ['11 A1', '11 A2', '11 A3', '11 A4', 'RUANG BK'];

export class CorridorManager {
  constructor(scene, texLib) {
    this.scene = scene;
    this.texLib = texLib;
    this.segments = [];
    this.bystanders = [];
    this.distantProps = [];
    this.highDetailProps = [];
    this.classCounter = 3;

    this.initMaterials();
    this.initSegments();
  }

  initMaterials() {
    const courtyardPavingSet = this.texLib.getCourtyardPavingSet();
    const concreteFloorSet = this.texLib.getConcreteFloorSet();
    const ceramicSet = this.texLib.getCeramicFloorSet();
    const corrugatedSet = this.texLib.getCorrugatedRoofSet();
    const plasterNorm = this.texLib.getPlasterNormalMap();

    this.propMats = createSharedPropMaterials(this.texLib);

    // Area A: Lantai Paving Block Abu-abu Halaman Sekolah (Sesuai Foto 1)
    this.courtyardPavingMat = new THREE.MeshStandardMaterial({
      map: courtyardPavingSet.map,
      normalMap: courtyardPavingSet.normalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughness: 0.86,
      metalness: 0.02,
      envMapIntensity: 0.4
    });

    // Area B: Lantai Beton Halus Parkiran Motor Rangka Baja (Sesuai Foto 2)
    this.concreteFloorMat = new THREE.MeshStandardMaterial({
      map: concreteFloorSet.map,
      normalMap: concreteFloorSet.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.54,
      metalness: 0.04,
      envMapIntensity: 0.65
    });

    // Area C & D: Lantai Keramik Putih Mengkilap Bersih Sekolah & Kantin
    this.ceramicFloorMat = new THREE.MeshStandardMaterial({
      map: ceramicSet.map,
      roughnessMap: ceramicSet.roughnessMap,
      normalMap: ceramicSet.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.68,
      metalness: 0.03,
      envMapIntensity: 0.75
    });

    // Dinding Bangunan Sekolah Hijau & Krem (Sesuai Foto 1 & Foto 4)
    this.wallGreenUpperMat = new THREE.MeshStandardMaterial({
      map: this.texLib.getPlasterWallTexture('#2e7d32', false),
      normalMap: plasterNorm,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.86,
      metalness: 0.02
    });

    this.wallCreamLowerMat = new THREE.MeshStandardMaterial({
      map: this.texLib.getPlasterWallTexture('#e8dfc8', true),
      normalMap: plasterNorm,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.84,
      metalness: 0.02
    });

    this.plinthDarkMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8,
      metalness: 0.05
    });

    this.whiteFrameMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.52,
      metalness: 0.05
    });

    this.windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      roughness: 0.12,
      metalness: 0.25,
      envMapIntensity: 1.2
    });

    this.roofTileMat = new THREE.MeshStandardMaterial({
      map: this.texLib.getTerracottaTileSet(),
      color: 0x9a3412,
      roughness: 0.82,
      metalness: 0.04
    });

    this.corrugatedRoofMat = new THREE.MeshStandardMaterial({
      map: corrugatedSet.map,
      normalMap: corrugatedSet.normalMap,
      roughness: 0.45,
      metalness: 0.75,
      side: THREE.DoubleSide
    });

    this.ceilingGridMat = new THREE.MeshStandardMaterial({
      map: this.texLib.getCeilingGridTexture(),
      roughness: 0.85,
      metalness: 0.02
    });

    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x3f7a38,
      roughness: 0.94
    });

    this.parkingLineMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.75
    });

    // Papan Nama Sekolah Biru di Halaman
    this.schoolLandmarkMat = new THREE.MeshStandardMaterial({
      map: this.texLib.createSignboardTexture({
        title: 'SMAN 1',
        subtitle: 'PASIR SAKTI',
        bg: '#1e3a8a',
        fg: '#ffffff',
        border: '#93c5fd',
        accent: '#fde047',
        width: 512,
        height: 256
      }),
      roughness: 0.4
    });

    // Plang Kantin Sekolah & Plang Nama SMAN 1 PASIR SAKTI di bawahnya
    this.canteenTopSignMat = new THREE.MeshStandardMaterial({
      map: this.texLib.createSignboardTexture({
        title: 'KANTIN SEKOLAH',
        subtitle: '',
        bg: '#1f5c3a',
        fg: '#fef08a',
        border: '#86efac',
        width: 640,
        height: 140
      }),
      roughness: 0.45
    });

    this.canteenSchoolSubPlangMat = new THREE.MeshStandardMaterial({
      map: this.texLib.createSignboardTexture({
        title: 'SMAN 1 PASIR SAKTI',
        subtitle: '',
        bg: '#1e3a8a',
        fg: '#ffffff',
        border: '#fde047',
        width: 640,
        height: 128
      }),
      roughness: 0.42
    });

    // Plang Nama Kelas Depan Pintu: 11 A1, 11 A2, 11 A3, 11 A4
    this.classSignMaterials = CLASS_NAMES.map((name) =>
      new THREE.MeshStandardMaterial({
        map: this.texLib.createSignboardTexture({
          title: name,
          subtitle: 'SMAN 1 PASIR SAKTI',
          bg: '#14532d',
          fg: '#ffffff',
          border: '#facc15',
          accent: '#fef08a',
          width: 384,
          height: 144
        }),
        roughness: 0.35,
        metalness: 0.1
      })
    );

    // Mading Informasi Sekolah
    this.madingBoardMat = new THREE.MeshStandardMaterial({
      map: this.texLib.createSignboardTexture({
        title: 'MADING INFORMASI',
        subtitle: 'DISIPLIN • PRESTASI • SMAN 1 PASIR SAKTI',
        bg: '#1e293b',
        fg: '#f8fafc',
        border: '#fde047',
        accent: '#fde047',
        width: 512,
        height: 224
      }),
      roughness: 0.5
    });
  }

  initSegments() {
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const zoneType = ZONE_SEQUENCE[i % ZONE_SEQUENCE.length];
      const seg = this.createZoneSegment(zoneType, i);
      seg.group.position.z = -i * SEGMENT_LENGTH;
      this.scene.add(seg.group);
      this.segments.push(seg);
    }
  }

  createZoneSegment(zoneType, index) {
    const group = new THREE.Group();
    const halfW = CORRIDOR_WIDTH / 2; // 4.2m
    let signMeshes = [];

    if (zoneType === 'COURTYARD') {
      this.buildCourtyardZone(group, halfW, index);
    } else if (zoneType === 'STEEL_PARKING') {
      this.buildSteelParkingZone(group, halfW, index);
    } else if (zoneType === 'CANTEEN') {
      this.buildCanteenZone(group, halfW, index);
    } else {
      signMeshes = this.buildClassroomCorridorZone(group, halfW, index);
    }

    return {
      zoneType,
      group,
      signMeshes,
      index
    };
  }

  // =========================================================================
  // AREA 1 — HALAMAN SEKOLAH (Sesuai Foto 1)
  // Paving block abu-abu, pohon palem & pohon rindang, pembatas tanaman batu,
  // mobil MPV terparkir, gedung sekolah aksen hijau & atap merah bata, langit terbuka!
  // =========================================================================
  buildCourtyardZone(group, halfW, index) {
    const courtyardWidth = 26;

    // 1. Permukaan Halaman Paving Block Abu-abu Luas (Langit terbuka, tanpa atap!)
    const pavingFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(courtyardWidth, SEGMENT_LENGTH),
      this.courtyardPavingMat
    );
    pavingFloor.rotation.x = -Math.PI / 2;
    pavingFloor.receiveShadow = true;
    group.add(pavingFloor);

    // 2. Sisi Kiri Halaman: Jalur Mobil & Deretan Pohon Palem dengan Pembatas Tanaman (Foto 1)
    const palmPlanterZ = [-5.5, 4.5];
    palmPlanterZ.forEach((pz, pIdx) => {
      const planter = createTreePlanter(this.propMats, 2.6, 2.6);
      planter.position.set(-halfW - 3.8, 0, pz);
      group.add(planter);

      const palm = createPalmTree(this.propMats, 7.8, index * 2 + pIdx);
      palm.position.set(-halfW - 3.8, 0.35, pz);
      group.add(palm);
      this.highDetailProps.push(palm);
    });

    // Mobil MPV / SUV Terparkir di Sisi Kiri Halaman (Avanza / Innova sesuai Foto 1)
    const carColor = CAR_COLORS[(index * 2) % CAR_COLORS.length];
    const car = createCourtyardCar(this.propMats, carColor);
    car.position.set(-halfW - 7.5, 0, -1.0);
    car.rotation.y = Math.PI / 2;
    group.add(car);
    this.highDetailProps.push(car);

    // Kanopi baja parkir mobil sisi luar kiri
    const carportRoof = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.08, SEGMENT_LENGTH * 0.7),
      this.corrugatedRoofMat
    );
    carportRoof.position.set(-halfW - 7.8, 3.6, -1.0);
    carportRoof.rotation.z = -0.06;
    carportRoof.castShadow = true;
    group.add(carportRoof);

    [-halfW - 9.8, -halfW - 5.8].forEach((cpx) => {
      const cPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), this.propMats.ironFrame);
      cPost.position.set(cpx, 1.8, -1.0);
      cPost.castShadow = true;
      group.add(cPost);
    });

    // 3. Sisi Kanan Halaman: Gedung Sekolah Aksen Hijau & Atap Merah Bata (Foto 1)
    const buildingX = halfW + 4.2;

    const wallLow = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.6, SEGMENT_LENGTH),
      this.wallCreamLowerMat
    );
    wallLow.position.set(buildingX, 0.8, 0);
    wallLow.receiveShadow = true;

    const wallBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.75, SEGMENT_LENGTH),
      this.wallGreenUpperMat
    );
    wallBand.position.set(buildingX, 1.95, 0);

    const wallUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.5, SEGMENT_LENGTH),
      this.wallCreamLowerMat
    );
    wallUpper.position.set(buildingX, 3.05, 0);

    // Atap Miring Genteng Merah Bata Sekolah (Terracotta)
    const buildingRoof = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.14, SEGMENT_LENGTH),
      this.roofTileMat
    );
    buildingRoof.position.set(buildingX + 1.8, 4.4, 0);
    buildingRoof.rotation.z = -0.32;
    buildingRoof.castShadow = true;

    group.add(wallLow, wallBand, wallUpper, buildingRoof);

    // Jendela-Jendela Kelas Berbingkai Putih pada Dinding Kanan
    [-6.5, -1.5, 3.5].forEach((wz) => {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.4, 2.4), this.whiteFrameMat);
      winFrame.position.set(buildingX - 0.02, 2.2, wz);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.15, 2.15), this.windowGlassMat);
      glass.position.set(buildingX - 0.02, 2.2, wz);
      group.add(winFrame, glass);
    });

    // Trotoar & Tanaman Hias / Tempat Sampah di Depan Gedung Kanan
    const walkwayCurb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, SEGMENT_LENGTH), this.plinthDarkMat);
    walkwayCurb.position.set(buildingX - 0.65, 0.08, 0);
    walkwayCurb.receiveShadow = true;
    group.add(walkwayCurb);

    [-4.5, 3.0].forEach((pz) => {
      const pot = createSchoolPottedPlant(this.propMats);
      pot.position.set(buildingX - 0.7, 0.16, pz);
      group.add(pot);
    });

    const trashBin = createSchoolTrashBin(this.propMats);
    trashBin.position.set(buildingX - 0.85, 0, -0.5);
    group.add(trashBin);

    // Plang Biru Resmi SMAN 1 PASIR SAKTI pada segmen pembuka halaman
    if (index % 4 === 0) {
      const landmarkGroup = new THREE.Group();
      landmarkGroup.position.set(-halfW - 2.8, 0, 4.0);
      landmarkGroup.rotation.y = 0.35;

      const signPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.4, 6), this.whiteFrameMat);
      signPostL.position.set(0, 1.2, -1.1);
      const signPostR = signPostL.clone();
      signPostR.position.z = 1.1;

      const landmarkBoard = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.25, 2.5),
        [
          this.schoolLandmarkMat,
          this.schoolLandmarkMat,
          this.whiteFrameMat,
          this.whiteFrameMat,
          this.whiteFrameMat,
          this.whiteFrameMat
        ]
      );
      landmarkBoard.position.set(0, 2.05, 0);
      landmarkGroup.add(signPostL, signPostR, landmarkBoard);
      group.add(landmarkGroup);
    }
  }

  // =========================================================================
  // AREA 2 — PARKIRAN MOTOR BERATAP BAJA RINGAN (Sesuai Foto 2)
  // STRUKTUR TERBUKA RANGKA BAJA RINGAN 3D, ATAP METAL HORIZONTAL TANPA BUG,
  // LANTAI BETON HALUS, DERETAN SEPEDA MOTOR DI KANAN, SISI TERBUKA MATAHARI & POHON!
  // =========================================================================
  buildSteelParkingZone(group, halfW, index) {
    const lotWidth = CORRIDOR_WIDTH + 5.2;

    // 1. Lantai Beton Halus Parkiran (Halus, tanpa nat ubin, sedikit sheen alami)
    const concreteFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(lotWidth, SEGMENT_LENGTH),
      this.concreteFloorMat
    );
    concreteFloor.rotation.x = -Math.PI / 2;
    concreteFloor.receiveShadow = true;
    group.add(concreteFloor);

    // 2. Modul Struktur Rangka Baja Ringan Terbuka 3D Aktual (Tinggi Bersih ~5.15m)
    // Kuda-kuda segitiga, balok utama, balok melintang, penguat diagonal, dan atap seng metal horizontal sempurna!
    const steelRoofModule = createOpenSteelRoofTrussModule(
      this.propMats,
      CORRIDOR_WIDTH + 1.6,
      SEGMENT_LENGTH,
      5.15,
      6.0
    );
    group.add(steelRoofModule);

    // 3. Marka Parkir Motor & Deretan Sepeda Motor di Sisi Kanan (Sesuai Foto 2)
    const parkingBayX = halfW + 0.85;

    const longWhiteLine = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, SEGMENT_LENGTH - 0.4),
      this.parkingLineMat
    );
    longWhiteLine.rotation.x = -Math.PI / 2;
    longWhiteLine.position.set(halfW - 0.25, 0.008, 0);
    group.add(longWhiteLine);

    // Garis-garis petak miring parkir motor
    for (let pz = -8.2; pz <= 8.2; pz += 2.6) {
      const bayTick = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 0.06),
        this.parkingLineMat
      );
      bayTick.rotation.x = -Math.PI / 2;
      bayTick.rotation.z = -0.42;
      bayTick.position.set(parkingBayX, 0.008, pz);
      group.add(bayTick);
    }

    // Deretan Sepeda Motor Proporsional Parkir Rapi (Sesuai Foto 2)
    const bikeSlotsZ = [-7.6, -5.0, -2.4, 0.2, 2.8, 5.4, 7.8];
    bikeSlotsZ.forEach((bz, bIdx) => {
      const color = MOTOR_COLORS[(index * 3 + bIdx) % MOTOR_COLORS.length];
      const bike = createRealisticMotorcycle(this.propMats, color, bIdx % 2 === 0);
      bike.position.set(parkingBayX + 0.15, 0, bz);
      bike.rotation.y = -0.58;
      group.add(bike);
      if (bIdx % 2 === 1) this.highDetailProps.push(bike);
    });

    // Lingkungan luar di sekeliling struktur terbuka:
    const outerLawnLeft = new THREE.Mesh(new THREE.PlaneGeometry(18, SEGMENT_LENGTH), this.grassMat);
    outerLawnLeft.rotation.x = -Math.PI / 2;
    outerLawnLeft.position.set(-halfW - 10, -0.02, 0);
    outerLawnLeft.receiveShadow = true;

    const outerLawnRight = new THREE.Mesh(new THREE.PlaneGeometry(18, SEGMENT_LENGTH), this.grassMat);
    outerLawnRight.rotation.x = -Math.PI / 2;
    outerLawnRight.position.set(halfW + 11, -0.02, 0);
    outerLawnRight.receiveShadow = true;

    group.add(outerLawnLeft, outerLawnRight);

    // Pepohonan rindang luar yang bermandikan sinar matahari alami
    [-4.5, 5.0].forEach((tz, idx) => {
      const treeLeft = createTropicalTree(this.propMats, index * 4 + idx, false);
      treeLeft.position.set(-halfW - 5.5, 0, tz);
      group.add(treeLeft);

      const treeRight = createTropicalTree(this.propMats, index * 5 + idx + 2, true);
      treeRight.position.set(halfW + 6.2, 0, tz - 1.5);
      group.add(treeRight);
      this.distantProps.push(treeRight);
    });
  }

  // =========================================================================
  // AREA 3 — KANTIN SEKOLAH (Sesuai Foto 3)
  // Paviliun kantin luas, meja & bangku panjang kayu, etalase makanan kaca,
  // toples es teh & es jeruk, gerbang plang KANTIN SEKOLAH & SMAN 1 PASIR SAKTI!
  // =========================================================================
  buildCanteenZone(group, halfW, index) {
    const canteenWidth = CORRIDOR_WIDTH + 6.8;

    // 1. Lantai Keramik Kantin Sekolah
    const mainFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(canteenWidth, SEGMENT_LENGTH),
      this.ceramicFloorMat
    );
    mainFloor.rotation.x = -Math.PI / 2;
    mainFloor.position.x = 2.4;
    mainFloor.receiveShadow = true;
    group.add(mainFloor);

    // 2. Rangka Atap Kanopi Kantin Terbuka (Tinggi Bersih 4.85m)
    const roofBeamH = 4.85;

    [-6.5, 0, 6.5].forEach((cz) => {
      [-halfW + 0.15, halfW + 5.5].forEach((cx) => {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.24, roofBeamH, 0.24), this.wallGreenUpperMat);
        col.position.set(cx, roofBeamH * 0.5, cz);
        col.castShadow = true;
        group.add(col);
      });

      const beam = new THREE.Mesh(new THREE.BoxGeometry(canteenWidth + 0.4, 0.28, 0.24), this.wallGreenUpperMat);
      beam.position.set(2.4, roofBeamH, cz);
      group.add(beam);
    });

    const canteenRoof = new THREE.Mesh(
      new THREE.BoxGeometry(canteenWidth + 0.8, 0.08, SEGMENT_LENGTH),
      this.corrugatedRoofMat
    );
    canteenRoof.position.set(2.4, roofBeamH + 0.25, 0);
    canteenRoof.rotation.z = -0.04;
    canteenRoof.castShadow = true;
    group.add(canteenRoof);

    // 3. Gerbang Balok "KANTIN SEKOLAH" + Plang Gantung "SMAN 1 PASIR SAKTI" di Bawahnya (Foto 3)
    if (index % 2 === 1) {
      const archBeam = new THREE.Mesh(
        new THREE.BoxGeometry(CORRIDOR_WIDTH, 0.48, 0.28),
        this.wallGreenUpperMat
      );
      archBeam.position.set(0, roofBeamH - 0.24, 8.5);

      const frameMat = this.propMats.ironFrame;

      const canteenSign = new THREE.Mesh(
        new THREE.BoxGeometry(3.55, 0.58, 0.08),
        [frameMat, frameMat, frameMat, frameMat, this.canteenTopSignMat, this.canteenTopSignMat]
      );
      canteenSign.position.set(0, roofBeamH - 0.36, 8.72);

      const subPlang = new THREE.Mesh(
        new THREE.BoxGeometry(3.15, 0.46, 0.07),
        [frameMat, frameMat, frameMat, frameMat, this.canteenSchoolSubPlangMat, this.canteenSchoolSubPlangMat]
      );
      subPlang.position.set(0, roofBeamH - 0.94, 8.72);

      [-1.1, 1.1].forEach((hx) => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6), frameMat);
        rod.position.set(hx, roofBeamH - 0.68, 8.72);
        group.add(rod);
      });

      group.add(archBeam, canteenSign, subPlang);
    }

    // 4. Kios Pelayanan Makanan di Sisi Kanan (Meja Counter, Etalase Kaca, Dispenser Es)
    [-4.8, 4.8].forEach((sz) => {
      const counter = createCanteenStallCounter(this.propMats);
      counter.position.set(halfW + 4.5, 0, sz);
      group.add(counter);
      this.highDetailProps.push(counter);
    });

    // 5. Deretan Meja & Bangku Makan Kantin di Sisi Kiri & Tepi Luar (Foto 3)
    [-6.2, -1.8, 2.6, 6.8].forEach((tz, idx) => {
      const tableSet = createCanteenTableSet(this.propMats);
      tableSet.position.set(halfW + 1.85 + (idx % 2) * 0.45, 0, tz);
      group.add(tableSet);
    });

    const sideBench = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 2.4), this.propMats.woodLight);
    sideBench.position.set(-halfW + 0.35, 0.23, 2.5);
    sideBench.castShadow = true;
    group.add(sideBench);

    const canteenTrash = createSchoolTrashBin(this.propMats);
    canteenTrash.position.set(-halfW + 0.45, 0, -3.5);
    group.add(canteenTrash);
  }

  // =========================================================================
  // AREA 4 — KORIDOR BELAKANG KELAS (Foto 4 & Permintaan Pengguna: 11 A1, 11 A2, 11 A3)
  // Dinding hijau tua & krem, lantai keramik putih, tiang kolonade, plafon lampu neon,
  // pintu kelas kayu jati, jendela berjeruji, plang kelas 11 A1, 11 A2, 11 A3, 11 A4, mading!
  // =========================================================================
  buildClassroomCorridorZone(group, halfW, index) {
    const CEIL_H = 4.45;

    // 1. Lantai Keramik Putih Mengkilap Bersih
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(CORRIDOR_WIDTH, SEGMENT_LENGTH),
      this.ceramicFloorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // 2. Plafon Kotak-Kotak Gypsum Sekolah + Balok Melintang Hijau + Lampu Neon
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(CORRIDOR_WIDTH + 0.8, SEGMENT_LENGTH),
      this.ceilingGridMat
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(-0.2, CEIL_H, 0);
    group.add(ceiling);

    // Atap Genteng Merah Bata di Atas Plafon
    const roofSlope = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_WIDTH + 1.6, 0.14, SEGMENT_LENGTH),
      this.roofTileMat
    );
    roofSlope.position.set(-0.25, CEIL_H + 0.65, 0);
    roofSlope.rotation.z = 0.16;
    roofSlope.castShadow = true;
    group.add(roofSlope);

    // Balok Lisplank Hijau Memanjang di Sisi Kiri
    const leftHeaderBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.48, SEGMENT_LENGTH),
      this.wallGreenUpperMat
    );
    leftHeaderBeam.position.set(-halfW + 0.12, CEIL_H - 0.24, 0);
    leftHeaderBeam.castShadow = true;
    group.add(leftHeaderBeam);

    // 3. Dinding Kelas Kanan (Bawah Krem, Atas Hijau Sekolah, Plinth Bawah)
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.15, SEGMENT_LENGTH),
      this.plinthDarkMat
    );
    plinth.position.set(halfW, 0.075, 0);

    const lowerCreamWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 1.45, SEGMENT_LENGTH),
      this.wallCreamLowerMat
    );
    lowerCreamWall.position.set(halfW, 0.15 + 0.725, 0);
    lowerCreamWall.receiveShadow = true;

    const midTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.27, 0.08, SEGMENT_LENGTH),
      this.wallGreenUpperMat
    );
    midTrim.position.set(halfW, 1.64, 0);

    const upperGreenWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, CEIL_H - 1.68, SEGMENT_LENGTH),
      this.wallGreenUpperMat
    );
    upperGreenWall.position.set(halfW, 1.68 + (CEIL_H - 1.68) * 0.5, 0);
    upperGreenWall.receiveShadow = true;

    group.add(plinth, lowerCreamWall, midTrim, upperGreenWall);

    // 4. Kolonade Tiang Penyangga di Selasar Kiri (Jarak Konsisten 5 Meter)
    const columnZPositions = [-7.5, -2.5, 2.5, 7.5];
    columnZPositions.forEach((cz) => {
      const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.44), this.plinthDarkMat);
      colBase.position.set(-halfW + 0.12, 0.14, cz);
      colBase.castShadow = true;

      const colShaft = new THREE.Mesh(new THREE.BoxGeometry(0.36, 2.9, 0.36), this.wallCreamLowerMat);
      colShaft.position.set(-halfW + 0.12, 0.28 + 1.45, cz);
      colShaft.castShadow = true;

      const colCapital = new THREE.Mesh(new THREE.BoxGeometry(0.42, CEIL_H - 3.18, 0.42), this.wallGreenUpperMat);
      colCapital.position.set(-halfW + 0.12, 3.18 + (CEIL_H - 3.18) * 0.5, cz);
      colCapital.castShadow = true;

      // Balok Plafon Melintang
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(CORRIDOR_WIDTH, 0.28, 0.32), this.wallGreenUpperMat);
      crossBeam.position.set(0, CEIL_H - 0.14, cz);

      // Lampu Neon TL di Plafon
      const tubeLamp = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.14), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
      tubeLamp.position.set(0, CEIL_H - 0.03, cz + 2.5);

      group.add(colBase, colShaft, colCapital, crossBeam, tubeLamp);
    });

    // Pagar Tembok Rendah & Railing Besi di Sisi Kiri Terbuka Menghadap Halaman
    [-5.0, 0.0, 5.0].forEach((rz) => {
      const lowWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 4.6), this.wallCreamLowerMat);
      lowWall.position.set(-halfW + 0.12, 0.36, rz);
      lowWall.castShadow = true;

      const railBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.6, 6), this.propMats.ironFrame);
      railBar.rotation.x = Math.PI / 2;
      railBar.position.set(-halfW + 0.12, 0.95, rz);

      group.add(lowWall, railBar);
    });

    // 5. Pintu-Pintu Kelas dengan PLANG NAMA KELAS 11 A1, 11 A2, 11 A3, 11 A4!
    const corrSegmentIndex = Math.max(0, index - 6);
    const signIndex1 = (corrSegmentIndex * 2) % CLASS_NAMES.length;
    const signIndex2 = (corrSegmentIndex * 2 + 1) % CLASS_NAMES.length;

    const signMeshes = [];

    const createClassroomBay = (doorZ, winZ, signIdx) => {
      // Kusen & Daun Pintu Kelas
      const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.42, 1.28), this.whiteFrameMat);
      doorFrame.position.set(halfW - 0.08, 1.21, doorZ);

      const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.32, 1.15), this.propMats.woodDark);
      doorLeaf.position.set(halfW - 0.08, 1.16, doorZ);

      // Kaca Intip Pintu
      const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.42), this.windowGlassMat);
      doorGlass.position.set(halfW - 0.08, 1.55, doorZ);

      // Gagang Pintu Logam
      const doorHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), this.propMats.chrome);
      doorHandle.position.set(halfW - 0.14, 1.05, doorZ - 0.42);

      // Keset Hitam di Depan Pintu Kelas
      const mat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.02, 0.95), this.plinthDarkMat);
      mat.position.set(halfW - 0.45, 0.01, doorZ);

      // Ventilasi Jalusi di Atas Pintu
      const doorVent = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 1.28), this.propMats.woodLight);
      doorVent.position.set(halfW - 0.08, 2.65, doorZ);

      // PLANG NAMA KELAS BOLD (11 A1, 11 A2, 11 A3, 11 A4)
      const signMat = this.classSignMaterials[signIdx];
      const classSignBoard = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.46, 1.22),
        [this.plinthDarkMat, this.plinthDarkMat, this.plinthDarkMat, this.plinthDarkMat, signMat, signMat]
      );
      classSignBoard.position.set(halfW - 0.15, 3.02, doorZ);
      classSignBoard.castShadow = true;
      signMeshes.push(classSignBoard);

      // Jendela-Jendela Kelas Berjeruji di Sebelah Pintu
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.75, 2.6), this.whiteFrameMat);
      winFrame.position.set(halfW - 0.08, 1.82, winZ);

      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.32, 2.4), this.windowGlassMat);
      winGlass.position.set(halfW - 0.08, 1.68, winZ);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.36, 0.06), this.whiteFrameMat);
      bar.position.set(halfW - 0.08, 1.68, winZ);

      const winVent = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.26, 2.4), this.propMats.woodLight);
      winVent.position.set(halfW - 0.08, 2.54, winZ);

      group.add(doorFrame, doorLeaf, doorGlass, doorHandle, mat, doorVent, classSignBoard, winFrame, winGlass, bar, winVent);
    };

    // Kelas Pertama di Sisi Belakang Segmen (cth: 11 A1 pada Segmen 6, 11 A3 pada Segmen 7)
    createClassroomBay(-6.2, -2.8, signIndex1);

    // Papan Mading Informasi Sekolah di Tengah Antar-Kelas
    const mading = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 2.0), this.madingBoardMat);
    mading.position.set(halfW - 0.08, 2.05, 0.0);
    group.add(mading);

    // Kelas Kedua di Sisi Depan Segmen (cth: 11 A2 pada Segmen 6, 11 A4 pada Segmen 7)
    createClassroomBay(2.8, 6.2, signIndex2);

    // Pot Bunga di Sudut Koridor Kelas
    const pot1 = createSchoolPottedPlant(this.propMats);
    pot1.position.set(halfW - 0.42, 0, -8.6);
    const pot2 = createSchoolPottedPlant(this.propMats);
    pot2.position.set(halfW - 0.42, 0, 8.6);
    group.add(pot1, pot2);

    // Halaman Luar di Sebelah Kiri Koridor (Rumput Hijau & Pohon Peneduh)
    const lawnLeft = new THREE.Mesh(new THREE.PlaneGeometry(18, SEGMENT_LENGTH), this.grassMat);
    lawnLeft.rotation.x = -Math.PI / 2;
    lawnLeft.position.set(-halfW - 9, -0.02, 0);
    lawnLeft.receiveShadow = true;
    group.add(lawnLeft);

    const tree = createTropicalTree(this.propMats, index * 3 + 1, false);
    tree.position.set(-halfW - 4.5, 0, 0);
    group.add(tree);

    return signMeshes;
  }

  // Mendapatkan tipe zona yang sedang ditempati pemain pada koordinat Z dunia
  getZoneAtZ(z = 0) {
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const segZ = seg.group.position.z;
      if (z <= segZ + SEGMENT_LENGTH * 0.5 && z > segZ - SEGMENT_LENGTH * 0.5) {
        return seg.zoneType;
      }
    }
    return 'COURTYARD';
  }

  applyQualityPreset(quality) {
    const showSecondary = quality !== 'low';
    const showDistant = quality === 'medium' || quality === 'high' || quality === 'ultra';
    this.highDetailProps.forEach((obj) => {
      obj.visible = showSecondary;
    });
    this.distantProps.forEach((obj) => {
      obj.visible = showDistant;
    });
  }

  reset() {
    this.classCounter = 3;
    for (let i = 0; i < this.segments.length; i++) {
      this.segments[i].group.position.z = -i * SEGMENT_LENGTH;
    }
  }

  update(dt, speed) {
    const moveZ = speed * dt;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      seg.group.position.z += moveZ;

      if (seg.group.position.z > SEGMENT_LENGTH) {
        let minZ = Infinity;
        for (let j = 0; j < this.segments.length; j++) {
          if (this.segments[j].group.position.z < minZ) {
            minZ = this.segments[j].group.position.z;
          }
        }
        seg.group.position.z = minZ - SEGMENT_LENGTH;

        // Perbarui plang nama kelas jika berada di zona koridor kelas
        if (seg.signMeshes && seg.signMeshes.length > 0) {
          seg.signMeshes.forEach((mesh) => {
            this.classCounter++;
            const newMat = this.classSignMaterials[this.classCounter % this.classSignMaterials.length];
            mesh.material = [
              this.plinthDarkMat,
              this.plinthDarkMat,
              this.plinthDarkMat,
              this.plinthDarkMat,
              newMat,
              newMat
            ];
          });
        }
      }
    }
  }
}
