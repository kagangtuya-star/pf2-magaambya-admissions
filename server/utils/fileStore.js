import {mkdir,readFile,rename,writeFile,unlink} from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
const queues=new Map();
export async function readJsonFile(filePath){return JSON.parse(await readFile(filePath,'utf8'));}
export async function writeJsonFile(filePath,data){
  await mkdir(path.dirname(filePath),{recursive:true});
  const tempPath=`${filePath}.${crypto.randomUUID()}.tmp`;
  try{await writeFile(tempPath,`${JSON.stringify(data,null,2)}\n`,'utf8');await rename(tempPath,filePath);}
  catch(error){await unlink(tempPath).catch(()=>{});throw error;}
}
/** Serializes read-modify-write transactions within this ONE Node process. */
export function updateJsonFile(filePath,update){
  const previous=queues.get(filePath)||Promise.resolve();
  const task=previous.catch(()=>{}).then(async()=>{
    const data=await readJsonFile(filePath);const next=await update(data);
    await writeJsonFile(filePath,next);return next;
  });
  queues.set(filePath,task);
  task.finally(()=>{if(queues.get(filePath)===task)queues.delete(filePath);}).catch(()=>{});
  return task;
}
