'use strict';
import * as vscode from 'vscode';

import {NodeDependencyProvider} from './nodeDependencyProvider';
import {TextDocumentProvider} from './textDocumentProvider';
import { ResultStorage } from './resultStorage';

export function activate(context: vscode.ExtensionContext) {

    const textDocumentProvider = new TextDocumentProvider();
	const nodeDependencyProvider = new NodeDependencyProvider(textDocumentProvider);
	
    context.subscriptions.push(vscode.commands.registerCommand('nexusiq.npm.evaluate', () => {
        nodeDependencyProvider.evaluateDependecies();
    }));
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(TextDocumentProvider.scheme,
        textDocumentProvider));
}

// this method is called when your extension is deactivated
export function deactivate() {    
}