import * as vscode from 'vscode';
import { JackpotManager } from './JackpotManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Idle Death Gamble is active. Good luck.');

    const jackpotManager = new JackpotManager(context);

    const gambleCommand = vscode.commands.registerCommand('hakari.gamble', () => {
        jackpotManager.attemptGamble(true);
    });

    const taskListener = vscode.tasks.onDidEndTaskProcess(event => {
        const config = vscode.workspace.getConfiguration('hakari');
        const triggerOnSuccess = config.get<boolean>('triggerOnTestSuccess', true);

        if (!triggerOnSuccess) {
            return;
        }

        if (event.exitCode === 0) {
            jackpotManager.attemptGamble();
        }
    });

    context.subscriptions.push(jackpotManager, gambleCommand, taskListener);
}

export function deactivate() { }
