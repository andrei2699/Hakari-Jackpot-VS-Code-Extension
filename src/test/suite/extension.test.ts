import * as assert from 'assert';
import * as vscode from 'vscode';

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

    test('Sidebar view should be registered', async () => {
        const ext = vscode.extensions.getExtension('andrei2699.hakari-idle-death-gamble');
        assert.ok(ext, 'Extension not found');

        await ext.activate();

        assert.ok(ext.isActive, 'Extension should be active');
    });
});
