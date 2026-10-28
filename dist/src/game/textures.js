import * as THREE from 'three';

// Generator Tekstur PBR Prosedural Resolusi Tinggi (Albedo sRGB, Normal Map, Roughness Map, dan Environment Map)
// Dirancang agar tajam dengan mipmapping & anisotropy tanpa ketergantungan file eksternal yang berisiko gagal muat.

function configureTexture(canvas, { srgb = true, repeatX = 1, repeatY = 1, anisotropy = 4 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

// Konversi heightmap 2D (grayscale canvas) menjadi Normal Map RGB
function heightCanvasToNormalCanvas(heightCanvas, strength = 2.0) {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d');
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d');
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sample = (x, y) => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hL = sample(x - 1, y);
      const hR = sample(x + 1, y);
      const hU = sample(x, y - 1);
      const hD = sample(x, y + 1);

      const dx = (hL - hR) * strength;
      const dy = (hU - hD) * strength;
      const dz = 1.0;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

export class TextureLibrary {
  constructor(renderer, maxAnisotropy = 4) {
    this.renderer = renderer;
    this.anisotropy = maxAnisotropy;
    this.cache = {};
  }

  setAnisotropy(aniso) {
    this.anisotropy = aniso;
    Object.values(this.cache).forEach((entry) => {
      if (entry && entry.isTexture) {
        entry.anisotropy = aniso;
        entry.needsUpdate = true;
      } else if (entry && typeof entry === 'object') {
        Object.values(entry).forEach((sub) => {
          if (sub && sub.isTexture) {
            sub.anisotropy = aniso;
            sub.needsUpdate = true;
          }
        });
      }
    });
  }

  // 1. Environment Map Siang Hari Tropis SMA Negeri 1 Pasir Sakti
  getDaylightEnvMap() {
    if (this.cache.envMap) return this.cache.envMap;
    if (!this.renderer) return null;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();

    // Kubah langit siang cerah tropis
    const skyGeo = new THREE.SphereGeometry(40, 24, 16);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 128;
    skyCanvas.height = 128;
    const sctx = skyCanvas.getContext('2d');
    const grad = sctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0.0, '#2563eb'); // Zenith biru bersih
    grad.addColorStop(0.45, '#93c5fd'); // Langit siang terang
    grad.addColorStop(0.52, '#fef9c3'); // Horizon matahari hangat
    grad.addColorStop(0.6, '#4d7c5b'); // Pantulan pepohonan taman sekolah
    grad.addColorStop(1.0, '#d6d3cb'); // Pantulan lantai keramik hangat
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 128, 128);

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    envScene.add(new THREE.Mesh(skyGeo, skyMat));

    // Titik matahari terang untuk highlight spekular lembut pada keramik, kaca & motor
    const sunBulb = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfffbeb })
    );
    sunBulb.position.set(-18, 22, 12);
    envScene.add(sunBulb);

    const envRT = pmrem.fromScene(envScene, 0.035);
    this.cache.envMap = envRT.texture;
    pmrem.dispose();
    skyGeo.dispose();
    skyMat.dispose();
    skyTex.dispose();

    return this.cache.envMap;
  }

  // 2. Tekstur PBR Seragam Siswa SMA Abu-Abu Putih (Kemeja Putih dengan Emblem OSIS & Lipatan Kain Alami)
  getStudentShirtSet() {
    if (this.cache.studentShirt) return this.cache.studentShirt;

    const size = 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');

    // Warna dasar kemeja putih keabu-abuan khas SMA Indonesia
    ctx.fillStyle = '#f4f6fa';
    ctx.fillRect(0, 0, size, size);

    // Serat tenun katun mikro halus
    for (let y = 0; y < size; y += 2) {
      ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(148,163,184,0.06)';
      ctx.fillRect(0, y, size, 1);
    }
    for (let x = 0; x < size; x += 2) {
      ctx.fillStyle = x % 4 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.05)';
      ctx.fillRect(x, 0, 1, size);
    }

    // Garis placket kancing depan vertikal di tengah kemeja
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(size * 0.465, 0, size * 0.07, size);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(size * 0.465, 0, size * 0.07, size);

    // Kancing-kancing kemeja putih berdimensi
    for (let by = 60; by < size - 40; by += 85) {
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(size * 0.5, by + 1.2, 5.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(size * 0.5, by, 4.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(size * 0.5 - 1.2, by, 1.2, 0, Math.PI * 2);
      ctx.arc(size * 0.5 + 1.2, by, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Saku dada kiri kemeja
    const pX = size * 0.22;
    const pY = size * 0.28;
    const pW = size * 0.16;
    const pH = size * 0.2;
    ctx.fillStyle = 'rgba(226,232,240,0.5)';
    ctx.fillRect(pX, pY, pW, pH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(pX, pY, pW, pH);

    // Emblem Lencana OSIS SMA (Kuning Emas & Cokelat Khas Seragam SMA Indonesia)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(pX + pW * 0.5, pY + 12);
    ctx.lineTo(pX + pW - 8, pY + 22);
    ctx.lineTo(pX + pW - 12, pY + pH - 16);
    ctx.lineTo(pX + pW * 0.5, pY + pH - 8);
    ctx.lineTo(pX + 12, pY + pH - 16);
    ctx.lineTo(pX + 8, pY + 22);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(pX + pW * 0.5, pY + pH * 0.5, 9, 0, Math.PI * 2);
    ctx.fill();

    // Shading lipatan kain alami pada dada & pinggang
    for (let i = 0; i < 5; i++) {
      const fy = 80 + i * 85;
      const fg = ctx.createLinearGradient(0, fy - 18, 0, fy + 18);
      fg.addColorStop(0, 'rgba(203,213,225,0)');
      fg.addColorStop(0.5, 'rgba(148,163,184,0.18)');
      fg.addColorStop(1, 'rgba(203,213,225,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, fy - 18, size, 36);
    }

    // Normal Map dari heightmap lipatan
    const hc = document.createElement('canvas');
    hc.width = 256;
    hc.height = 256;
    const hctx = hc.getContext('2d');
    hctx.fillStyle = '#808080';
    hctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 5; i++) {
      const fy = 40 + i * 44;
      const g = hctx.createLinearGradient(0, fy - 12, 0, fy + 12);
      g.addColorStop(0, '#808080');
      g.addColorStop(0.5, '#a4a4a4');
      g.addColorStop(1, '#808080');
      hctx.fillStyle = g;
      hctx.fillRect(0, fy - 12, 256, 24);
    }

    const normCanvas = heightCanvasToNormalCanvas(hc, 1.4);

    this.cache.studentShirt = {
      map: configureTexture(c, { srgb: true, repeatX: 1, repeatY: 1, anisotropy: this.anisotropy }),
      normalMap: configureTexture(normCanvas, {
        srgb: false,
        repeatX: 1,
        repeatY: 1,
        anisotropy: this.anisotropy
      })
    };
    return this.cache.studentShirt;
  }

  // Fallback Batik
  getBatikMaroonSet() {
    return this.getStudentShirtSet();
  }

  // 3. Tekstur PBR Kemeja Putih Polos Guru (Pak Wahid) dengan Lipatan Kain
  getWhiteShirtSet() {
    if (this.cache.whiteShirt) return this.cache.whiteShirt;

    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(0, 0, 256, 256);

    // Shading halus lipatan kemeja putih agar berdimensi di siang hari
    for (let i = 0; i < 5; i++) {
      const y = 36 + i * 44;
      const g = ctx.createLinearGradient(0, y - 16, 0, y + 16);
      g.addColorStop(0, 'rgba(203,213,225,0)');
      g.addColorStop(0.5, 'rgba(148,163,184,0.18)');
      g.addColorStop(1, 'rgba(203,213,225,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 16, 256, 32);
    }

    const hc = document.createElement('canvas');
    hc.width = 256;
    hc.height = 256;
    const hctx = hc.getContext('2d');
    hctx.fillStyle = '#808080';
    hctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6; i++) {
      const y = 24 + i * 40;
      const g = hctx.createLinearGradient(0, y - 14, 0, y + 14);
      g.addColorStop(0, '#808080');
      g.addColorStop(0.5, '#a2a2a2');
      g.addColorStop(1, '#808080');
      hctx.fillStyle = g;
      hctx.fillRect(0, y - 14, 256, 28);
    }
    const normCanvas = heightCanvasToNormalCanvas(hc, 1.35);

    this.cache.whiteShirt = {
      map: configureTexture(c, { srgb: true, repeatX: 1, repeatY: 1, anisotropy: this.anisotropy }),
      normalMap: configureTexture(normCanvas, {
        srgb: false,
        repeatX: 1,
        repeatY: 1,
        anisotropy: this.anisotropy
      })
    };
    return this.cache.whiteShirt;
  }

  // 4. Tekstur PBR Celana Kain (SMA Abu-Biru & Guru Gelap)
  getTrouserFabricSet(hexColor = '#5b6b82') {
    const key = `trouser_${hexColor}`;
    if (this.cache[key]) return this.cache[key];

    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = hexColor;
    ctx.fillRect(0, 0, 256, 256);

    // Pola diagonal kain twill/drill seragam sekolah
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = -256; i < 512; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 256, 256);
      ctx.stroke();
    }

    // Lipatan lutut & paha
    const foldGrad = ctx.createLinearGradient(0, 100, 0, 156);
    foldGrad.addColorStop(0, 'rgba(0,0,0,0)');
    foldGrad.addColorStop(0.5, 'rgba(0,0,0,0.16)');
    foldGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = foldGrad;
    ctx.fillRect(0, 100, 256, 56);

    this.cache[key] = {
      map: configureTexture(c, { srgb: true, repeatX: 1, repeatY: 1, anisotropy: this.anisotropy })
    };
    return this.cache[key];
  }

  // 5. Tekstur PBR Lantai Keramik Putih Sekolah (40x40cm Realistis + Nat Tipis + Roughness/Normal)
  getCeramicFloorSet() {
    if (this.cache.ceramic) return this.cache.ceramic;

    const size = 512;
    const tiles = 4; // 4x4 ubin per repeat
    const step = size / tiles;

    const albedo = document.createElement('canvas');
    albedo.width = size;
    albedo.height = size;
    const actx = albedo.getContext('2d');

    const rough = document.createElement('canvas');
    rough.width = size;
    rough.height = size;
    const rctx = rough.getContext('2d');

    const height = document.createElement('canvas');
    height.width = size;
    height.height = size;
    const hctx = height.getContext('2d');

    // Warna dasar nat semen tipis (tidak hitam pekat agar tampak alami)
    actx.fillStyle = '#c4bfb6';
    actx.fillRect(0, 0, size, size);

    // Nat kasar (roughness tinggi = 230/255) & cekung (height rendah = 55)
    rctx.fillStyle = '#e6e6e6';
    rctx.fillRect(0, 0, size, size);

    hctx.fillStyle = '#383838';
    hctx.fillRect(0, 0, size, size);

    // Gambar tiap ubin keramik dengan sedikit variasi rona alami
    let seed = 17;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const groutHalf = 1.5; // Sambungan nat tipis ~3px pada 512x512
    for (let ty = 0; ty < tiles; ty++) {
      for (let tx = 0; tx < tiles; tx++) {
        const x0 = tx * step + groutHalf;
        const y0 = ty * step + groutHalf;
        const w = step - groutHalf * 2;
        const h = step - groutHalf * 2;

        // Variasi halus warna keramik putih-gading sekolah
        const baseL = 235 + Math.floor((rand() - 0.5) * 7);
        actx.fillStyle = `rgb(${baseL}, ${baseL - 2}, ${baseL - 6})`;
        actx.fillRect(x0, y0, w, h);

        // Serat marmer/keramik sangat lembut agar tidak terlihat plastik polos
        const veinGrad = actx.createLinearGradient(x0, y0, x0 + w, y0 + h);
        veinGrad.addColorStop(0, 'rgba(255,255,255,0.14)');
        veinGrad.addColorStop(0.5, 'rgba(205,198,186,0.12)');
        veinGrad.addColorStop(1, 'rgba(255,255,255,0.08)');
        actx.fillStyle = veinGrad;
        actx.fillRect(x0, y0, w, h);

        // Roughness keramik (~0.24 - 0.30 -> nilai 62-76) untuk pantulan cahaya lembut
        const rVal = 64 + Math.floor(rand() * 14);
        rctx.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
        rctx.fillRect(x0, y0, w, h);

        // Heightmap ubin (permukaan rata dengan sedikit bevel tepi)
        hctx.fillStyle = '#b8b8b8';
        hctx.fillRect(x0, y0, w, h);
        hctx.fillStyle = '#e0e0e0';
        hctx.fillRect(x0 + 2, y0 + 2, w - 4, h - 4);
      }
    }

    const normalCanvas = heightCanvasToNormalCanvas(height, 2.2);

    // Lebar koridor ~7.6m, panjang segmen 20m -> 1 repeat = 1.8m (4 ubin @ 45cm)
    const repX = 4.2;
    const repY = 11.0;

    this.cache.ceramic = {
      map: configureTexture(albedo, {
        srgb: true,
        repeatX: repX,
        repeatY: repY,
        anisotropy: this.anisotropy
      }),
      roughnessMap: configureTexture(rough, {
        srgb: false,
        repeatX: repX,
        repeatY: repY,
        anisotropy: this.anisotropy
      }),
      normalMap: configureTexture(normalCanvas, {
        srgb: false,
        repeatX: repX,
        repeatY: repY,
        anisotropy: this.anisotropy
      })
    };
    return this.cache.ceramic;
  }

  // 6. Tekstur PBR Paving Block Halaman Sekolah (Area A - Interlocking Paving Abu-abu sesuai Foto 1)
  getCourtyardPavingSet() {
    if (this.cache.courtyardPaving) return this.cache.courtyardPaving;

    const size = 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');

    const hc = document.createElement('canvas');
    hc.width = size;
    hc.height = size;
    const hctx = hc.getContext('2d');

    // Dasar pasir sambungan antar-paving
    ctx.fillStyle = '#474b52';
    ctx.fillRect(0, 0, size, size);
    hctx.fillStyle = '#222222';
    hctx.fillRect(0, 0, size, size);

    const rows = 12;
    const cols = 6;
    const rw = size / cols;
    const rh = size / rows;

    let s = 59;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (rw * 0.5);
      for (let col = -1; col <= cols + 1; col++) {
        const x = col * rw + offset + 2;
        const y = r * rh + 2;
        const w = rw - 4;
        const h = rh - 4;

        // Variasi abu-abu batu paving alami sesuai foto halaman
        const tone = 152 + Math.floor((rand() - 0.5) * 32);
        ctx.fillStyle = `rgb(${tone}, ${tone - 2}, ${tone - 5})`;
        ctx.fillRect(x, y, w, h);

        // Bintik agregat pasir halus
        for (let p = 0; p < 8; p++) {
          const px = x + rand() * w;
          const py = y + rand() * h;
          ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
          ctx.fillRect(px, py, 1.5, 1.5);
        }

        // Heightmap beveled edge untuk normal map tajam
        hctx.fillStyle = '#b0b0b0';
        hctx.fillRect(x, y, w, h);
        hctx.fillStyle = '#e4e4e4';
        hctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      }
    }

    const norm = heightCanvasToNormalCanvas(hc, 2.4);
    this.cache.courtyardPaving = {
      map: configureTexture(c, { srgb: true, repeatX: 6, repeatY: 12, anisotropy: this.anisotropy }),
      normalMap: configureTexture(norm, {
        srgb: false,
        repeatX: 6,
        repeatY: 12,
        anisotropy: this.anisotropy
      })
    };
    return this.cache.courtyardPaving;
  }

  // 6b. Tekstur PBR Lantai Beton Halus Parkiran Motor (Area B - Sesuai Foto 2 Lantai Parkir Terbuka)
  getConcreteFloorSet() {
    if (this.cache.concreteFloor) return this.cache.concreteFloor;

    const size = 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');

    const hc = document.createElement('canvas');
    hc.width = size;
    hc.height = size;
    const hctx = hc.getContext('2d');

    // Warna semen beton parkiran abu-abu terang
    ctx.fillStyle = '#9aa1a9';
    ctx.fillRect(0, 0, size, size);
    hctx.fillStyle = '#808080';
    hctx.fillRect(0, 0, size, size);

    // Variasi bercak trowel finishing semen
    let s = 103;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    for (let i = 0; i < 300; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 12 + rand() * 45;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Garis nat ekspansi beton per 4 meter
    ctx.strokeStyle = '#52575e';
    ctx.lineWidth = 2.5;
    hctx.strokeStyle = '#282828';
    hctx.lineWidth = 3;

    [128, 256, 384].forEach((pos) => {
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();

      hctx.beginPath();
      hctx.moveTo(pos, 0);
      hctx.lineTo(pos, size);
      hctx.stroke();
    });

    [256].forEach((pos) => {
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();

      hctx.beginPath();
      hctx.moveTo(0, pos);
      hctx.lineTo(size, pos);
      hctx.stroke();
    });

    const norm = heightCanvasToNormalCanvas(hc, 1.2);
    this.cache.concreteFloor = {
      map: configureTexture(c, { srgb: true, repeatX: 3, repeatY: 6, anisotropy: this.anisotropy }),
      normalMap: configureTexture(norm, {
        srgb: false,
        repeatX: 3,
        repeatY: 6,
        anisotropy: this.anisotropy
      })
    };
    return this.cache.concreteFloor;
  }

  // 6c. Tekstur PBR Atap Metal Spandek / Seng Gelombang (Area B & C)
  getCorrugatedRoofSet() {
    if (this.cache.corrugatedRoof) return this.cache.corrugatedRoof;

    const size = 256;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');

    const hc = document.createElement('canvas');
    hc.width = size;
    hc.height = size;
    const hctx = hc.getContext('2d');

    // Gelombang seng metal galvanis
    const ribs = 8;
    const rw = size / ribs;

    for (let i = 0; i < ribs; i++) {
      const x = i * rw;
      const g = ctx.createLinearGradient(x, 0, x + rw, 0);
      g.addColorStop(0.0, '#cbd5e1');
      g.addColorStop(0.3, '#f1f5f9');
      g.addColorStop(0.5, '#e2e8f0');
      g.addColorStop(0.85, '#94a3b8');
      g.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, rw, size);

      const hg = hctx.createLinearGradient(x, 0, x + rw, 0);
      hg.addColorStop(0.0, '#404040');
      hg.addColorStop(0.5, '#e8e8e8');
      hg.addColorStop(1.0, '#404040');
      hctx.fillStyle = hg;
      hctx.fillRect(x, 0, rw, size);
    }

    const norm = heightCanvasToNormalCanvas(hc, 2.5);
    this.cache.corrugatedRoof = {
      map: configureTexture(c, { srgb: true, repeatX: 12, repeatY: 10, anisotropy: this.anisotropy }),
      normalMap: configureTexture(norm, {
        srgb: false,
        repeatX: 12,
        repeatY: 10,
        anisotropy: this.anisotropy
      })
    };
    return this.cache.corrugatedRoof;
  }

  // 6d. Tekstur Baja Ringan Galvanis (Truss & Tiang Baja)
  getGalvanizedSteelTexture() {
    if (this.cache.galvSteel) return this.cache.galvSteel;

    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b6c2ce';
    ctx.fillRect(0, 0, size, size);

    // Pola kristal zinc spangles baja ringan
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(100,116,139,0.14)';
      ctx.beginPath();
      ctx.arc(x, y, 4 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    this.cache.galvSteel = configureTexture(c, { srgb: true, repeatX: 2, repeatY: 2, anisotropy: this.anisotropy });
    return this.cache.galvSteel;
  }

  // 6e. Tekstur Genteng Merah Bata Sekolah (Atap Gedung Area A Sesuai Foto 1)
  getTerracottaTileSet() {
    if (this.cache.terracottaTiles) return this.cache.terracottaTiles;

    const size = 256;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#993517';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 32) {
      const g = ctx.createLinearGradient(0, y, 0, y + 32);
      g.addColorStop(0, '#c2410c');
      g.addColorStop(0.7, '#9a3412');
      g.addColorStop(1, '#431407');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, size, 32);
    }

    this.cache.terracottaTiles = configureTexture(c, { srgb: true, repeatX: 4, repeatY: 6, anisotropy: this.anisotropy });
    return this.cache.terracottaTiles;
  }

  // Fallback Paving Lama
  getParkingFloorSet() {
    return this.getCourtyardPavingSet();
  }

  // 7. Tekstur PBR Dinding Plester Cat Sekolah (Dengan Ketidaksempurnaan Alami & AO Pertemuan Lantai)
  getPlasterWallTexture(baseHex, bottomAO = false) {
    const key = `wall_${baseHex}_${bottomAO}`;
    if (this.cache[key]) return this.cache[key];

    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);

    // Variasi bercak halus cat tembok sekolah alami
    let s = 99;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    for (let i = 0; i < 220; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const r = 6 + rand() * 22;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ambient Occlusion & sedikit noda kelembapan tipis pada pertemuan bawah dinding-lantai
    if (bottomAO) {
      const aoGrad = ctx.createLinearGradient(0, 200, 0, 256);
      aoGrad.addColorStop(0, 'rgba(0,0,0,0)');
      aoGrad.addColorStop(0.75, 'rgba(30,25,20,0.12)');
      aoGrad.addColorStop(1, 'rgba(15,12,10,0.32)');
      ctx.fillStyle = aoGrad;
      ctx.fillRect(0, 200, 256, 56);
    }

    const topAO = ctx.createLinearGradient(0, 0, 0, 28);
    topAO.addColorStop(0, 'rgba(0,0,0,0.18)');
    topAO.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topAO;
    ctx.fillRect(0, 0, 256, 28);

    this.cache[key] = configureTexture(c, {
      srgb: true,
      repeatX: bottomAO ? 4 : 2,
      repeatY: 1,
      anisotropy: this.anisotropy
    });
    return this.cache[key];
  }

  getPlasterNormalMap() {
    if (this.cache.plasterNorm) return this.cache.plasterNorm;
    const hc = document.createElement('canvas');
    hc.width = 128;
    hc.height = 128;
    const ctx = hc.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 128, 128);

    let s = 7;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let y = 0; y < 128; y += 2) {
      for (let x = 0; x < 128; x += 2) {
        const v = 116 + Math.floor(rand() * 24);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    const norm = heightCanvasToNormalCanvas(hc, 1.1);
    this.cache.plasterNorm = configureTexture(norm, {
      srgb: false,
      repeatX: 6,
      repeatY: 2,
      anisotropy: this.anisotropy
    });
    return this.cache.plasterNorm;
  }

  // 8. Tekstur Plafon Gypsum Grid Koridor Sekolah
  getCeilingGridTexture() {
    if (this.cache.ceiling) return this.cache.ceiling;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    this.cache.ceiling = configureTexture(c, {
      srgb: true,
      repeatX: 3,
      repeatY: 8,
      anisotropy: this.anisotropy
    });
    return this.cache.ceiling;
  }

  // 9. Tekstur Serat Kayu Alami (Pintu Kelas, Meja Belajar, Meja Kantin)
  getWoodTexture(baseHex = '#7c431e') {
    const key = `wood_${baseHex}`;
    if (this.cache[key]) return this.cache[key];

    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,220,180,0.04)';
      ctx.fillRect(0, y, 256, 2);
    }

    this.cache[key] = configureTexture(c, {
      srgb: true,
      repeatX: 1,
      repeatY: 1,
      anisotropy: this.anisotropy
    });
    return this.cache[key];
  }

  // 10. Bayangan Kontak (Ambient Occlusion Blob) agar objek & kaki selalu menempel ke lantai
  getContactShadowTexture() {
    if (this.cache.contactShadow) return this.cache.contactShadow;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    g.addColorStop(0, 'rgba(15, 23, 42, 0.52)');
    g.addColorStop(0.55, 'rgba(15, 23, 42, 0.22)');
    g.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.contactShadow = tex;
    return tex;
  }

  // 11. Pembuat Papan Nama Kelas, Plang Sekolah & Papan Kantin Tajam Proporsional
  createSignboardTexture({
    title,
    subtitle = '',
    bg = '#111827',
    fg = '#f8fafc',
    border = '#e2e8f0',
    accent = '#fbbf24',
    width = 512,
    height = 192
  }) {
    const key = `sign_${title}_${subtitle}_${bg}_${width}x${height}`;
    if (this.cache[key]) return this.cache[key];

    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(6, Math.round(height * 0.042));
    const pad = Math.round(height * 0.06);
    ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

    const maxTextWidth = width - pad * 5;
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (subtitle) {
      ctx.font = `900 ${Math.round(height * 0.31)}px system-ui, Segoe UI, Arial, sans-serif`;
      ctx.fillText(title, width / 2, height * 0.34, maxTextWidth);

      // Garis pemisah tipis antara judul utama (mis. KANTIN SEKOLAH) dan plang nama sekolah di bawahnya
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = Math.max(2, Math.round(height * 0.015));
      ctx.beginPath();
      ctx.moveTo(width * 0.16, height * 0.55);
      ctx.lineTo(width * 0.84, height * 0.55);
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.font = `800 ${Math.round(height * 0.23)}px system-ui, Segoe UI, Arial, sans-serif`;
      ctx.fillText(subtitle, width / 2, height * 0.74, maxTextWidth);
    } else {
      ctx.font = `800 ${Math.round(height * 0.46)}px system-ui, Segoe UI, Arial, sans-serif`;
      ctx.fillText(title, width / 2, height * 0.52, maxTextWidth);
    }

    const tex = configureTexture(c, { srgb: true, anisotropy: this.anisotropy });
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    this.cache[key] = tex;
    return tex;
  }
}
