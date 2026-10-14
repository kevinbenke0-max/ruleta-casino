// SIMBOLOS Y MULTIPLICADORES
const SYMBOLS = ['🍒', '🍋', '🍉', '🔔', '💎', '7️⃣'];

const PAYTABLE = {
    '7️⃣': 50,  // Tres '7' pagan 50x la apuesta
    '💎': 25,  // Tres Diamantes pagan 25x
    '🔔': 10,  // Tres Campanas pagan 10x
    '🍉': 5,   // Tres Sandías pagan 5x
    '🍋': 5,   // Tres Limones pagan 5x
    '🍒': 3    // Tres Cerezas pagan 3x
};

let slotBetAmount = 50;
let isSlotSpinning = false;

function changeSlotBet(delta) {
    if (isSlotSpinning) return;
    if (slotBetAmount + delta >= 10 && slotBetAmount + delta <= 1000) {
        slotBetAmount += delta;
        document.getElementById('slot-bet-amount').innerText = slotBetAmount;
    }
}

function spinSlot() {
    if (isSlotSpinning) return;
    
    // Validar fichas suficientes
    if (currentChips < slotBetAmount) {
        alert("❌ ¡No tienes suficientes fichas para esta apuesta!");
        return;
    }

    // Descontar apuesta
    currentChips -= slotBetAmount;
    updateChipsDisplay();
    playSound('spin');

    isSlotSpinning = true;
    document.getElementById('btn-spin').disabled = true;
    
    const msg = document.getElementById('live-payout-message');
    msg.innerText = "🎰 GIRANDO RODILLOS...";

    const r1 = document.getElementById('reel-1');
    const r2 = document.getElementById('reel-2');
    const r3 = document.getElementById('reel-3');

    // 1. Pre-seleccionar los 3 símbolos aleatorios
    const res1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const res2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const res3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

    // 2. Efecto visual de giro rápido
    let counter = 0;
    const interval = setInterval(() => {
        r1.innerText = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        r2.innerText = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        r3.innerText = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        counter++;

        if (counter > 15) {
            clearInterval(interval);
            
            // Detener rodillos uno por uno
            r1.innerText = res1;
            setTimeout(() => { r2.innerText = res2; }, 200);
            setTimeout(() => { 
                r3.innerText = res3; 
                evaluateSlotResult(res1, res2, res3);
            }, 400);
        }
    }, 80);
}

function evaluateSlotResult(s1, s2, s3) {
    isSlotSpinning = false;
    document.getElementById('btn-spin').disabled = false;

    let multiplier = 0;

    // Verificar si los 3 símbolos son iguales
    if (s1 === s2 && s2 === s3) {
        multiplier = PAYTABLE[s1] || 2;
    } 
    // Verificar si hay 2 símbolos iguales
    else if (s1 === s2 || s2 === s3 || s1 === s3) {
        multiplier = 1.5;
    }

    const msg = document.getElementById('live-payout-message');

    if (multiplier > 0) {
        let winAmount = Math.floor(slotBetAmount * multiplier);
        currentChips += winAmount;
        updateChipsDisplay();
        playSound('win');
        msg.innerText = `🎉 ¡GANASTE +$${winAmount.toLocaleString()}! (${multiplier}x)`;
    } else {
        msg.innerText = "❌ SIN PREMIO. ¡INTÉNTALO DE NUEVO!";
    }
}
