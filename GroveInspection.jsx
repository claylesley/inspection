// GroveInspection.jsx — full-featured inspection app with Supabase backend
// Requires: npm install @supabase/supabase-js
// Add to .env: VITE_SUPABASE_URL=...  VITE_SUPABASE_ANON_KEY=...

import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const DEFAULT_MULTS = { r02:0, r3:0.5, r4:0.75, r510:1.0 };

const SHARED_ITEMS = [
  { id:"keys",        label:"Keys",                     group:"Entry",    dirty:null, replace:20,  perUnit:true, note:"$20/key" },
  { id:"blinds",      label:"Blinds",                   group:"Windows",  dirty:5,    replace:50  },
  { id:"windows",     label:"Windows",                  group:"Windows",  dirty:6,    replace:250 },
  { id:"cabinets",    label:"Cabinets",                 group:"Kitchen",  dirty:12,   replace:null },
  { id:"cabTops",     label:"Cabinet Tops",             group:"Kitchen",  dirty:8,    replace:400 },
  { id:"iceBox",      label:"Ice Box",                  group:"Kitchen",  dirty:10,   replace:null },
  { id:"refrig",      label:"Refrigerator",             group:"Kitchen",  dirty:10,   replace:null },
  { id:"sink",        label:"Sink",                     group:"Kitchen",  dirty:5,    replace:null },
  { id:"drainStops",  label:"Drain Stops",              group:"Plumbing", dirty:null, replace:20,  fixed:true },
  { id:"dwRacks",     label:"D/W & Racks",              group:"Kitchen",  dirty:5,    replace:300 },
  { id:"stove",       label:"Stove",                    group:"Kitchen",  dirty:10,   replace:700 },
  { id:"eyePans",     label:"Eye Pans",                 group:"Kitchen",  dirty:3,    replace:40  },
  { id:"oven",        label:"Oven",                     group:"Kitchen",  dirty:10,   replace:700 },
  { id:"washer",      label:"Washer",                   group:"Laundry",  dirty:10,   replace:null },
  { id:"dryer",       label:"Dryer",                    group:"Laundry",  dirty:10,   replace:null },
  { id:"lintScreen",  label:"Lint Screen",              group:"Laundry",  dirty:2,    replace:null },
  { id:"floorsKit",   label:"Kitchen Floors",           group:"Floors",   dirty:6,    replace:250 },
  { id:"floorsLiv",   label:"Living Room Floors",       group:"Floors",   dirty:10,   replace:500 },
  { id:"deck",        label:"Deck",                     group:"Exterior", dirty:10,   replace:null },
  { id:"paintRockLK", label:"Paint / Rock (Liv/Kit)",   group:"Walls",    dirty:30,   replace:600 },
  { id:"doorsLivKit", label:"Doors (Liv/Kit)",          group:"Doors",    dirty:10,   replace:275 },
  { id:"furniture",   label:"Furniture / Trash Removal",group:"Removal",  dirty:null, replace:100, perUnit:true, note:"$100/item" },
];

const BED_ITEMS = [
  { id:"carpet",    label:"Carpet",          dirty:10,  replace:500 },
  { id:"paintRock", label:"Paint / Rock",    dirty:20,  replace:400 },
  { id:"doors",     label:"Doors",           dirty:10,  replace:275 },
  { id:"blinds",    label:"Blinds",          dirty:5,   replace:50  },
  { id:"windows",   label:"Windows",         dirty:6,   replace:250 },
  { id:"bathFloor", label:"Bath Floor",      dirty:3,   replace:null, bath:true },
  { id:"sinkTub",   label:"Sink / Tub",      dirty:10,  replace:null, bath:true },
  { id:"bathPaint", label:"Bath Paint/Rock", dirty:10,  replace:200,  bath:true },
  { id:"hvac",      label:"HVAC",            dirty:5,   replace:600  },
  { id:"flea",      label:"Flea Treatment",  dirty:null,replace:75,   fixed:true },
];

const SUPPLY_TRIGGERS = {
  keys:"Keys", blinds:"Blinds", eyePans:"Eye Pans", lintScreen:"Lint Screen",
  floorsKit:"Flooring", floorsLiv:"Flooring", carpet:"Carpet", hvac:"14×25 HVAC Filter",
};
const STD_SUPPLIES = ["Light Bulbs","Refrigerator Light","Oven Light","Smoke Detector Battery","Smoke Detector","Range Vent Fan + Light","Bath Vent Fan"];
const GROUP_ORDER  = ["Entry","Kitchen","Laundry","Floors","Walls","Doors","Windows","Plumbing","Exterior","Removal"];

// ═══════════════════════════════════════════════════════════
// COST ENGINE
//   dirty_cost = clean_rate × dirty_rating × multiplier
//   multiplier bands: 0–2=0, 3=0.5, 4=0.75, 5–10=1.0
// ═══════════════════════════════════════════════════════════

const getRatingMult = (r, m=DEFAULT_MULTS) => r<=2?m.r02:r===3?m.r3:r===4?m.r4:m.r510;

function calcCost(item, state={}, mults=DEFAULT_MULTS) {
  const { status="clean", dirtyRating=0, count=1 } = state;
  if (status==="clean") return 0;
  if (status==="dirty") {
    if (!item.dirty) return 0;
    const rm = getRatingMult(dirtyRating, mults);
    return rm===0 ? 0 : item.dirty * dirtyRating * rm;
  }
  if (status==="broken") {
    if (item.fixed)   return item.replace??0;
    if (item.perUnit) return (count||1)*(item.replace??0);
    return item.replace??0;
  }
  return 0;
}

const parseDollar = v => Math.max(0, parseFloat(v)||0);

// ═══════════════════════════════════════════════════════════
// PHOTO UTILITIES
// ═══════════════════════════════════════════════════════════

