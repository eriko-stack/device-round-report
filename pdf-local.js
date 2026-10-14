/* Local-only PDF generator. No upload, external libraries, or print dialog. */
(function(root){
 'use strict';
 const encoder=new TextEncoder();
 function buildPdf(jpeg,width,height){
  const parts=[],offsets=[0];let length=0;
  function add(value){const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);length+=bytes.length}
  function object(id,body){offsets[id]=length;add(`${id} 0 obj\n`);add(body);add('\nendobj\n')}
  add('%PDF-1.4\n% local report\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.2756 841.8898] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>');
  const commands='q\n595.2756 0 0 841.8898 0 0 cm\n/Im0 Do\nQ\n';
  object(4,`<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`);
  offsets[5]=length;
  add(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  add(jpeg);add('\nendstream\nendobj\n');
  const start=length;add('xref\n0 6\n0000000000 65535 f \n');
  for(let id=1;id<=5;id++)add(`${String(offsets[id]).padStart(10,'0')} 00000 n \n`);
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'});
 }
 const FAMILY='-apple-system, BlinkMacSystemFont, "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif';
 function font(context,size,bold=false){context.font=`${bold?'700':'400'} ${size}px ${FAMILY}`}
 function lines(context,text,width){
  const output=[];
  for(const paragraph of String(text).split('\n')){
   if(!paragraph){output.push('');continue}
   let current='';
   for(const character of paragraph){if(current&&context.measureText(current+character).width>width){output.push(current);current=character}else current+=character}
   output.push(current);
  }
  return output;
 }
 function drawText(context,text,x,y,width,height,size,bold=false){
  font(context,size,bold);const wrapped=lines(context,text,width);const leading=size*1.45;
  if(wrapped.length*leading>height)throw Error('文章が枠に収まりません。短くするか、1ページの件数を減らしてください。');
  context.fillStyle='#203e60';context.textAlign='left';
  wrapped.forEach((line,i)=>context.fillText(line,x,y+i*leading));
 }
 function commentLines(context,text,width,size){
  return String(text).split('\n').flatMap(paragraph=>{
   const bold=['確認した状況','ご提案'].includes(paragraph.trim());
   font(context,size,bold);return lines(context,paragraph,width).map(line=>({line,bold}));
  });
 }
 async function create(report){
  if(![3,4,5].includes(report.count))throw Error('件数を確認してください。');
  const canvas=document.createElement('canvas');canvas.width=2480;canvas.height=3508;
  const context=canvas.getContext('2d');if(!context)throw Error('PDFの作成機能を利用できません。');
  const mm=canvas.width/210;const M=value=>value*mm;
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.textBaseline='top';
  const left=M(12),width=M(186),titleTop=M(12),titleHeight=M(15);
  context.strokeStyle='#203e60';context.lineWidth=M(.4);context.strokeRect(left,titleTop,width,titleHeight);
  const title=`${report.place||'○○'}ラウンド報告書`;let titleSize=M(6.4);font(context,titleSize,true);
  while(context.measureText(title).width>width-M(6)&&titleSize>M(3.5)){titleSize-=1;font(context,titleSize,true)}
  if(context.measureText(title).width>width-M(6))throw Error('場所の文字を短くしてください。');
  context.fillStyle='#203e60';context.textAlign='center';context.fillText(title,canvas.width/2,titleTop+(titleHeight-titleSize)/2);
  drawText(context,`日時：${report.date}　${report.time}\n参加者：${report.participants}`,left,M(31),width,M(20),M(3.5));
  const start=M(57),bottom=M(280),rowHeight=(bottom-start)/report.count;
  for(let i=0;i<report.count;i++){
   const item=report.items[i],top=start+i*rowHeight;
   const heading=`${i+1}. ${item.title||'確認項目'}`;
   context.fillStyle='#203e60';context.fillRect(left,top,M(1.5),M(6));
   drawText(context,heading,left+M(4),top,width-M(4),M(7),M(3.8),true);
   context.strokeStyle='#9bb1c8';context.lineWidth=M(.2);context.beginPath();context.moveTo(left,top+M(8));context.lineTo(left+width,top+M(8));context.stroke();
   const boxY=top+M(11),boxHeight=rowHeight-M(15),gap=M(3),photoWidth=(width-gap)/2;
   if(item.photo){
    const image=new Image();image.src=item.photo;await image.decode();
    const factor=Math.min(photoWidth/image.naturalWidth,boxHeight/image.naturalHeight);
    const iw=image.naturalWidth*factor,ih=image.naturalHeight*factor;
    context.drawImage(image,left+(photoWidth-iw)/2,boxY+(boxHeight-ih)/2,iw,ih);
   }else drawText(context,'写真未登録',left+M(3),boxY+M(3),photoWidth-M(6),boxHeight,M(3.4));
   const commentX=left+photoWidth+gap,padding=M(3),size=M(report.count===5?3.1:3.5),leading=size*1.45;
   context.fillStyle='#e0eaf3';context.fillRect(commentX,boxY,photoWidth,boxHeight);
   const wrapped=commentLines(context,item.comment,photoWidth-padding*2,size);
   if(wrapped.length*leading>boxHeight-padding*2)throw Error(`項目${i+1}のコメントが枠に収まりません。短くするか件数を減らしてください。`);
   context.fillStyle='#203e60';context.textAlign='left';
   wrapped.forEach((entry,index)=>{font(context,size,entry.bold);context.fillText(entry.line,commentX+padding,boxY+padding+index*leading)});
  }
  font(context,M(2.7));context.fillStyle='#203e60';context.textAlign='right';context.fillText('1 / 1',left+width,M(286));
  const jpeg=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PDF画像を生成できませんでした。')),'image/jpeg',.94));
  const result=buildPdf(new Uint8Array(await jpeg.arrayBuffer()),canvas.width,canvas.height);
  canvas.width=canvas.height=1;
  return result;
 }
 root.LocalRoundPDF={create,buildPdf};
 if(typeof module!=='undefined')module.exports=root.LocalRoundPDF;
})(globalThis);
