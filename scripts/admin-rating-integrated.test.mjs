import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture, formHarness, load} from './admin-poster.test.mjs';
import {requireLocal} from './episode-guides/register-local.mjs';
const rating=requireLocal('../../src/app/lib/movies/rating.ts');

function editor(f){return {manualRating:f.row()?.data.rating??null,baseRating:{effectiveRating:7,manualRating:null,source:'catalog'}};}
async function form(f){return formHarness({movie:await f.movies.getMovieWithOverrides('fixture'),editor:editor(f),transport:body=>f.put(body)});}

test('new editor loader rejects override read errors and distinguishes missing row',async()=>{
 const f=fixture({absent:true});const data=await f.movies.getMovieEditorData('fixture');assert.equal(data.editor.manualRating,null);assert.equal(data.editor.baseRating.source,'catalog');
 for(const readMode of ['error','throw','invalid']){const bad=fixture({readMode});await assert.rejects(bad.movies.getMovieEditorData('fixture'),bad.movies.MovieOverrideReadError);assert.equal(bad.writes(),0);}
});
test('clearing card rating reveals draft manual rating explicitly, never labels it as provider',async()=>{
 const previous=process.env.KINOLUMA_LOAD_PUBLISHED_DRAFTS;process.env.KINOLUMA_LOAD_PUBLISHED_DRAFTS='true';
 try{
  const draft={id:'draft',slug:'fixture',title:'Fixture',status:'published',poster_url:'/provider.svg',raw_json:{kinoluma:{manual_rating:8.7},kinopoisk:{rating:{kp:7.3}},tmdb:{vote_average:6.2,vote_count:100}}};
  const f=fixture({draft});assert.equal((await f.movies.getMovieEditorData('fixture')).editor.manualRating,8);
  assert.equal((await f.put({rating:null})).status,200);const data=await f.movies.getMovieEditorData('fixture');
  assert.equal(data.editor.manualRating,null);assert.equal(data.editor.baseRating.source,'draft_manual');assert.equal(data.movie.rating,8.7);
  const h=formHarness({...data,transport:body=>f.put(body)});await h.submit({poster:'/manual.svg'});assert.equal(Object.hasOwn(f.row().data,'rating'),false);assert.equal(draft.raw_json.kinoluma.manual_rating,8.7);
  const broken=fixture({draftReadError:true});await assert.rejects(broken.movies.getMovieEditorData('fixture'),broken.movies.MovieOverrideReadError);
 }finally{if(previous===undefined)delete process.env.KINOLUMA_LOAD_PUBLISHED_DRAFTS;else process.env.KINOLUMA_LOAD_PUBLISHED_DRAFTS=previous;}
});
test('source priority and TMDB vote gate are unchanged',()=>{
 const raw={kinopoisk:{rating:{kp:7.3,imdb:8.2}},tmdb:{vote_average:6.4,vote_count:2}};
 assert.equal(rating.getDraftRatingState(raw).source,'kinopoisk');delete raw.kinopoisk.rating.kp;
 assert.equal(rating.getDraftRatingState(raw).source,'imdb');delete raw.kinopoisk.rating.imdb;
 assert.deepEqual(rating.getDraftRatingState(raw),{effectiveRating:6.4,manualRating:null,source:'tmdb'});
 raw.tmdb.vote_count=0;assert.equal(rating.getDraftRatingState(raw).source,'unknown');
 assert.equal(rating.getDraftRatingState({tmdb:{vote_average:'',vote_count:2},candidate:{vote_average:9,vote_count:100}}).effectiveRating,0);
});
test('same form saves, reverts and clears without reapplying untouched fields',async()=>{
 const f=fixture();const h=await form(f);await h.submit({rating:'9.2',posterFallbacks:'/new-backup.svg'});
 await h.submit({rating:'8',posterFallbacks:'/stale-provider.svg'});assert.equal(f.row().data.rating,8);assert.deepEqual(f.row().data.posterFallbacks,['/stale-provider.svg']);
 await h.submit({rating:''});await h.submit({poster:'/new.svg'});assert.equal(Object.hasOwn(f.row().data,'rating'),false);
 assert.deepEqual(f.row().data.custom,{keep:true});
});

