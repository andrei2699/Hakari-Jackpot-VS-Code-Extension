import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            if (data.type === 'roll') {
                this._jackpotManager.attemptGamble(true);
            }
        });

        this._resumeFeverIfActive();
    }

    private _resumeFeverIfActive() {
        const state = this._jackpotManager.getFeverState();
        if (state.isFever && state.feverEndTime) {
            const remainingDuration = state.feverEndTime - Date.now();
            if (remainingDuration > 0) {
                setTimeout(() => {
                    this._view?.webview.postMessage({ type: 'startFever', duration: remainingDuration });
                }, 500);
            }
        }
    }

    public playRoll(isWin: boolean, duration: number) {
        this._view?.webview.postMessage({ type: 'playRoll', isWin, duration });
    }

    public startFever() {
        this._view?.webview.postMessage({ type: 'startFever' });
    }

    public stop() {
        this._view?.webview.postMessage({ type: 'stop' });
    }

    public updateConfig(disableFlashingLights: boolean) {
        this._view?.webview.postMessage({ type: 'updateConfig', disableFlashingLights });
    }

    public playLoss() {
        this._view?.webview.postMessage({ type: 'playLoss' });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const assetUris = this._getAssetUris(webview);
        const webviewUris = this._getWebviewResourceUris(webview);
        const disableFlashingLights = this._getFlashingLightsConfig();

        const htmlTemplatePath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'sidebar.html');
        const htmlTemplate = fs.readFileSync(htmlTemplatePath, 'utf8');

        return this._populateTemplate(htmlTemplate, {
            ...assetUris,
            ...webviewUris,
            disableFlashingLights: disableFlashingLights.toString()
        });
    }

    private _getAssetUris(webview: vscode.Webview) {
        return {
            rollUri: webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'jackpot.mp3')),
            feverUri: webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'TUCA_DONKA.mp3')),
            lossUri: webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'aw-dangit.mp3')),
            danceUri: webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'hakari-dance.gif'))
        };
    }

    private _getWebviewResourceUris(webview: vscode.Webview) {
        return {
            cssUri: webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'sidebar.css')),
            jsUri: webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'sidebar.js'))
        };
    }

    private _getFlashingLightsConfig(): boolean {
        const config = vscode.workspace.getConfiguration('hakari');
        return config.get<boolean>('disableFlashingLights', false);
    }

    private _populateTemplate(template: string, replacements: Record<string, string | vscode.Uri>): string {
        return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
            const value = replacements[key];
            return value !== undefined ? value.toString() : match;
        });
    }
}
