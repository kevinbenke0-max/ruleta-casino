// --- SISTEMA DE AUDIO SINTETIZADO (Efectos de Casino) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'chip') {
        // Sonido seco de fichas al apostar
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'win') {
        // Sonido alegre de victoria
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

// --- ESTADO DEL USUARIO ---
let currentUser = null;
let currentChips = 1000;
let currentBetAmount = 10;
let activeBets = [];

// Números de la Ruleta Americana (38 casillas: 0, 00 y del 1 al 36)
const rouletteNumbers = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];
const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

// --- LOGIN ---
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    currentUser = document.getElementById('username').value;
    
    document.getElementById('header-username').innerText = currentUser;
    updateChipsDisplay();
    
    switchScreen('screen-games');
    document.getElementById('main-header').classList.remove('hidden');
});

document.getElementById('btn-logout').addEventListener('click', () => {
    switchScreen('screen-login');
    document.getElementById('main-header').classList.add('hidden');
});

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function updateChipsDisplay() {
    document.getElementById('user-chips').innerText = currentChips.toLocaleString();
}

// --- MESA Y NÚMEROS ---
function initBoard() {
    const grid = document.getElementById('numbers-grid');
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

// --- SISTEMA DE APUESTAS ---
function selectChip(val) {
    currentBetAmount = val;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
}

function placeBet(tipo, eleccion) {
    if (currentChips < currentBetAmount) {
        alert("❌ ¡No tienes suficientes fichas!");
        return;
    }

    currentChips -= currentBetAmount;
    updateChipsDisplay();
    playSound('chip');

    activeBets.push({ tipo, eleccion, monto: currentBetAmount });
    document.getElementById('live-payout-message').innerText = `Apuesta colocada: ${currentBetAmount} fichas a '${eleccion}'`;
}

function clearBets() {
    let refunded = activeBets.reduce((acc, b) => acc + b.monto, 0);
    currentChips += refunded;
    activeBets = [];
    updateChipsDisplay();
    document.getElementById('live-payout-message').innerText = "Apuestas limpiadas.";
}

// --- CANVAS Y ANIMACIÓN DE LA RULETA ---
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
let currentAngle = 0;
let isSpinning = false;

function drawWheel() {
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

    // Flecha indicadora fija
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
    document.getElementById('live-payout-message').innerText = "🎲 ¡GIRANDO LA BOLA!...";

    const spinAngle = Math.random() * 10 + 25;
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

// --- EVALUACIÓN DE GANADORES ---
function evaluateResults() {
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

    let msg = `🎯 Cayó en el ${winningNumber} (${colorStr}). `;
    msg += totalPayout > 0 ? `🎉 ¡GANASTE ${totalPayout} FICHAS!` : `❌ No hubo premio esta vez.`;
    document.getElementById('live-payout-message').innerText = msg;

    activeBets = [];
}

// --- MODAL ---
function openRulesModal() { document.getElementById('modal-rules').classList.remove('hidden'); }
function closeRulesModal() { document.getElementById('modal-rules').classList.add('hidden'); }
function enterGame(game) { if (game === 'ruleta') switchScreen('screen-roulette'); }
function exitToLobby() { switchScreen('screen-games'); }
