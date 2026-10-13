/* Imported files are treated as data, never HTML or code. */
(function(root){
  const text=(v,max)=>{if(typeof v!=='string'||v.length>max)throw Error('編集データの文字項目が不正です。');return v};
  function validateReport(value){
    if(!value||typeof value!=='object'||!Array.isArray(value.items)||value.items.length!==5)throw Error('このアプリの編集データではありません。');
    if(![3,4,5].includes(value.count))throw Error('件数が不正です。');
    const date=text(value.date,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('日付が不正です。');
    return {id:crypto.randomUUID(),place:text(value.place,40),date,time:text(value.time,40),participants:text(value.participants,160),count:value.count,
      items:value.items.map(item=>{const photo=item.photo;if(photo!==null&&(typeof photo!=='string'||photo.length>8000000||!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(photo)))throw Error('写真データが不正です。');return {title:text(item.title,40),comment:text(item.comment,600),photo}})};
  }
  function fresh(){const now=new Date();const date=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);return {id:crypto.randomUUID(),place:'',date,time:'',participants:'',count:3,items:Array.from({length:5},()=>({title:'',comment:'確認した状況\n\nご提案\n',photo:null}))}}
  root.RoundModel={fresh,validateReport};
  if(typeof module!=='undefined')module.exports=root.RoundModel;
})(globalThis);
