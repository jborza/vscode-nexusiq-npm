export interface ResultStorage{
    saveResult(hash:string, result:any);
    retrieveResult(hash:string):any;
}