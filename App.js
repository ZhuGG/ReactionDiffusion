// --- PARAMÈTRES & DONNÉES ---
const CANVAS_W = 480, CANVAS_H = 315, N = CANVAS_W * CANVAS_H;
let U, V, U2, V2, running = true, animationId = null, fractaleMode = false, fractaleType = "perlin";

let params = {
  feed: 0.037, kill: 0.06, diffU: 0.16, diffV: 0.08, speed: 4, zoom: 160,
  contrast: 1, gain: 1, offset: 0,
  palette: "bw", renderMode: "normal"
};

const PRESETS = {
  tigre:  { feed:0.034, kill:0.056, diffU:0.17, diffV:0.09 },
  léopard:{ feed:0.037, kill:0.063, diffU:0.15, diffV:0.068 },
  corail: { feed:0.055, kill:0.062, diffU:0.16, diffV:0.064 },
  girafe: { feed:0.03,  kill:0.058, diffU:0.21, diffV:0.1 },
  ondes:  { feed:0.025, kill:0.055, diffU:0.19, diffV:0.05 },
  zèbre:  { feed:0.025, kill:0.061, diffU:0.18, diffV:0.07 },
  aléatoire: null
};

// -- Palettes naturelles (de 2 à 4 couleurs selon la sélection) --
const PALETTES = {
  bw:       [[255,255,255],[30,30,30]],
  sable:    [[232,210,151],[193,164,110],[118,92,53],[62,51,34]],
  foret:    [[225,244,214],[98,133,84],[38,59,32],[19,31,20]],
  corail:   [[252,228,211],[220,79,69],[225,180,133],[77,57,43]],
  zebra:    [[255,255,255],[35,35,35],[230,220,172],[119,101,55]],
  marron:   [[237,214,187],[157,111,69],[69,49,35],[40,27,17]],
  feuille:  [[231,246,206],[140,210,126],[56,112,51],[33,58,28]]
};

// -- Rendu des contours --
function edgeDetect(vmap, w, h) {
  const out = new Float32Array(vmap.length);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    let i = x+y*w;
    let dx = (vmap[i-1] - vmap[i+1])/2, dy = (vmap[i-w] - vmap[i+w])/2;
    out[i] = Math.sqrt(dx*dx+dy*dy)*3;
  }
  return out;
}

function heatMap(val) {
  // Viridis/heatmap simple
  let t = Math.max(0, Math.min(1, val));
  let r = Math.floor(255 * Math.sqrt(t));
  let g = Math.floor(200 * t);
  let b = Math.floor(140 * (1-t));
  return [r, g, b];
}

// -- Initialisation du champ --
function initField(seed=true) {
  U = new Float32Array(N).fill(1);
  V = new Float32Array(N).fill(0);
  U2 = new Float32Array(N);
  V2 = new Float32Array(N);

  let s = 36;
  for (let y = CANVAS_H/2-s; y < CANVAS_H/2+s; y++)
    for (let x = CANVAS_W/2-s; x < CANVAS_W/2+s; x++) {
      let i = x + y*CANVAS_W;
      if (i >= 0 && i < N) V[i] = 1.0;
    }
  if(seed){
    for(let i=0;i<300;i++){
      let x = Math.floor(Math.random()*CANVAS_W), y = Math.floor(Math.random()*CANVAS_H);
      V[x+y*CANVAS_W] += Math.random()*0.5;
    }
  }
}

// -- Canvas dynamique/responsive --
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  let w = Math.min(window.innerWidth * 0.97, 900);
  let h = w * CANVAS_H / CANVAS_W;
  if (window.innerHeight < h + 200) h = window.innerHeight - 160, w = h * CANVAS_W / CANVAS_H;
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// -- Laplacien circulaire --
const LAPLACE_KERNEL = [
  [0.05, 0.2, 0.05],
  [0.2, -1, 0.2],
  [0.05, 0.2, 0.05]
];

function laplace(A, x, y) {
  let sum = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      let nx = (x + dx + CANVAS_W) % CANVAS_W;
      let ny = (y + dy + CANVAS_H) % CANVAS_H;
      sum += A[nx + ny*CANVAS_W] * LAPLACE_KERNEL[dy+1][dx+1];
    }
  return sum;
}

// -- Simulation Gray-Scott --
function updateField() {
  for (let y = 0; y < CANVAS_H; y++) {
    for (let x = 0; x < CANVAS_W; x++) {
      let i = x + y*CANVAS_W, u = U[i], v = V[i];
      let du = params.diffU * laplace(U, x, y) - u*v*v + params.feed*(1-u);
      let dv = params.diffV * laplace(V, x, y) + u*v*v - (params.kill+params.feed)*v;
      U2[i] = u + du * 1.3;
      V2[i] = v + dv * 1.3;
    }
  }
  [U, U2] = [U2, U];
  [V, V2] = [V2, V];
}

// -- Rendu principal --
function renderField() {
  let img = ctx.createImageData(CANVAS_W, CANVAS_H);
  let contrast = params.contrast, gain = params.gain, offset = params.offset;
  let palette = PALETTES[params.palette];
  let renderMode = params.renderMode;
  let Vdraw = V;

  // Modes spéciaux
  if (renderMode === "contours") {
    Vdraw = edgeDetect(V, CANVAS_W, CANVAS_H);
  }
  for (let i = 0; i < N; i++) {
    let v = Math.max(0, Math.min(1, Vdraw[i]));
    v = Math.pow(v, gain)*contrast + offset;
    v = Math.max(0, Math.min(1, v));
    let rgb;
    if (renderMode === "heat") rgb = heatMap(v);
    else if (palette.length === 2) { // palette binaire
      rgb = [
        palette[0][0]*v+palette[1][0]*(1-v),
        palette[0][1]*v+palette[1][1]*(1-v),
        palette[0][2]*v+palette[1][2]*(1-v)
      ];
    } else { // interpolation multi
      let idx = v * (palette.length-1);
      let i0 = Math.floor(idx), i1 = Math.min(i0+1, palette.length-1);
      let t = idx-i0;
      rgb = [
        palette[i0][0]*(1-t) + palette[i1][0]*t,
        palette[i0][1]*(1-t) + palette[i1][1]*t,
        palette[i0][2]*(1-t) + palette[i1][2]*t
      ];
    }
    img.data[i*4+0] = Math.floor(rgb[0]);
    img.data[i*4+1] = Math.floor(rgb[1]);
    img.data[i*4+2] = Math.floor(rgb[2]);
    img.data[i*4+3] = 255;
  }
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.putImageData(img, 0, 0);
  if (params.zoom !== 160) {
    let zw = Math.round(CANVAS_W * params.zoom/160);
    let zh = Math.round(CANVAS_H * params.zoom/160);
    ctx.drawImage(canvas, 0, 0, CANVAS_W, CANVAS_H, (canvas.width-zw)/2, (canvas.height-zh)/2, zw, zh);
  }
}

// -- Animation --
function animate() {
  if (!running) return;
  for (let i = 0; i < params.speed; i++) updateField();
  renderField();
  animationId = requestAnimationFrame(animate);
}

// -- Presets UI --
function applyPreset(name) {
  let p = PRESETS
