import * as vscode from 'vscode';
import { JackpotManager } from './JackpotManager';
import { SidebarProvider } from './SidebarProvider';
import { TestTriggerManager } from './TestTriggerManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Idle Death Gamble is active. Good luck.');

    const jackpotManager = new JackpotManager(context);

    const gambleCommand = vscode.commands.registerCommand('hakari.gamble', () => {
        jackpotManager.attemptGamble(true);
    });

    const sidebarProvider = new SidebarProvider(context.extensionUri, jackpotManager);
    jackpotManager.setSidebar(sidebarProvider);

    const testTriggerManager = new TestTriggerManager(jackpotManager, sidebarProvider);

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
                    config.get<number>('feverSpeed', 2.5)
                );
            }
        })
    );

    context.subscriptions.push(jackpotManager, gambleCommand, testTriggerManager);
}

export function deactivate() { }
