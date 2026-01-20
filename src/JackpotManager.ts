import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';

export class JackpotManager {
    private isRolling: boolean = false;
    private isFever: boolean = false;
    private feverEndTime: number | undefined;
    private sidebar: SidebarProvider | undefined;
    private feverTimer: NodeJS.Timeout | undefined;

    private readonly feverDurationMs = 251000;
    private readonly rollBuildupDurationMs = 6000;
    private readonly winRevealDelayMs = 3000;

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

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Idle Death Gamble",
            cancellable: false
        }, async (progress) => {
            try {
                const config = vscode.workspace.getConfiguration('hakari');
                const chance = config.get<number>('jackpotChance', 0.8);
                const isWin = Math.random() < chance;

                this.sidebar?.playRoll(isWin, this.rollBuildupDurationMs);
                progress.report({ message: "Calculating luck..." });

                await new Promise(resolve => setTimeout(resolve, this.rollBuildupDurationMs));

                if (isWin) {
                    progress.report({ message: "JACKPOT REVEALED!" });
                    await new Promise(resolve => setTimeout(resolve, this.winRevealDelayMs));
                    this.triggerJackpot();
                } else {
                    this.handleLoss();
                }
            } catch (error) {
                this.isRolling = false;
                if (manual) {
                    vscode.window.showErrorMessage("Gamble failed. State reset.");
                }
            }
        });
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
        vscode.window.setStatusBarMessage("Tch... Missed.", 3000);
        this.sidebar?.playLoss();
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
