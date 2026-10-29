import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const flush = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve,reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise,resolve,reject }; };
const page = (ids,next_cursor=null) => ({ results:ids.map(id=>({id,name:"QA "+id})),cursor:"cursor-"+ids[0],next_cursor,total:235 });
function hooks() {
  const slots=[];let index=0;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]));
  const react={...React,
    useState(initial){const i=index++;if(!(i in slots))slots[i]=typeof initial==="function"?initial():initial;return [slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;}];},
    useMemo(fn,deps){const i=index++;if(!same(slots[i]?.deps,deps))slots[i]={deps,value:fn()};return slots[i].value;},
    useCallback(fn,deps){return react.useMemo(()=>fn,deps);},
    useEffect(fn,deps){const i=index++;if(!same(slots[i]?.deps,deps)){slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};}},
    useSyncExternalStore(subscribe,snapshot){void subscribe;return snapshot();},
  };
  return {react,render(fn){index=0;return fn();},unmount(){for(const slot of slots)slot?.cleanup?.();}};
}
async function setup(react=React) {
  let epoch=1;const window=new EventTarget();
  const context=vm.createContext({window,Event,CustomEvent,AbortController,console});
  async function load(file,deps={}) {
    const code=ts.transpileModule(readFileSync(new URL("../src/"+file,import.meta.url),"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const mod=new vm.SourceTextModule(code,{context});
    await mod.link(name=>{const values={react,"react/jsx-runtime":jsx,"../auth/api":{sessionVersion:()=>epoch,errorText:error=>error.message},...deps}[name];assert.ok(values,name);return new vm.SyntheticModule(Object.keys(values),function(){for(const key of Object.keys(values))this.setExport(key,values[key]);},{context});});
    await mod.evaluate();return mod.namespace;
  }
  const stream=await load("features/projects/projectStream.ts");
  const events=await load("features/projects/projectDirectoryEvents.ts");
  const hook=await load("features/projects/useProjectStream.ts",{"./projectStream":stream,"./projectDirectoryEvents":events});
  const q=[];const request=(...args)=>{const item={...deferred(),args};q.push(item);return item.promise;};
  return {load,stream,events,hook,q,request,window,session(type="gm-session-updated"){epoch++;window.dispatchEvent(new Event(type));}};
}

test("closed streams are inert and opening reads one bounded page without duplicate requests",async()=>{
  const e=await setup(),s=e.stream.createProjectStream(e.request,1);assert.equal(e.q.length,0);
  s.resume();s.resume();await flush();assert.equal(e.q.length,1);assert.equal(e.q[0].args[0],null);
  e.q[0].resolve(page([235,234],"next"));await flush();assert.equal(s.getSnapshot().hasMore,true);assert.equal(e.q.length,1);s.pause();
});
test("progressive traversal reaches all 235 records beyond 200 with stable deduplicated IDs",async()=>{
  const e=await setup();let calls=0;
  const s=e.stream.createProjectStream(async cursor=>{calls++;const offset=Number(cursor??0);return page(Array.from({length:Math.min(25,235-offset)},(_,i)=>235-offset-i),offset+25<235?String(offset+25):null);},1);
  s.resume();await flush();assert.equal(calls,1);while(s.getSnapshot().hasMore)await s.more();
  assert.equal(calls,10);assert.deepEqual(plain(s.getSnapshot().data.map(item=>item.id)),Array.from({length:235},(_,i)=>235-i));s.pause();
});
test("overlapping continuation rows merge by ID and simultaneous reads share an operation",async()=>{
  const e=await setup(),s=e.stream.createProjectStream(e.request,1);s.resume();await flush();e.q[0].resolve(page([8,7],"next"));await flush();
  const a=s.more(),b=s.more();assert.equal(a,b);await flush();e.q[1].resolve(page([7,6]));await a;
  assert.deepEqual(plain(s.getSnapshot().data.map(item=>item.id)),[8,7,6]);s.pause();
});
test("continuation failure preserves valid rows and retry uses the failed cursor",async()=>{
  const e=await setup(),s=e.stream.createProjectStream(e.request,1);s.resume();await flush();e.q[0].resolve(page([5],"next"));await flush();
  const a=s.more();await flush();e.q[1].reject(Error("Conexión perdida"));await a;
  assert.equal(s.getSnapshot().error,"Conexión perdida");assert.equal(s.getSnapshot().data[0].id,5);await s.more();assert.equal(e.q.length,2);
  const retry=s.retry();await flush();assert.equal(e.q[2].args[0],"next");e.q[2].resolve(page([4]));await retry;assert.equal(s.getSnapshot().data.length,2);s.pause();
});
test("initial failure differs from a successfully empty collection",async()=>{
  const e=await setup(),s=e.stream.createProjectStream(e.request,1);s.resume();await flush();e.q[0].reject(Error("Sin conexión"));await flush();
  assert.equal(s.getSnapshot().ready,false);assert.ok(s.getSnapshot().error);const retry=s.retry();await flush();e.q[1].resolve(page([]));await retry;
  assert.equal(s.getSnapshot().ready,true);assert.equal(s.getSnapshot().error,"");assert.equal(s.getSnapshot().hasMore,false);s.pause();
});
test("collapse aborts a read and its late response cannot replace a reopened area",async()=>{
  const e=await setup(),s=e.stream.createProjectStream(e.request,1);s.resume();await flush();s.pause();assert.equal(e.q[0].args[1].aborted,true);
  s.resume();await flush();e.q[1].resolve(page([8]));await flush();e.q[0].resolve(page([99]));await flush();assert.equal(s.getSnapshot().data[0].id,8);s.pause();
});
test("refresh keeps valid content and requests only the previously loaded range",async()=>{
  const e=await setup(),s=e.stream.createProjectStream(e.request,1);s.resume();await flush();e.q[0].resolve(page([8],"second"));await flush();
  const more=s.more();await flush();e.q[1].resolve(page([7],"third"));await more;s.invalidate();await flush();
  assert.deepEqual(plain(s.getSnapshot().data.map(item=>item.id)),[8,7]);assert.equal(s.getSnapshot().pending,true);
  e.q[2].resolve(page([9],"new-second"));await flush();assert.equal(e.q[3].args[0],"new-second");e.q[3].resolve(page([8],"new-third"));await flush();
  assert.equal(e.q.length,4);assert.deepEqual(plain(s.getSnapshot().data.map(item=>item.id)),[9,8]);assert.equal(s.getSnapshot().hasMore,true);s.pause();
});
test("confirmed invalidation supersedes earlier metadata reads",async()=>{
  const e=await setup(),s=e.stream.createProjectStream(e.request,1);s.resume();await flush();s.invalidate();await flush();
  assert.equal(e.q[0].args[1].aborted,true);e.q[1].resolve(page([2]));await flush();e.q[0].resolve(page([1]));await flush();assert.equal(s.getSnapshot().data[0].id,2);s.pause();
});
test("session changes and dispose reject previous identity responses",async()=>{
  const e=await setup(),s=e.stream.createProjectStream(e.request,1);s.resume();await flush();e.session();e.q[0].resolve(page([9]));await flush();assert.equal(s.getSnapshot().data.length,0);
  s.dispose();await s.more();assert.equal(e.q.length,1);assert.equal(s.getSnapshot().ready,false);
});
test("invalidation reloads affected area and metadata while leaving other areas untouched",async()=>{
  const h=hooks(),e=await setup(h.react),a=[],b=[],index=[];
  const queued=list=>(...args)=>{const item={...deferred(),args};list.push(item);return item.promise;};
  const la=queued(a),lb=queued(b),li=queued(index);
  const render=()=>h.render(()=>[e.hook.useProjectStream(la,true,1),e.hook.useProjectStream(lb,true,2),e.hook.useProjectStream(li,true)]);
  render();await flush();for(const list of [a,b,index])list[0].resolve(page([10]));await flush();
  e.events.projectDirectoryChanged([1]);await flush();assert.equal(a.length,2);assert.equal(b.length,1);assert.equal(index.length,2);
  a[1].resolve(page([11]));index[1].resolve(page([11]));await flush();assert.equal(render()[0].data[0].id,11);h.unmount();
});
test("area and session switches discard late pages and keep the associated filter",async()=>{
  const h=hooks(),e=await setup(h.react);let area=1,enabled=true;
  const module=await e.load("features/projects/useProjectAreaDirectory.ts",{"./services":{getProjects:e.request,getProjectAreas:e.request},"./projectStream":e.stream,"./useProjectStream":e.hook});
  const render=()=>h.render(()=>module.useProjectAreaProjects(area,true,enabled));
  render();await flush();assert.equal(e.q[0].args[0].associated,true);assert.equal(e.q[0].args[0].area_id,1);
  area=2;render();await flush();e.q[1].resolve(page([20]));e.q[0].resolve(page([10]));await flush();assert.equal(render().data[0].id,20);
  enabled=false;render();await flush();assert.equal(e.q.length,2);e.session("gm-session-expired");assert.equal(render().data.length,0);await flush();assert.equal(e.q.length,2);h.unmount();
});
test("direct URL pins its authorized area without full detail or draining pages",async()=>{
  const h=hooks(),e=await setup(h.react);
  const module=await e.load("features/projects/useProjectAreaDirectory.ts",{"./services":{getProjects:e.request,getProjectAreas:e.request},"./projectStream":e.stream,"./useProjectStream":e.hook});
  const render=()=>h.render(()=>module.useProjectAreaDirectory(true,true,"/proyectos/3"));
  render();await flush();assert.equal(e.q.length,2);assert.deepEqual(plain(e.q[1].args[0]),{project_id:3,associated:true});
  e.q[0].resolve(page([100],"more-areas"));e.q[1].resolve({results:[{id:3,areas:[{id:1,name:"Área antigua"}]}],next_cursor:null,cursor:"x",total:1});await flush();
  assert.deepEqual(plain(render().areas.map(area=>area.id)),[100,1]);assert.equal(render().hasMore,true);assert.equal(e.q.length,2);h.unmount();
});
test("compact menu keeps GM hierarchy without search, paging, counters or redundant links",async()=>{
  const e=await setup();let seen;const Empty=()=>null;
  const {default:Menu}=await e.load("features/layout/Sidebar/ProjectsMenu.tsx",{
    "../../../shared/icons/ChevronDownIcon":{default:Empty},"../../../shared/icons/PlusIcon":{default:Empty},
    "../../projects/ProjectNavigation/ProjectAreaNavigation":{default:Empty},
    "../../projects/ProjectNavigation/navigationClasses":{projectCreateActionClassName:"cursor-pointer"},
    "../../projects/useProjectAreaDirectory":{useProjectAreaDirectory:(...args)=>{seen=args;return {}; }},
  });
  const html=renderToStaticMarkup(React.createElement(Menu,{isCollapsed:false,currentPath:"/",canCreateProject:true,projectCreationDisabled:false,onCreateProject(){},canCreateTasks:true,onCreateTask(){}}));
  assert.match(html,/Proyectos/);assert.match(html,/aria-expanded="true"/);assert.match(html,/Crear proyecto/);
  for(const text of ["Ver todos los proyectos","Buscar","Anterior","Siguiente","Actualizar listado","en esta página","resultados"])assert.ok(!html.includes(text),text);
  assert.deepEqual(seen,[true,true,"/"]);
});
