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
            'TUCA_DONKA.mp3',
            'hakari-dance.gif',
            'jackpot.mp3',
            'aw-dangit.mp3',
            'lets-go-gambling.mp3'
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

    test('Configuration should include disableFlashingLights and feverSpeed', () => {
        const config = vscode.workspace.getConfiguration('hakari');
        assert.notStrictEqual(config.get('disableFlashingLights'), undefined);
        assert.notStrictEqual(config.get('feverSpeed'), undefined);
        assert.strictEqual(typeof config.get('feverSpeed'), 'number');
    });

    test('Webview template files should exist', async () => {
        const ext = vscode.extensions.getExtension('andrei2699.hakari-idle-death-gamble');
        assert.ok(ext, 'Extension not found');

        const webviewFiles = [
            'src/webview/sidebar.html',
            'src/webview/sidebar.css',
            'src/webview/sidebar.js'
        ];

        for (const file of webviewFiles) {
            const fileUri = vscode.Uri.joinPath(ext.extensionUri, file);
            try {
                await vscode.workspace.fs.stat(fileUri);
                assert.ok(true, `${file} found`);
            } catch (e) {
                assert.fail(`${file} missing`);
            }
        }
    });

    test('Sidebar HTML template should contain required placeholders', async () => {
        const ext = vscode.extensions.getExtension('andrei2699.hakari-idle-death-gamble');
        assert.ok(ext, 'Extension not found');

        const htmlUri = vscode.Uri.joinPath(ext.extensionUri, 'src', 'webview', 'sidebar.html');
        const htmlContent = await vscode.workspace.fs.readFile(htmlUri);
        const html = Buffer.from(htmlContent).toString('utf8');

        const requiredPlaceholders = [
            '{{cssUri}}',
            '{{jsUri}}',
            '{{rollUri}}',
            '{{feverUri}}',
            '{{lossUri}}',
            '{{danceUri}}',
            '{{welcomeUri}}',
            '{{disableFlashingLights}}',
            '{{feverSpeed}}'
        ];

        for (const placeholder of requiredPlaceholders) {
            assert.ok(html.includes(placeholder), `Missing placeholder: ${placeholder}`);
        }
    });
});
