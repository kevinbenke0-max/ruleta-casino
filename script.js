// --- SISTEMA DE AUDIO SINTETIZADO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'chip') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

// --- GESTIÓN DE USUARIOS Y SALDO DESDE EL CAJERO ---
let currentUser = null;
let currentChips = 0;
let currentBetAmount = 10;
let activeBets = [];

function getUsersDB() {
    let users = localStorage.getItem('casino_users');
    if (!users) {
        return { "admin": { pass: "1234", chips: 5000 } };
    }
    return JSON.parse(users);
}

function saveUserChips() {
    if (!currentUser) return;
    let users = getUsersDB();
    if (users[currentUser]) {
        users[currentUser].chips = currentChips;
        localStorage.setItem('casino_users', JSON.stringify(users));
    }
}

// --- LOGIN ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        
        let users = getUsersDB();

        if (users[user] && users[user].pass === pass) {
            currentUser = user;
            currentChips = users[user].chips;
            
            // Redirigir o mostrar pantalla de juegos
            if (document.getElementById('screen-login')) {
                document.getElementById('screen-login').classList.remove('active');
                document.getElementById('screen-login').style.display = 'none';
            }
            
            // Si estás en index.html con estructura de lobby, abrimos el juego directamente
            window.location.href = "ruleta.html"; // O transición interna si está en el mismo HTML
        } else {
            alert("❌ Usuario o contraseña incorrectos, o no autorizado por el cajero.");
        }
    });
}

// Soporte si está todo en el mismo index.html o en páginas separadas
document.addEventListener('DOMContentLoaded', () => {
    // Si la pantalla de juego carga directamente vía URL o sesión guardada
    let sessionUser = sessionStorage.getItem('active_user');
    if (sessionUser) {
        currentUser = sessionUser;
        let users = getUsersDB();
        if (users[currentUser]) currentChips = users[currentUser].chips;
    }
});

// --- Rueda Americana ---
const rouletteNumbers = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];
const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

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
            const tile = document.createElement('div');
            tile.className = `tile ${isRed ? 'red' : 'black'}`;
            tile.innerText = col;
            tile.onclick = () => placeBet('PLENO', col);
            grid.appendChild(tile);
        }
    }
}
initBoard();

function selectChip(val) {
    currentBetAmount = val;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
}

function placeBet(tipo, eleccion) {
    if (currentChips < currentBetAmount) {
        alert("❌ ¡No tienes suficientes fichas! Pídele una recarga al cajero.");
        return;
    }

    currentChips -= currentBetAmount;
    updateChipsDisplay();
    playSound('chip');

    activeBets.push({ tipo, eleccion, monto: currentBetAmount });
    const msg = document.getElementById('live-payout-message');
    if(msg) msg.innerText = `Apuesta colocada: ${currentBetAmount} fichas a '${eleccion}'`;
}

function clearBets() {
    let refunded = activeBets.reduce((acc, b) => acc + b.monto, 0);
    currentChips += refunded;
    activeBets = [];
    updateChipsDisplay();
    const msg = document.getElementById('live-payout-message');
    if(msg) msg.innerText = "Apuestas limpiadas.";
}

// Canvas Ruleta
const canvas = document.getElementById('wheel-canvas');
let currentAngle = 0;
let isSpinning = false;

function drawWheel() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const numSlices = rouletteNumbers.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(currentAngle);

    for (let i = 0; i < numSlices; i++) {
        const angle = i * sliceAngle;
        const num = rouletteNumbers[i];

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius - 10, angle, angle + sliceAngle);
        ctx.closePath();

        if (num === 0 || num === '00') ctx.fillStyle = '#008000';
        else ctx.fillStyle = redNumbers.includes(num) ? '#b22222' : '#111111';

        ctx.fill();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.save();
        ctx.rotate(angle + sliceAngle / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Poppins';
        ctx.fillText(num, radius - 28, 4);
        ctx.restore();
    }
    ctx.restore();

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(radius - 10, 10);
    ctx.lineTo(radius + 10, 10);
    ctx.lineTo(radius, 30);
    ctx.fill();
}
drawWheel();

function spinWheel() {
    if (isSpinning) return;
    if (activeBets.length === 0) {
        alert("⚠️ Por favor coloca al menos una apuesta antes de girar.");
        return;
    }

    isSpinning = true;
    const msg = document.getElementById('live-payout-message');
    if(msg) msg.innerText = "🎲 ¡GIRANDO LA BOLA!...";

    let speed = 0.35;
    function animate() {
        if (speed > 0.002) {
            speed *= 0.985;
            currentAngle += speed;
            drawWheel();
            requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            evaluateResults();
        }
    }
    animate();
}

function evaluateResults() {
    if (!canvas) return;
    const numSlices = rouletteNumbers.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    
    let normalizedAngle = (2 * Math.PI - (currentAngle % (2 * Math.PI))) % (2 * Math.PI);
    let winningIndex = Math.floor(normalizedAngle / sliceAngle);
    let winningNumber = rouletteNumbers[winningIndex];
    let isRed = redNumbers.includes(winningNumber);
    let colorStr = (winningNumber === 0 || winningNumber === '00') ? 'VERDE' : (isRed ? 'ROJO' : 'NEGRO');

    let totalPayout = 0;

    activeBets.forEach(bet => {
        let won = false;
        let payoutMultiplier = 0;

        if (bet.tipo === 'PLENO' && bet.eleccion == winningNumber) {
            won = true; payoutMultiplier = 35;
        } else if (bet.tipo === 'COLOR' && bet.eleccion === (isRed ? 'rojo' : 'negro') && winningNumber !== 0 && winningNumber !== '00') {
            won = true; payoutMultiplier = 1;
        } else if (bet.tipo === 'PARIDAD' && winningNumber !== 0 && winningNumber !== '00') {
            if (bet.eleccion === 'par' && winningNumber % 2 === 0) { won = true; payoutMultiplier = 1; }
            if (bet.eleccion === 'impar' && winningNumber % 2 !== 0) { won = true; payoutMultiplier = 1; }
        } else if (bet.tipo === 'DOCENA' && winningNumber !== 0 && winningNumber !== '00') {
            if (bet.eleccion === 1 && winningNumber <= 12) { won = true; payoutMultiplier = 2; }
            if (bet.eleccion === 2 && winningNumber >= 13 && winningNumber <= 24) { won = true; payoutMultiplier = 2; }
            if (bet.eleccion === 3 && winningNumber >= 25) { won = true; payoutMultiplier = 2; }
        }

        if (won) {
            totalPayout += bet.monto + (bet.monto * payoutMultiplier);
        }
    });

    if (totalPayout > 0) {
        currentChips += totalPayout;
        playSound('win');
    }
    updateChipsDisplay();

    const msg = document.getElementById('live-payout-message');
    if(msg) {
        let text = `🎯 Cayó en el ${winningNumber} (${colorStr}). `;
        text += totalPayout > 0 ? `🎉 ¡GANASTE ${totalPayout} FICHAS!` : `❌ No hubo premio esta vez.`;
        msg.innerText = text;
    }

    activeBets = [];
}
