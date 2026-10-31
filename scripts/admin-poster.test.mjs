import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { test } from 'node:test';
import { requireLocal } from './episode-guides/register-local.mjs';

let networkAttempts=0;
const forbidden=()=>{networkAttempts++;throw Error('NETWORK_FORBIDDEN')};
globalThis.fetch=forbidden;http.get=http.request=https.get=https.request=forbidden;
const ts=requireLocal('typescript');
const rating=requireLocal('../../src/app/lib/movies/rating.ts');
export function load(path,resolve,extras={}){
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mod={exports:{}};
 new Function('require','module','exports',...Object.keys(extras),code)(resolve,mod,mod.exports,...Object.values(extras));
 return mod.exports;
}
export function fixture({writeError=false,stale=false,missing=false,authorized=true,readMode='ok',absent=false,credentials=true,draft=null,draftReadError=false}={}){
 const base={id:1,slug:'fixture',canonicalMovieId:'canonical-fixture',title:'Fixture',type:'Фильм',poster:'/provider-old.svg',posterFallbacks:['/provider-fallback.svg'],genres:[],facts:[],rating:7};
 const rows={control:{slug:'control',data:{poster:'/control.svg',rating:6,custom:{control:true}}}};
 if(!absent)rows.fixture={slug:'fixture',data:{poster:'/manual-old.svg',posterFallbacks:['/stale-provider.svg'],rating:8,custom:{keep:true}}};
 let writes=0;
 const client={from(table){
  if(table==='movie_drafts')return {select(){return this},eq(){return this},async maybeSingle(){return {data:draft,error:draftReadError?Error('draft-read'):null}}};
  assert.equal(table,'movie_overrides');
  let selectedSlug;
  return {
   select(){return this},eq(key,value){assert.equal(key,'slug');selectedSlug=value;return this},async maybeSingle(){
    if(readMode==='throw')throw Error('private-db-read-detail');
    if(readMode==='error')return {data:null,error:Error('private-db-read-detail')};
    if(readMode==='invalid')return {data:{data:[]},error:null};
    return {data:rows[selectedSlug]??null,error:null};
   },
   upsert(next,options){
    assert.equal(options.onConflict,'slug');writes++;
    if(!writeError&&!stale)rows[next.slug]=structuredClone(next);
    return {select(columns){
     assert.equal(columns,'slug, data');
     return {async single(){return {data:missing?null:rows[next.slug],error:writeError instanceof Error?writeError:writeError?new Error('private-db-write-detail'):null}}};
    }};
   }
  };
 }};
 const movies=load('src/app/lib/movies/movieOverrides.ts',id=>{
  if(id==='react')return {cache:fn=>fn};
  if(id==='../../data/movies')return {movies:[base],sanitizeMovieForPublicDisplay:m=>m};
  if(id==='../supabase/admin')return {getSupabaseAdmin:()=>client,hasRealSupabaseAdminCredentials:()=>credentials};
  if(id==='./rating')return rating;
  if(id==='./verifiedCredits')return {attachVerifiedCredits:m=>m};
  if(id==='../episodeGuides/movieIntegration')return {attachVerifiedEpisodeGuide:async m=>m};
  throw Error('Unexpected import '+id);
 });
 const invalidations=[];
 const route=load('src/app/api/admin/movies/[slug]/override/route.ts',id=>{
  if(id==='next/cache')return {revalidatePath:path=>invalidations.push(path)};
  if(id.endsWith('/import/adminAuth'))return {assertAdminAccess:async()=>authorized?null:Response.json({error:'Unauthorized'},{status:401}),getAdminUserFromRequest:async()=>({email:'fixture@example.invalid'})};
  if(id.endsWith('/movies/movieOverrides'))return movies;
  if(id.endsWith('/movies/rating'))return rating;
  if(id.endsWith('/players'))return {extractRendexVideoId:()=>''};
  throw Error('Unexpected import '+id);
 });
 return {movies,base,invalidations,row:()=>rows.fixture??null,control:()=>rows.control,state:()=>structuredClone(rows),setReadMode:mode=>{readMode=mode},writes:()=>writes,put:body=>route.PUT(new Request('http://localhost/api/admin/movies/fixture/override',{method:'PUT',body:JSON.stringify(body)}),{params:Promise.resolve({slug:'fixture'})}),remove:()=>route.DELETE(new Request('http://localhost/api/admin/movies/fixture/override',{method:'DELETE'}),{params:Promise.resolve({slug:'fixture'})})};
}
test('poster PUT returns confirmed row and survives subsequent reads; identity and unrelated overrides persist',async()=>{
 const f=fixture();const response=await f.put({poster:'  /manual-new.svg  ',posterFallbacks:[]});
 assert.equal(response.status,200);assert.equal((await response.json()).data.poster,'/manual-new.svg');
 assert.equal(f.row().data.poster,'/manual-new.svg');assert.equal(f.row().data.rating,8);assert.deepEqual(f.row().data.custom,{keep:true});
 for(let i=0;i<2;i++){const m=await f.movies.getMovieWithOverrides('fixture');assert.equal(m.poster,'/manual-new.svg');assert.equal(m.canonicalMovieId,f.base.canonicalMovieId);assert.deepEqual(m.posterFallbacks,[])}
 assert.ok(f.invalidations.includes('/movie/fixture'));
});
test('unrelated edit preserves manual poster',async()=>{
 const f=fixture();await f.put({title:'Edited'});assert.equal((await f.movies.getMovieWithOverrides('fixture')).poster,'/manual-old.svg');
});
for(const poster of ['', '   ', null])test(`explicit reset ${JSON.stringify(poster)} restores catalog poster without deleting other overrides`,async()=>{
 const f=fixture();assert.equal((await f.put({poster})).status,200);assert.equal(Object.hasOwn(f.row().data,'poster'),false);assert.equal((await f.movies.getMovieWithOverrides('fixture')).poster,'/provider-old.svg');assert.equal(f.row().data.rating,8);
});
for(const mode of ['writeError','stale','missing'])test(`no false success or revalidation on ${mode}`,async()=>{
 const f=fixture({[mode]:true});const r=await f.put({poster:'/new.svg'});assert.equal(r.status,500);assert.equal((await r.json()).ok,false);assert.deepEqual(f.invalidations,[]);
});
test('unauthorized request cannot write',async()=>{
 const f=fixture({authorized:false});assert.equal((await f.put({poster:'/new.svg'})).status,401);assert.equal(f.writes(),0);
});
test('DELETE awaits promised params and hides only the fixture while preserving its manual overrides',async()=>{
 const f=fixture();const response=await f.remove();
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,slug:'fixture',message:'Фильм скрыт с публичного сайта через movie_overrides.'});
 assert.equal(f.row().slug,'fixture');assert.equal(f.row().data.hidden,true);assert.equal(f.row().data.poster,'/manual-old.svg');assert.equal(f.row().data.rating,8);assert.deepEqual(f.row().data.custom,{keep:true});
 assert.ok(f.invalidations.includes('/movie/fixture'));assert.equal(await f.movies.getMovieWithOverrides('fixture'),null);
});
test('unauthorized DELETE cannot write or revalidate',async()=>{
 const f=fixture({authorized:false});assert.equal((await f.remove()).status,401);assert.equal(f.writes(),0);assert.deepEqual(f.invalidations,[]);
});
test('failed DELETE does not acknowledge success or revalidate',async()=>{
 const f=fixture({writeError:true});const response=await f.remove();assert.equal(response.status,500);assert.equal((await response.json()).ok,false);assert.equal(f.row().data.hidden,undefined);assert.deepEqual(f.invalidations,[]);
});
test('explicit manual fallbacks remain available',async()=>{
 const f=fixture();await f.put({poster:'/new.svg',posterFallbacks:['/manual-backup.svg']});assert.deepEqual((await f.movies.getMovieWithOverrides('fixture')).posterFallbacks,['/manual-backup.svg']);
});
test('changing a manual poster clears inherited provider fallbacks',async()=>{
 const f=fixture();await f.put({poster:'/manual-new.svg',posterFallbacks:[]});
 const movie=await f.movies.getMovieWithOverrides('fixture');
 assert.equal(movie.poster,'/manual-new.svg');assert.deepEqual(movie.posterFallbacks,[]);
 assert.equal(Object.hasOwn(f.row().data,'posterFallbacks'),false);
});

