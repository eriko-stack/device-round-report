/* Editable local PowerPoint export. All photos are embedded data URLs. */
(function(root){
 'use strict';
 const MIME='application/vnd.openxmlformats-officedocument.presentationml.presentation';
 const FONT='Yu Gothic';
 const inch=mm=>mm/25.4;
 function wrapped(context,text,width,size,bold=false){
  context.font=`${bold?'700':'400'} ${size*96/72}px "Yu Gothic", sans-serif`;
  const lines=[];
  for(const paragraph of String(text).split('\n')){
   if(!paragraph){lines.push('');continue}
   let line='';for(const char of paragraph){if(line&&context.measureText(line+char).width>width*96/25.4){lines.push(line);line=char}else line+=char}lines.push(line);
  }
  return lines;
 }
 async function create(report){
  if(![3,4,5].includes(report.count))throw Error('件数を確認してください。');
  const PptxConstructor=root.PptxGenJS || root.pptxgen;
  if(!PptxConstructor)throw Error('PPTX機能を読み込めません。アプリを開き直してください。');
  const pptx=new PptxConstructor();
  pptx.defineLayout({name:'A4_PORTRAIT',width:inch(210),height:inch(297)});pptx.layout='A4_PORTRAIT';
  pptx.author='';pptx.subject='ラウンド報告書';pptx.title=`${report.place||'○○'}ラウンド報告書`;pptx.company='';pptx.lang='ja-JP';
  pptx.theme={headFontFace:FONT,bodyFontFace:FONT,lang:'ja-JP'};
  const slide=pptx.addSlide();slide.background={color:'FFFFFF'};
  const context=document.createElement('canvas').getContext('2d');
  const text=(content,x,y,w,h,options={})=>slide.addText(content,{x:inch(x),y:inch(y),w:inch(w),h:inch(h),fontFace:FONT,fontSize:10,color:'203E60',lang:'ja-JP',margin:0,paraSpaceAfter:0,vertAnchor:'top',valign:'top',...options});
  const shape=(x,y,w,h,color,line={color,transparency:100})=>slide.addShape(pptx.ShapeType.rect,{x:inch(x),y:inch(y),w:inch(w),h:inch(h),fill:{color},line});
  shape(12,12,186,15,'FFFFFF',{color:'203E60',width:1});
  const title=`${report.place||'○○'}ラウンド報告書`;const titleSize=28;
  if(wrapped(context,title,180,titleSize,true).length>1)throw Error('場所の文字を短くしてください。');
  text(title,15,13,180,13,{fontSize:titleSize,bold:true,align:'center',valign:'mid'});
  const meta=`日時：${report.date}　${report.time}\n参加者：${report.participants}`;
  if(wrapped(context,meta,186,16).length*16*1.45*25.4/72>22)throw Error('参加者または時間を短くしてください。');
  text(meta,12,31,186,22,{fontSize:16,lineSpacingMultiple:1.05});
  const rowHeight=230/report.count;
  for(let i=0;i<report.count;i++){
   const item=report.items[i],top=56+i*rowHeight,heading=`${i+1}. ${item.title||'確認項目'}`;
   if(wrapped(context,heading,182,14,true).length>1)throw Error(`項目${i+1}の見出しを短くしてください。`);
   shape(12,top,1.5,7.5,'203E60');text(heading,16,top,182,8,{fontSize:14,bold:true});
   slide.addShape(pptx.ShapeType.line,{x:inch(12),y:inch(top+8),w:inch(186),h:0,line:{color:'9BB1C8',width:.5}});
   const y=top+9.5,h=rowHeight-10.5,w=91.5,right=106.5;
   if(item.photo){
    if(!/^data:image\/(jpeg|png);base64,/.test(item.photo))throw Error('写真データを確認してください。');
    const image=new Image();image.src=item.photo;await image.decode();
    const factor=Math.min(w/image.naturalWidth,h/image.naturalHeight),iw=image.naturalWidth*factor,ih=image.naturalHeight*factor;
    slide.addImage({data:item.photo,x:inch(12+(w-iw)/2),y:inch(y+(h-ih)/2),w:inch(iw),h:inch(ih),altText:`写真 ${i+1}`});
   }else text('写真未登録',15,y+3,w-6,h-6,{fontSize:10});
   shape(right,y,w,h,'E0EAF3');
   const size=12;
   const paragraphs=String(item.comment).split('\n');
   const count=paragraphs.reduce((sum,line)=>sum+wrapped(context,line,w-3,size,['確認した状況','ご提案'].includes(line.trim())).length,0);
   if(count*size*1.25*25.4/72>h-3)throw Error(`項目${i+1}のコメントが枠に収まりません。短くするか件数を減らしてください。`);
   const runs=paragraphs.map((line,index)=>({text:line||' ',options:{bold:['確認した状況','ご提案'].includes(line.trim()),breakLine:index<paragraphs.length-1}}));
   text(runs,right+1.5,y+1.5,w-3,h-3,{fontSize:size,lineSpacingMultiple:1.0,fit:'none'});
  }
  text('1 / 1',175,290,23,4,{fontSize:8,align:'right'});
  const result=await pptx.write({outputType:'arraybuffer',compression:true});
  return new Blob([result],{type:MIME});
 }
 root.LocalRoundPPTX={create,MIME};
 if(typeof module!=='undefined')module.exports=root.LocalRoundPPTX;
})(globalThis);
