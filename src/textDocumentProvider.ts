import * as vscode from 'vscode';
import { ResultStorage } from './resultStorage';

export class TextDocumentProvider implements vscode.TextDocumentContentProvider, ResultStorage{
    constructor(){
        this.map = {};
    }
    private map;

    static scheme = 'nexusiq.npm';
    provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
        return this.retrieveResult(uri.path);  
    }        

    public saveResult(requestHash:string, result:any){
        this.map[requestHash] = result;
    }

    public retrieveResult(hash:string){
        return this.map[hash];
    }
}