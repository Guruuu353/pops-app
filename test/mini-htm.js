/* test-only stand-in for htm: same tagged-template contract, plus nesting checks */
(function(){
 window.__htmErrors=[];
 const PH=/\u0001(\d+)\u0002/g;
 function parse(h,strings,vals){
  let src='';for(let i=0;i<strings.length;i++){src+=strings[i];if(i<vals.length)src+='\u0001'+i+'\u0002';}
  let pos=0;const stack=[{name:null,children:[]}];
  const nm=n=>n&&n.name?n.name:n;
  const sub=t=>{let last=0,m;PH.lastIndex=0;const parts=[];while((m=PH.exec(t))){if(m.index>last)parts.push(t.slice(last,m.index));parts.push(vals[+m[1]]);last=m.index+m[0].length;}if(last<t.length)parts.push(t.slice(last));return parts;};
  const pushText=t=>{if(!t)return;sub(t).forEach(p=>{if(typeof p==='string'){if(/\n/.test(p))p=p.replace(/^\s*\n\s*|\s*\n\s*$/g,'').replace(/\s*\n\s*/g,' ');if(p==='')return;}stack[stack.length-1].children.push(p);});};
  while(pos<src.length){
   const lt=src.indexOf('<',pos);
   if(lt<0){pushText(src.slice(pos));break;}
   if(lt>pos)pushText(src.slice(pos,lt));
   pos=lt+1;
   if(src[pos]==='/'){
    const gt=src.indexOf('>',pos);const raw=src.slice(pos+1,gt).trim();pos=gt+1;
    const top=stack.pop();
    if(!top||top.name===null){window.__htmErrors.push('stray close '+raw);continue;}
    if(raw!=='/'){const m=raw.match(/^\u0001(\d+)\u0002$/);const cn=m?vals[+m[1]]:raw;if(cn!==top.name)window.__htmErrors.push('mismatch: open <'+nm(top.name)+'> closed </'+nm(cn)+'>');}
    stack[stack.length-1].children.push(h(top.name,top.props,...top.children));continue;
   }
   const m=/^(?:\u0001(\d+)\u0002|([A-Za-z][\w-]*))/.exec(src.slice(pos));
   if(!m){window.__htmErrors.push('bad tag near '+src.slice(pos-10,pos+30));break;}
   const name=m[1]!==undefined?vals[+m[1]]:m[2];pos+=m[0].length;const props={};let self=false;
   for(;;){
    while(/\s/.test(src[pos]))pos++;
    if(src[pos]==='/'&&src[pos+1]==='>'){pos+=2;self=true;break;}
    if(src[pos]==='>'){pos++;break;}
    const a=/^[^\s=\/>]+/.exec(src.slice(pos));
    if(!a){window.__htmErrors.push('bad attr near '+src.slice(pos,pos+30));return null;}
    let an=a[0];pos+=an.length;
    let an2=PH.test(an);PH.lastIndex=0;
    if(src[pos]==='='){pos++;let v;
     if(src[pos]==='"'||src[pos]==="'"){const q=src[pos];const e=src.indexOf(q,pos+1);const raw=src.slice(pos+1,e);pos=e+1;const parts=sub(raw);v=parts.length===1?parts[0]:parts.join('');}
     else{const pm=/^\u0001(\d+)\u0002/.exec(src.slice(pos));if(pm){v=vals[+pm[1]];pos+=pm[0].length;}else{const u=/^[^\s>]+/.exec(src.slice(pos));v=u[0];pos+=v.length;}}
     props[an]=v;
    }else props[an]=true;
   }
   if(self)stack[stack.length-1].children.push(h(name,Object.keys(props).length?props:null));
   else stack.push({name,props:Object.keys(props).length?props:null,children:[]});
  }
  if(stack.length!==1)window.__htmErrors.push('unclosed tags: '+stack.slice(1).map(s=>nm(s.name)).join(','));
  const ch=stack[0].children;return ch.length===1?ch[0]:ch;
 }
 const htm=function(){};htm.bind=h=>(s,...v)=>parse(h,s,v);window.htm=htm;
})();
