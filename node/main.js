import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';

// Cache geometries and materials
const xMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const xBarGeo = new THREE.BoxGeometry(0.1, 0.02, 0.8);
const oMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const oGeo = new THREE.TorusGeometry(0.35, 0.02, 16, 100);

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,5,5);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(5,10,7.5);
scene.add(dirLight);

// Grid helper
const gridHelper = new THREE.GridHelper(3, 3, 0x555555, 0x999999);
scene.add(gridHelper);

// Invisible click plane
const planeGeo = new THREE.PlaneGeometry(3, 3);
const planeMat = new THREE.MeshBasicMaterial({ visible: false });
const clickPlane = new THREE.Mesh(planeGeo, planeMat);
clickPlane.rotation.x = -Math.PI / 2;
scene.add(clickPlane);

// Game state
let board = Array(9).fill(null);
let currentPlayer = 'X';
let running = true;
let pieceGroup = new THREE.Group();
scene.add(pieceGroup);

// UI elements
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');
statusEl.textContent = `Player ${currentPlayer}'s turn`;

// Raycaster and mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Helpers
function getBoardIndex(point) {
  const x = Math.floor((point.x + 1.5) / 1);
  const z = Math.floor((point.z + 1.5) / 1);
  if (x < 0 || x > 2 || z < 0 || z > 2) return null;
  return z * 3 + x;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
}

function placePiece(index, player) {
  const x = index % 3, z = Math.floor(index / 3);
  const posX = x - 1, posZ = z - 1;
  let mesh;
  if (player === 'X') mesh = createX(); else mesh = createO();
  mesh.position.set(posX, 0.05, posZ);
  pieceGroup.add(mesh);
}

function createX() {
  const b1 = new THREE.Mesh(xBarGeo, xMaterial);
  b1.rotation.y = Math.PI / 4;
  const b2 = new THREE.Mesh(xBarGeo, xMaterial);
  b2.rotation.y = -Math.PI / 4;
  const group = new THREE.Group();
  group.add(b1, b2);
  return group;
}

function createO() {
  const torus = new THREE.Mesh(oGeo, oMaterial);
  torus.rotation.x = Math.PI / 2;
  return torus;
}

function checkGameState() {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  const win = wins.some(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
  if (win) {
    statusEl.textContent = `Player ${currentPlayer} wins!`;
    running = false;
  } else if (!board.includes(null)) {
    statusEl.textContent = `It's a tie!`;
    running = false;
  } else {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    statusEl.textContent = `Player ${currentPlayer}'s turn`;
  }
}

function onClick(event) {
  if (!running) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(clickPlane);
  if (!hits.length) return;
  const idx = getBoardIndex(hits[0].point);
  if (idx === null || board[idx]) return;
  board[idx] = currentPlayer;
  placePiece(idx, currentPlayer);
  checkGameState();
}

function onTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  onClick({ clientX: touch.clientX, clientY: touch.clientY });
}

function resetGame() {
  pieceGroup.children.forEach(mesh => {
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  scene.remove(pieceGroup);
  pieceGroup = new THREE.Group();
  scene.add(pieceGroup);
  board.fill(null);
  currentPlayer = 'X';
  running = true;
  statusEl.textContent = `Player ${currentPlayer}'s turn`;
}

let rafId;
function animate() {
  rafId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Event listeners
window.addEventListener('resize', onWindowResize);
renderer.domElement.addEventListener('click', onClick);
renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
resetBtn.addEventListener('click', resetGame);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(rafId);
  else animate();
});

animate();
