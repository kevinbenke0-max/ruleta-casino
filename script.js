// SONIDO SINTETIZADO
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'chip') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.06);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.06);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.06);
    } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

// ESTADO DE USUARIO
let currentUser = sessionStorage.getItem('active_user') || null;
let currentChips = 0;
let currentBetAmount = 50;
let activeBets = [];

function getUsersDB() {
    let users = localStorage.getItem('casino_users');
    return users ? JSON.parse(users) : { "admin": { pass: "1234", chips: 5000 } };
}

function saveUserChips() {
    if (!currentUser) return;
    let users = getUsersDB();
    if (users[currentUser]) {
        users[currentUser].chips = currentChips;
        localStorage.setItem('casino_users', JSON.stringify(users));
    }
}

// LOGIN & LOGOUT
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        let users = getUsersDB();

        if (users[user] && users[user].pass === pass) {
            sessionStorage.setItem('active_user', user);
            window.location.href = "ruleta.html";
        } else {
            alert("❌ Usuario o contraseña incorrectos.");
        }
    });
}

function logout() {
    sessionStorage.removeItem('active_user');
    window.location.href = "index.html";
}

// RULETA EUROPEA (37 CASILLEROS)
const rouletteNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const redNumbers = [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 1, 14, 9, 18, 7, 12, 3, 26];

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('ruleta.html')) {
        if (currentUser) {
            let users = getUsersDB();
            if (users[currentUser]) {
                currentChips = users[currentUser].chips;
                const disp = document.getElementById('player-display');
                if (disp) disp.innerText = currentUser;
                updateChipsDisplay();
            } else {
                window.location.href = "index.html";
            }
        } else {
            window.location.href = "index.html";
        }
        initBoard();
        init3DWheel();
    }
});

function updateChipsDisplay() {
    const chipsEl = document.getElementById('user-chips');
    if (chipsEl) chipsEl.innerText = currentChips.toLocaleString();
    saveUserChips();
}

function initBoard() {
    const grid = document.getElementById('numbers-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let row = 3; row >= 1; row--) {
        for (let col = row; col <= 36; col += 3) {
            const isRed = redNumbers.includes(col);
            const cell = document.createElement('div');
            cell.className = `num-cell ${isRed ? 'red' : 'black'}`;
            cell.innerText = col;
            cell.onclick = () => placeBet('PLENO', col);
            grid.appendChild(cell);
        }
    }
}

function selectChip(val, el) {
    currentBetAmount = val;
    document.querySelectorAll('.chip-stack').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
}

function placeBet(tipo, eleccion) {
    if (currentChips < currentBetAmount) {
        alert("❌ Sin fichas suficientes.");
        return;
    }
    currentChips -= currentBetAmount;
    updateChipsDisplay();
    playSound('chip');
    activeBets.push({ tipo, eleccion, monto: currentBetAmount });
    
    const msg = document.getElementById('live-payout-message');
    if (msg) msg.innerText = `APUESTA: $${currentBetAmount} EN '${eleccion}'`;
}

function clearBets() {
    let refunded = activeBets.reduce((acc, b) => acc + b.monto, 0);
    currentChips += refunded;
    activeBets = [];
    updateChipsDisplay();
    const msg = document.getElementById('live-payout-message');
    if (msg) msg.innerText = "APUESTAS LIMPIADAS";
}

// MOTOR 3D (THREE.JS)
let scene, camera, renderer, wheelGroup, ballMesh;
let isSpinning3D = false;
let wheelSpeed = 0;
let ballAngle = 0;
let ballRadius = 8.2;
let ballSpeed = 0;

