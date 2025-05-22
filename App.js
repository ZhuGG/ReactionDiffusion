// Réaction-diffusion & fractale - version avancée avec palettes naturelles et interactions

/////////////////////////////
// PARAMÈTRES GLOBAUX
/////////////////////////////

const CANVAS_W = 480, CANVAS_H = 315, N = CANVAS_W * CANVAS_H;
let U, V, U2, V2;
let params = {
  feed: 0.037,
  kill: 0.06,
  diffU: 0.16,
  diffV: 0.08,
  speed: 5,
  zoom: 160
};
let running = true, animationId = null;
let fractaleMode = false, fractaleType = 'perlin';
let invert = false;
let colorPalette = "nb";

/////////////////////////////
// PALETTES DE COULEURS
/////////////////////////////

const PALETTES = {
  nb:   v => [v*255,v*255,v*255],
  tigre: v => [Math.floor(255-80*v),Math.floor(150-50*v),Math.floor(20+120*v)],
  zebra: v => [Math.floor(240-190*v),Math.floor(240-190*v),Math.floor(240-190*v)],
  corail: v => [Math.floor(220-80*v),Math.floor(110+80*v),Math.floor(220-140*v)],
  girafe: v => [Math.floor(255-130*v),Math.floor(230-100*v),Math.floor(150-80*v)],
  cameleon: v => [Math.floor(100+100*v),Math.floor(200-90*v),Math.floor(120+90*v)],
  sable: v => [Math.floor(240-60*v),Math.floor(210-50*v),Math.floor(160-40*v)],
  chlorophylle: v => [Math.floor(50+20*v),Math.floor(160+70*v),Math.floor(60+20*v)],
  feu: v => [Math.floor(240-100*v),Math.floor(90+120*v),Math.floor(40+100*v)],
};

/////////////////////////////
// INITIALISATION CANEVAS
/////////////////////////////

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
  let w = Math.min(window.innerWidth * 0.96, 960);
  let h = w * CANVAS_H / CANVAS_W;
  if (window.innerHeight < h + 220) h = window.innerHeight - 200, w = h * CANVAS_W / CANVAS_H;
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function initField(noise=0) {
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
  // Bruit initial ?
  if(noise>0){
    for(let i=0; i<N; i++){
      if(Math.random()<noise) U[i]=Math.random(); 
      if(Math.random()<noise) V[i]=Math.random();
    }
  }
}
initField();

/////////////////////////////
// COEUR DE LA SIMULATION
/////////////////////////////

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
function updateField() {
  for (let y = 0; y < CANVAS_H; y++) {
    for (let x = 0; x < CANVAS_W; x++) {
      let i = x + y*CANVAS_W;
      let u = U[i], v = V[i];
      let du = params.diffU * laplace(U, x, y) - u*v*v + params.feed*(1-u);
      let dv = params.diffV * laplace(V, x, y) + u*v*v - (params.kill+params.feed)*v;
      U2[i] = Math.min(Math.max(u + du * 1.3,0),1);
      V2[i] = Math.min(Math.max(v + dv * 1.3,0),1);
    }
  }
  [U, U2] = [U2, U];
  [V, V2] = [V2, V];
}

/////////////////////////////
// AFFICHAGE
/////////////////////////////

function renderField() {
  let img = ctx.createImageData(CANVAS_W, CANVAS_H);
  for (let i = 0; i < N; i++) {
    let v = Math.max(0, Math.min(1, V[i]));
    if(invert) v=1-v;
    let rgb = PALETTES[colorPalette](v);
    img.data[i*4 + 0] = rgb[0];
    img.data[i*4 + 1] = rgb[1];
    img.data[i*4 + 2] = rgb[2];
    img.data[i*4 + 3] = 255;
  }
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.putImageData(img, 0, 0);
  if (params.zoom !== 160) {
    let zw = Math.round(CANVAS_W * params.zoom/160);
    let zh = Math.round(CANVAS_H * params.zoom/160);
    ctx.drawImage(canvas, 0, 0, CANVAS_W, CANVAS_H, (canvas.width-zw)/2, (canvas.height-zh)/2, zw, zh);
  }
}

/////////////////////////////
// ANIMATION
/////////////////////////////

function animate() {
  if (!running) return;
  for (let i = 0; i < params.speed; i++) updateField();
  renderField();
  animationId = requestAnimationFrame(animate);
}

/////////////////////////////
// CONTROLES ET UI
/////////////////////////////

const PRESETS = {
  tigre:  { feed:0.034, kill:0.056, diffU:0.17, diffV:0.09 },
  léopard:{ feed:0.037, kill:0.063, diffU:0.15, diffV:0.068 },
  corail: { feed:0.055, kill:0.062, diffU:0.16, diffV:0.064 },
    girafe: { feed:0.03,  kill:0.058, diffU:0.21, diffV:0.1 },
  ondes:  { feed:0.025, kill:0.055, diffU:0.19, diffV:0.05 },
  zèbre:  { feed:0.025, kill:0.061, diffU:0.18, diffV:0.07 },
  aléatoire: null // handled dynamically
};

