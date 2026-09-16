const fail=message=>{const e=new Error(message);e.status=400;throw e;};
const text=(v,label,max=10000,empty=false)=>{
  if(typeof v!=='string'||(!empty&&!v.trim())||v.length>max)fail(`${label}需为${empty?'':'非空'}文本，且不超过 ${max} 字。`);
  return v;
};
const array=(v,label,max)=>{if(!Array.isArray(v)||v.length>max)fail(`${label}必须为数组，且不超过 ${max} 项。`);return v;};
const safeId=(value,label)=>{text(value,label,80);if(!/^[a-zA-Z0-9_-]+$/.test(value)||['__proto__','constructor','prototype'].includes(value))fail(`${label}只能使用字母、数字、下划线与短横线。`);return value;};
const unique=(items,key,label)=>{const keys=items.map(x=>x[key]);if(new Set(keys).size!==keys.length)fail(`${label}不可重复。`);};
export function validateContent(body){
  const riddles=array(body.page1_riddles,'启封题',40).map((q,i)=>{
    const options=array(q.options,'选项',12).map(o=>({key:safeId(o.key,'选项键'),text:text(o.text,'选项内容',2000)}));
    if(options.length<2)fail(`启封题 ${i+1} 至少需要两个选项。`);
    unique(options,'key','同一题的选项键');
    if(!options.some(o=>o.key===q.correct_key))fail(`启封题 ${i+1} 的正确选项不存在。`);
    return {id:safeId(q.id,'题号'),question:text(q.question,'启封题题目',5000),options,correct_key:q.correct_key};
  });
  unique(riddles,'id','启封题题号');
  const groups=array(body.page2_exam,'阅读材料',40).map(g=>{
    const questions=array(g.questions,'问答题',30).map(q=>{
      if(!Number.isFinite(q.points)||q.points<0||q.points>1000)fail('题目分值必须在 0 到 1000 之间。');
      return {id:safeId(q.id,'问答题号'),question:text(q.question,'问答题目',5000),
        placeholder:text(q.placeholder??'','输入提示',500,true),points:q.points,required:q.required!==false};
    });
    if(!questions.length)fail('每份阅读材料至少需要一道问答题。');
    return {group_id:safeId(g.group_id,'材料编号'),...(g.title?{title:text(g.title,'材料标题',100)}:{}),
      reading_material:text(g.reading_material,'阅读材料',30000),questions};
  });
  if(!groups.length)fail('至少需要一份阅读材料。');
  unique(groups,'group_id','材料编号');unique(groups.flatMap(g=>g.questions),'id','问答题号');
  return {page1_riddles:riddles,page2_exam:groups};
}
export function validateSettings(body){
  if(typeof body.submission_enabled!=='boolean')fail('接收答卷开关必须为布尔值。');
  return {unlock_spell:text(body.unlock_spell,'启匣口令',128).trim(),site_title:text(body.site_title,'页面标题',80).trim(),
    submission_enabled:body.submission_enabled};
}
export function validateReview(body){
  if(!['submitted','reviewed','archived'].includes(body.status))fail('审阅状态无效。');
  return {status:body.status,review_note:text(body.review_note??'','审阅意见',10000,true)};
}
