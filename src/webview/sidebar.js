const vscode = acquireVsCodeApi();
let isAutoFlashingDisabled = document.body.dataset.disableFlashingLights === 'true';
let currentFeverSpeed = parseFloat(document.body.dataset.feverSpeed) || 1.0;

const mechanicalHandle = document.getElementById('slot-handle');
const rollSoundEffect = document.getElementById('roll-audio');
const feverMusicTrack = document.getElementById('fever-audio');
const lossSoundEffect = document.getElementById('loss-audio');
const welcomeSoundEffect = document.getElementById('welcome-audio');
const jackpotOverlay = document.getElementById('fever-overlay');
const feverCountdown = document.getElementById('timer');
const particlesContainer = document.getElementById('sparkles-container');
const machineStatusDisplay = document.getElementById('machine-status');

const SLOT_SYMBOLS = ['🎰', '🍒', '🍋', '🍐', '🔔', '💎', '7️⃣'];
const REEL_CAPACITY = 80;
const SYMBOL_HEIGHT_PX = 50;

let frameRequestIdentifier;
let sparkleTimerIdentifier;
let reelResetTimeoutIdentifier;

const FEVER_TOTAL_DURATION_MS = 251000;
const AUDIO_MAX_RETRIES = 3;
const AUDIO_RETRY_INTERVAL_MS = 100;
let sparkleSpawnIntervalMs = 200 / currentFeverSpeed;
const AUDIO_FADE_THRESHOLD_MS = 5000;

const reelStrips = [
    document.querySelector('#reel-1 .reel-strip'),
    document.querySelector('#reel-2 .reel-strip'),
    document.querySelector('#reel-3 .reel-strip')
];

function initializeSlotReels() {
    reelStrips.forEach(strip => {
        strip.innerHTML = '';
        for (let i = 0; i < REEL_CAPACITY; i++) {
            const sym = document.createElement('div');
            sym.classList.add('symbol');
            sym.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
            strip.appendChild(sym);
        }
    });
}
initializeSlotReels();

window.addEventListener('load', () => {
    handleWelcomePlayback();
});

function spawnVisualSparkle() {
    if (isAutoFlashingDisabled) return;
    const sparkle = document.createElement('div');
    sparkle.classList.add('party-sparkle');
    sparkle.style.left = Math.random() * 100 + '%';
    sparkle.style.top = Math.random() * 100 + '%';
    sparkle.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
    particlesContainer.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 1000);
}

function initiateGambleTrigger() {
    if (document.body.classList.contains('is-rolling')) return;
    mechanicalHandle.classList.add('handle-pulled');
    setTimeout(() => { mechanicalHandle.classList.remove('handle-pulled'); }, 400);
    vscode.postMessage({ type: 'roll' });
}

mechanicalHandle.addEventListener('click', initiateGambleTrigger);

async function attemptAudioPlayback(audio, remainingRetries = AUDIO_MAX_RETRIES) {
    audio.currentTime = 0;
    for (let attempt = 0; attempt < remainingRetries; attempt++) {
        try {
            await audio.play();
            return true;
        } catch {
            await new Promise(r => setTimeout(r, AUDIO_RETRY_INTERVAL_MS));
        }
    }
    return false;
}

window.addEventListener('message', event => {
    const payload = event.data;
    switch (payload.type) {
        case 'playRoll':
            executeRollSequence(payload.isWin, payload.duration);
            break;
        case 'playLoss':
            finalizeLossState();
            break;
        case 'startFever':
            activateJackpotFever(payload.duration);
            break;
        case 'stop':
            terminateAllState();
            break;
        case 'updateConfig':
            refreshConfiguration(payload.disableFlashingLights, payload.feverSpeed);
            break;
    }
});

let isWelcomeDeferred = false;
async function handleWelcomePlayback() {
    const success = await attemptAudioPlayback(welcomeSoundEffect);
    isWelcomeDeferred = !success;
}

document.addEventListener('click', () => {
    rollSoundEffect.load();
    feverMusicTrack.load();
    lossSoundEffect.load();
    welcomeSoundEffect.load();

    if (isWelcomeDeferred) {
        handleWelcomePlayback();
    }
}, { once: true });

function executeRollSequence(isWinningRoll, rollDurationMs) {
    if (document.body.classList.contains('is-rolling')) return;

    if (reelResetTimeoutIdentifier) {
        clearTimeout(reelResetTimeoutIdentifier);
        reelResetTimeoutIdentifier = null;
    }

    document.body.classList.add('is-rolling');
    machineStatusDisplay.textContent = "ROLLING...";
    machineStatusDisplay.className = "status-display";
    machineStatusDisplay.classList.remove('jackpot-glow', 'miss-glow');
    attemptAudioPlayback(rollSoundEffect);

    const animationDurationSeconds = (rollDurationMs / 1000);

    reelStrips.forEach(strip => {
        strip.style.transition = 'none';
        strip.style.transform = 'translateY(0)';
        void strip.offsetHeight;
    });

    setTimeout(() => {
        reelStrips.forEach((strip, index) => {
            const symbols = strip.children;
            const targetSymbol = isWinningRoll ? '7️⃣' : SLOT_SYMBOLS[Math.floor(Math.random() * (SLOT_SYMBOLS.length - 1))];

            for (let i = 2; i < REEL_CAPACITY - 2; i++) {
                symbols[i].textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
            }

            symbols[REEL_CAPACITY - 2].textContent = targetSymbol;

            const scrollDistance = (REEL_CAPACITY - 3) * SYMBOL_HEIGHT_PX;
            const durationForThisReel = animationDurationSeconds - (1.0 - (index * 0.5));

            strip.style.transition = `transform ${durationForThisReel}s cubic-bezier(0.1, 0, 0.1, 1)`;
            strip.style.transform = `translateY(-${scrollDistance}px)`;
        });
    }, 50);

    setTimeout(() => {
        if (isWinningRoll) {
            machineStatusDisplay.textContent = "JACKPOT!!";
            machineStatusDisplay.classList.add('jackpot-glow');
        }
    }, rollDurationMs);
}

