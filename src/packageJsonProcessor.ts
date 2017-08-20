import * as fs from 'fs';
import {exec} from './exec';
import * as path from 'path';
import * as _ from 'lodash';

export class PackageJsonProcessor{
    public async runShrinkwrap(workspaceRoot:string):Promise<Array<NpmPackage>>{
        if(workspaceRoot === undefined)
            return Promise.reject("No workspace opened");
        const packageJsonPath = path.join(workspaceRoot, 'package.json');
        if (this.pathExists(packageJsonPath) == false) {
            return Promise.reject('Workspace has no package.json');
        }
        try{
            let { stdout, stderr} = await exec("npm shrinkwrap",{cwd:workspaceRoot});
			if (stdout) {
				let lines = stdout.split(/\r{0,1}\n/);
                //read npm-shrinkwrap.json
				let obj = JSON.parse(fs.readFileSync(path.join(workspaceRoot,"npm-shrinkwrap.json"), "utf8"));
				return this.flattenAndUniqDependencies(obj);
			}
		}
		catch(e){
            return Promise.reject('npm shrinkwrap failed, try running it manually to see what went wrong');
		}
    }

    private flattenAndUniqDependencies(npmShrinkwrapContents):NpmPackage[]{
        //first level in npm-shrinkwrap is our project package, we go a level deeper not to include it in the results
        let flatDependencies = this.flattenDependencies(this.extractInfo(npmShrinkwrapContents.dependencies));
        flatDependencies = _.uniqBy(flatDependencies, x=>x.toString());
        return flatDependencies;
    }
    
    private pathExists(p: string): boolean {
		try {
            fs.accessSync(p);
            return true;
		} catch (err) {
			return false;
        }
	}
    
    //extracts array with name, version, dependencies from a dictionary
    private extractInfo(array:any):NpmPackage[]{
        return Object.keys(array).map(k=>new NpmPackage(k, 
                array[k].version,
                 array[k].dependencies));            
    }

    private flattenDependencies(dependencies):NpmPackage[]{
        let result = new Array<NpmPackage>();
        for(let dependency of dependencies){
            result.push(dependency);
            if(dependency.dependencies){
                result = result.concat(this.flattenDependencies(this.extractInfo(dependency.dependencies)));
            }
        }
        return result;
    }
}

export class NpmPackage{
    constructor(public name:string,
        public version:string,
        public dependencies:any)
        {}

    public toString(){
        return `${this.name}@${this.version}`;
    }
}