const compressPhoto = file => new Promise(resolve => {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX   = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ═══════════════════════════════════════════════════════════
// STYLE TOKENS
// ═══════════════════════════════════════════════════════════

const LBL      = {fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".6px",marginBottom:5};
const INPUT_ST = {display:"block",width:"100%",padding:"9px 11px",border:"1.5px solid #E2E8F0",borderRadius:8,fontSize:14,color:"#0F172A",background:"#FAFAFA"};
const NEXT_BTN = {flex:2,padding:"13px 0",background:"#1E40AF",color:"#FFF",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer"};
const BACK_BTN = {flex:1,padding:"13px 0",background:"#F1F5F9",color:"#64748B",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer"};
const SUMROW   = {display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #F1F5F9"};
const SUML     = {fontSize:14,color:"#475569"};
const SUMV     = {fontSize:14,fontWeight:700,color:"#0F172A"};
const SUBL     = {fontSize:12,color:"#94A3B8"};
const SUBV     = {fontSize:12,color:"#64748B"};

// ═══════════════════════════════════════════════════════════
// LOGIN VIEW
// ═══════════════════════════════════════════════════════════

function LoginView() {
  const [email,setEmail]=useState(""); const [pass,setPass]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);

  const login = async () => {
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password:pass });
    if (error) setErr(error.message);
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#F0F4F8",display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      <div style={{background:"#FFF",borderRadius:14,padding:32,width:"100%",maxWidth:380,boxShadow:"0 4px 24px rgba(0,0,0,.12)"}}>
        <div style={{fontSize:24,fontWeight:900,color:"#0F2744",marginBottom:4}}>The Groves</div>
        <div style={{fontSize:13,color:"#64748B",marginBottom:28}}>Inspection Management</div>
        {err&&<div style={{background:"#FEE2E2",color:"#991B1B",padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:16}}>{err}</div>}
        <div style={{marginBottom:14}}><div style={LBL}>Email</div><input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} style={INPUT_ST} autoComplete="email"/></div>
        <div style={{marginBottom:22}}><div style={LBL}>Password</div><input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} style={INPUT_ST} autoComplete="current-password"/></div>
        <button onClick={login} disabled={loading} style={{width:"100%",padding:"12px 0",background:loading?"#94A3B8":"#0F2744",color:"#FFF",border:"none",borderRadius:10,fontSize:15,fontWeight:800,cursor:"pointer"}}>
          {loading?"Signing in…":"Sign In"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRINT REPORT
// ═══════════════════════════════════════════════════════════

function PrintReport({ info, numBeds, sharedItems, bedItems, shared, beds,
  sharedItemsTotal, extraShared, bedTotals, perBedShared, grandTotal, dynSupplies, signatures, sharedPhotos=[], onClose }) {
  const fmt = v=>`$${Number(v).toFixed(2)}`;
  const itemRows = (items, stateMap, mults=DEFAULT_MULTS) => items.flatMap(item=>{
    const st=stateMap?.[item.id]||{}; const cost=calcCost(item,st,mults);
    const tag=st.status==="broken"?"Replace":st.status==="dirty"?`Dirty — ${st.dirtyRating??0}/10`:"Clean ✓";
    const c=st.status==="broken"?"#B91C1C":st.status==="dirty"?"#92400E":"#166534";
    const photos=st.photos||[];
    const mainRow=(
      <tr key={item.id} style={{borderBottom:photos.length===0?"1px solid #f0f0f0":"none"}}>
        <td style={{padding:"4px 8px",fontSize:11}}>{item.label}</td>
        <td style={{padding:"4px 8px",fontSize:11,color:c}}>{tag}</td>
        <td style={{padding:"4px 8px",fontSize:11,textAlign:"right",fontWeight:cost>0?700:400,color:cost>0?"#B91C1C":"#94A3B8"}}>{cost>0?fmt(cost):"—"}</td>
        <td style={{padding:"4px 8px",fontSize:10,color:"#94A3B8",fontStyle:"italic"}}>{st.memo||""}</td>
      </tr>
    );
    if (!photos.length) return [mainRow];
    const photoRow=(
      <tr key={`${item.id}_ph`} style={{borderBottom:"1px solid #f0f0f0"}}>
        <td colSpan="4" style={{padding:"4px 8px 8px 20px"}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {photos.map((src,pi)=>(
              <img key={pi} src={src} alt={`${item.label} ${pi+1}`}
                style={{width:90,height:68,objectFit:"cover",borderRadius:5,border:"1px solid #E2E8F0"}}/>
            ))}
          </div>
        </td>
      </tr>
    );
    return [mainRow, photoRow];
  });

  const SH=({t,s="",bg="#1E40AF"})=>(
    <tr><td colSpan="4" style={{background:bg,color:"white",padding:"7px 10px",fontSize:12,fontWeight:700}}>
      {t}{s&&<span style={{fontWeight:400,opacity:.7,marginLeft:8,fontSize:11}}>{s}</span>}
    </td></tr>
  );

  return (
    <div style={{fontFamily:"Arial,sans-serif",padding:20,maxWidth:760,margin:"0 auto"}}>
      <style>{`@media print { .no-print-btn { display:none!important; } }`}</style>
      {onClose&&(
        <button className="no-print-btn" onClick={onClose} style={{
          position:"fixed",top:14,right:16,zIndex:9999,
          display:"flex",alignItems:"center",gap:6,
          padding:"8px 16px",background:"#0F2744",color:"#FFF",
          border:"none",borderRadius:10,fontSize:13,fontWeight:700,
          cursor:"pointer",boxShadow:"0 2px 10px rgba(0,0,0,.35)",
        }}>✕ Close Preview</button>
      )}
      <div style={{background:"#0F2744",color:"white",padding:"14px 20px",marginBottom:16}}>
        <div style={{fontSize:20,fontWeight:900}}>The Groves — Move-Out Inspection Report</div>
        <div style={{fontSize:11,opacity:.6,marginTop:2}}>{info.date}</div>
      </div>
      <table style={{marginBottom:16,borderCollapse:"collapse"}}>
        {[["House #",info.house||"—"],["Room #",info.room||"—"],["Tenant",info.tenant||"—"],["Inspector",info.inspector||"—"],["Date",info.date||"—"],["Bedrooms",numBeds]].map(([l,v])=>(
          <tr key={l}><td style={{fontWeight:700,color:"#64748B",fontSize:11,padding:"3px 16px 3px 0",whiteSpace:"nowrap"}}>{l}</td><td style={{fontSize:12}}>{v}</td></tr>
        ))}
      </table>

      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <tbody>
          <SH t="SHARED LIVING SPACE" s={`item total: ${fmt(sharedItemsTotal)}${extraShared.amount?` + extra: ${fmt(extraShared.amount)}`:""} · per bed: ${fmt(perBedShared)}`}/>
          {itemRows(sharedItems,shared)}
          {extraShared.amount>0&&<tr style={{background:"#FFFBEB"}}>
            <td style={{padding:"4px 8px",fontSize:11}}>{extraShared.note||"Extra charge"}</td>
            <td style={{padding:"4px 8px",fontSize:11,color:"#D97706"}}>Extra</td>
            <td style={{padding:"4px 8px",fontSize:11,textAlign:"right",fontWeight:700,color:"#D97706"}}>{fmt(extraShared.amount)}</td>
            <td/>
          </tr>}
          <tr style={{background:"#EFF6FF"}}>
            <td colSpan="2" style={{padding:"6px 8px",fontWeight:700,fontSize:12}}>Shared Total</td>
            <td style={{padding:"6px 8px",textAlign:"right",fontWeight:900,fontSize:13,color:"#1E3A5F"}}>{fmt(sharedItemsTotal+extraShared.amount)}</td><td/>
          </tr>
          {sharedPhotos.length>0&&<tr><td colSpan="4" style={{padding:"10px 0 4px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Shared Space Photos ({sharedPhotos.length})</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {sharedPhotos.map((src,i)=><img key={i} src={src} alt={`S${i+1}`} style={{width:130,height:98,objectFit:"cover",borderRadius:6,border:"1px solid #E2E8F0"}}/>)}
            </div>
          </td></tr>}

          {beds.slice(0,numBeds).map((bed,bi)=>[
            <SH key={`h${bi}`} t={`BEDROOM ${bi+1}${bed.bathNum?` · Bath #${bed.bathNum}`:""}`}
              s={`room: ${fmt(bedTotals[bi])} | total w/shared: ${fmt(bedTotals[bi]+perBedShared)}`} bg="#1E3A5F"/>,
            ...itemRows(bedItems,bed.items),
            bed.extraAmount>0&&<tr key={`ex${bi}`} style={{background:"#FFFBEB"}}>
              <td style={{padding:"4px 8px",fontSize:11}}>{bed.extraNote||"Extra charge"}</td>
              <td style={{padding:"4px 8px",fontSize:11,color:"#D97706"}}>Extra — Bed {bi+1}</td>
              <td style={{padding:"4px 8px",fontSize:11,textAlign:"right",fontWeight:700,color:"#D97706"}}>{fmt(bed.extraAmount)}</td>
              <td/>
            </tr>,
            (bed.photos||[]).length>0&&<tr key={`ph${bi}`}><td colSpan="4" style={{padding:"10px 0 4px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Bedroom {bi+1} Photos ({(bed.photos||[]).length})</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {(bed.photos||[]).map((src,pi)=><img key={pi} src={src} alt={`B${bi+1}-P${pi+1}`} style={{width:130,height:98,objectFit:"cover",borderRadius:6,border:"1px solid #E2E8F0"}}/>)}
              </div>
            </td></tr>,
          ])}

          <tr style={{background:"#0F2744"}}>
            <td colSpan="2" style={{padding:"11px 12px",color:"white",fontSize:14,fontWeight:900}}>GRAND TOTAL</td>
            <td style={{padding:"11px 12px",textAlign:"right",color:"#FCA5A5",fontSize:17,fontWeight:900}}>{fmt(grandTotal)}</td><td/>
          </tr>
        </tbody>
      </table>

      {dynSupplies.length>0&&<div style={{marginTop:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#065F46",marginBottom:6}}>SUPPLIES NEEDED</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {dynSupplies.map(s=><span key={s} style={{padding:"3px 12px",background:"#ECFDF5",color:"#065F46",borderRadius:99,fontSize:11,fontWeight:700,border:"1px solid #A7F3D0"}}>{s}</span>)}
        </div>
      </div>}

      <div style={{marginTop:30,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"28px 40px",maxWidth:600}}>
        {[["Inspector Signature",signatures?.inspector],["Tenant Signature",signatures?.tenant]].map(([lbl,sig])=>(
          <div key={lbl}>
            {sig
              ?<img src={sig} alt={lbl} style={{width:"100%",height:80,objectFit:"contain",border:"1px solid #E2E8F0",borderRadius:6,background:"#FAFAFA"}}/>
              :<div style={{height:80,border:"1.5px solid #CBD5E1",borderRadius:6,background:"#FAFAFA"}}/>}
            <div style={{fontSize:10,color:"#94A3B8",marginTop:4}}>{lbl}</div>
          </div>
        ))}
        {[["Inspector Print Name",info.inspector],["Date",info.date]].map(([lbl,val])=>(
          <div key={lbl}>
            <div style={{height:36,borderBottom:"1.5px solid #475569",display:"flex",alignItems:"center",fontSize:13,color:"#1E293B"}}>{val||""}</div>
            <div style={{fontSize:10,color:"#94A3B8",marginTop:4}}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIGNATURE PAD
// ═══════════════════════════════════════════════════════════

function SignaturePad({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef({x:0,y:0});
  const [hasSig,  setHasSig] = useState(!!value);

  useEffect(()=>{
    if (value && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height);
        ctx.drawImage(img,0,0);
      };
      img.src = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const getXY = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const sx   = canvas.width  / rect.width;
    const sy   = canvas.height / rect.height;
    const src  = e.touches ? e.touches[0] : e;
    return { x:(src.clientX-rect.left)*sx, y:(src.clientY-rect.top)*sy };
  };

  const onStart = e => { e.preventDefault(); drawing.current=true; lastPos.current=getXY(e,canvasRef.current); };

  const onMove = e => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas=canvasRef.current; const ctx=canvas.getContext("2d"); const pos=getXY(e,canvas);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x,lastPos.current.y); ctx.lineTo(pos.x,pos.y);
    ctx.strokeStyle="#0F2744"; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.stroke();
    lastPos.current=pos; setHasSig(true); onChange?.(canvas.toDataURL());
  };

  const onEnd = e => { e.preventDefault(); drawing.current=false; };

  const clear = () => {
    const canvas=canvasRef.current;
    canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
    setHasSig(false); onChange?.(null);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div style={LBL}>{label}</div>
        {hasSig&&<button onClick={clear} style={{fontSize:11,color:"#94A3B8",background:"transparent",border:"none",cursor:"pointer",padding:"2px 6px"}}>✕ Clear</button>}
      </div>
      <div style={{position:"relative"}}>
        <canvas ref={canvasRef} width={560} height={130}
          style={{width:"100%",height:130,border:"1.5px solid #E2E8F0",borderRadius:8,background:"#FAFAFA",touchAction:"none",cursor:"crosshair",display:"block"}}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}/>
        {!hasSig&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",userSelect:"none",fontSize:13,color:"#D1D5DB",fontStyle:"italic"}}>
            Sign here with finger or mouse
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN — PRICING SETTINGS
// ═══════════════════════════════════════════════════════════

const newId = ()=>`item_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

function ItemTable({ items, onSave, groups }) {
  const [local,setLocal]=useState(items.map(i=>({...i}))); const [editing,setEditing]=useState(null); const [draft,setDraft]=useState({});
  const [adding,setAdding]=useState(false); const [newItem,setNewItem]=useState({label:"",group:groups?.[0]||"",dirty:"",replace:"",fixed:false,perUnit:false,bath:false});
  const startEdit=item=>{setEditing(item.id);setDraft({...item});}; const cancelEdit=()=>{setEditing(null);setDraft({});};
  const saveEdit=()=>{ const u=local.map(i=>i.id===editing?{...draft,dirty:draft.dirty===""?null:Number(draft.dirty),replace:draft.replace===""?null:Number(draft.replace)}:i); setLocal(u);setEditing(null);setDraft({});onSave(u); };
  const del=id=>{const u=local.filter(i=>i.id!==id);setLocal(u);onSave(u);};
  const add=()=>{ if(!newItem.label.trim())return; const item={...newItem,id:newId(),dirty:newItem.dirty===""?null:Number(newItem.dirty),replace:newItem.replace===""?null:Number(newItem.replace)}; const u=[...local,item];setLocal(u);onSave(u);setAdding(false);setNewItem({label:"",group:groups?.[0]||"",dirty:"",replace:"",fixed:false,perUnit:false,bath:false}); };
  const TH=({c,a="left"})=><th style={{padding:"6px 8px",background:"#F1F5F9",fontSize:11,fontWeight:700,color:"#64748B",textAlign:a,whiteSpace:"nowrap"}}>{c}</th>;
  const TD=({children,a="left"})=><td style={{padding:"5px 8px",fontSize:12,borderBottom:"1px solid #F1F5F9",textAlign:a,verticalAlign:"middle"}}>{children}</td>;
  const TI=({val,onChange,type="text",w=80})=><input type={type} value={val??""} onChange={e=>onChange(e.target.value)} style={{width:w,padding:"3px 6px",border:"1px solid #CBD5E1",borderRadius:5,fontSize:12}}/>;
  const SB=(bg,label,onClick)=><button onClick={onClick} style={{padding:"3px 10px",background:bg,color:"#FFF",border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",marginLeft:4}}>{label}</button>;
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
        <thead><tr><TH c="Label"/>{groups&&<TH c="Group"/>}<TH c="Clean Rate"/><TH c="Replace"/><TH c="Flags"/><TH c="Actions" a="center"/></tr></thead>
        <tbody>
          {local.map(item=>editing===item.id?(
            <tr key={item.id} style={{background:"#FFFBEB"}}>
              <TD><TI val={draft.label} onChange={v=>setDraft(d=>({...d,label:v}))} w={130}/></TD>
              {groups&&<TD><select value={draft.group||""} onChange={e=>setDraft(d=>({...d,group:e.target.value}))} style={{padding:"3px 6px",border:"1px solid #CBD5E1",borderRadius:5,fontSize:12}}>{groups.map(g=><option key={g}>{g}</option>)}</select></TD>}
              <TD><TI val={draft.dirty??""} onChange={v=>setDraft(d=>({...d,dirty:v}))} type="number" w={72}/></TD>
              <TD><TI val={draft.replace??""} onChange={v=>setDraft(d=>({...d,replace:v}))} type="number" w={72}/></TD>
              <TD><label style={{display:"flex",gap:4,alignItems:"center",fontSize:11}}><input type="checkbox" checked={!!draft.perUnit} onChange={e=>setDraft(d=>({...d,perUnit:e.target.checked}))}/> Per unit</label>{!groups&&<label style={{display:"flex",gap:4,alignItems:"center",fontSize:11,marginTop:2}}><input type="checkbox" checked={!!draft.bath} onChange={e=>setDraft(d=>({...d,bath:e.target.checked}))}/> Bath</label>}</TD>
              <TD a="center">{SB("#166534","✓",saveEdit)}{SB("#64748B","✗",cancelEdit)}</TD>
            </tr>
          ):(
            <tr key={item.id}>
              <TD><span style={{fontWeight:500}}>{item.label}</span>{item.note&&<span style={{fontSize:10,color:"#94A3B8",marginLeft:5}}>{item.note}</span>}</TD>
              {groups&&<TD><span style={{fontSize:11,background:"#F1F5F9",borderRadius:4,padding:"1px 6px"}}>{item.group}</span></TD>}
              <TD a="right">{item.dirty!=null?`$${item.dirty}`:"—"}</TD>
              <TD a="right">{item.replace!=null?`$${item.replace}`:"—"}</TD>
              <TD><span style={{fontSize:10,color:"#64748B"}}>{[item.perUnit&&"per-unit",item.fixed&&"fixed",item.bath&&"bath"].filter(Boolean).join(", ")||"—"}</span></TD>
              <TD a="center">{SB("#1E40AF","Edit",()=>startEdit(item))}{SB("#DC2626","Del",()=>del(item.id))}</TD>
            </tr>
          ))}
          {adding?(
            <tr style={{background:"#F0FDF4"}}>
              <TD><TI val={newItem.label} onChange={v=>setNewItem(p=>({...p,label:v}))} w={130}/></TD>
              {groups&&<TD><select value={newItem.group} onChange={e=>setNewItem(p=>({...p,group:e.target.value}))} style={{padding:"3px 6px",border:"1px solid #CBD5E1",borderRadius:5,fontSize:12}}>{groups.map(g=><option key={g}>{g}</option>)}</select></TD>}
              <TD><TI val={newItem.dirty} onChange={v=>setNewItem(p=>({...p,dirty:v}))} type="number" w={72}/></TD>
              <TD><TI val={newItem.replace} onChange={v=>setNewItem(p=>({...p,replace:v}))} type="number" w={72}/></TD>
              <TD><label style={{display:"flex",gap:4,alignItems:"center",fontSize:11}}><input type="checkbox" checked={newItem.perUnit} onChange={e=>setNewItem(p=>({...p,perUnit:e.target.checked}))}/> Per unit</label>{!groups&&<label style={{display:"flex",gap:4,alignItems:"center",fontSize:11,marginTop:2}}><input type="checkbox" checked={newItem.bath} onChange={e=>setNewItem(p=>({...p,bath:e.target.checked}))}/> Bath</label>}</TD>
              <TD a="center">{SB("#166534","Add",add)}{SB("#64748B","✗",()=>setAdding(false))}</TD>
            </tr>
          ):(
            <tr><td colSpan={groups?6:5} style={{padding:"8px 6px"}}><button onClick={()=>setAdding(true)} style={{padding:"5px 14px",background:"#EFF6FF",color:"#1E40AF",border:"1.5px dashed #93C5FD",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Item</button></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AdminSettings({ profile, pricing, onPricingUpdated }) {
  const [aTab,setATab]=useState("shared");
  const [sharedItems,setSharedItemsL]=useState(pricing?.shared_items||SHARED_ITEMS);
  const [bedItems,setBedItemsL]=useState(pricing?.bed_items||BED_ITEMS);
  const [mults,setMults]=useState(pricing?.mults||DEFAULT_MULTS);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");

  const save = async (field, value) => {
    setSaving(true); setMsg("");
    const { error } = await supabase.from("pricing_config")
      .update({ [field]:value, updated_at:new Date().toISOString(), updated_by:profile.id })
      .eq("org_id",profile.org_id);
    setSaving(false);
    if (error) setMsg("Error: "+error.message);
    else { setMsg("Saved!"); onPricingUpdated?.({...pricing,[field]:value}); setTimeout(()=>setMsg(""),3000); }
  };

  const ATABS=[{k:"shared",l:"Shared Items"},{k:"beds",l:"Bedroom Items"},{k:"mults",l:"Rating Scale"}];

  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',background:"#F0F4F8",minHeight:"100vh"}}>
      <div style={{background:"#1E3A5F",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:16,fontWeight:900,color:"#FFF"}}>Pricing Settings</div>
        {msg&&<div style={{fontSize:13,color:msg.startsWith("Error")?"#FCA5A5":"#86EFAC",fontWeight:700}}>{msg}</div>}
      </div>
      <div style={{background:"#1E3A5F",display:"flex",padding:"0 12px",gap:4,overflowX:"auto"}}>
        {ATABS.map(({k,l})=><button key={k} onClick={()=>setATab(k)} style={{padding:"9px 14px",border:"none",cursor:"pointer",whiteSpace:"nowrap",background:aTab===k?"#F0F4F8":"transparent",color:aTab===k?"#0F2744":"rgba(255,255,255,.6)",fontSize:12,fontWeight:aTab===k?700:400,borderRadius:"6px 6px 0 0"}}>{l}</button>)}
      </div>
      <div style={{maxWidth:800,margin:"0 auto",padding:16}}>
        {aTab==="shared"&&(
          <div style={{background:"#FFF",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.08)",padding:16}}>
            <div style={{fontSize:15,fontWeight:800,color:"#0F2744",marginBottom:12}}>Shared Living Space Items</div>
            <ItemTable items={sharedItems} onSave={updated=>{setSharedItemsL(updated);save("shared_items",updated);}} groups={GROUP_ORDER}/>
          </div>
        )}
        {aTab==="beds"&&(
          <div style={{background:"#FFF",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.08)",padding:16}}>
            <div style={{fontSize:15,fontWeight:800,color:"#0F2744",marginBottom:12}}>Bedroom Items</div>
            <ItemTable items={bedItems} onSave={updated=>{setBedItemsL(updated);save("bed_items",updated);}} groups={null}/>
          </div>
        )}
        {aTab==="mults"&&(
          <div style={{background:"#FFF",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.08)",padding:20,maxWidth:440}}>
            <div style={{fontSize:15,fontWeight:800,color:"#0F2744",marginBottom:4}}>Rating Scale Multipliers</div>
            <div style={{fontSize:13,color:"#64748B",marginBottom:20}}>Formula: <strong>dirty_cost = clean_rate × dirty_rating × multiplier</strong></div>
            {msg&&<div style={{padding:"8px 12px",borderRadius:8,marginBottom:14,background:"#DCFCE7",color:"#166534",fontSize:13}}>{msg}</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,maxWidth:400,marginBottom:16}}>
              {[["Rating 0–2","r02"],["Rating 3","r3"],["Rating 4","r4"],["Rating 5–10","r510"]].map(([l,k])=>(
                <div key={k}><div style={LBL}>{l}</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,color:"#64748B"}}>×</span>
                <input type="number" step="0.05" min="0" max="2" value={mults[k]} onChange={e=>setMults(p=>({...p,[k]:parseFloat(e.target.value)||0}))} style={{width:80,...INPUT_ST}}/></div></div>
              ))}
            </div>
            <div style={{padding:"10px 14px",background:"#F8FAFC",borderRadius:8,fontSize:12,color:"#64748B",marginBottom:16}}>
              Preview — Blinds ($5): {[3,4,5,10].map(r=>{const rm=getRatingMult(r,mults);return<span key={r} style={{marginLeft:12}}>r{r}: <strong>${(5*r*rm).toFixed(2)}</strong></span>;})}
            </div>
            <button onClick={()=>save("mults",mults)} disabled={saving} style={{padding:"10px 24px",background:"#1E40AF",color:"#FFF",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>{saving?"Saving…":"Save Multipliers"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INSPECTION UI COMPONENTS
// ═══════════════════════════════════════════════════════════

const TP = { clean:{fg:"#166534",bg:"#DCFCE7",bd:"#86EFAC"},dirty:{fg:"#92400E",bg:"#FEF3C7",bd:"#FCD34D"},broken:{fg:"#991B1B",bg:"#FEE2E2",bd:"#FCA5A5"} };

function Pill({val,active,label,onClick}) {
  const c=TP[val];
  return <button onClick={onClick} style={{padding:"4px 14px",borderRadius:99,cursor:"pointer",transition:"all .12s",border:`1.5px solid ${active?c.bd:"#E2E8F0"}`,background:active?c.bg:"#F8FAFC",color:active?c.fg:"#94A3B8",fontSize:12,fontWeight:active?700:400}}>{label}</button>;
}

function DirtyRater({value=0,onChange,dirtyRate=0,mults=DEFAULT_MULTS}) {
  const liveCost=n=>{const rm=getRatingMult(n,mults);return rm===0?null:`$${(dirtyRate*n*rm).toFixed(2)}`;};
  const rm=getRatingMult(value,mults); const charged=rm>0;
  return (
    <div style={{marginTop:8,display:"flex",alignItems:"flex-start",flexWrap:"wrap",gap:6}}>
      <span style={{fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".5px",paddingTop:5}}>Rating</span>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
        {[0,1,2,3,4,5,6,7,8,9,10].map(n=>{
          const isSel=value===n; const hot=getRatingMult(n,mults)>0; const amt=liveCost(n);
          return (
            <div key={n} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <button onClick={()=>onChange(n)} style={{minWidth:26,height:26,borderRadius:5,cursor:"pointer",border:`1.5px solid ${isSel?(hot?"#FCA5A5":"#86EFAC"):"#E2E8F0"}`,background:isSel?(hot?"#FEE2E2":"#DCFCE7"):hot?"#FFF5F5":"#F0FDF4",color:isSel?(hot?"#991B1B":"#166534"):hot?"#DC2626":"#16A34A",fontSize:11,fontWeight:isSel?900:600}}>{n}</button>
              {amt&&<span style={{fontSize:9,color:isSel?"#991B1B":"#FCA5A5",fontWeight:isSel?700:400,whiteSpace:"nowrap"}}>{amt}</span>}
            </div>
          );
        })}
      </div>
      <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,marginTop:2,background:charged?"#FEE2E2":"#DCFCE7",color:charged?"#991B1B":"#166534"}}>
        {charged?`⚠ $${(dirtyRate*value*rm).toFixed(2)} charged`:"✓ $0.00"}
      </span>
    </div>
  );
}

function ItemRow({item,state={},onChange,mults=DEFAULT_MULTS}) {
  const fileRef    = useRef(null);
  const [preview, setPreview] = useState(null);

  const status      = state.status      ?? "clean";
  const dirtyRating = state.dirtyRating ?? 0;
  const count       = state.count       ?? 1;
  const memo        = state.memo        ?? "";
  const photos      = state.photos      ?? [];
  const cost        = calcCost(item, state, mults);
  const hasDirty    = !!item.dirty;
  const hasReplace  = (item.replace ?? null) !== null || item.fixed;

  const handleFiles = async e => {
    const files = Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    const compressed = await Promise.all(files.map(compressPhoto));
    onChange({...state, photos:[...photos,...compressed]});
  };

  const removePhoto = i => onChange({...state, photos:photos.filter((_,j)=>j!==i)});

  return (
    <div style={{padding:"11px 0",borderBottom:"1px solid #F1F5F9"}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:"#1E293B",marginBottom:6}}>
            {item.label}{item.note&&<span style={{fontSize:11,color:"#94A3B8",marginLeft:7,fontWeight:400}}>{item.note}</span>}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <Pill val="clean"  active={status==="clean"}  label="✓ Clean"   onClick={()=>onChange({...state,status:"clean"})}/>
            {hasDirty   &&<Pill val="dirty"  active={status==="dirty"}  label="⚠ Dirty"   onClick={()=>onChange({...state,status:"dirty"})}/>}
            {hasReplace &&<Pill val="broken" active={status==="broken"} label="✕ Replace" onClick={()=>onChange({...state,status:"broken"})}/>}
            {item.perUnit&&status==="broken"&&(
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:11,color:"#94A3B8"}}>qty</span>
                <input type="number" min="0" value={count}
                  onChange={e=>onChange({...state,count:Math.max(0,parseInt(e.target.value)||0)})}
                  style={{width:46,padding:"3px 5px",border:"1px solid #CBD5E1",borderRadius:6,fontSize:13,textAlign:"center"}}/>
              </div>
            )}
          </div>
          {status==="dirty"&&hasDirty&&
            <DirtyRater value={dirtyRating} onChange={v=>onChange({...state,dirtyRating:v})} dirtyRate={item.dirty} mults={mults}/>}
          <div style={{display:"flex",gap:8,marginTop:7,alignItems:"center",flexWrap:"wrap"}}>
            <input type="text" placeholder="Add note…" value={memo}
              onChange={e=>onChange({...state,memo:e.target.value})}
              style={{flex:1,minWidth:120,maxWidth:220,padding:"4px 9px",border:"1px solid #F1F5F9",borderRadius:6,fontSize:11,color:"#64748B",background:"#FAFAFA"}}/>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFiles}/>
            <button onClick={()=>fileRef.current?.click()} style={{
              display:"flex",alignItems:"center",gap:4,
              padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,
              border:`1px solid ${photos.length>0?"#BFDBFE":"#E2E8F0"}`,
              background:photos.length>0?"#EFF6FF":"#F8FAFC",
              color:photos.length>0?"#1E40AF":"#94A3B8",whiteSpace:"nowrap",
            }}>📷 {photos.length>0?`${photos.length} photo${photos.length>1?"s":""}`:"+"}
            </button>
          </div>
          {photos.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
              {photos.map((src,i)=>(
                <div key={i} style={{position:"relative",flexShrink:0}}>
                  <img src={src} alt={`${item.label} ${i+1}`} onClick={()=>setPreview(src)}
                    style={{width:54,height:54,objectFit:"cover",borderRadius:7,border:"2px solid #E2E8F0",cursor:"pointer",display:"block"}}/>
                  <button onClick={()=>removePhoto(i)} style={{
                    position:"absolute",top:-6,right:-6,width:18,height:18,
                    borderRadius:"50%",background:"#DC2626",color:"#FFF",
                    border:"2px solid #FFF",cursor:"pointer",fontSize:11,fontWeight:900,
                    display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{minWidth:58,textAlign:"right",paddingTop:2}}>
          {cost>0?<span style={{fontSize:13,fontWeight:800,color:"#B91C1C"}}>${cost.toFixed(2)}</span>:<span style={{fontSize:12,color:"#CBD5E1"}}>—</span>}
        </div>
      </div>
      {preview&&(
        <div onClick={()=>setPreview(null)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <img src={preview} alt="Preview" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:8}}/>
          <button onClick={()=>setPreview(null)} style={{position:"absolute",top:16,right:16,background:"white",border:"none",borderRadius:"50%",width:36,height:36,fontSize:20,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      )}
    </div>
  );
}

function ExtraChargeField({ note, amount, onNoteChange, onAmountChange, label="Extra Charges" }) {
  return (
    <div style={{marginTop:14,paddingTop:10,borderTop:"1px dashed #E2E8F0"}}>
      <div style={LBL}>{label}</div>
      <div style={{display:"flex",gap:10,marginTop:5,alignItems:"stretch"}}>
        <input value={note} onChange={e=>onNoteChange(e.target.value)} placeholder="Description of extra charge…"
          style={{...INPUT_ST,flex:1}}/>
        <div style={{position:"relative",width:114}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#64748B",fontSize:14,pointerEvents:"none"}}>$</span>
          <input type="number" min="0" step="0.01" value={amount}
            onChange={e=>onAmountChange(e.target.value)}
            placeholder="0.00"
            style={{...INPUT_ST,paddingLeft:22,width:"100%",boxSizing:"border-box"}}/>
        </div>
      </div>
      {parseDollar(amount)>0&&(
        <div style={{fontSize:12,color:"#D97706",fontWeight:600,marginTop:5}}>
          ⚡ ${parseDollar(amount).toFixed(2)} will be added to this section's total
        </div>
      )}
    </div>
  );
}

function Card({children,color="#1E40AF",title,subtitle,total,mb=16}) {
  return (
    <div style={{background:"#FFF",borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,.09)",marginBottom:mb,overflow:"hidden"}}>
      {title&&(
        <div style={{background:color,padding:"13px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"#FFF",letterSpacing:"-.2px"}}>{title}</div>
            {subtitle&&<div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:2}}>{subtitle}</div>}
          </div>
          {total!==undefined&&<div style={{fontSize:17,fontWeight:900,color:"#FFF",letterSpacing:"-.4px"}}>${total.toFixed(2)}</div>}
        </div>
      )}
      <div style={{padding:"2px 16px 14px"}}>{children}</div>
    </div>
  );
}

function PhotoCapture({ photos=[], onAdd, onRemove, label="Photos" }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFiles = async e => {
    const files = Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    const compressed = await Promise.all(files.map(compressPhoto));
    compressed.forEach(src => onAdd(src));
  };

  return (
    <div style={{marginTop:14,paddingTop:10,borderTop:"1px dashed #E2E8F0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{...LBL,marginBottom:0}}>{label}{photos.length>0&&` (${photos.length})`}</div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFiles}/>
        <button onClick={()=>fileRef.current?.click()} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"#EFF6FF",color:"#1E40AF",border:"1.5px solid #BFDBFE",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>
          📷 Add Photos
        </button>
      </div>
      {photos.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {photos.map((src,i)=>(
            <div key={i} style={{position:"relative",flexShrink:0}}>
              <img src={src} alt={`Photo ${i+1}`} onClick={()=>setPreview(src)}
                style={{width:80,height:80,objectFit:"cover",borderRadius:8,border:"2px solid #E2E8F0",cursor:"pointer",display:"block"}}/>
              <button onClick={()=>onRemove(i)} style={{position:"absolute",top:-7,right:-7,width:22,height:22,borderRadius:"50%",background:"#DC2626",color:"#FFF",border:"2px solid #FFF",cursor:"pointer",fontSize:13,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>
            </div>
          ))}
        </div>
      )}
      {preview&&(
        <div onClick={()=>setPreview(null)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <img src={preview} alt="Preview" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:8}}/>
          <button onClick={()=>setPreview(null)} style={{position:"absolute",top:16,right:16,background:"white",border:"none",borderRadius:"50%",width:36,height:36,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>✕</button>
        </div>
      )}
    </div>
  );
}

function SubmitModal({onClose,onSubmit,loading,result}) {
  const [email,setEmail]=useState("");
  return (
    <div style={{position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#FFF",borderRadius:16,width:"100%",maxWidth:400,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{fontSize:18,fontWeight:900,color:"#0F2744",marginBottom:4}}>Submit Report</div>
        {result?(
          <>
            <div style={{background:"#DCFCE7",border:"1px solid #86EFAC",borderRadius:10,padding:"14px 16px",marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:700,color:"#166534"}}>✓ Report saved & print dialog opened!</div>
              <div style={{fontSize:12,color:"#166534",marginTop:4,lineHeight:1.5}}>Choose <strong>Save as PDF</strong> to create a file. The inspection is saved to the cloud.</div>
            </div>
            <button onClick={onClose} style={{width:"100%",padding:"11px 0",background:"#166534",color:"#FFF",border:"none",borderRadius:10,fontSize:14,fontWeight:800,cursor:"pointer"}}>Done</button>
          </>
        ):(
          <>
            <div style={{fontSize:13,color:"#64748B",marginBottom:18,lineHeight:1.5}}>The inspection will be saved to the cloud and the full report will open in your print dialog. Signatures and all charges will be included.</div>
            <div style={{marginBottom:18}}><div style={LBL}>Recipient Email (optional)</div><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="manager@thegroves.com" style={{...INPUT_ST,marginTop:5}} onKeyDown={e=>e.key==="Enter"&&onSubmit(email)}/></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={onClose} style={{flex:1,padding:"11px 0",background:"#F1F5F9",color:"#64748B",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>onSubmit(email)} disabled={loading} style={{flex:2,padding:"11px 0",background:loading?"#94A3B8":"#0F2744",color:"#FFF",border:"none",borderRadius:10,fontSize:14,fontWeight:800,cursor:loading?"default":"pointer"}}>{loading?"⏳ Saving…":"🖨 Save & Print"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INSPECTION LIST  (history)
// ═══════════════════════════════════════════════════════════

function InspectionList({ profile, onSelect, onNew, showAll=false }) {
  const [inspections,setInspections]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      let q = supabase.from("inspections")
        .select("id,house_num,room_num,tenant_name,inspection_date,grand_total,status,inspector_id,profiles(full_name)")
        .eq("org_id",profile.org_id).order("created_at",{ascending:false}).limit(100);
      if (!showAll) q = q.eq("inspector_id",profile.id);
      const { data } = await q;
      setInspections(data||[]);
      setLoading(false);
    })();
  },[profile,showAll]);

  const filtered = inspections.filter(i=>
    !search||[i.house_num,i.room_num,i.tenant_name].some(v=>v?.toLowerCase().includes(search.toLowerCase()))
  );

  const statusColor = s => s==="submitted"?"#166534":"#92400E";
  const statusBg    = s => s==="submitted"?"#DCFCE7":"#FEF3C7";

  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',background:"#F0F4F8",minHeight:"100vh"}}>
      <div style={{background:"#1E3A5F",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:16,fontWeight:900,color:"#FFF"}}>{showAll?"All Inspections":"My Inspections"}</div>
        <button onClick={onNew} style={{padding:"8px 16px",background:"#1E40AF",color:"#FFF",border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>+ New</button>
      </div>
      <div style={{maxWidth:700,margin:"0 auto",padding:16}}>
        <input placeholder="Search house, tenant, room…" value={search} onChange={e=>setSearch(e.target.value)} style={{...INPUT_ST,marginBottom:14}}/>
        {loading?<div style={{textAlign:"center",padding:40,color:"#94A3B8"}}>Loading…</div>
        :filtered.length===0?<div style={{textAlign:"center",padding:40,color:"#94A3B8"}}>No inspections found.</div>
        :filtered.map(insp=>(
          <div key={insp.id} onClick={()=>onSelect(insp)} style={{background:"#FFF",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.09)",padding:"14px 18px",marginBottom:10,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#0F172A"}}>House {insp.house_num||"—"} · Room {insp.room_num||"—"}</div>
                <div style={{fontSize:13,color:"#64748B",marginTop:2}}>{insp.tenant_name||"No tenant name"}</div>
                {showAll&&<div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>Inspector: {insp.profiles?.full_name||"—"}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:16,fontWeight:800,color:"#1E293B"}}>${Number(insp.grand_total||0).toFixed(2)}</div>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,background:statusBg(insp.status),color:statusColor(insp.status),marginTop:4,display:"inline-block"}}>{insp.status}</span>
              </div>
            </div>
            <div style={{fontSize:11,color:"#94A3B8",marginTop:6}}>{insp.inspection_date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════

function AdminDashboard({ profile, onNav }) {
  const [stats,setStats]=useState({total:0,submitted:0,drafts:0,totalCharges:0,thisMonth:0});
  const [recent,setRecent]=useState([]);

  useEffect(()=>{
    (async()=>{
      const { data } = await supabase.from("inspections")
        .select("id,status,grand_total,created_at,house_num,tenant_name,profiles(full_name)")
        .eq("org_id",profile.org_id).order("created_at",{ascending:false}).limit(20);
      if (!data) return;
      const now=new Date(); const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
      setStats({
        total:       data.length,
        submitted:   data.filter(i=>i.status==="submitted").length,
        drafts:      data.filter(i=>i.status==="draft").length,
        totalCharges:data.reduce((a,i)=>a+Number(i.grand_total||0),0),
        thisMonth:   data.filter(i=>new Date(i.created_at)>=monthStart).reduce((a,i)=>a+Number(i.grand_total||0),0),
      });
      setRecent(data.slice(0,6));
    })();
  },[profile]);

  const Stat=({label,value,sub})=>(
    <div style={{background:"#FFF",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.09)",padding:"16px 20px",flex:1,minWidth:140}}>
      <div style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".5px"}}>{label}</div>
      <div style={{fontSize:24,fontWeight:900,color:"#0F172A",marginTop:4}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:"#94A3B8",marginTop:2}}>{sub}</div>}
    </div>
  );

  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',background:"#F0F4F8",minHeight:"100vh",padding:16}}>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <div style={{fontSize:20,fontWeight:900,color:"#0F2744",marginBottom:16}}>Dashboard</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
          <Stat label="Total Inspections" value={stats.total}/>
          <Stat label="Submitted" value={stats.submitted}/>
          <Stat label="This Month" value={`$${stats.thisMonth.toFixed(0)}`} sub="in charges"/>
          <Stat label="All-Time Charges" value={`$${stats.totalCharges.toFixed(0)}`}/>
        </div>
        <div style={{background:"#FFF",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.09)",padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:700,color:"#0F2744"}}>Recent Inspections</div>
            <button onClick={()=>onNav("history")} style={{padding:"6px 14px",background:"#F1F5F9",color:"#374151",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>View All</button>
          </div>
          {recent.map(i=>(
            <div key={i.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #F1F5F9"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#1E293B"}}>House {i.house_num||"—"} · {i.tenant_name||"—"}</div>
                <div style={{fontSize:11,color:"#94A3B8"}}>{i.profiles?.full_name} · {i.created_at?.slice(0,10)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>${Number(i.grand_total||0).toFixed(2)}</div>
                <span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:99,background:i.status==="submitted"?"#DCFCE7":"#FEF3C7",color:i.status==="submitted"?"#166534":"#92400E"}}>{i.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════

function UserManagement({ profile }) {
  const [users,setUsers]=useState([]); const [loading,setLoading]=useState(true);
  const [inviteEmail,setInviteEmail]=useState(""); const [inviteName,setInviteName]=useState(""); const [inviteRole,setInviteRole]=useState("inspector"); const [msg,setMsg]=useState("");

  useEffect(()=>{
    supabase.from("profiles").select("*").eq("org_id",profile.org_id).then(({data})=>{ setUsers(data||[]); setLoading(false); });
  },[profile]);

  const toggleRole = async u => {
    const role=u.role==="admin"?"inspector":"admin";
    await supabase.from("profiles").update({role}).eq("id",u.id);
    setUsers(p=>p.map(x=>x.id===u.id?{...x,role}:x));
  };

  const toggleActive = async u => {
    const active=!u.active;
    await supabase.from("profiles").update({active}).eq("id",u.id);
    setUsers(p=>p.map(x=>x.id===u.id?{...x,active}:x));
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setMsg("Sending invite…");
    const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
      data:{ org_id:profile.org_id, role:inviteRole, full_name:inviteName }
    });
    setMsg(error?"Error: "+error.message:"Invite sent! ✓");
    if (!error) { setInviteEmail(""); setInviteName(""); }
    setTimeout(()=>setMsg(""),4000);
  };

  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',background:"#F0F4F8",minHeight:"100vh",padding:16}}>
      <div style={{maxWidth:700,margin:"0 auto"}}>
        <div style={{fontSize:18,fontWeight:900,color:"#0F2744",marginBottom:16}}>User Management</div>
        <div style={{background:"#FFF",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.09)",padding:20,marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0F2744",marginBottom:14}}>Invite New User</div>
          {msg&&<div style={{padding:"8px 12px",borderRadius:8,marginBottom:12,background:msg.startsWith("Error")?"#FEE2E2":"#DCFCE7",color:msg.startsWith("Error")?"#991B1B":"#166534",fontSize:13}}>{msg}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div><div style={LBL}>Full Name</div><input value={inviteName} onChange={e=>setInviteName(e.target.value)} style={INPUT_ST}/></div>
            <div><div style={LBL}>Email</div><input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} style={INPUT_ST}/></div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={LBL}>Role</div>
            <div style={{display:"flex",gap:10,marginTop:5}}>
              {["inspector","admin"].map(r=><button key={r} onClick={()=>setInviteRole(r)} style={{padding:"7px 18px",borderRadius:8,border:`2px solid ${inviteRole===r?"#1E40AF":"#E2E8F0"}`,background:inviteRole===r?"#EFF6FF":"#F8FAFC",color:inviteRole===r?"#1E40AF":"#64748B",fontWeight:inviteRole===r?700:400,fontSize:13,cursor:"pointer"}}>{r}</button>)}
            </div>
          </div>
          <button onClick={sendInvite} style={{padding:"10px 24px",background:"#0F2744",color:"#FFF",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>Send Invite Email</button>
          <div style={{fontSize:11,color:"#94A3B8",marginTop:8}}>They'll receive a link to set their password and join your organization.</div>
        </div>
        <div style={{background:"#FFF",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.09)",padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0F2744",marginBottom:14}}>Team Members ({users.length})</div>
          {loading?<div style={{color:"#94A3B8"}}>Loading…</div>:users.map(u=>(
            <div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid #F1F5F9"}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:u.active?"#1E293B":"#94A3B8"}}>{u.full_name||"—"}</div>
                <div style={{fontSize:12,color:"#94A3B8"}}>{u.email}</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:99,background:u.role==="admin"?"#EFF6FF":"#F8FAFC",color:u.role==="admin"?"#1E40AF":"#64748B",border:`1px solid ${u.role==="admin"?"#BFDBFE":"#E2E8F0"}`}}>{u.role}</span>
                {u.id!==profile.id&&<>
                  <button onClick={()=>toggleRole(u)} style={{padding:"4px 10px",background:"#F1F5F9",color:"#374151",border:"none",borderRadius:6,fontSize:11,cursor:"pointer"}}>Toggle Role</button>
                  <button onClick={()=>toggleActive(u)} style={{padding:"4px 10px",background:u.active?"#FEE2E2":"#DCFCE7",color:u.active?"#991B1B":"#166534",border:"none",borderRadius:6,fontSize:11,cursor:"pointer"}}>{u.active?"Deactivate":"Activate"}</button>
                </>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INSPECTION FORM VIEW
// ═══════════════════════════════════════════════════════════

function InspectionFormView({ profile, pricing, existingId, onSaved, onBack }) {
  const sharedItems = pricing?.shared_items || SHARED_ITEMS;
  const bedItems    = pricing?.bed_items    || BED_ITEMS;
  const mults       = pricing?.mults        || DEFAULT_MULTS;

  const today = new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"});

  const defItem  = ()=>({status:"clean",dirtyRating:0,count:1,memo:"",photos:[]});
  const defExtra = ()=>({note:"",amount:""});
  const defBed   = ()=>({bathNum:"",extraNote:"",extraAmount:"",photos:[],items:Object.fromEntries(bedItems.map(i=>[i.id,defItem()]))});

  const [loaded,      setLoaded]      = useState(!existingId);
  const [info,        setInfo]        = useState({house:"",room:"",date:today,tenant:"",inspector:profile.full_name||"",numBeds:1});
  const [extraShared, setExtraShared] = useState(defExtra());
  const [sharedPhotos,setSharedPhotos]= useState([]);
  const [shared,      setShared]      = useState(()=>Object.fromEntries(sharedItems.map(i=>[i.id,defItem()])));
  const [beds,        setBeds]        = useState(()=>[0,1,2,3,4,5].map(defBed));
  const [stdChecks,   setStdChecks]   = useState(Object.fromEntries(STD_SUPPLIES.map(s=>[s,false])));
  const [signatures,  setSignatures]  = useState({inspector:null,tenant:null});
  const [tab,         setTab]         = useState("info");
  const [showModal,   setShowModal]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [printMode,   setPrintMode]   = useState(false);
  const [saving,      setSaving]      = useState(false);

  // Load existing inspection from Supabase
  useEffect(()=>{
    if (!existingId) return;
    supabase.from("inspections").select("*").eq("id",existingId).single().then(({data})=>{
      if (!data) { setLoaded(true); return; }
      setInfo({
        house:    data.house_num||"",
        room:     data.room_num||"",
        date:     data.inspection_date
                    ? new Date(data.inspection_date+"T12:00:00").toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"})
                    : today,
        tenant:   data.tenant_name||"",
        inspector:data.shared_data?._inspector||profile.full_name||"",
        numBeds:  data.num_beds||1,
      });
      const sd = data.shared_data||{};
      const { _sharedPhotos, _signatures, _inspector, ...cleanShared } = sd;
      // Merge saved item states with current sharedItems (handles added/removed items)
      setShared(Object.fromEntries(sharedItems.map(i=>[i.id, cleanShared[i.id]||defItem()])));
      setSharedPhotos(_sharedPhotos||[]);
      setSignatures(_signatures||{inspector:null,tenant:null});
      // Merge saved beds with current bedItems schema, pad to 6
      const savedBeds = (data.beds_data||[]).map(bed=>({
        ...defBed(),
        ...bed,
        items: Object.fromEntries(bedItems.map(i=>[i.id, bed.items?.[i.id]||defItem()])),
      }));
      while (savedBeds.length < 6) savedBeds.push(defBed());
      setBeds(savedBeds);
      const es = data.extra_shared ? (()=>{ try{ return JSON.parse(data.extra_shared); }catch{ return defExtra(); } })() : defExtra();
      setExtraShared(es);
      setStdChecks(data.std_checks||Object.fromEntries(STD_SUPPLIES.map(s=>[s,false])));
      setLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[existingId]);

  const numBeds = info.numBeds||1;

  // ── Costs ──────────────────────────────────────────────
  const sharedItemsTotal = useMemo(()=>sharedItems.reduce((a,i)=>a+calcCost(i,shared[i.id],mults),0),[sharedItems,shared,mults]);
  const extraSharedAmt   = parseDollar(extraShared.amount);
  const sharedTotal      = sharedItemsTotal + extraSharedAmt;
  const bedItemsTotals   = useMemo(()=>beds.slice(0,numBeds).map(bed=>bedItems.reduce((a,i)=>a+calcCost(i,bed.items?.[i.id],mults),0)),[bedItems,beds,numBeds,mults]);
  const bedTotals        = useMemo(()=>beds.slice(0,numBeds).map((bed,i)=>bedItemsTotals[i]+parseDollar(bed.extraAmount)),[bedItemsTotals,beds,numBeds]);
  const perBedShared     = numBeds>0?sharedTotal/numBeds:0;
  const grandTotal       = sharedTotal+bedTotals.reduce((a,b)=>a+b,0);

  // ── Supplies ───────────────────────────────────────────
  const dynSupplies=useMemo(()=>{
    const s=new Set();
    sharedItems.forEach(item=>{if(shared[item.id]?.status==="broken"&&SUPPLY_TRIGGERS[item.id])s.add(SUPPLY_TRIGGERS[item.id]);});
    beds.slice(0,numBeds).forEach(bed=>{bedItems.forEach(item=>{const st=bed.items?.[item.id];if(st?.status==="broken"&&SUPPLY_TRIGGERS[item.id])s.add(SUPPLY_TRIGGERS[item.id]);});});
    return [...s];
  },[sharedItems,bedItems,shared,beds,numBeds]);

  // ── Updaters ───────────────────────────────────────────
  const setSharedItem   =(id,v)=>setShared(p=>({...p,[id]:v}));
  const setBedItem      =(bi,id,v)=>setBeds(p=>{const n=[...p];n[bi]={...n[bi],items:{...n[bi].items,[id]:v}};return n;});
  const setBedField     =(bi,k,v)=>setBeds(p=>{const n=[...p];n[bi]={...n[bi],[k]:v};return n;});
  const addSharedPhoto  =src=>setSharedPhotos(p=>[...p,src]);
  const removeSharedPhoto=i=>setSharedPhotos(p=>p.filter((_,j)=>j!==i));
  const addBedPhoto     =(bi,src)=>setBedField(bi,"photos",[...(beds[bi].photos||[]),src]);
  const removeBedPhoto  =(bi,i)=>setBedField(bi,"photos",(beds[bi].photos||[]).filter((_,j)=>j!==i));

  // ── Supabase save ──────────────────────────────────────
  const saveInspection = async (status="draft") => {
    setSaving(true);
    const sharedDataWithExtras = {
      ...shared,
      _sharedPhotos: sharedPhotos,
      _signatures:   signatures,
      _inspector:    info.inspector,
    };
    const payload = {
      org_id:         profile.org_id,
      inspector_id:   profile.id,
      house_num:      info.house,
      room_num:       info.room,
      tenant_name:    info.tenant,
      inspection_date:info.date,
      num_beds:       numBeds,
      shared_data:    sharedDataWithExtras,
      beds_data:      beds.slice(0,numBeds),
      extra_shared:   JSON.stringify(extraShared),
      std_checks:     stdChecks,
      shared_total:   sharedTotal,
      bed_totals:     bedTotals,
      grand_total:    grandTotal,
      status,
      ...(status==="submitted"?{submitted_at:new Date().toISOString()}:{}),
    };
    const { data, error } = existingId
      ? await supabase.from("inspections").update(payload).eq("id",existingId).select().single()
      : await supabase.from("inspections").insert(payload).select().single();
    setSaving(false);
    if (error) { alert("Save error: "+error.message); return null; }
    return data;
  };

  // ── Submit + print ─────────────────────────────────────
  const handleSubmit = async email => {
    setSubmitting(true);
    const data = await saveInspection("submitted");
    if (!data) { setSubmitting(false); return; }
    if (email) {
      await supabase.functions.invoke("send-inspection-email", {
        body: { inspection_id:data.id, recipient_email:email },
      });
    }
    setPrintMode(true);
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      setPrintMode(false);
      setSubmitting(false);
      setSubmitted(true);
    };
    setTimeout(()=>{
      window.print();
      window.addEventListener("afterprint", restore, {once:true});
      setTimeout(restore, 15000);
    }, 250);
  };

  // ── Damaged items list ─────────────────────────────────
  const damagedItems=useMemo(()=>{
    const out=[];
    sharedItems.forEach(item=>{const st=shared[item.id];if(st?.status&&st.status!=="clean")out.push({label:`${item.label} (Shared)`,status:st.status,rating:st.dirtyRating??0,cost:calcCost(item,st,mults),memo:st.memo});});
    beds.slice(0,numBeds).forEach((bed,bi)=>bedItems.forEach(item=>{const st=bed.items?.[item.id];if(st?.status&&st.status!=="clean")out.push({label:`Bed ${bi+1} – ${item.label}`,status:st.status,rating:st.dirtyRating??0,cost:calcCost(item,st,mults),memo:st.memo});}));
    return out;
  },[sharedItems,bedItems,shared,beds,numBeds,mults]);

  const TABS=[{key:"info",icon:"📋",label:"Info"},{key:"shared",icon:"🏠",label:"Shared"},{key:"beds",icon:"🛏",label:"Beds"},{key:"summary",icon:"📊",label:"Summary"}];

  if (!loaded) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#94A3B8",fontFamily:"sans-serif"}}>Loading…</div>;

  if (printMode) {
    return <PrintReport info={info} numBeds={numBeds} sharedItems={sharedItems} bedItems={bedItems}
      shared={shared} beds={beds} sharedItemsTotal={sharedItemsTotal} extraShared={{note:extraShared.note,amount:extraSharedAmt}}
      bedTotals={bedTotals} perBedShared={perBedShared} grandTotal={grandTotal} dynSupplies={dynSupplies}
      signatures={signatures} sharedPhotos={sharedPhotos}
      onClose={()=>{ setPrintMode(false); setSubmitting(false); }}
    />;
  }

  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',background:"#F0F4F8",minHeight:"100vh"}}>
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent} input:focus{outline:2px solid #3B82F6;border-color:#3B82F6!important} button:active{opacity:.8}`}</style>

      {/* Sticky form header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"#1E3A5F",boxShadow:"0 2px 12px rgba(0,0,0,.3)"}}>
        <div style={{maxWidth:660,margin:"0 auto",padding:"10px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <button onClick={onBack} style={{background:"transparent",border:"none",color:"rgba(255,255,255,.6)",fontSize:13,cursor:"pointer",padding:0,marginBottom:2}}>← Back</button>
            <div style={{fontSize:15,fontWeight:800,color:"#FFF"}}>
              {existingId?"Edit Inspection":"New Inspection"}
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>
              {info.house?`House ${info.house}`:""}{info.tenant?` · ${info.tenant}`:""}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>saveInspection("draft")} disabled={saving} style={{padding:"7px 14px",background:"rgba(255,255,255,.15)",color:"#FFF",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              {saving?"Saving…":"💾 Draft"}
            </button>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,.45)",textTransform:"uppercase",letterSpacing:".5px"}}>Total</div>
              <div style={{fontSize:22,fontWeight:900,letterSpacing:"-1px",color:grandTotal>0?"#F87171":"rgba(255,255,255,.25)"}}>${grandTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div style={{maxWidth:660,margin:"0 auto",display:"flex",padding:"8px 12px 0",gap:4}}>
          {TABS.map(({key,icon,label})=>(
            <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:"7px 0 8px",border:"none",cursor:"pointer",borderRadius:"8px 8px 0 0",background:tab===key?"#F0F4F8":"transparent",color:tab===key?"#0F2744":"rgba(255,255,255,.55)",fontSize:12,fontWeight:tab===key?700:400}}>
              <div>{icon}</div><div>{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{maxWidth:660,margin:"0 auto",padding:"16px 12px 48px"}}>

        {/* ════ INFO ════ */}
        {tab==="info"&&(
          <div>
            <Card title="Inspection Details" color="#1E3A5F">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,paddingTop:14}}>
                {[["House #","house"],["Room #","room"]].map(([l,k])=>(
                  <div key={k}><div style={LBL}>{l}</div><input value={info[k]} onChange={e=>setInfo(p=>({...p,[k]:e.target.value}))} style={INPUT_ST}/></div>
                ))}
                {[["Tenant Name","tenant"],["Inspector","inspector"],["Date","date"]].map(([l,k])=>(
                  <div key={k} style={{gridColumn:"span 2"}}><div style={LBL}>{l}</div><input value={info[k]} onChange={e=>setInfo(p=>({...p,[k]:e.target.value}))} style={INPUT_ST}/></div>
                ))}
                <div style={{gridColumn:"span 2"}}>
                  <div style={LBL}>Number of Bedrooms</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:5}}>
                    {[1,2,3,4,5,6].map(n=>(
                      <button key={n} onClick={()=>setInfo(p=>({...p,numBeds:n}))} style={{width:44,height:44,borderRadius:10,cursor:"pointer",border:`2px solid ${info.numBeds===n?"#1E40AF":"#E2E8F0"}`,background:info.numBeds===n?"#EFF6FF":"#F8FAFC",color:info.numBeds===n?"#1E40AF":"#94A3B8",fontSize:16,fontWeight:info.numBeds===n?900:400}}>{n}</button>
                    ))}
                  </div>
                  <div style={{marginTop:8,fontSize:12,color:"#94A3B8"}}>Shared split {numBeds} way{numBeds>1?"s":""} · Dirty: clean × rating × mod (3=×0.5, 4=×0.75, 5–10=×1)</div>
                </div>
              </div>
            </Card>
            <button onClick={()=>setTab("shared")} style={{...NEXT_BTN,display:"block",width:"100%"}}>Start Inspection →</button>
          </div>
        )}

        {/* ════ SHARED SPACE ════ */}
        {tab==="shared"&&(
          <div>
            <Card color="#1E40AF" title="Shared Living Space" subtitle={`clean × rating × mod · ÷${numBeds} = $${perBedShared.toFixed(2)}/bed`} total={sharedTotal}>
              {GROUP_ORDER.map(grp=>{
                const items=sharedItems.filter(i=>i.group===grp);
                if(!items.length)return null;
                return (<div key={grp}><div style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:2}}>{grp}</div>
                  {items.map(item=><ItemRow key={item.id} item={item} state={shared[item.id]} onChange={v=>setSharedItem(item.id,v)} mults={mults}/>)}
                </div>);
              })}
              <ExtraChargeField
                note={extraShared.note} amount={extraShared.amount}
                onNoteChange={v=>setExtraShared(p=>({...p,note:v}))}
                onAmountChange={v=>setExtraShared(p=>({...p,amount:v}))}
                label="Shared Extra Charge"
              />
              <PhotoCapture
                photos={sharedPhotos}
                onAdd={addSharedPhoto}
                onRemove={removeSharedPhoto}
                label="Shared Space Photos"
              />
            </Card>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setTab("info")}   style={BACK_BTN}>← Back</button>
              <button onClick={()=>setTab("beds")}   style={NEXT_BTN}>Bedroom Inspection →</button>
            </div>
          </div>
        )}

        {/* ════ BEDS ════ */}
        {tab==="beds"&&(
          <div>
            {beds.slice(0,numBeds).map((bed,bi)=>(
              <Card key={bi} color="#1E3A5F" title={`Bedroom ${bi+1}`} subtitle="Individual room charges" total={bedTotals[bi]} mb={14}>
                {bedItems.filter(i=>!i.bath).map(item=><ItemRow key={item.id} item={item} state={bed.items?.[item.id]} onChange={v=>setBedItem(bi,item.id,v)} mults={mults}/>)}
                <div style={{margin:"12px 0 4px",padding:"0 12px 8px",background:"#F8FAFC",borderRadius:10,border:"1px solid #F1F5F9"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"1px",padding:"10px 0 2px"}}>Bathroom {bed.bathNum&&`#${bed.bathNum}`}</div>
                  {bedItems.filter(i=>i.bath).map(item=><ItemRow key={item.id} item={item} state={bed.items?.[item.id]} onChange={v=>setBedItem(bi,item.id,v)} mults={mults}/>)}
                </div>
                <div style={{marginTop:10}}>
                  <div style={LBL}>Bath #</div>
                  <input value={bed.bathNum} onChange={e=>setBedField(bi,"bathNum",e.target.value)} style={{...INPUT_ST,width:88}}/>
                </div>
                <ExtraChargeField
                  note={bed.extraNote||""} amount={bed.extraAmount||""}
                  onNoteChange={v=>setBedField(bi,"extraNote",v)}
                  onAmountChange={v=>setBedField(bi,"extraAmount",v)}
                  label={`Bedroom ${bi+1} Extra Charge`}
                />
                <PhotoCapture
                  photos={bed.photos||[]}
                  onAdd={src=>addBedPhoto(bi,src)}
                  onRemove={i=>removeBedPhoto(bi,i)}
                  label={`Bedroom ${bi+1} Photos`}
                />
                <div style={{marginTop:12,padding:"10px 14px",background:"#F0F9FF",borderRadius:10,border:"1px solid #BAE6FD"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:"#0369A1"}}>Room item charges</span><span style={{fontSize:12,color:"#0369A1",fontWeight:700}}>${bedItemsTotals[bi].toFixed(2)}</span></div>
                  {parseDollar(bed.extraAmount)>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:"#D97706"}}>Extra: {bed.extraNote||"—"}</span><span style={{fontSize:12,color:"#D97706",fontWeight:700}}>${parseDollar(bed.extraAmount).toFixed(2)}</span></div>}
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:"#0369A1"}}>Shared portion (÷{numBeds})</span><span style={{fontSize:12,color:"#0369A1",fontWeight:700}}>${perBedShared.toFixed(2)}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #BAE6FD",paddingTop:6}}><span style={{fontSize:13,fontWeight:700,color:"#1E3A5F"}}>Bedroom {bi+1} Total</span><span style={{fontSize:14,fontWeight:900,color:"#1E3A5F"}}>${(bedTotals[bi]+perBedShared).toFixed(2)}</span></div>
                </div>
              </Card>
            ))}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setTab("shared")} style={BACK_BTN}>← Back</button>
              <button onClick={()=>setTab("summary")} style={NEXT_BTN}>View Summary →</button>
            </div>
          </div>
        )}

        {/* ════ SUMMARY ════ */}
        {tab==="summary"&&(
          <div>
            <Card color="#0F2744" title="Inspection Report" subtitle={`${info.house?"House "+info.house:""} ${info.room?"· Room "+info.room:""} · ${info.date}`.trim()}>
              <div style={{paddingTop:10}}>
                {[["Tenant",info.tenant],["Inspector",info.inspector]].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #F1F5F9"}}>
                    <span style={{fontSize:13,color:"#64748B"}}>{l}</span><span style={{fontSize:13,fontWeight:600,color:"#0F172A"}}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card color="#1E3A5F" title="Cost Breakdown" total={grandTotal}>
              <div style={{paddingTop:6}}>
                <div style={SUMROW}><span style={SUML}>Shared — items</span><span style={SUMV}>${sharedItemsTotal.toFixed(2)}</span></div>
                {extraSharedAmt>0&&<div style={SUMROW}><span style={SUML}>Shared — extra: {extraShared.note||"—"}</span><span style={{...SUMV,color:"#D97706"}}>${extraSharedAmt.toFixed(2)}</span></div>}
                {beds.slice(0,numBeds).map((bed,i)=>[
                  <div key={`bi${i}`} style={SUMROW}><span style={SUML}>Bedroom {i+1} — items</span><span style={SUMV}>${bedItemsTotals[i].toFixed(2)}</span></div>,
                  parseDollar(bed.extraAmount)>0&&<div key={`be${i}`} style={SUMROW}><span style={SUML}>Bedroom {i+1} — extra: {bed.extraNote||"—"}</span><span style={{...SUMV,color:"#D97706"}}>${parseDollar(bed.extraAmount).toFixed(2)}</span></div>,
                ])}
                <div style={{display:"flex",justifyContent:"space-between",padding:"13px 0 4px",borderTop:"2.5px solid #0F2744",marginTop:4}}>
                  <span style={{fontSize:16,fontWeight:800,color:"#0F172A"}}>GRAND TOTAL</span>
                  <span style={{fontSize:18,fontWeight:900,color:"#DC2626"}}>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Card color="#374151" title="Per-Bedroom Charges">
              {beds.slice(0,numBeds).map((bed,i)=>(
                <div key={i} style={{padding:"11px 0",borderBottom:"1px solid #F1F5F9"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:14,fontWeight:800,color:"#1E293B"}}>Bedroom {i+1}</span>
                    <span style={{fontSize:15,fontWeight:900,color:"#1E293B"}}>${(bedTotals[i]+perBedShared).toFixed(2)}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={SUBL}>Items</span><span style={SUBV}>${bedItemsTotals[i].toFixed(2)}</span></div>
                  {parseDollar(bed.extraAmount)>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{...SUBL,color:"#D97706"}}>Extra: {bed.extraNote||"—"}</span><span style={{...SUBV,color:"#D97706"}}>${parseDollar(bed.extraAmount).toFixed(2)}</span></div>}
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={SUBL}>Shared (÷{numBeds})</span><span style={SUBV}>${perBedShared.toFixed(2)}</span></div>
                </div>
              ))}
            </Card>

            {damagedItems.length>0&&(
              <Card color="#7C3AED" title={`Damaged / Dirty Items (${damagedItems.length})`}>
                {damagedItems.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",borderBottom:"1px solid #F5F3FF"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:99,whiteSpace:"nowrap",background:d.status==="dirty"?"#FEF3C7":"#FEE2E2",color:d.status==="dirty"?"#92400E":"#991B1B"}}>
                      {d.status==="dirty"?`DIRTY ${d.rating}/10`:"REPLACE"}
                    </span>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#1E293B"}}>{d.label}</div>{d.memo&&<div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>{d.memo}</div>}</div>
                    {d.cost>0&&<span style={{fontSize:13,fontWeight:800,color:"#B91C1C"}}>${d.cost.toFixed(2)}</span>}
                  </div>
                ))}
              </Card>
            )}

            {dynSupplies.length>0&&(
              <Card color="#065F46" title={`Supplies Needed (${dynSupplies.length})`}>
                <div style={{paddingTop:10,display:"flex",flexWrap:"wrap",gap:8}}>
                  {dynSupplies.map(s=><span key={s} style={{padding:"4px 14px",background:"#ECFDF5",color:"#065F46",borderRadius:99,fontSize:13,fontWeight:700,border:"1px solid #A7F3D0"}}>{s}</span>)}
                </div>
              </Card>
            )}

            <Card color="#0369A1" title="Standard Supplies Checklist">
              {STD_SUPPLIES.map(s=>(
                <label key={s} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:"1px solid #F0F9FF",cursor:"pointer"}}>
                  <input type="checkbox" checked={stdChecks[s]} onChange={()=>setStdChecks(p=>({...p,[s]:!p[s]}))} style={{width:18,height:18,cursor:"pointer",accentColor:"#0369A1"}}/>
                  <span style={{fontSize:14,color:stdChecks[s]?"#94A3B8":"#1E293B",textDecoration:stdChecks[s]?"line-through":"none"}}>{s}</span>
                </label>
              ))}
            </Card>

            {/* Sign-off */}
            <Card color="#334155" title="Sign-Off">
              <div style={{paddingTop:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                <SignaturePad label="Inspector Signature" value={signatures.inspector} onChange={v=>setSignatures(p=>({...p,inspector:v}))}/>
                <SignaturePad label="Tenant Signature"   value={signatures.tenant}    onChange={v=>setSignatures(p=>({...p,tenant:v}))}/>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Inspector Print Name</div>
                  <div style={{borderBottom:"2px solid #CBD5E1",height:32,display:"flex",alignItems:"center",fontSize:13,color:"#1E293B",paddingLeft:2}}>{info.inspector||""}</div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Date</div>
                  <div style={{borderBottom:"2px solid #CBD5E1",height:32,display:"flex",alignItems:"center",fontSize:13,color:"#1E293B",paddingLeft:2}}>{info.date}</div>
                </div>
              </div>
            </Card>

            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={()=>setTab("beds")} style={BACK_BTN}>← Edit</button>
              <button onClick={()=>{setSubmitted(false);setShowModal(true);}} style={{flex:2,padding:"13px 0",background:"#0F2744",color:"#FFF",border:"none",borderRadius:12,fontSize:15,fontWeight:800,cursor:"pointer"}}>📤 Submit Report</button>
            </div>
          </div>
        )}
      </div>

      {showModal&&<SubmitModal
        loading={submitting}
        result={submitted}
        onClose={()=>{ setShowModal(false); setSubmitted(false); if(submitted) onSaved?.(); }}
        onSubmit={handleSubmit}
      />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP  — auth + routing
// ═══════════════════════════════════════════════════════════

export default function App() {
  const [profile,  setProfile]  = useState(null);
  const [pricing,  setPricing]  = useState(null);
  const [view,     setView]     = useState("loading");
  const [selected, setSelected] = useState(null);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ session?loadProfile(session.user):setView("login"); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>{
      if (session) loadProfile(session.user);
      else { setProfile(null); setPricing(null); setView("login"); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  const loadProfile = async authUser => {
    const {data:prof} = await supabase.from("profiles").select("*").eq("id",authUser.id).single();
    if (!prof) { setView("login"); return; }
    setProfile(prof);
    const {data:pc} = await supabase.from("pricing_config").select("*").eq("org_id",prof.org_id).single();
    setPricing(pc);
    setView(prof.role==="admin"?"dashboard":"inspections");
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const NavShell = ({children, navItems}) => (
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
      <div style={{background:"#0F2744",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 8px rgba(0,0,0,.25)"}}>
        <div style={{fontSize:16,fontWeight:900,color:"#FFF"}}>The Groves</div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
          {navItems.map(({k,l})=>(
            <button key={k} onClick={()=>setView(k)} style={{padding:"6px 12px",background:view===k?"rgba(255,255,255,.2)":"transparent",color:"#FFF",border:"none",borderRadius:7,fontSize:12,fontWeight:view===k?700:400,cursor:"pointer"}}>{l}</button>
          ))}
          <button onClick={logout} style={{padding:"6px 12px",background:"transparent",color:"rgba(255,255,255,.5)",border:"none",fontSize:12,cursor:"pointer"}}>Sign Out</button>
        </div>
      </div>
      {children}
    </div>
  );

  if (view==="loading") return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"sans-serif",color:"#64748B"}}>Loading…</div>;
  if (view==="login")   return <LoginView/>;
  if (!profile)         return null;

  // Inspector
  if (profile.role==="inspector") {
    const nav=[{k:"inspections",l:"My Inspections"},{k:"new",l:"+ New"}];
    return (
      <NavShell navItems={nav}>
        {view==="inspections" && <InspectionList profile={profile} showAll={false} onNew={()=>setView("new")} onSelect={i=>{setSelected(i);setView("detail");}}/>}
        {view==="new"         && <InspectionFormView profile={profile} pricing={pricing} onSaved={()=>setView("inspections")} onBack={()=>setView("inspections")}/>}
        {view==="detail"      && <InspectionFormView profile={profile} pricing={pricing} existingId={selected?.id} onSaved={()=>setView("inspections")} onBack={()=>setView("inspections")}/>}
      </NavShell>
    );
  }

  // Admin
  const adminNav=[{k:"dashboard",l:"Dashboard"},{k:"history",l:"All Inspections"},{k:"new",l:"+ New"},{k:"settings",l:"Settings"},{k:"users",l:"Users"}];
  return (
    <NavShell navItems={adminNav}>
      {view==="dashboard" && <AdminDashboard profile={profile} onNav={setView}/>}
      {view==="history"   && <InspectionList profile={profile} showAll={true} onNew={()=>setView("new")} onSelect={i=>{setSelected(i);setView("detail");}}/>}
      {view==="new"       && <InspectionFormView profile={profile} pricing={pricing} onSaved={()=>setView("history")} onBack={()=>setView("dashboard")}/>}
      {view==="detail"    && <InspectionFormView profile={profile} pricing={pricing} existingId={selected?.id} onSaved={()=>setView("history")} onBack={()=>setView("history")}/>}
      {view==="settings"  && <AdminSettings profile={profile} pricing={pricing} onPricingUpdated={setPricing}/>}
      {view==="users"     && <UserManagement profile={profile}/>}
    </NavShell>
  );
}
