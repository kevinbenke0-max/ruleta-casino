// SONIDOS SINTETIZADOS DE ALTA FIDELIDAD
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'chip') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'spin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 1.5);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
    } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
    }
}

// GESTIÓN DE BASE DE DATOS LOCAL
function getUsersDB() {
    let users = localStorage.getItem('casino_users');
    if (!users) {
        let defaultUsers = { "admin": { pass: "1234", chips: 5000 } };
        localStorage.setItem('casino_users', JSON.stringify(defaultUsers));
        return defaultUsers;
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

let currentUser = sessionStorage.getItem('active_user') || null;
let currentChips = 0;
let currentBetAmount = 50;
let activeBets = [];

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputUser = document.getElementById('username').value.trim().toLowerCase();
            const inputPass = document.getElementById('password').value.trim();
            let users = getUsersDB();

            let matchedUserKey = Object.keys(users).find(key => key.toLowerCase() === inputUser);

            if (matchedUserKey && String(users[matchedUserKey].pass) === String(inputPass)) {
                sessionStorage.setItem('active_user', matchedUserKey);
                window.location.href = "ruleta.html";
            } else {
                alert("❌ Usuario o contraseña incorrectos.");
            }
        });
    }

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
        drawWheelHD(0, null);
    }
});

function logout() {
    sessionStorage.removeItem('active_user');
    window.location.href = "index.html";
}

const rouletteNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const redNumbers = [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 1, 14, 9, 18, 7, 12, 3, 26];

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
        alert("❌ ¡No tienes suficientes fichas!");
        return;
    }
    currentChips -= currentBetAmount;
    updateChipsDisplay();
    playSound('chip');

    let existingBet = activeBets.find(b => b.tipo === tipo && b.eleccion === eleccion);
    if (existingBet) {
        existingBet.monto += currentBetAmount;
    } else {
        activeBets.push({ tipo, eleccion, monto: currentBetAmount });
    }

    let totalCurrentBet = activeBets.reduce((sum, b) => sum + b.monto, 0);
    const msg = document.getElementById('live-payout-message');
    if (msg) msg.innerText = `APUESTAS ACTIVAS: $${totalCurrentBet} (${activeBets.length} jugadas)`;
}

function placeSpecialBet(sector) {
    let numbersToBet = [];
    if (sector === 'ZERO') numbersToBet = [0, 3, 12, 15, 26, 32, 35];
    else if (sector === 'VOISINS') numbersToBet = [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25];
    else if (sector === 'ORPHELINS') numbersToBet = [1, 20, 14, 31, 9, 17, 34, 6];
    else if (sector === 'TIERS') numbersToBet = [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33];

    let totalCost = numbersToBet.length * currentBetAmount;
    if (currentChips < totalCost) {
        alert("❌ Fichas insuficientes para este sector.");
        return;
    }
    numbersToBet.forEach(num => placeBet('PLENO', num));
}

function clearBets() {
    let refunded = activeBets.reduce((acc, b) => acc + b.monto, 0);
    currentChips += refunded;
    activeBets = [];
    updateChipsDisplay();
    const msg = document.getElementById('live-payout-message');
    if (msg) msg.innerText = "APUESTAS LIMPIADAS";
}

// RENDERIZADO FOTORREALISTA HD Y BOLA DE MARFIL
let currentAngle = 0;
let isSpinning = false;

