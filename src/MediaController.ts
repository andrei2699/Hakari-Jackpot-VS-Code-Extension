import * as vscode from 'vscode';

export class MediaController {
    private audioPanel: vscode.WebviewPanel | undefined;
    private dancerPanel: vscode.WebviewPanel | undefined;
    private extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.extensionUri = context.extensionUri;
    }

    public async playRollSound() {
        this.ensureAudioPanel();
        if (this.audioPanel) {
            this.audioPanel.webview.postMessage({ command: 'playRoll' });
        }
    }

    public async startFever() {
        this.ensureAudioPanel();
        this.createDancerPanel();

        if (this.audioPanel) {
            this.audioPanel.webview.postMessage({ command: 'playFever' });
        }
    }

    public stopFever() {
        if (this.audioPanel) {
            this.audioPanel.webview.postMessage({ command: 'stop' });
        }
        if (this.dancerPanel) {
            this.dancerPanel.dispose();
            this.dancerPanel = undefined;
        }
    }

    public stopAudio() {
        if (this.audioPanel) {
            this.audioPanel.webview.postMessage({ command: 'stop' });
        }
    }

    private ensureAudioPanel() {
        if (this.audioPanel) {
            return;
        }

        this.audioPanel = vscode.window.createWebviewPanel(
            'hakariAudio',
            'Hakari Audio',
            { viewColumn: vscode.ViewColumn.Active, preserveFocus: true },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'assets')]
            }
        );

        this.audioPanel.webview.html = this.getAudioWebviewContent(this.audioPanel.webview);

        this.audioPanel.onDidDispose(() => {
            this.audioPanel = undefined;
        }, null, this.disposables);
    }

    private createDancerPanel() {
        if (this.dancerPanel) {
            this.dancerPanel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        const config = vscode.workspace.getConfiguration('hakari');
        const positionPref = config.get<string>('gifPosition', 'Beside');
        const viewColumn = positionPref === 'Beside' ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active;

        this.dancerPanel = vscode.window.createWebviewPanel(
            'hakariDancer',
            'Idle Death Gamble',
            viewColumn,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'assets')]
            }
        );

        this.dancerPanel.webview.html = this.getDancerWebviewContent(this.dancerPanel.webview);

        this.dancerPanel.onDidDispose(() => {
            this.dancerPanel = undefined;
            this.stopAudio();
        }, null, this.disposables);
    }

    private getAudioWebviewContent(webview: vscode.Webview): string {
        const rollUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'assets', 'roll.wav'));
        const feverUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'assets', 'fever_theme.mp3'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Hakari Audio</title>
        </head>
        <body>
            <audio id="roll" src="${rollUri}"></audio>
            <audio id="fever" src="${feverUri}"></audio>
            <script>
                const rollAudio = document.getElementById('roll');
                const feverAudio = document.getElementById('fever');
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'playRoll':
                            rollAudio.currentTime = 0;
                            rollAudio.play();
                            break;
                        case 'playFever':
                            feverAudio.currentTime = 0;
                            feverAudio.play();
                            break;
                        case 'stop':
                            rollAudio.pause();
                            feverAudio.pause();
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }

    private getDancerWebviewContent(webview: vscode.Webview): string {
        const danceUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'assets', 'dancer.gif'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: black;
                    overflow: hidden;
                    position: relative;
                }
                img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }
                #timer-container {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-weight: bold;
                    font-size: 3rem;
                    color: gold;
                    text-shadow: 0 0 10px red, 0 0 20px orange;
                    z-index: 10;
                    pointer-events: none;
                    animation: pulse 1s infinite alternate;
                }
                @keyframes pulse {
                    from { transform: scale(1); opacity: 0.9; }
                    to { transform: scale(1.1); opacity: 1; }
                }
            </style>
        </head>
        <body>
            <img src="${danceUri}" alt="Hakari Dance" />
            <div id="timer-container">04:11:00</div>
            <script>
                // Format: MM:SS:ms (2 digits)
                let duration = 4 * 60 * 1000 + 11 * 1000; // 4m 11s
                const endTime = Date.now() + duration;
                const timerEl = document.getElementById('timer-container');

                function updateTimer() {
                    const now = Date.now();
                    const diff = endTime - now;

                    if (diff <= 0) {
                        timerEl.textContent = "00:00:00";
                        return;
                    }

                    const m = Math.floor(diff / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    const ms = Math.floor((diff % 1000) / 10); // 2 digits

                    const mStr = m.toString().padStart(2, '0');
                    const sStr = s.toString().padStart(2, '0');
                    const msStr = ms.toString().padStart(2, '0');

                    timerEl.textContent = \`\${mStr}:\${sStr}:\${msStr}\`;
                    requestAnimationFrame(updateTimer);
                }

                updateTimer();
            </script>
        </body>
        </html>`;
    }

    public dispose() {
        this.stopFever();
        this.audioPanel?.dispose();
        this.dancerPanel?.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