function applyPreset(name) {
  let p = PRESETS[name];
  if (p) {
    for (let k in p) params[k] = p[k];
  } else {
    // Aléatoire
    params.feed = +(Math.random()*0.06+0.02).toFixed(4);
    params.kill = +(Math.random()*0.06+0.04).toFixed(4);
    params.diffU = +(Math.random()*0.22+0.08).toFixed(3);
    params.diffV = +(Math.random()*0.07+0.04).toFixed(3);
  }
  for (let k of ['feed','kill','diffU','diffV']) {
    document.getElementById(k).value = params[k];
    document.getElementById(k+'num').value = params[k];
  }
  initField();
  renderField();
}
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.onclick = e => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    applyPreset(btn.dataset.preset);
  }
});

['feed','kill','diffU','diffV'].forEach(k => {
  let slider = document.getElementById(k);
  let num = document.getElementById(k+'num');
  slider.oninput = e => { num.value = slider.value; params[k] = +slider.value; };
  num.oninput = e => { slider.value = num.value; params[k] = +num.value; };
});
document.getElementById('speed').oninput = e => { params.speed = +e.target.value; };
document.getElementById('zoom').oninput = e => { params.zoom = +e.target.value; };

document.getElementById('reset').onclick = e => { initField(); renderField(); };
document.getElementById('randomInit').onclick = e => { initField(.45); renderField(); };

document.getElementById('invert').onclick = e => {
  invert = !invert;
  renderField();
};

document.getElementById('pausePlay').onclick = function() {
  running = !running;
  this.textContent = running ? "⏸️ Pause" : "▶️ Play";
  if (running) animate();
};

document.getElementById('savePng').onclick = function() {
  // On copie le canvas affiché (zoomé)
  let url = canvas.toDataURL("image/png");
  let a = document.createElement("a");
  a.href = url;
  a.download = "reaction-diffusion.png";
  a.click();
};

///////////////////////////
// Palette de couleurs
///////////////////////////

document.getElementById('colorPalette').onchange = function() {
  colorPalette = this.value;
  renderField();
};
document.getElementById('invertColor').onchange = function() {
  invert = this.checked;
  renderField();
};

///////////////////////////
// FRACTALE (PERLIN / MANDELBROT)
///////////////////////////

document.getElementById('fractaleChk').onchange = e => {
  fractaleMode = e.target.checked;
  running = !fractaleMode;
  if (fractaleMode) {
    renderFractale();
    cancelAnimationFrame(animationId);
    document.getElementById('pausePlay').disabled = true;
  } else {
    document.getElementById('pausePlay').disabled = false;
    animate();
  }
};
document.getElementById('fractaleType').onchange = e => {
  fractaleType = e.target.value;
  if (fractaleMode) renderFractale();
};

function renderFractale() {
  let img = ctx.createImageData(CANVAS_W, CANVAS_H);
  if (fractaleType === 'perlin') {
    for (let y = 0; y < CANVAS_H; y++)
      for (let x = 0; x < CANVAS_W; x++) {
        let v = Math.abs(Math.sin(x*0.025 + y*0.012 + Math.cos(x*0.03)*0.6));
        if (invert) v = 1-v;
        let rgb = PALETTES[colorPalette](v);
        let i = x + y*CANVAS_W;
        img.data[i*4+0] = rgb[0];
        img.data[i*4+1] = rgb[1];
        img.data[i*4+2] = rgb[2];
        img.data[i*4+3]=255;
      }
  } else {
    for (let y = 0; y < CANVAS_H; y++)
      for (let x = 0; x < CANVAS_W; x++) {
        let zx = (x - CANVAS_W/2)/CANVAS_W*3.2;
        let zy = (y - CANVAS_H/2)/CANVAS_H*2.2;
        let cx = -0.7, cy = 0.27015;
        let i = x + y*CANVAS_W, iter = 0, maxIter = 40;
        while (zx*zx + zy*zy < 4 && iter < maxIter) {
          let tmp = zx*zx - zy*zy + cx;
          zy = 2*zx*zy + cy;
          zx = tmp;
          iter++;
        }
        let v = iter === maxIter ? 0 : 1-iter/maxIter;
        if (invert) v = 1-v;
        let rgb = PALETTES[colorPalette](v);
        img.data[i*4+0] = rgb[0]; img.data[i*4+1] = rgb[1]; img.data[i*4+2] = rgb[2]; img.data[i*4+3]=255;
      }
  }
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.putImageData(img, 0, 0);
  if (params.zoom !== 160) {
    let zw = Math.round(CANVAS_W * params.zoom/160);
    let zh = Math.round(CANVAS_H * params.zoom/160);
    ctx.drawImage(canvas, 0, 0, CANVAS_W, CANVAS_H, (canvas.width-zw)/2, (canvas.height-zh)/2, zw, zh);
  }
}

/////////////////////////////
// LANCEMENT
/////////////////////////////

renderField();
animate();