function drawWheelHD(angleOffset, ballPos) {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const numSlices = rouletteNumbers.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(radius, radius);

    // BORDE DE MADERA BARNIZADA Y METAL DORADO
    let woodGrad = ctx.createRadialGradient(0, 0, radius - 28, 0, 0, radius);
    woodGrad.addColorStop(0, '#260d00');
    woodGrad.addColorStop(0.6, '#4d1a00');
    woodGrad.addColorStop(1, '#d4af37');

    ctx.beginPath();
    ctx.arc(0, 0, radius - 4, 0, 2 * Math.PI);
    ctx.fillStyle = woodGrad;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffd700';
    ctx.stroke();

    // ROTACIÓN DE LA RUEDA
    ctx.rotate(angleOffset);

    for (let i = 0; i < numSlices; i++) {
        const angle = i * sliceAngle;
        const num = rouletteNumbers[i];

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius - 42, angle, angle + sliceAngle);
        ctx.closePath();

        if (num === 0) ctx.fillStyle = '#008744';
        else ctx.fillStyle = redNumbers.includes(num) ? '#d92020' : '#111111';

        ctx.fill();
        ctx.strokeStyle = '#c5a059';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // NÚMEROS HD DEFINIDOS
        ctx.save();
        ctx.rotate(angle + sliceAngle / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Montserrat';
        ctx.textAlign = 'right';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 3;
        ctx.fillText(num, radius - 55, 4);
        ctx.restore();
    }

    // CENTRO METÁLICO DORADO Y TORRETA
    let centerGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 50);
    centerGrad.addColorStop(0, '#fff5c0');
    centerGrad.addColorStop(0.5, '#d4af37');
    centerGrad.addColorStop(1, '#4a3500');

    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, 2 * Math.PI);
    ctx.fillStyle = centerGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111';
    ctx.stroke();

    // CRUZ DE LA TORRETA
    ctx.fillStyle = '#ffea75';
    ctx.fillRect(-38, -5, 76, 10);
    ctx.fillRect(-5, -38, 10, 76);

    ctx.restore();

    // DIBUJAR BOLA DE MARFIL SI ESTÁ ACTIVA
    if (ballPos) {
        ctx.save();
        ctx.translate(radius, radius);
        ctx.beginPath();
        ctx.arc(ballPos.x, ballPos.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
    }
}

function spinWheel() {
    if (isSpinning) return;
    if (activeBets.length === 0) {
        alert("⚠️ Realiza al menos una apuesta en el paño antes de girar.");
        return;
    }

    isSpinning = true;
    playSound('spin');
    const msg = document.getElementById('live-payout-message');
    if (msg) msg.innerText = "🎲 GIRANDO RUEDA Y BOLA...";

    let wheelSpeed = 0.35;
    let ballAngle = Math.random() * Math.PI * 2;
    let ballSpeed = 0.5;
    let ballRadius = 130;

    function animate() {
        if (wheelSpeed > 0.0012) {
            wheelSpeed *= 0.987;
            ballSpeed *= 0.985;
            currentAngle += wheelSpeed;
            ballAngle -= ballSpeed;

            if (ballRadius > 75) {
                ballRadius -= 0.3; // Física de caída hacia los números
            }

            let bx = Math.cos(ballAngle) * ballRadius;
            let by = Math.sin(ballAngle) * ballRadius;

            drawWheelHD(currentAngle, { x: bx, y: by });
            requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            evaluateResultsHD();
        }
    }
    animate();
}

function evaluateResultsHD() {
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
        } else if (bet.tipo === 'COLUMNA' && winningNumber !== 0) {
            let col = bet.eleccion;
            if (winningNumber % 3 === col % 3) { won = true; mult = 2; }
        } else if (bet.tipo === 'PASO' && winningNumber !== 0) {
            if (bet.eleccion === 1 && winningNumber <= 18) { won = true; mult = 1; }
            if (bet.eleccion === 2 && winningNumber >= 19) { won = true; mult = 1; }
        }

        if (won) {
            totalPayout += bet.monto + (bet.monto * mult);
        }
    });

    if (totalPayout > 0) {
        currentChips += totalPayout;
        playSound('win');
    }
    updateChipsDisplay();

    const msg = document.getElementById('live-payout-message');
    if (msg) {
        let text = `🎯 CAYÓ ${winningNumber} (${colorStr}). `;
        text += totalPayout > 0 ? `🎉 ¡PREMIO TOTAL: $${totalPayout}!` : `❌ SIN PREMIO.`;
        msg.innerText = text;
    }
    activeBets = [];
    drawWheelHD(currentAngle, null);
}
