'use strict';
const $=id=>document.getElementById(id);
let report=RoundModel.fresh(),db,dirty=false;
const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error)};
function openDB(){return new Promise((resolve,reject)=>{const request=indexedDB.open('device-round-reports',1);request.onupgradeneeded=()=>request.result.createObjectStore('reports',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
function transact(mode,operation){return new Promise((resolve,reject)=>{const transaction=db.transaction('reports',mode);const request=operation(transaction.objectStore('reports'));transaction.oncomplete=()=>resolve(request.result);transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error)})}
async function refreshList(){const all=await transact('readonly',store=>store.getAll());const select=$('reports');select.replaceChildren(new Option('選択してください',''));all.sort((a,b)=>b.updated.localeCompare(a.updated));for(const r of all)select.add(new Option(`${r.date} ${r.place||'場所未入力'}`,r.id));select.value=all.some(r=>r.id===report.id)?report.id:''}
function modified(){dirty=true;status('未保存の変更があります。「この端末に保存」を押してください。');preview()}
function collect(){for(const key of ['place','date','time','participants'])report[key]=$(key).value;report.count=Number($('count').value)}
function button(label,callback){const node=document.createElement('button');node.textContent=label;node.addEventListener('click',callback);return node}
function photoInput(capture){const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;if(capture)input.setAttribute('capture','environment');return input}
async function readPhoto(file){if(file.size>20*1024*1024)throw Error('写真は20MB以下にしてください。');const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();const factor=Math.min(1,1800/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*factor);canvas.height=Math.round(image.naturalHeight*factor);const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.88)}finally{URL.revokeObjectURL(url)}}
async function rotatePhoto(data, degrees) {
  const image = new Image();
  image.src = data;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalHeight;
  canvas.height = image.naturalWidth;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(degrees * Math.PI / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  return canvas.toDataURL('image/jpeg', 0.95);
}
function editor(){const target=$('editor');target.replaceChildren();report.items.slice(0,report.count).forEach((item,index)=>{
 const section=document.createElement('section');section.className='item';
 const heading=document.createElement('label');heading.textContent=`${index+1}. 項目の見出し`;const title=document.createElement('input');title.value=item.title;title.maxLength=40;title.addEventListener('input',()=>{item.title=title.value;modified()});heading.append(title);section.append(heading);
 const grid=document.createElement('div');grid.className='photo-comment';const photo=document.createElement('div');photo.className='photo-area';
 if(item.photo){const image=document.createElement('img');image.src=item.photo;image.alt=`写真 ${index+1}`;photo.append(image)}else{const empty=document.createElement('div');empty.className='empty';empty.textContent='写真を撮影・選択してください';photo.append(empty)}
 const tools=document.createElement('div');tools.className='toolbar';for(const [label,capture] of [['📷 この項目を撮影',true],['写真を選ぶ',false]]){const input=photoInput(capture);input.addEventListener('change',async()=>{if(!input.files[0])return;const current=report;try{const data=await readPhoto(input.files[0]);if(current!==report)return;item.photo=data;modified();editor()}catch(error){status('写真を読み込めませんでした。JPEG／PNGの写真でお試しください。',true)}});tools.append(button(label,()=>input.click()),input)}
 for (const [label, degrees] of [['↶ 左へ90°', -90], ['↷ 右へ90°', 90]]) {
   const rotateButton = button(label, async () => {
     const current = report;
     const original = item.photo;
     if (!original) return;
     rotateButton.disabled = true;
     try {
       const rotated = await rotatePhoto(original, degrees);
       if (current !== report || item.photo !== original) return;
       item.photo = rotated;
       modified();
       editor();
       status('写真の向きを変更しました。「この端末に保存」で保存してください。');
     } catch (error) {
       status('写真を回転できませんでした。写真を選び直してください。', true);
     } finally {
       rotateButton.disabled = !item.photo;
     }
   });
   rotateButton.disabled = !item.photo;
   tools.append(rotateButton);
 }
 const remove=button('写真を削除',()=>{if(!confirm('この項目の写真を外しますか？'))return;item.photo=null;modified();editor()});remove.disabled=!item.photo;tools.append(remove);photo.append(tools);grid.append(photo);
 const label=document.createElement('label');label.className='comment';label.textContent='確認した状況・ご提案';const comment=document.createElement('textarea');comment.value=item.comment;comment.maxLength=600;comment.addEventListener('input',()=>{item.comment=comment.value;modified()});label.append(comment);grid.append(label);section.append(grid);target.append(section)
})}
function render(){for(const key of ['place','date','time','participants','count'])$(key).value=report[key];editor();preview()}
function preview(){const paper=$('paper');paper.className=`rows-${report.count}`;$('paper-title').textContent=`${report.place||'○○'}ラウンド報告書`;$('paper-meta').textContent=`日時：${report.date}　${report.time}\n参加者：${report.participants}`;const target=$('paper-items');target.replaceChildren();report.items.slice(0,report.count).forEach((item,i)=>{const row=document.createElement('div');row.className='print-row';const title=document.createElement('h2');title.textContent=`${i+1}. ${item.title||'確認項目'}`;const content=document.createElement('div');content.className='row-content';const photo=document.createElement('div');photo.className='print-photo';if(item.photo){const image=new Image();image.src=item.photo;image.alt=`写真 ${i+1}`;photo.append(image)}else{photo.textContent='写真未登録'}const comment=document.createElement('div');comment.className='print-comment';item.comment.split('\n').forEach((line, index) => {
  if (index > 0) {
    comment.append(document.createTextNode('\n'));
  }

  if (['確認した状況', 'ご提案'].includes(line.trim())) {
    const bold = document.createElement('strong');
    bold.textContent = line;
    comment.append(bold);
  } else {
    comment.append(document.createTextNode(line));
  }
});content.append(photo,comment);row.append(title,content);target.append(row)})}
async function save(){if(!db){status('ブラウザー内の保存が利用できません。編集データを書き出してください。',true);return}collect();try{await transact('readwrite',store=>store.put({...report,updated:new Date().toISOString()}));dirty=false;await refreshList();status('この端末に保存しました。')}catch(error){status('端末に保存できませんでした。空き容量を確認し、編集データを書き出してください。',true)}}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
for(const key of ['place','date','time','participants'])$(key).addEventListener('input',()=>{collect();modified()});$('count').addEventListener('change',()=>{collect();modified();editor()});$('save').addEventListener('click',save);
$('new').addEventListener('click',()=>{if(dirty&&!confirm('未保存の変更があります。新規作成しますか？'))return;report=RoundModel.fresh();dirty=false;render();$('reports').value='';status('新しい報告書です。')});
$('reports').addEventListener('change',async()=>{const id=$('reports').value;if(!id)return;if(dirty&&!confirm('未保存の変更があります。別の報告書を開きますか？')){await refreshList();return}try{const saved=await transact('readonly',store=>store.get(id));if(!saved)throw Error();report=saved;dirty=false;render();status('この端末の報告書を開きました。')}catch(error){status('報告書を開けませんでした。',true)}});
$('export').addEventListener('click',()=>{collect();download(`round-report-${report.date}.json`,JSON.stringify({format:'device-round-v1',report}),'application/json');status('編集データを書き出しました。写真とコメントを含むファイルとして管理してください。')});
$('import').addEventListener('change',async event=>{const input=event.target;const file=input.files[0];if(!file)return;try{if(file.size>45*1024*1024)throw Error('編集データが大きすぎます。');const value=JSON.parse(await file.text());if(value.format!=='device-round-v1')throw Error('このアプリの編集データではありません。');const next=RoundModel.validateReport(value.report);if(dirty&&!confirm('未保存の変更があります。編集データを開きますか？'))return;report=next;dirty=true;render();await save()}catch(error){status(error.message||'編集データを開けませんでした。',true)}finally{input.value=''}});
$('delete').addEventListener('click',async()=>{if(!confirm('この報告書と写真を、このブラウザーの保存先から削除します。よろしいですか？'))return;try{if(db)await transact('readwrite',store=>store.delete(report.id));report=RoundModel.fresh();dirty=false;render();if(db)await refreshList();status('端末内の報告書を削除しました。書き出したファイル・PDFや写真アプリの写真は別に削除してください。')}catch(error){status('削除できませんでした。',true)}});
const pdfReady = new Promise((resolve, reject) => {
  if (window.LocalRoundPDF) { resolve(); return; }
  const script = document.createElement('script');
  script.src = './pdf-local.js';
  script.onload = resolve;
  script.onerror = () => reject(Error('PDF機能を読み込めません。オンラインでページを開き直してください。'));
  document.head.append(script);
});
pdfReady.catch(() => {});
let preparedPdf = null;
const sharePdfButton = button('作成したPDFを保存／共有', async () => {
  if (!preparedPdf) return;
  try {
    const file = new File([preparedPdf.blob], preparedPdf.name, {type: 'application/pdf'});
    if (navigator.canShare && navigator.canShare({files: [file]})) {
      await navigator.share({files: [file]});
    } else {
      download(preparedPdf.name, preparedPdf.blob, 'application/pdf');
    }
  } catch (error) {
    if (error.name !== 'AbortError') status('共有できませんでした。PDFの保存をもう一度お試しください。', true);
  }
});
sharePdfButton.hidden = true;
sharePdfButton.style.display = 'none';
$('pdf').after(sharePdfButton);
$('pdf').textContent = 'A4のPDFを直接作る';
const pdfHelp = sharePdfButton.nextElementSibling;
if (pdfHelp && pdfHelp.tagName === 'P') pdfHelp.textContent = '印刷画面を使わず、端末内でPDFを作ります。作成後「作成したPDFを保存／共有」から「ファイルに保存」を選んでください。';
function clearPreparedPdf() {
  preparedPdf = null;
  sharePdfButton.hidden = true;
  sharePdfButton.style.display = 'none';
}
const reportPanel = $('pdf').closest('main');
reportPanel.addEventListener('input', clearPreparedPdf);
reportPanel.addEventListener('change', clearPreparedPdf);
reportPanel.addEventListener('click', event => {
  if (event.target.closest('#editor') || event.target.id === 'new' || event.target.id === 'delete') clearPreparedPdf();
});
$('pdf').addEventListener('click', async () => {
  collect();
  const current = report;
  const snapshot = JSON.stringify(report);
  clearPreparedPdf();
  $('pdf').disabled = true;
  status('端末内でPDFを作成しています…');
  try {
    await pdfReady;
    const blob = await LocalRoundPDF.create(JSON.parse(snapshot));
    if (report !== current || JSON.stringify(report) !== snapshot) {
      status('作成中に入力が変わりました。PDFをもう一度作成してください。', true);
      return;
    }
    preparedPdf = {blob, name: `round-report-${report.date}.pdf`};
    sharePdfButton.hidden = false;
    sharePdfButton.style.display = 'inline-block';
    status('PDFを作成しました。「作成したPDFを保存／共有」を押してください。');
  } catch (error) {
    status(error.message || 'PDFを作成できませんでした。', true);
  } finally {
    $('pdf').disabled = false;
  }
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});
render();openDB().then(async value=>{db=value;await refreshList();status('端末内保存を利用できます。入力後に保存してください。')}).catch(()=>status('端末内保存を利用できません。通常のSafariで開き、編集データを書き出してください。',true));
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