function finalizeLossState() {
    document.body.classList.remove('is-rolling');
    rollSoundEffect.pause();
    rollSoundEffect.currentTime = 0;
    machineStatusDisplay.textContent = "MISS...";
    machineStatusDisplay.classList.add('miss-glow');
    attemptAudioPlayback(lossSoundEffect);

    if (reelResetTimeoutIdentifier) clearTimeout(reelResetTimeoutIdentifier);
    reelResetTimeoutIdentifier = setTimeout(() => {
        if (!document.body.classList.contains('is-fever')) resetSlotReels();
        reelResetTimeoutIdentifier = null;
    }, 3000);
}

function resetSlotReels() {
    reelStrips.forEach(strip => {
        const finalSymbol = strip.children[REEL_CAPACITY - 2].textContent;
        strip.style.transition = 'none';
        strip.style.transform = 'translateY(0)';
        strip.children[1].textContent = finalSymbol;
    });
    machineStatusDisplay.textContent = "READY";
    machineStatusDisplay.className = "status-display";
    machineStatusDisplay.classList.remove('jackpot-glow', 'miss-glow');
}

function refreshConfiguration(isDisabled, speed) {
    isAutoFlashingDisabled = isDisabled;
    if (speed !== undefined) {
        currentFeverSpeed = speed;
        sparkleSpawnIntervalMs = 200 / speed;
        document.documentElement.style.setProperty('--fever-flash-duration', `${1 / speed}s`);
    }

    if (isAutoFlashingDisabled) {
        jackpotOverlay.classList.remove('party-mode');
        particlesContainer.innerHTML = '';
        if (sparkleTimerIdentifier) {
            clearInterval(sparkleTimerIdentifier);
            sparkleTimerIdentifier = null;
        }
    } else if (jackpotOverlay.style.display === 'flex') {
        jackpotOverlay.classList.add('party-mode');
        if (!sparkleTimerIdentifier) {
            sparkleTimerIdentifier = setInterval(spawnVisualSparkle, sparkleSpawnIntervalMs);
        } else {
            // Restart with new interval
            clearInterval(sparkleTimerIdentifier);
            sparkleTimerIdentifier = setInterval(spawnVisualSparkle, sparkleSpawnIntervalMs);
        }
    }
}

function activateJackpotFever(resumeMs) {
    document.body.classList.remove('is-rolling');
    document.body.classList.add('is-fever');
    jackpotOverlay.style.display = 'flex';
    if (!isAutoFlashingDisabled) jackpotOverlay.classList.add('party-mode');

    feverMusicTrack.volume = 1.0;
    feverMusicTrack.loop = true;

    const remainingTime = resumeMs || FEVER_TOTAL_DURATION_MS;
    const expirationTimestamp = Date.now() + remainingTime;

    if (resumeMs) {
        const offset = (FEVER_TOTAL_DURATION_MS - resumeMs) / 1000;
        feverMusicTrack.currentTime = offset % feverMusicTrack.duration || 0;
    } else {
        feverMusicTrack.currentTime = 0;
    }

    attemptAudioPlayback(feverMusicTrack);
    if (sparkleTimerIdentifier) clearInterval(sparkleTimerIdentifier);
    sparkleTimerIdentifier = setInterval(spawnVisualSparkle, sparkleSpawnIntervalMs);
    document.documentElement.style.setProperty('--fever-flash-duration', `${1 / currentFeverSpeed}s`);

    function updateCountdown() {
        const now = Date.now();
        const delta = expirationTimestamp - now;
        if (delta <= 0) { terminateAllState(); return; }
        if (delta < AUDIO_FADE_THRESHOLD_MS) feverMusicTrack.volume = Math.max(0, delta / AUDIO_FADE_THRESHOLD_MS);

        const m = Math.floor(delta / 60000).toString().padStart(2, '0');
        const s = Math.floor((delta % 60000) / 1000).toString().padStart(2, '0');
        const ms = Math.floor((delta % 1000) / 10).toString().padStart(2, '0');
        feverCountdown.textContent = `${m}:${s}:${ms}`;
        frameRequestIdentifier = requestAnimationFrame(updateCountdown);
    }
    updateCountdown();
}

function terminateAllState() {
    document.body.classList.remove('is-fever');
    jackpotOverlay.style.display = 'none';
    jackpotOverlay.classList.remove('party-mode');
    particlesContainer.innerHTML = '';
    if (sparkleTimerIdentifier) clearInterval(sparkleTimerIdentifier);
    rollSoundEffect.pause();
    feverMusicTrack.pause();
    if (frameRequestIdentifier) cancelAnimationFrame(frameRequestIdentifier);
    resetSlotReels();
}
