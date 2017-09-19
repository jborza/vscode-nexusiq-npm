import * as vscode from 'vscode';
import * as request from 'request';
import * as md5 from 'md5';
import { ResultStorage } from './resultStorage';
import * as pluralize from 'pluralize';
import { PackageJsonProcessor} from './packageJsonProcessor';
import * as _ from 'lodash';
import * as fs from 'fs';

export class NodeDependencyProvider{
	constructor(private resultStorage: ResultStorage) {}

	public async evaluateDependecies(){
		let processor = new PackageJsonProcessor();
		try{
			let items = await processor.runShrinkwrap(vscode.workspace.rootPath);		
			let data = this.convertToNexusFormat(items);
			this.submitDataToComponentDetailsApi(data);
		}
		catch(e){
			vscode.window.showErrorMessage("Nexus IQ extension: "+e);
			return;
		}
	}

	private submitDataToEvaluationApi(data){
		let config = vscode.workspace.getConfiguration('nexusiq.npm');
		let url = config.get("url");
		let username = config.get("username");
		let password = config.get("password");
		let applicationName = config.get("application");
		let requestHash = md5(JSON.stringify(data));
		//TODO retrieve application ID
		request.post(
			{
				method:'POST',
				url: url+'/api/v2/evaluation/applications/1d7b1795c01941aa911bfdba8a557b8d',
				'json':data,
				'auth':{'user':username, 'pass':password}
			},
			(err,response,body)=>{
				//result: body.resultsUrl
				request.get(url+'/'+body.resultsUrl,{'auth':{'user':username, 'pass':password}},(err,response,body)=>{
					fs.writeFileSync(vscode.workspace.rootPath+'/'+'eval-'+requestHash,JSON.stringify(JSON.parse(body),null,2));
				});				
			}
		);
	}

	private submitDataToComponentDetailsApi(data){
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
				fs.writeFileSync(vscode.workspace.rootPath+'/'+'details-'+requestHash,JSON.stringify(body,null,2));
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