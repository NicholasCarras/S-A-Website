import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../server/worker.ts';
import {encrypt,decrypt} from '../server/auth.ts';
import {hash} from '../server/utils.ts';
import {runJobs} from '../server/jobs.ts';
import {slotStart} from '../server/google.ts';
import {foldICS,escapeICS} from '../server/calendar-export.ts';
class Statement {
 constructor(db,sql,values=[]){this.db=db;this.sql=sql;this.values=values;}
 bind(...values){return new Statement(this.db,this.sql,values);}
 execute(){const q=this.db.prepare(this.sql);if(q.columns().length){const results=q.all(...this.values);return {results,meta:{changes:/^\s*SELECT/i.test(this.sql)?0:results.length}};}const r=q.run(...this.values);return {results:[],meta:{changes:Number(r.changes)}};}
 async first(){return this.execute().results[0]||null;}
 async all(){return this.execute();}
 async run(){return this.execute();}
}
function setup(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));
 const DB={prepare:sql=>new Statement(sqlite,sql),async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const env={DB,ASSETS:{fetch:async()=>new Response('static')},APP_URL:'https://sa.example',ADMIN_EMAIL:'owner@example.com',GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret',TOKEN_ENCRYPTION_KEY:'ab'.repeat(32),GOOGLE_CALENDAR_ID:'primary',RESEND_API_KEY:'test-email-key',EMAIL_FROM:'S&A <bookings@example.com>'};
 const pending=[];const ctx={waitUntil:p=>pending.push(p)};
 const call=(path,method='GET',payload,headers={})=>worker.fetch(new Request(env.APP_URL+path,{method,headers:{...(method==='GET'?{}:{Origin:env.APP_URL,'Content-Type':'application/json'}),...headers},...(payload?{body:JSON.stringify(payload)}:{})}),env,ctx);
 return {env,sqlite,call,async drain(){while(pending.length)await Promise.all(pending.splice(0));}};
}
const tomorrow=()=>new Date(Date.now()+2*86400000).toISOString().slice(0,10);
const request=(more={})=>({id:crypto.randomUUID(),kind:'visit',name:'Test Customer',email:'customer@example.com',phone:'706-555-0100',address:'12 Sample Lane',city:'Dalton',postal:'30720',area:'1 acre',services:['lawn'],details:'Please mow and edge the yard.',language:'English',frequency:'One-time',preferredDate:tomorrow(),window:'Morning',website:'',consent:true,...more});
const review=()=>({id:crypto.randomUUID(),name:'Test Customer',email:'private@example.com',service:'lawn',rating:2,body:'The crew was polite but arrived late.',website:'',consent:true});
async function login(h,email='owner@example.com'){
 const start=await h.call('/auth/google');assert.equal(start.status,302);
 const url=new URL(start.headers.get('location')),state=url.searchParams.get('state');assert.ok(url.searchParams.get('code_challenge'));
 const cookie=start.headers.get('set-cookie').split(';')[0];
 const response=await h.call('/auth/callback?state='+state+'&code=test');assert.equal(response.status,400,'callback must require state cookie');
 const done=await h.call('/auth/callback?state='+state+'&code=test','GET',undefined,{Cookie:cookie});
 return {done,cookie:done.headers.getSetCookie().find(c=>c.startsWith('sa_session='))?.split(';')[0],state,stateCookie:cookie};
}
function providerMock(options={}){
 const calls=[];const original=globalThis.fetch;const events=new Map();
 globalThis.fetch=async(input,init={})=>{
 const url=String(input);calls.push({url,...init});
 if(url.includes('oauth2.googleapis.com/token'))return Response.json({access_token:'test-access',refresh_token:'test-refresh',scope:'openid email https://www.googleapis.com/auth/calendar.events'});
 if(url.includes('/userinfo'))return Response.json({email:options.email||'owner@example.com',email_verified:true});
 if(url.includes('api.resend.com'))return Response.json({id:'email'}, {status:options.failEmail?503:200});
 if(url.includes('/calendar/v3/')){
  if(!init.method||init.method==='GET')return Response.json({items:options.busy?[{id:'other-event',transparency:'opaque',status:'confirmed'}]:[]});
  const body=JSON.parse(init.body);
  if(init.method==='POST'){events.set(body.id,body);return Response.json(body);}
  const id=new URL(url).pathname.split('/').at(-1);if(!events.has(id))return Response.json({}, {status:404});events.set(id,body);return Response.json(body);
 }
 throw new Error('Unexpected provider URL '+url);
 };
 return {calls,events,restore(){globalThis.fetch=original;}};
}
test('owner authentication validates state, allowlist, replay, session expiry and logout',async()=>{
 const h=setup(),mock=providerMock();try{
 assert.equal((await h.call('/api/admin/requests')).status,401);
 const s=await login(h);assert.equal(s.done.status,302);assert.match(s.done.headers.getSetCookie()[0],/Secure/);assert.match(s.done.headers.getSetCookie()[0],/HttpOnly/);
 assert.equal((await h.call('/api/admin/requests','GET',undefined,{Cookie:s.cookie})).status,200);
 assert.equal((await h.call('/auth/callback?state='+s.state+'&code=test','GET',undefined,{Cookie:s.stateCookie})).status,400);
 const saved=h.sqlite.prepare('SELECT refresh_ciphertext FROM google_tokens').get();assert.ok(!saved.refresh_ciphertext.includes('test-refresh'));assert.equal(await decrypt(h.env,saved.refresh_ciphertext),'test-refresh');
 assert.equal((await h.call('/auth/logout','POST',undefined,{Cookie:s.cookie,Origin:'https://evil.example'})).status,403);
 assert.equal((await h.call('/auth/logout','POST',undefined,{Cookie:s.cookie})).status,303);
 assert.equal((await h.call('/api/admin/requests','GET',undefined,{Cookie:s.cookie})).status,401);
 const expired=await login(h);h.sqlite.exec('UPDATE sessions SET expires=0');assert.equal((await h.call('/api/admin/requests','GET',undefined,{Cookie:expired.cookie})).status,401);
 }finally{mock.restore();h.sqlite.close();}
 const bad=setup(),badMock=providerMock({email:'intruder@example.com'});try{const result=await login(bad);assert.equal(result.done.status,403);assert.equal(bad.sqlite.prepare('SELECT COUNT(*) count FROM sessions').get().count,0);}finally{badMock.restore();bad.sqlite.close();}
});
test('submissions persist once; calendar and email sync; review moderation never exposes email',async()=>{
 const h=setup(),mock=providerMock();try{
 const s=await login(h),headers={Cookie:s.cookie};const v=request();
 assert.equal((await h.call('/api/requests','POST',v)).status,201);await h.drain();
 assert.equal((await h.call('/api/requests','POST',v)).status,200);await h.drain();
 assert.equal(h.sqlite.prepare('SELECT COUNT(*) count FROM requests').get().count,1);
 assert.equal(mock.calls.filter(c=>c.url.includes('resend.com')).length,2);assert.equal(mock.events.size,1);assert.equal([...mock.events.values()][0].transparency,'transparent');
 assert.equal((await h.call('/api/admin/requests','PATCH',{id:v.id,status:'confirmed'},headers)).status,200);await h.drain();assert.equal(mock.events.size,1);assert.equal([...mock.events.values()][0].transparency,'opaque');
 const second=request();await h.call('/api/requests','POST',second);await h.drain();assert.equal((await h.call('/api/admin/requests','PATCH',{id:second.id,status:'confirmed'},headers)).status,409);
 assert.equal(h.sqlite.prepare('SELECT status FROM requests WHERE id=?').get(second.id).status,'pending');
 const rev=review();assert.equal((await h.call('/api/reviews','POST',rev)).status,201);await h.drain();assert.equal((await (await h.call('/api/reviews')).json()).reviews.length,0);
 assert.equal((await h.call('/api/admin/reviews','PATCH',{id:rev.id,status:'approved'},headers)).status,200);const publicRows=await (await h.call('/api/reviews')).json();assert.equal(publicRows.reviews[0].rating,2);assert.equal(publicRows.reviews[0].email,undefined);
 const calendar=await h.call('/api/admin/calendar','GET',undefined,headers);assert.match(await calendar.text(),/BEGIN:VCALENDAR/);
 assert.equal((await h.call('/api/admin/calendar')).status,401);
 }finally{await h.drain();mock.restore();h.sqlite.close();}
});
test('provider failure keeps records and durable jobs; retry completes without creating another request',async()=>{
 const h=setup(),fail=providerMock({failEmail:true});try{
 await login(h);const v=request({kind:'quote',preferredDate:null,window:null});assert.equal((await h.call('/api/requests','POST',v)).status,201);await h.drain();
 assert.equal(h.sqlite.prepare('SELECT COUNT(*) count FROM requests').get().count,1);assert.equal(h.sqlite.prepare("SELECT COUNT(*) count FROM jobs WHERE state='pending' AND last_error IS NOT NULL").get().count,2);
 fail.restore();const good=providerMock();try{h.sqlite.exec('UPDATE jobs SET next_attempt=0');await Promise.all([runJobs(h.env),runJobs(h.env)]);assert.equal(good.calls.filter(c=>c.url.includes('resend.com')).length,2);assert.equal(h.sqlite.prepare("SELECT COUNT(*) count FROM jobs WHERE state='done'").get().count,2);}finally{good.restore();}
 }finally{fail.restore();h.sqlite.close();}
});
test('Google busy events block confirmation and rescheduling updates existing event',async()=>{
 const h=setup(),busy=providerMock({busy:true});try{
 const s=await login(h);const v=request();await h.call('/api/requests','POST',v);await h.drain();const r=await h.call('/api/admin/requests','PATCH',{id:v.id,status:'confirmed'},{Cookie:s.cookie});assert.equal(r.status,409);assert.equal(h.sqlite.prepare('SELECT status FROM requests').get().status,'pending');
 const date=new Date(Date.now()+4*86400000).toISOString().slice(0,10);assert.equal((await h.call('/api/admin/requests','PATCH',{id:v.id,status:'pending',preferredDate:date,window:'Afternoon'},{Cookie:s.cookie})).status,200);await h.drain();assert.equal(busy.events.size,1);assert.match([...busy.events.values()][0].start.dateTime,new RegExp('^'+date));
 }finally{await h.drain();busy.restore();h.sqlite.close();}
});
test('CSRF, invalid input, size caps, honeypots, and rate limits reject bad submissions',async()=>{
 const h=setup();try{
 assert.equal((await h.call('/api/requests','POST',request(),{Origin:'https://evil.example'})).status,403);
 assert.equal((await h.call('/api/requests','POST',request({website:'spam'}))).status,400);
 assert.equal((await h.call('/api/requests','POST',request({preferredDate:'2027-02-30'}))).status,400);
 assert.equal((await h.call('/api/requests','POST',request({details:'x'.repeat(20000)}))).status,413);
 for(let i=0;i<10;i++)await h.call('/api/requests','POST',{});
 assert.equal((await h.call('/api/requests','POST',request())).status,429);
 assert.equal(h.sqlite.prepare('SELECT COUNT(*) count FROM requests').get().count,0);
 }finally{h.sqlite.close();}
});
test('DST, encryption tampering, hashed sessions and safe calendar line folding',async()=>{
 const h=setup();try{
 assert.equal(slotStart('2027-01-15','Morning').toISOString(),'2027-01-15T14:00:00.000Z');assert.equal(slotStart('2027-07-15','Afternoon').toISOString(),'2027-07-15T17:00:00.000Z');
 const encrypted=await encrypt(h.env,'secret');const changed=JSON.parse(encrypted);changed.data[0]^=1;await assert.rejects(decrypt(h.env,JSON.stringify(changed)));
 assert.notEqual(await hash('cookie-value'),'cookie-value');
 const folded=foldICS('DESCRIPTION:'+('🌱,résumé;'.repeat(30)));for(const line of folded.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);assert.equal(folded.replace(/\r\n /g,''),'DESCRIPTION:'+('🌱,résumé;'.repeat(30)));assert.equal(escapeICS('line\nBEGIN:VEVENT'),'line\\nBEGIN:VEVENT');
 }finally{h.sqlite.close();}
});
