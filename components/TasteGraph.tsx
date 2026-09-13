"use client";
import {useMemo,useState} from "react";
import {works} from "@/lib/works";
import {supabase} from "@/lib/supabase";
type Relationship="rewatch_always"|"rewatch"|"watched"|"dropped"|"unwatched"|"want_to_watch";
const labels:Record<Relationship,string>={rewatch_always:"何度でも見たい",rewatch:"もう一度見たい",watched:"見た",dropped:"途中離脱",unwatched:"見てない",want_to_watch:"見たい"};
const hints:Record<Relationship,string>={rewatch_always:"何度見てもいい、繰り返し触れたい",rewatch:"また見たいと思える",watched:"視聴したことがある",dropped:"最後まで見なかった",unwatched:"まだ見ていない",want_to_watch:"まだ見ていないが興味がある"};
const choices:Relationship[]=["rewatch_always","rewatch","watched","dropped","unwatched","want_to_watch"];
export default function TasteGraph(){
 const [index,setIndex]=useState(0); const [tab,setTab]=useState<"rate"|"graph"|"history">("rate"); const [data,setData]=useState<Record<string,Relationship>>({}); const work=works[index%works.length];
 const counts=useMemo(()=>choices.map(k=>({key:k,label:labels[k],count:Object.values(data).filter(v=>v===k).length})),[data]);
 async function select(k:Relationship){setData(d=>({...d,[work.id]:k})); if(supabase){await supabase.from("work_relationships").upsert({work_id:work.id,work_title:work.title,genre:work.genre,relationship:k},{onConflict:"work_id"});} setIndex(i=>i+1);}
 return <main className="shell"><header><div><div className="eyebrow">TASTEGRAPH / V4</div><h1>作品を、点数ではなく<span>言葉</span>で捉える。</h1><p className="lead">「好き度」を無理に数字へ変換せず、作品との関係そのものを記録します。</p></div><div className="badge">LANGUAGE FIRST</div></header>
 <nav>{([["rate","記録する"],["graph","Taste Graph"],["history","履歴"]] as const).map(([k,v])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{v}</button>)}</nav>
 {tab==="rate"&&<section className="workspace"><div className="card poster"><img src={work.image} alt=""/><div className="overlay"><span>{work.year}</span><span>{work.genre}</span></div></div><div className="card panel"><div className="counter">{index%works.length+1} / {works.length}</div><p className="question">この作品との関係は？</p><h2>{work.title}</h2><p className="desc">{work.description}</p><div className="choices">{choices.map(k=><button key={k} onClick={()=>select(k)}><strong>{labels[k]}</strong><small>{hints[k]}</small></button>)}</div></div></section>}
 {tab==="graph"&&<section className="card graph"><p className="eyebrow">TASTE GRAPH</p><h2>あなたの作品との関係</h2><p className="muted">ここではカテゴリを点数化しません。分布そのものを「好みの構造」として眺めます。</p>{counts.map(x=><div className="row" key={x.key}><div><b>{x.label}</b><span>{x.count}作品</span></div><div className="bar"><i style={{width:`${Math.max(4,x.count/Math.max(1,Object.keys(data).length)*100)}%`}}/></div></div>)}</section>}
 {tab==="history"&&<section className="card graph"><p className="eyebrow">RELATIONSHIP HISTORY</p><h2>記録した作品</h2>{Object.entries(data).length===0?<p className="empty">まだ記録がありません。まず作品との関係を記録してみましょう。</p>:<div className="history">{Object.entries(data).map(([id,k])=>{const w=works.find(x=>x.id===id)!;return <div key={id}><span>{w.title}</span><b>{labels[k]}</b></div>})}</div>}</section>}
 <footer>v4 · 数値評価を保存しないTasteGraph</footer></main>;
}
