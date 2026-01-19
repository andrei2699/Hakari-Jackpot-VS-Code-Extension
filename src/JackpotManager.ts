import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';

export class JackpotManager {
    private isRolling: boolean = false;
    private isFever: boolean = false;
    private feverEndTime: number | undefined;
    private sidebar: SidebarProvider | undefined;
    private feverTimer: NodeJS.Timeout | undefined;
    private readonly feverDurationMs = 251000;
    private readonly rollDurationMs = 2000;

    constructor(context: vscode.ExtensionContext) {
    }

    public setSidebar(sidebar: SidebarProvider) {
        this.sidebar = sidebar;
    }

    public getFeverState() {
        return {
            isRolling: this.isRolling,
            isFever: this.isFever,
            feverEndTime: this.feverEndTime
        };
    }

    public async attemptGamble(manual: boolean = false) {
        if (this.isRolling) {
            return;
        }

        if (manual && this.isFever) {
            this.resetState();
        }

        if (this.isFever) {
            return;
        }

        this.isRolling = true;

        try {
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
        } catch (error) {
            console.error('Error during gamble:', error);
            this.isRolling = false;

            if (manual) {
                vscode.window.showErrorMessage("Gamble failed due to an error. State has been reset.");
            }
        }
    }

    public resetState() {
        this.isRolling = false;
        this.isFever = false;
        this.feverEndTime = undefined;
        if (this.feverTimer) {
            clearTimeout(this.feverTimer);
            this.feverTimer = undefined;
        }
        this.sidebar?.stop();
    }

    private triggerJackpot() {
        this.isRolling = false;
        this.isFever = true;
        this.feverEndTime = Date.now() + this.feverDurationMs;

        vscode.window.showInformationMessage("JACKPOT! FEVER TIME!");

        this.sidebar?.startFever();

        if (this.feverTimer) {
            clearTimeout(this.feverTimer);
        }

        this.feverTimer = setTimeout(() => {
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
        this.feverEndTime = undefined;
        this.sidebar?.stop();
        vscode.window.showInformationMessage("Fever mode ended.");
    }

    public dispose() {
    }
}
