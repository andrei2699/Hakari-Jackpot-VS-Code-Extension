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
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('hakari.disableFlashingLights') || e.affectsConfiguration('hakari.feverSpeed')) {
                const config = vscode.workspace.getConfiguration('hakari');
                sidebarProvider.updateConfig(
                    config.get<boolean>('disableFlashingLights', false),
                    config.get<number>('feverSpeed', 1.0)
                );
            }
        })
    );

    context.subscriptions.push(jackpotManager, gambleCommand, taskListener);
}

export function deactivate() { }
