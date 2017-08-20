import * as vscode from 'vscode';
import * as request from 'request';
import * as md5 from 'md5';
import { ResultStorage } from './resultStorage';
import * as pluralize from 'pluralize';
import { PackageJsonProcessor} from './packageJsonProcessor';
import * as _ from 'lodash';

export class NodeDependencyProvider{
	constructor(private resultStorage: ResultStorage) {}

	public async evaluateDependecies(){
		let processor = new PackageJsonProcessor();
		try{
			let items = await processor.runShrinkwrap(vscode.workspace.rootPath);		
			let data = this.convertToNexusFormat(items);
			this.submitData(data);
		}
		catch(e){
			vscode.window.showErrorMessage("Nexus IQ extension: "+e);
			return;
		}
	}

	private submitData(data){
		let config = vscode.workspace.getConfiguration('nexusiq.npm');
		let url = config.get("url");
		let username = config.get("username");
		let password = config.get("password");
		let requestHash = md5(JSON.stringify(data));
		request.post(
			{
				method:'POST',
				url: url+'/api/v2/components/details',
				'json':data,
				'auth':{'user':username, 'pass':password}
			},
			(err, response, body)=>{
				if(err){
					vscode.window.showErrorMessage("Nexus IQ extension: Unable to evaluate - " + 	err);
					return;
				}
				this.showResult(requestHash, body);
			});
	}

	private showResult(requestHash, body){
		let jsonAsString = JSON.stringify(body,null,2);
		let componentsWithSecurityIssues = _.filter(body.componentDetails, (c:any)=>c.securityData.securityIssues.length > 0);
		let count = componentsWithSecurityIssues.length;
		vscode.window.showInformationMessage(`Evaluation done, ${count} ${pluralize('component',count)} with security issues`);
		this.resultStorage.saveResult(requestHash,jsonAsString);
		let uri = vscode.Uri.parse(`nexusiq.npm:${requestHash}`);
		vscode.window.showTextDocument(uri);
	}

	private convertToNexusFormat(dependencies:Array<any>){
		return {
			"components": _.map(dependencies, d => ({
				"hash":null,
				"componentIdentifier":{
					"format":"npm",
					"coordinates":{
						"packageId":d.name,
						"version":d.version
					}
				}
			}))
		};
	}				
}