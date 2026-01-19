import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';

export class JackpotManager {
    private isRolling: boolean = false;
    private isFever: boolean = false;
    private sidebar: SidebarProvider | undefined;
    private readonly feverDurationMs = 251000;
    private readonly rollDurationMs = 2000;

    constructor(context: vscode.ExtensionContext) {
    }

    public setSidebar(sidebar: SidebarProvider) {
        this.sidebar = sidebar;
    }

    public async attemptGamble(manual: boolean = false) {
        if (this.isRolling || this.isFever) {
            if (manual) {
                vscode.window.showWarningMessage("Idle Death Gamble is already in progress!");
            }
            return;
        }

        this.isRolling = true;

        this.sidebar?.playRoll();

        const config = vscode.workspace.getConfiguration('hakari');
        const chance = config.get<number>('jackpotChance', 0.8);
        const roll = Math.random();

        const win = roll < chance;

        await new Promise(resolve => setTimeout(resolve, this.rollDurationMs));

        if (win) {
            this.triggerJackpot();
        } else {
            this.handleLoss();
        }
    }

    private triggerJackpot() {
        this.isRolling = false;
        this.isFever = true;

        vscode.window.showInformationMessage("JACKPOT! FEVER TIME!");

        this.sidebar?.startFever();

        setTimeout(() => {
            this.endFever();
        }, this.feverDurationMs);
    }

    private handleLoss() {
        this.isRolling = false;
        vscode.window.showInformationMessage("Tch... Missed.");
        this.sidebar?.stop();
    }

    private endFever() {
        this.isFever = false;
        this.sidebar?.stop();
        vscode.window.showInformationMessage("Fever mode ended.");
    }

    public dispose() {
    }
}
