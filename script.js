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

let currentUser = sessionStorage.getItem('active_user') || null;
let currentChips = 0;
let currentBetAmount = 50;
let activeBets = [];

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

// MOTOR 3D CON CÁMARA AJUSTADA
let scene, camera, renderer, wheelGroup, ballMesh;
let isSpinning3D = false;
let wheelSpeed = 0;
let ballAngle = 0;
let ballRadius = 7.5;
let ballSpeed = 0;

function init3DWheel() {
    const container = document.getElementById('canvas-3d-container');
    if (!container) return;

    scene = new THREE.Scene();
    
    // CÁMARA ALEJADA PARA VER TODA LA RUEDA COMPLETA
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 16, 16);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(320, 320);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 15, 10);
    scene.add(mainLight);

    wheelGroup = new THREE.Group();
    scene.add(wheelGroup);

    // BASE DE MADERA
    const woodBase = new THREE.Mesh(
        new THREE.CylinderGeometry(9, 9.5, 1, 64),
        new THREE.MeshStandardMaterial({ color: 0x2b1100, roughness: 0.3 })
    );
    woodBase.position.y = -0.5;
    scene.add(woodBase);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.1, metalness: 0.9 });
    
    // ANILLO DORADO EXTERIOR
    const goldRing = new THREE.Mesh(new THREE.TorusGeometry(8, 0.25, 16, 100), goldMat);
    goldRing.rotation.x = Math.PI / 2;
    scene.add(goldRing);

    // DISCO INTERIOR DE LA RUEDA
    const innerWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(7.5, 2, 0.6, 37),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })
    );
    wheelGroup.add(innerWheel);

    // TORRETA CENTRAL
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 2, 32), goldMat);
    turret.position.y = 0.6;
    wheelGroup.add(turret);

    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.3, 0.5), goldMat);
    cross1.position.y = 1.5;
    wheelGroup.add(cross1);

    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 3.8), goldMat);
    cross2.position.y = 1.5;
    wheelGroup.add(cross2);

    // BOLA DE MARFIL
    ballMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 })
    );
    ballMesh.position.set(ballRadius, 0.4, 0);
    scene.add(ballMesh);

    function animate3D() {
        requestAnimationFrame(animate3D);

        if (isSpinning3D) {
            wheelGroup.rotation.y += wheelSpeed;
            wheelSpeed *= 0.988;

            ballAngle -= ballSpeed;
            ballSpeed *= 0.985;

            if (ballSpeed < 0.08 && ballRadius > 4) {
                ballRadius -= 0.03;
            }

            ballMesh.position.x = Math.cos(ballAngle) * ballRadius;
            ballMesh.position.z = Math.sin(ballAngle) * ballRadius;

            if (wheelSpeed <= 0.001) {
                isSpinning3D = false;
                evaluateResults3D();
            }
        } else {
            wheelGroup.rotation.y += 0.002;
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
    ballRadius = 7.5;
    
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
