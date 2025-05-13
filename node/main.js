// Import necessary modules from Three.js (using the version you provided)
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';

// Wait for the HTML document to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

  // --- DOM Element References ---
  const statusEl = document.getElementById('status');
  const resetBtn = document.getElementById('reset');

  // Basic check to ensure required elements are found
  if (!statusEl || !resetBtn) {
    console.error("Status display or Reset button element not found in HTML!");
    if (!statusEl) alert("Error: HTML element with id 'status' is missing.");
    if (!resetBtn) alert("Error: HTML element with id 'reset' is missing.");
    return; // Stop execution if elements are missing
  }

  // --- Scene Setup ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdddddd);

  // --- Camera Setup ---
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 5);
  camera.lookAt(0, 0, 0);

  // --- Renderer Setup ---
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Append the renderer's canvas to the body (as in your original code)
  // If you create a specific container div in HTML, append it there instead.
  document.body.appendChild(renderer.domElement);

  // --- Controls ---
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 15;
  controls.enablePan = false; // Optional: disable panning

  // --- Lighting ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Slightly brighter ambient
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Slightly stronger directional
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  // --- Grid Helper ---
  const gridHelper = new THREE.GridHelper(3, 3, 0x555555, 0x999999);
  scene.add(gridHelper);

  // --- Invisible Click Plane ---
  const planeGeometry = new THREE.PlaneGeometry(3, 3);
  // Make sure it's double-sided if camera might go below
  const planeMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
  const clickPlane = new THREE.Mesh(planeGeometry, planeMaterial);
  clickPlane.rotation.x = -Math.PI / 2;
  scene.add(clickPlane);

  // --- Reusable Geometries and Materials ---
  // Using slightly different geometry for X for better visual separation
  const xMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 });
  const xBarGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.1); // X bars
  const oMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0.5 });
  const oGeometry = new THREE.TorusGeometry(0.35, 0.05, 16, 100); // O Torus

  // --- Game State Variables ---
  let board = Array(9).fill(null);
  let currentPlayer = 'X';
  let isGameRunning = true;
  let pieceGroup = new THREE.Group();
  scene.add(pieceGroup);

  // --- UI Update ---
  statusEl.textContent = `Player ${currentPlayer}'s turn`;

  // --- Raycaster for Click Detection ---
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // --- Helper Functions ---

  // Calculates the board index (0-8) based on a 3D point
  function getBoardIndex(point) {
    // Clamp coordinates to be within the grid boundaries slightly inset
    const x = THREE.MathUtils.clamp(point.x, -1.49, 1.49);
    const z = THREE.MathUtils.clamp(point.z, -1.49, 1.49);
    const col = Math.floor((x + 1.5) / 1);
    const row = Math.floor((z + 1.5) / 1);
    // Check bounds rigorously
    if (col < 0 || col > 2 || row < 0 || row > 2) return null;
    return row * 3 + col;
  }

  // Creates the 'X' mesh group
  function createX() {
    const group = new THREE.Group();
    const bar1 = new THREE.Mesh(xBarGeometry, xMaterial);
    bar1.rotation.y = Math.PI / 4;
    const bar2 = new THREE.Mesh(xBarGeometry, xMaterial);
    bar2.rotation.y = -Math.PI / 4;
    group.add(bar1, bar2);
    return group;
  }

  // Creates the 'O' mesh
  function createO() {
    const torus = new THREE.Mesh(oGeometry, oMaterial);
    torus.rotation.x = Math.PI / 2;
    return torus;
  }

  // Places a piece (X or O) on the board
  function placePiece(index, player) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const positionX = col - 1; // Map col 0,1,2 to -1,0,1
    const positionZ = row - 1; // Map row 0,1,2 to -1,0,1

    let pieceMesh = (player === 'X') ? createX() : createO();
    pieceMesh.position.set(positionX, 0.05, positionZ); // Place slightly above the grid
    pieceGroup.add(pieceMesh);
  }

  // Checks win condition or tie
  function checkWinCondition() {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // Winning player
      }
    }
    return board.includes(null) ? null : 'Tie'; // Null if ongoing, 'Tie' if full
  }

  // Handles turn end logic
  function handleTurnEnd() {
    const winner = checkWinCondition();
    if (winner) {
      isGameRunning = false;
      statusEl.textContent = (winner === 'Tie') ? "It's a Tie!" : `Player ${winner} wins!`;
    } else {
      currentPlayer = (currentPlayer === 'X') ? 'O' : 'X';
      statusEl.textContent = `Player ${currentPlayer}'s turn`;
    }
  }

  // --- Event Handlers ---

  // Handles window resize
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
  }

  // Handles mouse click
  function processPointerEvent(clientX, clientY) {
    if (!isGameRunning) return;

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(clickPlane);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const index = getBoardIndex(point);
      if (index !== null && board[index] === null) {
        board[index] = currentPlayer;
        placePiece(index, currentPlayer);
        handleTurnEnd();
      }
    }
  }

  function onClick(event) {
    processPointerEvent(event.clientX, event.clientY);
  }

  // Handles touch start
  function onTouchStart(event) {
    // Prevent default only if the game is running to avoid interfering
    // with other touch interactions if the game ends overlay needs clicks etc.
    // Use passive: true below if preventDefault is not strictly needed.
    // if (isGameRunning) event.preventDefault(); // Causes issues on some browsers if passive: true

    if (event.touches.length > 0) {
      processPointerEvent(event.touches[0].clientX, event.touches[0].clientY);
    }
  }

  // Resets the game state and visuals
  function resetGame() {
    // Dispose geometries and materials associated with pieces in pieceGroup
    while (pieceGroup.children.length > 0) {
        const piece = pieceGroup.children[0];
        pieceGroup.remove(piece); // Remove from group first

        // If it's a group (like 'X'), iterate through its children (meshes)
        if (piece.isGroup) {
            piece.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    // child.material.dispose(); // Materials are shared, dispose elsewhere if needed
                }
            });
        } else if (piece.isMesh) { // If it's a single mesh (like 'O')
            piece.geometry.dispose();
            // piece.material.dispose(); // Materials are shared
        }
    }
    // Note: Shared materials (xMaterial, oMaterial) and geometries (xBarGeo, oGeo)
    // are not disposed here as they are reused. They would typically be disposed
    // if the entire application is shutting down.

    // Reset game state
    board.fill(null);
    currentPlayer = 'X';
    isGameRunning = true;
    statusEl.textContent = `Player ${currentPlayer}'s turn`;
  }

  // --- Animation Loop ---
  let rafId;
  function animate() {
    rafId = requestAnimationFrame(animate);
    controls.update(); // Required if enableDamping is true
    renderer.render(scene, camera);
  }

  // --- Add Event Listeners ---
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onClick);
  // Use passive: true for touchstart for better scroll performance,
  // but it means preventDefault() inside the handler will be ignored.
  renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
  resetBtn.addEventListener('click', resetGame);

  // Pause animation when tab is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      animate();
    }
  });

  // --- Start Animation ---
  animate();

}); // End of DOMContentLoaded listener