test('provider rating remains automatic when only poster changes',async()=>{
 const f=fixture({absent:true});const h=await form(f);const payload=await h.submit({poster:'/new.svg'});
 assert.equal(Object.hasOwn(payload,'rating'),false);assert.equal(Object.hasOwn(f.row().data,'rating'),false);
});
test('provider poster remains automatic when only rating changes',async()=>{
 const f=fixture({absent:true});const h=await form(f);const payload=await h.submit({rating:'8,4'});
 assert.equal(Object.hasOwn(payload,'poster'),false);assert.equal(Object.hasOwn(f.row().data,'poster'),false);assert.equal(f.row().data.rating,8.4);
});
test('clear rating, reload, save poster never reintroduces rating',async()=>{
 const f=fixture();await (await form(f)).submit({rating:''});assert.equal(Object.hasOwn(f.row().data,'rating'),false);
 const reloaded=await form(f);assert.equal(reloaded.values.rating,'');await reloaded.submit({poster:'/new.svg'});
 assert.equal(Object.hasOwn(f.row().data,'rating'),false);
});
test('clear removes all legacy aliases and preserves provider/player/custom data',()=>{
 const before={tmdb:{vote_average:6.4},custom:{keep:true},kinoluma:{manual_rating:8,manual_movie_rating:8,movie_rating:9,players:[{id:'keep'}]}};
 const after=rating.mergeManualRatingIntoRawJson(before,null);
 for(const key of ['manual_rating','manual_movie_rating','movie_rating'])assert.equal(Object.hasOwn(after.kinoluma,key),false);
 assert.equal(rating.getManualRatingFromRawJson(after),null);assert.deepEqual(after.tmdb,before.tmdb);assert.deepEqual(after.kinoluma.players,before.kinoluma.players);assert.deepEqual(after.custom,before.custom);
});
for(const zero of [0,'0','0,0'])test('zero clears the movie override '+JSON.stringify(zero),async()=>{
 const f=fixture();assert.equal((await f.put({rating:zero})).status,200);assert.equal(Object.hasOwn(f.row().data,'rating'),false);assert.equal((await f.movies.getMovieWithOverrides('fixture')).rating,7);
});
for(const value of ['abc','NaN',-1,11,'Infinity',{},'0x8'])test('invalid override rejects without writes '+JSON.stringify(value),async()=>{
 const f=fixture();const before=f.state();assert.equal((await f.put({rating:value})).status,400);assert.equal(f.writes(),0);assert.deepEqual(f.state(),before);
});
test('rating-only save preserves manual poster, fallbacks and unknown keys',async()=>{
 const f=fixture();const before=structuredClone(f.row().data);await (await form(f)).submit({rating:'9.1'});
 for(const key of ['poster','posterFallbacks','custom'])assert.deepEqual(f.row().data[key],before[key]);assert.equal(f.row().data.rating,9.1);
});
test('rating write failure and stale confirmation never succeed or invalidate',async()=>{
 for(const mode of ['writeError','stale','missing']){const f=fixture({[mode]:true});const r=await f.put({rating:9});assert.equal(r.status,500,mode);assert.deepEqual(f.invalidations,[]);}
});
test('rating read failure forbids writes',async()=>{
 for(const readMode of ['error','throw','invalid']){const f=fixture({readMode});assert.equal((await f.put({rating:9})).status,503);assert.equal(f.writes(),0);}
});
test('form refuses an unconfirmed rating response',async()=>{
 const h=formHarness({editor:{manualRating:7,baseRating:{effectiveRating:6,source:'catalog',manualRating:null}},transport:body=>Response.json({ok:true,data:{poster:body.poster,rating:7}})});
 await h.submit({rating:'9'});assert.equal(h.states[0],'error');
});

