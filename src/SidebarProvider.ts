import * as vscode from 'vscode';
import { JackpotManager } from './JackpotManager';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'hakari-sidebar';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _jackpotManager: JackpotManager
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('SidebarProvider.resolveWebviewView called');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'roll': {
                    this._jackpotManager.attemptGamble(true);
                    break;
                }
            }
        });
    }

    public playRoll() {
        this._view?.webview.postMessage({ type: 'playRoll' });
    }

    public startFever() {
        this._view?.webview.postMessage({ type: 'startFever' });
    }

    public stop() {
        this._view?.webview.postMessage({ type: 'stop' });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const rollUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'jackpot.webm'));
        const feverUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'TUCA_DONKA.mp4'));
        const danceUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'hakari-dance.gif'));

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 10px;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                        overflow: hidden;
                        height: 100vh;
                        position: relative;
                    }
                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 10px 20px;
                        cursor: pointer;
                        font-size: 1.2em;
                        width: 100%;
                        margin-top: 10px;
                        z-index: 10;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .title {
                        font-weight: bold;
                        font-size: 1.5em;
                        margin-bottom: 20px;
                        text-align: center;
                        z-index: 10;
                    }
                    #fever-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: black;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        z-index: 100;
                        display: none;
                        transition: background-color 0.2s ease;
                    }
                    #fever-overlay.party-mode {
                        animation: disco 0.5s infinite alternate;
                    }
                    @keyframes disco {
                        0% { background-color: #ff00ff; box-shadow: inset 0 0 100px #00ffff; }
                        25% { background-color: #00ffff; box-shadow: inset 0 0 100px #ffff00; }
                        50% { background-color: #ffff00; box-shadow: inset 0 0 100px #ff00ff; }
                        75% { background-color: #000000; box-shadow: inset 0 0 100px #ffffff; }
                        100% { background-color: #ff0000; box-shadow: inset 0 0 100px #0000ff; }
                    }
                    #fever-overlay img {
                        max-width: 100%;
                        max-height: 80%;
                        object-fit: contain;
                        filter: drop-shadow(0 0 20px gold);
                    }
                    #timer {
                        color: gold;
                        font-size: 2.5em;
                        font-weight: bold;
                        margin-top: 10px;
                        text-shadow: 0 0 10px red, 0 0 20px black;
                        z-index: 110;
                    }
                    .party-sparkle {
                        position: absolute;
                        width: 10px;
                        height: 10px;
                        background: white;
                        border-radius: 50%;
                        animation: sparkle 1s infinite alternate;
                    }
                    @keyframes sparkle {
                        from { opacity: 0; transform: scale(0); }
                        to { opacity: 1; transform: scale(1.5); }
                    }
				</style>
			</head>
			<body>
                <div class="title">Idle Death Gamble</div>
                <p>Feeling lucky?</p>
                <button id="roll-btn">MANUAL ROLL</button>

                <div id="fever-overlay">
                    <div id="sparkles-container" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></div>
                    <img src="${danceUri}" alt="Hakari Dance">
                    <div id="timer">04:11:00</div>
                </div>

                <audio id="roll-audio" src="${rollUri}"></audio>
                <audio id="fever-audio" src="${feverUri}"></audio>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    const rollBtn = document.getElementById('roll-btn');
                    const rollAudio = document.getElementById('roll-audio');
                    const feverAudio = document.getElementById('fever-audio');
                    const feverOverlay = document.getElementById('fever-overlay');
                    const timerElement = document.getElementById('timer');
                    const sparklesContainer = document.getElementById('sparkles-container');

                    let animationFrame;

                    function createSparkle() {
                        const sparkle = document.createElement('div');
                        sparkle.classList.add('party-sparkle');
                        sparkle.style.left = Math.random() * 100 + '%';
                        sparkle.style.top = Math.random() * 100 + '%';
                        sparkle.style.background = \`hsl(\${Math.random() * 360}, 100%, 50%)\`;
                        sparklesContainer.appendChild(sparkle);
                        setTimeout(() => sparkle.remove(), 1000);
                    }

                    rollBtn.addEventListener('click', () => {
                        vscode.postMessage({ type: 'roll' });
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'playRoll':
                                rollAudio.currentTime = 0;
                                rollAudio.play().catch(e => console.error('Audio play failed', e));
                                break;
                            case 'startFever':
                                startFever();
                                break;
                            case 'stop':
                                stopAll();
                                break;
                        }
                    });

                    function startFever() {
                        feverOverlay.style.display = 'flex';
                        feverOverlay.classList.add('party-mode');
                        feverAudio.volume = 1.0;
                        feverAudio.loop = true;
                        feverAudio.currentTime = 0;
                        feverAudio.play().catch(e => console.error('Audio play failed', e));
                        
                        const sparkleInterval = setInterval(createSparkle, 200);

                        const duration = 4 * 60 * 1000 + 11 * 1000;
                        const endTime = Date.now() + duration;

                        function updateTimer() {
                            const now = Date.now();
                            const difference = endTime - now;

                            if (difference <= 0) {
                                clearInterval(sparkleInterval);
                                stopAll();
                                return;
                            }

                            // Fade out in last 5 seconds
                            if (difference < 5000) {
                                feverAudio.volume = Math.max(0, difference / 5000);
                            }

                            const minutes = Math.floor(difference / 60000);
                            const seconds = Math.floor((difference % 60000) / 1000);
                            const milliseconds = Math.floor((difference % 1000) / 10);

                            const minutesString = minutes.toString().padStart(2, '0');
                            const secondsString = seconds.toString().padStart(2, '0');
                            const millisecondsString = milliseconds.toString().padStart(2, '0');

                            timerElement.textContent = \`\${minutesString}:\${secondsString}:\${millisecondsString}\`;
                            animationFrame = requestAnimationFrame(updateTimer);
                        }
                        updateTimer();
                    }

                    function stopAll() {
                        feverOverlay.style.display = 'none';
                        feverOverlay.classList.remove('party-mode');
                        sparklesContainer.innerHTML = '';
                        rollAudio.pause();
                        rollAudio.currentTime = 0;
                        feverAudio.pause();
                        feverAudio.currentTime = 0;
                        if (animationFrame) {
                            cancelAnimationFrame(animationFrame);
                        }
                    }
                </script>
			</body>
			</html>`;
    }
}
