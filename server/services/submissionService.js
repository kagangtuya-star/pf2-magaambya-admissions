import crypto from 'node:crypto';
import {SUBMISSIONS_PATH} from '../constants.js';
import {readJsonFile,updateJsonFile} from '../utils/fileStore.js';
export async function listSubmissions(){return (await readJsonFile(SUBMISSIONS_PATH)).items;}
export async function createSubmission(payload){
  let item;
  await updateJsonFile(SUBMISSIONS_PATH,current=>{
    const existing=current.items.find(s=>s.attempt_id===payload.attempt_id);
    if(existing){item=existing;return current;}
    const now=new Date().toISOString();
    item={id:`sub_${crypto.randomUUID()}`,...payload,status:'submitted',review_note:'',created_at:now,updated_at:now};
    return {items:[item,...current.items],updated_at:now};
  });
  return item;
}
export async function getSubmissionById(id){return (await listSubmissions()).find(s=>s.id===id)||null;}
export async function updateSubmission(id,patch){
  let result=null;
  await updateJsonFile(SUBMISSIONS_PATH,data=>{
    const now=new Date().toISOString();
    const items=data.items.map(item=>{if(item.id!==id)return item;result={...item,...patch,updated_at:now};return result;});
    return {...data,items,updated_at:now};
  });return result;
}
export async function getSubmissionStats(){
  const items=await listSubmissions();
  return {total_submissions:items.length,submitted_count:items.filter(i=>i.status==='submitted').length,
    reviewed_count:items.filter(i=>i.status==='reviewed').length,archived_count:items.filter(i=>i.status==='archived').length,last_submission_at:items[0]?.created_at||null};
}
