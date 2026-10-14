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

// SECUENCIA RULETA EUROPEA (37 NÚMEROS)
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
    }
    initBoard();
    drawWheel();
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

    // Filas 3, 2, 1 (Estilo clásico)
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

// CANVAS RUEDA HIPER-REALISTA
const canvas = document.getElementById('wheel-canvas');
let currentAngle = 0;
let isSpinning = false;

function drawWheel() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const numSlices = rouletteNumbers.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // BORDES Y MARCO METALICO EXTERIOR
    ctx.save();
    ctx.translate(radius, radius);

    let outerGrad = ctx.createRadialGradient(0, 0, radius - 25, 0, 0, radius);
    outerGrad.addColorStop(0, '#1a1a1a');
    outerGrad.addColorStop(0.5, '#444444');
    outerGrad.addColorStop(1, '#0a0a0a');
    
    ctx.beginPath();
    ctx.arc(0, 0, radius - 2, 0, 2 * Math.PI);
    ctx.fillStyle = outerGrad;
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();

    // RUEDA GIRATORIA
    ctx.rotate(currentAngle);

    for (let i = 0; i < numSlices; i++) {
        const angle = i * sliceAngle;
        const num = rouletteNumbers[i];

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius - 30, angle, angle + sliceAngle);
        ctx.closePath();

        if (num === 0) ctx.fillStyle = '#008744';
        else ctx.fillStyle = redNumbers.includes(num) ? '#d32f2f' : '#111111';

        ctx.fill();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.stroke();

        // TEXTO DE NÚMEROS
        ctx.save();
        ctx.rotate(angle + sliceAngle / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Montserrat';
        ctx.fillText(num, radius - 55, 4);
        ctx.restore();
    }

    // TORRETA DE LATÓN Y CENTRO DORADO
    let centerGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 60);
    centerGrad.addColorStop(0, '#fff2a3');
    centerGrad.addColorStop(0.5, '#d4af37');
    centerGrad.addColorStop(1, '#594100');

    ctx.beginPath();
    ctx.arc(0, 0, 65, 0, 2 * Math.PI);
    ctx.fillStyle = centerGrad;
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.stroke();

    // CRUZ DE LA TORRETA
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(-45, -6, 90, 12);
    ctx.fillRect(-6, -45, 12, 90);

    ctx.restore();

    // BOLA DE MARFIL
    ctx.save();
    ctx.translate(radius, radius);
    let ballRadius = radius - 42;
    let ballAngle = -currentAngle * 1.5; // Gira en dirección opuesta
    let ballX = Math.cos(ballAngle) * ballRadius;
    let ballY = Math.sin(ballAngle) * ballRadius;

    ctx.beginPath();
    ctx.arc(ballX, ballY, 7, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.restore();
}

function spinWheel() {
    if (isSpinning) return;
    if (activeBets.length === 0) {
        alert("⚠️ Realice al menos una apuesta.");
        return;
    }

    isSpinning = true;
    const msg = document.getElementById('live-payout-message');
    if (msg) msg.innerText = "🎲 GIRANDO RUEDA...";

    let speed = 0.4;
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
    const numSlices = rouletteNumbers.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    
    let normalizedAngle = (2 * Math.PI - (currentAngle % (2 * Math.PI))) % (2 * Math.PI);
    let winningIndex = Math.floor(normalizedAngle / sliceAngle);
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