function importFixture({readError=false,writeError=false,stale=false,authorized=true}={}){
 let row={id:'draft',title:'Fixture',slug:'fixture',status:'draft',raw_json:{tmdb:{vote_average:6.3,vote_count:100},kinoluma:{manual_rating:8,manual_movie_rating:8,movie_rating:9,players:[{id:'keep'}]},custom:{keep:true}}};let writes=0;
 const client={from(table){if(table==='agent_feedback')return {insert:async()=>({error:null})};assert.equal(table,'movie_drafts');let patch;
 return {select(){return this},eq(){return this},update(value){patch=value;return this},async single(){if(!patch)return {data:structuredClone(row),error:readError?Error('read'):null};writes++;if(!writeError&&!stale)row={...row,...structuredClone(patch)};return {data:structuredClone(row),error:writeError?Error('write'):null}}};}};
 const route=load('src/app/api/admin/import/update-draft/route.ts',id=>{
 if(id.endsWith('/supabase/admin'))return {getSupabaseAdmin:()=>client};
 if(id.endsWith('/import/adminAuth'))return {assertAdminSecret:()=>authorized?null:Response.json({ok:false},{status:401})};
 if(id.endsWith('/movies/rating'))return rating;
 if(id.endsWith('/trailers'))return {normalizeTrailerUrl:()=>null};
 if(id==='next/cache')return {revalidatePath:()=>{}};
 throw Error('Unexpected import '+id);
 });
 return {row:()=>row,writes:()=>writes,post:values=>route.POST(new Request('http://localhost/api/admin/import/update-draft',{method:'POST',body:JSON.stringify({draftId:'draft',values})}))};
}
for(const value of ['abc',-1,11,'0x8'])test('import invalid rating returns 400 without write '+JSON.stringify(value),async()=>{
 const f=importFixture();const before=structuredClone(f.row());assert.equal((await f.post({rating:value})).status,400);assert.equal(f.writes(),0);assert.deepEqual(f.row(),before);
});
for(const value of ['',null,0])test('import clear removes aliases '+JSON.stringify(value),async()=>{
 const f=importFixture();assert.equal((await f.post({rating:value})).status,200);assert.equal(rating.getManualRatingFromRawJson(f.row().raw_json),null);assert.deepEqual(f.row().raw_json.kinoluma.players,[{id:'keep'}]);
});
test('import positive comma save and neighboring update preserve rating and provider',async()=>{
 const f=importFixture();assert.equal((await f.post({rating:'7,8'})).status,200);assert.equal(rating.getManualRatingFromRawJson(f.row().raw_json),7.8);const raw=structuredClone(f.row().raw_json);await f.post({poster_url:'/poster.svg'});assert.deepEqual(f.row().raw_json,raw);
});
test('import stale rating confirmation is rejected',async()=>{const f=importFixture({stale:true});assert.equal((await f.post({rating:9.2})).status,500);});
test('import read/write failure never succeeds',async()=>{for(const mode of ['readError','writeError']){const f=importFixture({[mode]:true});assert.equal((await f.post({rating:9.2})).status,500);if(mode==='readError')assert.equal(f.writes(),0);}});
test('import unauthorized request cannot write',async()=>{const f=importFixture({authorized:false});assert.equal((await f.post({rating:9})).status,401);assert.equal(f.writes(),0);});
test('clear cannot be confirmed by malformed stored raw JSON',()=>{for(const raw of [null,undefined,[],42])assert.throws(()=>rating.assertSavedDraftRating(raw,null),/не подтверждено/);});

function createFixture({authorized=true,stale=false}={}){
 let writes=0;
 const client={from(table){if(table==='agent_feedback')return {insert:async()=>({error:null})};assert.equal(table,'movie_drafts');return {insert(value){writes++;return {select(){return this},single:async()=>({data:{id:'new',...value,raw_json:stale?{}:value.raw_json},error:null})}}};}};
 const route=load('src/app/api/admin/import/create-draft/route.ts',id=>{
  if(id.endsWith('/supabase/admin'))return {getSupabaseAdmin:()=>client};
  if(id.endsWith('/import/adminAuth'))return {assertAdminSecret:()=>authorized?null:Response.json({ok:false},{status:401})};
  if(id.endsWith('/movies/rating'))return rating;
  if(id.endsWith('/trailers'))return {normalizeTrailerUrl:()=>null};
  if(id.endsWith('/checkDuplicates'))return {checkDuplicates:async()=>({isDuplicate:false})};
  if(id.endsWith('/generateSlug'))return {generateSlug:()=> 'fixture-new'};
  if(id.endsWith('/players'))return {mergeAutoPlayersIntoRawJson:raw=>raw,parsePlayerText:()=>[]};
  throw Error('Unexpected import '+id);
 });
 return {writes:()=>writes,post:value=>route.POST(new Request('http://localhost/api/admin/import/create-draft',{method:'POST',body:JSON.stringify({values:{title:'New fixture',rating:value}})}))};
}
for(const value of ['abc',11,-1,'0x8'])test('create draft invalid rating cannot insert '+JSON.stringify(value),async()=>{const f=createFixture();assert.equal((await f.post(value)).status,400);assert.equal(f.writes(),0);});
for(const value of ['',0,'7,8',10])test('create draft applies the shared rating contract '+JSON.stringify(value),async()=>{const f=createFixture();const r=await f.post(value);assert.equal(r.status,200);const body=await r.json();assert.equal(rating.getManualRatingFromRawJson(body.draft.raw_json),value==='7,8'?7.8:value===10?10:null);});
test('create draft requires confirmed stored rating and authorization',async()=>{const f=createFixture({stale:true});assert.equal((await f.post(8)).status,500);const unauthorized=createFixture({authorized:false});assert.equal((await unauthorized.post(8)).status,401);assert.equal(unauthorized.writes(),0);});
