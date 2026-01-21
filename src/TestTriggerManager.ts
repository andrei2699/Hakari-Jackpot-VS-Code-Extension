import * as vscode from 'vscode';
import { JackpotManager } from './JackpotManager';
import { SidebarProvider } from './SidebarProvider';

export class TestTriggerManager {
    private lastGambleTriggerTime = 0;
    private readonly gambleCooldownMs = 5000;
    private subscriptions: vscode.Disposable[] = [];

    constructor(
        private readonly jackpotManager: JackpotManager,
        private readonly sidebarProvider: SidebarProvider
    ) {
        this.registerListeners();
    }

    private registerListeners() {
        this.subscriptions.push(
            vscode.tasks.onDidEndTaskProcess(event => this.handleTaskEnd(event))
        );

        try {
            const tests = vscode.tests as any;
            if (tests && typeof tests.onDidChangeTestResults === 'function') {
                this.subscriptions.push(
                    tests.onDidChangeTestResults(() => this.handleTestResultsChange())
                );
            }
        } catch (error) {
            console.log('Testing API not available');
        }
    }

    private handleTaskEnd(event: vscode.TaskProcessEndEvent) {
        if (event.exitCode === 0 && this.shouldTriggerGamble()) {
            this.triggerGamble();
        }
    }

    private handleTestResultsChange() {
        if (this.isLastTestRunSuccessful() && this.shouldTriggerGamble()) {
            this.triggerGamble();
        }
    }

    private isLastTestRunSuccessful(): boolean {
        try {
            const testResults = (vscode.tests as any).testResults;
            if (!testResults || testResults.length === 0) {
                return false;
            }

            const mostRecentResult = testResults[0];
            const summary = mostRecentResult.summary;
            if (!summary) {
                return false;
            }

            const hasFailures = (summary.errored || 0) > 0 || (summary.failed || 0) > 0;
            const hasPassed = (summary.passed || 0) > 0;

            return !hasFailures && hasPassed;
        } catch {
            return false;
        }
    }

    private shouldTriggerGamble(): boolean {
        const config = vscode.workspace.getConfiguration('hakari');
        const isTriggerEnabled = config.get<boolean>('triggerOnTestSuccess', true);
        const isFeverActive = this.jackpotManager.getFeverState().isFever;

        if (!isTriggerEnabled || isFeverActive) {
            return false;
        }

        const now = Date.now();
        if (now - this.lastGambleTriggerTime < this.gambleCooldownMs) {
            return false;
        }

        return true;
    }

    private triggerGamble() {
        this.lastGambleTriggerTime = Date.now();
        this.sidebarProvider.playWelcome();
        this.jackpotManager.attemptGamble();
    }

    public dispose() {
        this.subscriptions.forEach(s => s.dispose());
        this.subscriptions = [];
    }
}
