import * as vscode from 'vscode';
import { JackpotManager } from './JackpotManager';
import { SidebarProvider } from './SidebarProvider';

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

    const sidebarProvider = new SidebarProvider(context.extensionUri, jackpotManager);
    jackpotManager.setSidebar(sidebarProvider);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
    );

    context.subscriptions.push(jackpotManager, gambleCommand, taskListener);
}

export function deactivate() { }