function init3DWheel() {
    const container = document.getElementById('canvas-3d-container');
    if (!container) return;

    // ESCENA, CAMARA Y RENDERIZADOR
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    camera.position.set(0, 12, 14);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(420, 420);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ILUMINACIÓN REALISTA
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff5ea, 1.2);
    mainLight.position.set(10, 20, 15);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const goldPointLight = new THREE.PointLight(0xffd700, 0.8, 20);
    goldPointLight.position.set(0, 5, 0);
    scene.add(goldPointLight);

    // GRUPO DE LA RUEDA 3D
    wheelGroup = new THREE.Group();
    scene.add(wheelGroup);

    // BASE DE MADERA Y BISLE
    const woodGeo = new THREE.CylinderGeometry(10, 10.5, 1.2, 64);
    const woodMat = new THREE.MeshStandardMaterial({
        color: 0x2b1100,
        roughness: 0.3,
        metalness: 0.1
    });
    const woodBase = new THREE.Mesh(woodGeo, woodMat);
    woodBase.position.y = -0.6;
    scene.add(woodBase);

    // ANILLO METÁLICO DORADO
    const goldRingGeo = new THREE.TorusGeometry(8.8, 0.3, 16, 100);
    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.1,
        metalness: 0.9
    });
    const goldRing = new THREE.Mesh(goldRingGeo, goldMat);
    goldRing.rotation.x = Math.PI / 2;
    scene.add(goldRing);

    // CENTRO CÓNICO CON CASILLEROS
    const innerGeo = new THREE.CylinderGeometry(8.5, 2, 0.8, 37);
    const innerMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.4,
        metalness: 0.2
    });
    const innerWheel = new THREE.Mesh(innerGeo, innerMat);
    wheelGroup.add(innerWheel);

    // TORRETA CENTRAL DORADA CON CRUZ
    const turretGeo = new THREE.CylinderGeometry(1.5, 2.2, 2.5, 32);
    const turret = new THREE.Mesh(turretGeo, goldMat);
    turret.position.y = 0.8;
    wheelGroup.add(turret);

    const crossArm1 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 0.6), goldMat);
    crossArm1.position.y = 1.8;
    wheelGroup.add(crossArm1);

    const crossArm2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 4.5), goldMat);
    crossArm2.position.y = 1.8;
    wheelGroup.add(crossArm2);

    // BOLA DE MARFIL
    const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.05
    });
    ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    ballMesh.position.set(ballRadius, 0.5, 0);
    scene.add(ballMesh);

    // BUCLE DE RENDERIZADO
    function animate3D() {
        requestAnimationFrame(animate3D);

        if (isSpinning3D) {
            // ROTACIÓN DE LA RUEDA
            wheelGroup.rotation.y += wheelSpeed;
            wheelSpeed *= 0.988;

            // FÍSICA DE LA BOLA EN SENTIDO OPUESTO
            ballAngle -= ballSpeed;
            ballSpeed *= 0.985;

            if (ballSpeed < 0.08 && ballRadius > 4.5) {
                ballRadius -= 0.03; // Cae hacia el centro
            }

            ballMesh.position.x = Math.cos(ballAngle) * ballRadius;
            ballMesh.position.z = Math.sin(ballAngle) * ballRadius;

            if (wheelSpeed <= 0.001) {
                isSpinning3D = false;
                evaluateResults3D();
            }
        } else {
            wheelGroup.rotation.y += 0.002; // Giro suave en espera
        }

        renderer.render(scene, camera);
    }

    animate3D();
}

function spinWheel3D() {
    if (isSpinning3D) return;
    if (activeBets.length === 0) {
        alert("⚠️ Realice al menos una apuesta.");
        return;
    }

    isSpinning3D = true;
    wheelSpeed = 0.35;
    ballSpeed = 0.45;
    ballRadius = 8.2;
    
    const msg = document.getElementById('live-payout-message');
    if (msg) msg.innerText = "🎲 GIRANDO RUEDA 3D...";
}

function evaluateResults3D() {
    const numSlices = rouletteNumbers.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    let currentRotation = wheelGroup.rotation.y % (2 * Math.PI);
    if (currentRotation < 0) currentRotation += 2 * Math.PI;

    let winningIndex = Math.floor(currentRotation / sliceAngle) % numSlices;
    let winningNumber = rouletteNumbers[winningIndex];
    let isRed = redNumbers.includes(winningNumber);
    let colorStr = (winningNumber === 0) ? 'VERDE' : (isRed ? 'ROJO' : 'NEGRO');

    let totalPayout = 0;

    activeBets.forEach(bet => {
        let won = false;
        let mult = 0;

        if (bet.tipo === 'PLENO' && bet.eleccion == winningNumber) { won = true; mult = 35; }
        else if (bet.tipo === 'COLOR' && bet.eleccion === (isRed ? 'rojo' : 'negro') && winningNumber !== 0) { won = true; mult = 1; }
        else if (bet.tipo === 'PARIDAD' && winningNumber !== 0) {
            if (bet.eleccion === 'par' && winningNumber % 2 === 0) { won = true; mult = 1; }
            if (bet.eleccion === 'impar' && winningNumber % 2 !== 0) { won = true; mult = 1; }
        } else if (bet.tipo === 'DOCENA' && winningNumber !== 0) {
            if (bet.eleccion === 1 && winningNumber <= 12) { won = true; mult = 2; }
            if (bet.eleccion === 2 && winningNumber >= 13 && winningNumber <= 24) { won = true; mult = 2; }
            if (bet.eleccion === 3 && winningNumber >= 25) { won = true; mult = 2; }
        }

        if (won) totalPayout += bet.monto + (bet.monto * mult);
    });

    if (totalPayout > 0) {
        currentChips += totalPayout;
        playSound('win');
    }
    updateChipsDisplay();

    const msg = document.getElementById('live-payout-message');
    if (msg) {
        let text = `🎯 RESULTADO: ${winningNumber} (${colorStr}). `;
        text += totalPayout > 0 ? `🎉 GANASTE $${totalPayout}!` : `❌ SIN PREMIO.`;
        msg.innerText = text;
    }
    activeBets = [];
}
