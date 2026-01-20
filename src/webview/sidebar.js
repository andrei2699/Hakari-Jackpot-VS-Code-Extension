const vscode = acquireVsCodeApi();
let disableFlashingLights = document.body.dataset.disableFlashingLights === 'true';

const rollButton = document.getElementById('roll-btn');
const rollAudio = document.getElementById('roll-audio');
const feverAudio = document.getElementById('fever-audio');
const lossAudio = document.getElementById('loss-audio');
const feverOverlay = document.getElementById('fever-overlay');
const timerDisplay = document.getElementById('timer');
const sparklesContainer = document.getElementById('sparkles-container');

let animationFrameId;
let sparkleIntervalId;

const FEVER_DURATION_MS = 4 * 60 * 1000 + 11 * 1000;
const AUDIO_RETRY_COUNT = 3;
const AUDIO_RETRY_DELAY_MS = 100;
const SPARKLE_INTERVAL_MS = 200;
const FADE_OUT_DURATION_MS = 5000;

document.addEventListener('click', preloadAllAudio, { once: true });

function preloadAllAudio() {
    rollAudio.load();
    feverAudio.load();
    lossAudio.load();
}

function createSparkle() {
    if (disableFlashingLights) return;

    const sparkle = document.createElement('div');
    sparkle.classList.add('party-sparkle');
    sparkle.style.left = Math.random() * 100 + '%';
    sparkle.style.top = Math.random() * 100 + '%';
    sparkle.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
    sparklesContainer.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 1000);
}

rollButton.addEventListener('click', () => {
    vscode.postMessage({ type: 'roll' });
});

async function playAudioWithRetry(audioElement, retries = AUDIO_RETRY_COUNT) {
    audioElement.currentTime = 0;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            await audioElement.play();
            return true;
        } catch (error) {
            console.warn(`Audio play attempt ${attempt + 1} failed:`, error.message);
            await new Promise(resolve => setTimeout(resolve, AUDIO_RETRY_DELAY_MS));
        }
    }
    console.error(`Audio playback failed after ${retries} attempts`);
    return false;
}

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'playRoll':
            playAudioWithRetry(rollAudio);
            break;
        case 'startFever':
            startFever(message.duration);
            break;
        case 'stop':
            stopAll();
            break;
        case 'playLoss':
            playAudioWithRetry(lossAudio);
            break;
        case 'updateConfig':
            updateFlashingLightsConfig(message.disableFlashingLights);
            break;
    }
});

function updateFlashingLightsConfig(disabled) {
    disableFlashingLights = disabled;
    if (disableFlashingLights) {
        feverOverlay.classList.remove('party-mode');
        sparklesContainer.innerHTML = '';
    } else if (feverOverlay.style.display === 'flex') {
        feverOverlay.classList.add('party-mode');
    }
}

function startFever(resumeDuration) {
    showFeverOverlay();
    configureFeverAudio();

    const duration = resumeDuration || FEVER_DURATION_MS;
    const endTime = Date.now() + duration;

    setAudioPositionForResume(resumeDuration);
    playAudioWithRetry(feverAudio);
    startSparkleAnimation();
    runTimerLoop(endTime);
}

function showFeverOverlay() {
    feverOverlay.style.display = 'flex';
    if (!disableFlashingLights) {
        feverOverlay.classList.add('party-mode');
    }
}

function configureFeverAudio() {
    feverAudio.volume = 1.0;
    feverAudio.loop = true;
}

function setAudioPositionForResume(resumeDuration) {
    if (resumeDuration) {
        const playedSoFar = (FEVER_DURATION_MS - resumeDuration) / 1000;
        feverAudio.currentTime = playedSoFar % feverAudio.duration || 0;
    } else {
        feverAudio.currentTime = 0;
    }
}

function startSparkleAnimation() {
    if (sparkleIntervalId) clearInterval(sparkleIntervalId);
    sparkleIntervalId = setInterval(createSparkle, SPARKLE_INTERVAL_MS);
}

function runTimerLoop(endTime) {
    function updateTimer() {
        const remainingMs = endTime - Date.now();

        if (remainingMs <= 0) {
            stopAll();
            return;
        }

        applyFadeOutIfNeeded(remainingMs);
        updateTimerDisplay(remainingMs);
        animationFrameId = requestAnimationFrame(updateTimer);
    }
    updateTimer();
}

function applyFadeOutIfNeeded(remainingMs) {
    if (remainingMs < FADE_OUT_DURATION_MS) {
        feverAudio.volume = Math.max(0, remainingMs / FADE_OUT_DURATION_MS);
    }
}

function updateTimerDisplay(remainingMs) {
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    const centiseconds = Math.floor((remainingMs % 1000) / 10);

    timerDisplay.textContent = [
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0'),
        centiseconds.toString().padStart(2, '0')
    ].join(':');
}

function stopAll() {
    hideFeverOverlay();
    clearSparkles();
    stopAllAudio();
    cancelTimerAnimation();
}

function hideFeverOverlay() {
    feverOverlay.style.display = 'none';
    feverOverlay.classList.remove('party-mode');
}

function clearSparkles() {
    sparklesContainer.innerHTML = '';
    if (sparkleIntervalId) clearInterval(sparkleIntervalId);
}

function stopAllAudio() {
    rollAudio.pause();
    rollAudio.currentTime = 0;
    feverAudio.pause();
    feverAudio.currentTime = 0;
}

function cancelTimerAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}
