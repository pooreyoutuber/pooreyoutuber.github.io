const API_KEY = "YOUR_API_KEY_HERE"; // <-- replace with your API key

const qs = s => document.querySelector(s);
const videoUrlInput = qs('#videoUrl');
const fetchBtn = qs('#fetchBtn');
const clearBtn = qs('#clearBtn');
const statusEl = qs('#status');
const resultCard = qs('#resultCard');
const thumb = qs('#thumbnail');
const titleEl = qs('#title');
const channelEl = qs('#channelTitle');
const publishedEl = qs('#publishedAt');
const viewsEl = qs('#views');
const likesEl = qs('#likes');
const commentsEl = qs('#comments');
const descEl = qs('#description');
const openBtn = qs('#openBtn');
const copyBtn = qs('#copyBtn');

function setStatus(node){ statusEl.innerHTML = ''; statusEl.appendChild(node); }
function showSpinner(){ const s=document.createElement('div'); s.className='spinner'; setStatus(s); }
function clearStatus(){ statusEl.innerHTML=''; }

function parseVideoId(input){
  if(!input) return null;
  input=input.trim();
  if(/^[-_a-zA-Z0-9]{11}$/.test(input)) return input;
  try{
    const url=new URL(input);
    if(url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if(url.searchParams.has('v')) return url.searchParams.get('v');
    const parts=url.pathname.split('/').filter(Boolean);
    const idx=parts.indexOf('embed');
    if(idx>=0 && parts[idx+1]) return parts[idx+1];
  }catch(e){}
  const m=input.match(/([\\w-]{11})/);
  return m?m[1]:null;
}

async function fetchVideoInfo(id){
  if(!API_KEY || API_KEY==='YOUR_API_KEY_HERE'){
    setStatus(document.createTextNode('Please set your API key in script.js'));
    throw new Error('No API key');
  }
  showSpinner();
  const url=`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${id}&key=${API_KEY}`;
  const res=await fetch(url);
  clearStatus();
  if(!res.ok){ throw new Error('API error: '+res.status); }
  const data=await res.json();
  if(!data.items || !data.items.length) throw new Error('Video not found or is private.');
  return data.items[0];
}

function formatNumber(n){ return n?Number(n).toLocaleString():'—'; }
function iso8601ToDuration(iso){
  const m=iso.match(/PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?/);
  if(!m) return iso;
  const H=m[1]||0,M=m[2]||0,S=m[3]||0;
  return [H,String(M).padStart(2,'0'),String(S).padStart(2,'0')].filter((v,i)=>!(i==0 && v=='0')).join(':');
}

fetchBtn.addEventListener('click', async ()=>{
  const id=parseVideoId(videoUrlInput.value);
  if(!id){ setStatus(document.createTextNode('Invalid URL or ID')); return; }
  try{
    const item=await fetchVideoInfo(id);
    const sn=item.snippet||{}, st=item.statistics||{}, cd=item.contentDetails||{};
    thumb.src=(sn.thumbnails?.maxres||sn.thumbnails?.high||sn.thumbnails?.default)?.url||'';
    titleEl.textContent=sn.title||'—';
    channelEl.textContent=sn.channelTitle||'—';
    publishedEl.textContent=sn.publishedAt?new Date(sn.publishedAt).toLocaleString():'—';
    viewsEl.textContent=formatNumber(st.viewCount);
    likesEl.textContent=formatNumber(st.likeCount);
    commentsEl.textContent=formatNumber(st.commentCount);
    descEl.textContent=sn.description||'—';
    qs('#duration').textContent=cd.duration?iso8601ToDuration(cd.duration):'—';
    openBtn.onclick=()=>window.open('https://www.youtube.com/watch?v='+id,'_blank');
    copyBtn.onclick=async()=>{await navigator.clipboard.writeText('https://www.youtube.com/watch?v='+id); copyBtn.textContent='Copied!'; setTimeout(()=>copyBtn.textContent='Copy URL',1500);};
    resultCard.classList.remove('hidden');
    window.scrollTo({top:resultCard.offsetTop-20,behavior:'smooth'});
  }catch(err){ setStatus(document.createTextNode(err.message)); resultCard.classList.add('hidden'); }
});

clearBtn.addEventListener('click', ()=>{ videoUrlInput.value=''; resultCard.classList.add('hidden'); clearStatus(); });
videoUrlInput.addEventListener('keydown', e=>{ if(e.key==='Enter') fetchBtn.click(); });
