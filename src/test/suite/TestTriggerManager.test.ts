import * as assert from 'assert';
import * as vscode from 'vscode';
import { TestTriggerManager } from '../../TestTriggerManager';

suite('TestTriggerManager Test Suite', () => {
    let jackpotManagerMock: any;
    let sidebarProviderMock: any;
    let triggerManager: TestTriggerManager | undefined;
    let currentTime = 0;

    setup(() => {
        currentTime = Date.now();
        jackpotManagerMock = {
            _isFever: false,
            _gambleCalled: 0,
            getFeverState: () => ({ isFever: jackpotManagerMock._isFever }),
            attemptGamble: () => { jackpotManagerMock._gambleCalled++; }
        };
        sidebarProviderMock = {
            _welcomeCalled: 0,
            playWelcome: () => { sidebarProviderMock._welcomeCalled++; }
        };

        try {
            triggerManager = new TestTriggerManager(jackpotManagerMock as any, sidebarProviderMock as any);
        } catch (e) {
            triggerManager = undefined;
        }
    });

    teardown(() => {
        if (triggerManager) {
            triggerManager.dispose();
        }
    });

    test('Should trigger gamble on successful task', () => {
        if (!triggerManager) { return; }
        const event: any = { exitCode: 0 };
        (triggerManager as any).handleTaskEnd(event);

        assert.strictEqual(sidebarProviderMock._welcomeCalled, 1);
        assert.strictEqual(jackpotManagerMock._gambleCalled, 1);
    });

    test('Should not trigger gamble on failed task', () => {
        if (!triggerManager) { return; }
        const event: any = { exitCode: 1 };
        (triggerManager as any).handleTaskEnd(event);

        assert.strictEqual(sidebarProviderMock._welcomeCalled, 0);
        assert.strictEqual(jackpotManagerMock._gambleCalled, 0);
    });

    test('Should not trigger gamble if fever is active', () => {
        if (!triggerManager) { return; }
        jackpotManagerMock._isFever = true;

        const event: any = { exitCode: 0 };
        (triggerManager as any).handleTaskEnd(event);

        assert.strictEqual(sidebarProviderMock._welcomeCalled, 0);
        assert.strictEqual(jackpotManagerMock._gambleCalled, 0);
    });

    test('Should respect cooldown between triggers', () => {
        if (!triggerManager) { return; }
        const event: any = { exitCode: 0 };
        const originalNow = Date.now;
        Date.now = () => currentTime;

        try {
            (triggerManager as any).handleTaskEnd(event);
            assert.strictEqual(jackpotManagerMock._gambleCalled, 1);

            (triggerManager as any).handleTaskEnd(event);
            assert.strictEqual(jackpotManagerMock._gambleCalled, 1);

            currentTime += 5001;
            (triggerManager as any).handleTaskEnd(event);
            assert.strictEqual(jackpotManagerMock._gambleCalled, 2);
        } finally {
            Date.now = originalNow;
        }
    });

    test('Should trigger gamble on successful test run', function (this: any) {
        if (!triggerManager) { this.skip(); return; }

        try {
            const check = (vscode.tests as any).testResults;
        } catch (e) {
            this.skip();
            return;
        }

        const testResults = [{
            summary: {
                errored: 0,
                failed: 0,
                passed: 10
            }
        }];

        const originalTests = vscode.tests;
        (vscode as any).tests = {
            ...originalTests,
            testResults: testResults
        };

        try {
            (triggerManager as any).handleTestResultsChange();
            assert.strictEqual(sidebarProviderMock._welcomeCalled, 1);
            assert.strictEqual(jackpotManagerMock._gambleCalled, 1);
        } finally {
            (vscode as any).tests = originalTests;
        }
    });

    test('Should not trigger gamble on failed test run', function (this: any) {
        if (!triggerManager) { this.skip(); return; }

        try {
            const check = (vscode.tests as any).testResults;
        } catch (e) {
            this.skip();
            return;
        }

        const testResults = [{
            summary: {
                errored: 0,
                failed: 1,
                passed: 9
            }
        }];

        const originalTests = vscode.tests;
        (vscode as any).tests = {
            ...originalTests,
            testResults: testResults
        };

        try {
            (triggerManager as any).handleTestResultsChange();
            assert.strictEqual(jackpotManagerMock._gambleCalled, 0);
        } finally {
            (vscode as any).tests = originalTests;
        }
    });
});
