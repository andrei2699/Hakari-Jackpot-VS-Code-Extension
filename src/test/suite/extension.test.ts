import * as assert from 'assert';
import * as vscode from 'vscode';
import { JackpotManager } from '../../JackpotManager';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('andrei2699.hakari-idle-death-gamble'));
    });

    test('Assets should exist', async () => {
        const ext = vscode.extensions.getExtension('andrei2699.hakari-idle-death-gamble');
        assert.ok(ext, 'Extension not found');

        const assetsUri = vscode.Uri.joinPath(ext.extensionUri, 'assets');

        const neededAssets = [
            'Hakari_logo.png',
            'Hakari_logo.svg',
            'TUCA_DONKA.mp4',
            'hakari-dance.gif',
            'jackpot.webm'
        ];

        for (const asset of neededAssets) {
            const assetUri = vscode.Uri.joinPath(assetsUri, asset);
            try {
                await vscode.workspace.fs.stat(assetUri);
                assert.ok(true, `${asset} found`);
            } catch (e) {
                assert.fail(`${asset} missing`);
            }
        }
    });

    test('JackpotManager should track state correctly', async () => {
        const mockContext = {
            extensionUri: vscode.Uri.file('/'),
            subscriptions: []
        } as any;

        const manager = new JackpotManager(mockContext);
        let state = manager.getFeverState();
        assert.strictEqual(state.isRolling, false);
        assert.strictEqual(state.isFever, false);
        assert.strictEqual(state.feverEndTime, undefined);
    });

    test('JackpotManager should not leak isRolling on error', async () => {
        const mockContext = { extensionUri: vscode.Uri.file('/'), subscriptions: [] } as any;
        const manager = new JackpotManager(mockContext);

        const mockSidebar = {
            playRoll: () => { throw new Error('Communication failed'); },
            stop: () => { },
            startFever: () => { },
            updateConfig: () => { }
        } as any;

        manager.setSidebar(mockSidebar);

        try {
            await manager.attemptGamble(true);
        } catch (e) {
            // Expected
        }

        const state = manager.getFeverState();
        assert.strictEqual(state.isRolling, false, 'isRolling should be reset after error');
    });

    test('Sidebar view should be registered', async () => {
        const extension = vscode.extensions.getExtension('andrei2699.hakari-idle-death-gamble')!;
        await extension.activate();
        assert.strictEqual(extension.isActive, true);
    });

    test('Configuration should include disableFlashingLights', () => {
        const config = vscode.workspace.getConfiguration('hakari');
        assert.notStrictEqual(config.get('disableFlashingLights'), undefined);
    });
});