export function formHarness({movie={title:'Fixture',poster:'/old.svg',posterFallbacks:['/provider-old.svg'],rating:7},transport,editor}={}){
 const updates=[],states=[],requests=[];let index=0;
 const values={poster:movie.poster??'',rating:String(movie.rating??7),title:movie.title,posterFallbacks:(movie.posterFallbacks??[]).join(', ')};
 const component=load('src/app/admin/movies/[slug]/edit/MovieAdminEditForm.tsx',id=>{
  if(id==='react')return {useRef:initial=>({current:initial}),useState:initial=>{const n=index++;states[n]=initial;return [initial,v=>{states[n]=v;updates.push([n,v])}]},useMemo:fn=>fn()};
  if(id==='react/jsx-runtime')return requireLocal(id);
  if(id==='next/link')return ()=>null;
  if(id.endsWith('/lib/supabase'))return {supabase:{auth:{getSession:async()=>({data:{session:{access_token:'fixture-not-a-secret'}}})}}};
  if(id.endsWith('/movies/rating'))return rating;
  throw Error(id);
 },{FormData:class{constructor(target){this.values={...target.values}}get(k){return this.values[k]??''}},fetch:async(_url,init)=>{const payload=JSON.parse(init.body);requests.push(payload);return transport?transport(payload):Response.json({ok:true,data:{poster:payload.poster}})}}).default;
 const tree=component({slug:'fixture',movie,editor:editor??{manualRating:null,baseRating:{effectiveRating:movie.rating??0,manualRating:null,source:'catalog'}}});
 function findInput(node,name){if(!node||typeof node!=='object')return null;if(node.type==='input'&&node.props.name===name)return node;for(const child of [node.props?.children].flat(Infinity)){const found=findInput(child,name);if(found)return found}return null}
 const posterInput=findInput(tree,'poster');
 const ratingInput=findInput(tree,'rating');
 function collect(node){if(!node||typeof node!=='object')return;if(['input','textarea'].includes(node.type)&&node.props.name)values[node.props.name]=node.props.value??node.props.defaultValue??'';for(const child of [node.props?.children].flat(Infinity))collect(child)}
 collect(tree);
 values.rating=ratingInput.props.value;
 return {updates,states,requests,values,async submit(patch={}){Object.assign(values,patch);if(Object.hasOwn(patch,'poster'))posterInput.props.onChange({target:{value:patch.poster}});await tree.props.onSubmit({preventDefault(){},currentTarget:{values}});return requests.at(-1)}};
}
async function submitForm(result,status=200){
 const harness=formHarness({transport:()=>Response.json(result,{status})});
 const submitted=await harness.submit({poster:'/new.svg'});
 return {...harness,submitted};
}
test('form only acknowledges matching persisted poster',async()=>{
 const r=await submitForm({ok:true,data:{poster:'/new.svg'}});assert.equal(r.submitted.poster,'/new.svg');assert.equal(Object.hasOwn(r.submitted,'posterFallbacks'),false);assert.ok(r.updates.some(([i,v])=>i===0&&v==='saved'));
});
for(const result of [{ok:true,data:{poster:'/old.svg'}},{ok:false},{ok:true}])test(`form preserves draft on unconfirmed response ${JSON.stringify(result)}`,async()=>{
 const r=await submitForm(result);assert.ok(r.updates.some(([i,v])=>i===0&&v==='error'));assert.ok(!r.updates.some(([i,v])=>i===0&&v==='saved'));assert.equal(r.states[4],'/new.svg');
});
for(const method of ['put','remove'])for(const mode of ['error','throw','invalid'])test('P1 '+method+' read failure '+mode+' forbids every write',async()=>{
 const f=fixture({readMode:mode});const before=f.state();
 const response=await (method==='put'?f.put({poster:'/new.svg'}):f.remove());
 assert.equal(response.status,503);const body=await response.json();assert.equal(body.ok,false);assert.equal(body.error,'Не удалось достоверно прочитать текущие правки.');assert.ok(!JSON.stringify(body).includes('private-db'));
 assert.equal(f.writes(),0);assert.deepEqual(f.state(),before);assert.deepEqual(f.invalidations,[]);
});
for(const method of ['put','remove'])test('P1 '+method+' unavailable credentials cannot imply absence',async()=>{
 const f=fixture({credentials:false});const before=f.state();assert.equal((await (method==='put'?f.put({poster:'/new.svg'}):f.remove())).status,503);assert.equal(f.writes(),0);assert.deepEqual(f.state(),before);
});
test('P1 genuinely absent row permits PUT creation',async()=>{
 const f=fixture({absent:true});const control=structuredClone(f.control());assert.equal(await f.movies.getMovieOverrideData('fixture'),null);
 assert.equal((await f.put({poster:'/new.svg'})).status,200);assert.equal(f.writes(),1);assert.equal(f.row().data.poster,'/new.svg');assert.deepEqual(f.control(),control);
});
test('P1 genuinely absent row permits DELETE hidden override creation',async()=>{
 const f=fixture({absent:true});assert.equal((await f.remove()).status,200);assert.equal(f.row().data.hidden,true);assert.equal(f.writes(),1);
});
test('P1 public read retains provider fallback while strict read rejects the same error',async()=>{
 const f=fixture({readMode:'error'});await assert.rejects(f.movies.getMovieOverrideData('fixture'),f.movies.MovieOverrideReadError);
 assert.equal((await f.movies.getCachedMovieWithOverrides('fixture')).poster,'/provider-old.svg');assert.equal(f.writes(),0);
});
test('P1 editor loader rejects failed override reads instead of exposing editable provider values',async()=>{
 const f=fixture({readMode:'error'});const before=f.state();await assert.rejects(f.movies.getMovieWithOverrides('fixture'),f.movies.MovieOverrideReadError);assert.deepEqual(f.state(),before);assert.equal(f.writes(),0);
});
test('P1 successful poster-only patch preserves every existing manual field and other cards',async()=>{
 const f=fixture();const control=structuredClone(f.control());assert.equal((await f.put({poster:'/new.svg'})).status,200);
 assert.equal(f.row().data.rating,8);assert.deepEqual(f.row().data.custom,{keep:true});assert.deepEqual(f.row().data.posterFallbacks,['/stale-provider.svg']);assert.deepEqual(f.control(),control);
});
test('P2 actual form poster-only payload preserves manual fallback M through PUT and reread',async()=>{
 const f=fixture();const control=structuredClone(f.control());const form=formHarness({movie:await f.movies.getMovieWithOverrides('fixture'),transport:body=>f.put(body)});
 const payload=await form.submit({poster:'/new.svg'});assert.equal(Object.hasOwn(payload,'posterFallbacks'),false);assert.equal(form.states[0],'saved');assert.equal(form.states[4],'/new.svg');
 assert.equal(f.row().data.poster,'/new.svg');assert.deepEqual(f.row().data.posterFallbacks,['/stale-provider.svg']);assert.equal(f.row().data.rating,8);assert.deepEqual(f.row().data.custom,{keep:true});assert.deepEqual(f.control(),control);
 assert.deepEqual((await f.movies.getMovieWithOverrides('fixture')).posterFallbacks,['/stale-provider.svg']);
});
test('P2 actual form explicitly changed fallback payload persists new manual values',async()=>{
 const f=fixture();const form=formHarness({movie:await f.movies.getMovieWithOverrides('fixture'),transport:body=>f.put(body)});
 const payload=await form.submit({poster:'/new.svg',posterFallbacks:'/manual-M.svg, /manual-N.svg'});assert.deepEqual(payload.posterFallbacks,['/manual-M.svg','/manual-N.svg']);assert.deepEqual(f.row().data.posterFallbacks,payload.posterFallbacks);
});
test('P2 actual form explicit clear sends empty fallback list and removes only that key',async()=>{
 const f=fixture();const form=formHarness({movie:await f.movies.getMovieWithOverrides('fixture'),transport:body=>f.put(body)});
 const payload=await form.submit({posterFallbacks:''});assert.deepEqual(payload.posterFallbacks,[]);assert.equal(Object.hasOwn(f.row().data,'posterFallbacks'),false);assert.equal(f.row().data.poster,'/manual-old.svg');assert.equal(f.row().data.rating,8);assert.deepEqual(f.row().data.custom,{keep:true});
});
test('P2 unchanged empty fallback field sends no implicit clear',async()=>{
 const form=formHarness({movie:{title:'Fixture',poster:'/old.svg',posterFallbacks:[]}});const payload=await form.submit({poster:'/new.svg'});assert.equal(Object.hasOwn(payload,'posterFallbacks'),false);
});
test('P2 provider fallback is not promoted to a manual override by poster-only form edit',async()=>{
 const f=fixture({absent:true});const form=formHarness({movie:await f.movies.getMovieWithOverrides('fixture'),transport:body=>f.put(body)});
 const payload=await form.submit({poster:'/manual-new.svg'});assert.equal(Object.hasOwn(payload,'posterFallbacks'),false);assert.equal(Object.hasOwn(f.row().data,'posterFallbacks'),false);assert.deepEqual((await f.movies.getMovieWithOverrides('fixture')).posterFallbacks,[]);
});
test('P2 repeated saves in the same form retain manual fallback and unrelated overrides',async()=>{
 const f=fixture();const form=formHarness({movie:await f.movies.getMovieWithOverrides('fixture'),transport:body=>f.put(body)});
 await form.submit({poster:'/new.svg'});await form.submit({poster:'/newer.svg'});await form.submit();
 assert.equal(f.writes(),2);assert.equal(f.row().data.poster,'/newer.svg');assert.deepEqual(f.row().data.posterFallbacks,['/stale-provider.svg']);assert.equal(f.row().data.rating,8);assert.deepEqual(f.row().data.custom,{keep:true});
});
test('P1/P2 failed form save retains URL and fallback draft for a successful retry',async()=>{
 const f=fixture();const initial=await f.movies.getMovieWithOverrides('fixture');const before=f.state();f.setReadMode('error');const form=formHarness({movie:initial,transport:body=>f.put(body)});
 await form.submit({poster:'/retry.svg',posterFallbacks:'/retry-backup.svg'});assert.equal(form.states[0],'error');assert.equal(form.states[4],'/retry.svg');assert.equal(form.values.posterFallbacks,'/retry-backup.svg');assert.equal(f.writes(),0);assert.deepEqual(f.state(),before);
 f.setReadMode('ok');await form.submit();assert.equal(form.states[0],'saved');assert.equal(f.row().data.poster,'/retry.svg');assert.deepEqual(f.row().data.posterFallbacks,['/retry-backup.svg']);assert.equal(f.row().data.rating,8);assert.deepEqual(f.row().data.custom,{keep:true});
});
test('PUT poster null resets only poster, preserving manual fallbacks and other overrides',async()=>{
 const f=fixture();assert.equal((await f.put({poster:null})).status,200);assert.equal(Object.hasOwn(f.row().data,'poster'),false);assert.deepEqual(f.row().data.posterFallbacks,['/stale-provider.svg']);assert.equal(f.row().data.rating,8);assert.deepEqual(f.row().data.custom,{keep:true});assert.equal((await f.movies.getMovieWithOverrides('fixture')).poster,'/provider-old.svg');
});
for(const method of ['put','remove'])test(method+' write errors do not expose DB details',async()=>{
 const f=fixture({writeError:true});const response=await (method==='put'?f.put({poster:'/new.svg'}):f.remove());assert.equal(response.status,500);assert.ok(!(await response.text()).includes('private-db'));
});
test('rating validation remains a safe 400 without writes',async()=>{
 const f=fixture();const response=await f.put({rating:11});assert.equal(response.status,400);assert.equal(f.writes(),0);
});
test('unexpected RangeError cannot leak backend details through the validation response',async()=>{
 const f=fixture({writeError:new RangeError('private-db-range-detail')});const response=await f.put({poster:'/new.svg'});assert.ok(!(await response.text()).includes('private-db'));
});
test('no real network used',()=>assert.equal(networkAttempts,0));
