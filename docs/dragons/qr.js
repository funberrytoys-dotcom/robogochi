(() => {
  function token(value) {
    const trimmed=String(value||'').trim();
    if(/^TB-[A-Z]+-\d{2}$/i.test(trimmed))return trimmed.toUpperCase();
    try {
      const u=new URL(trimmed);
      return (u.searchParams.get('toy')||new URLSearchParams(u.hash.slice(1)).get('toy')||'').trim().toUpperCase();
    }catch{return '';}
  }
  function open({panel,header,finish}) {
    panel.innerHTML='<div class="sheet stack">'+header('ИГРУШКИ TOYSBERRY','Яйцо из игрушки')+
      '<div class="photo-block"><img src="'+groveAsset('assets/dragons/photo-babies.webp')+'" alt="Игрушечные драконы ToysBerry"><p>Отсканируйте QR с игрушки. Из яйца появится дракон её расцветки.</p></div>'+
      '<div class="actions"><button class="soft" id="scan">'+glyph('camera')+'Камера</button><button class="soft" id="from-file">'+glyph('qr')+'Открыть фото QR</button><input class="file-input" type="file" accept="image/*" id="qr-file"></div>'+
      '<video class="camera-preview" playsinline muted hidden></video><hr><form id="code-form" class="stack"><div><label for="qr-code">Код игрушки</label><input class="field" id="qr-code" autocomplete="off" autocapitalize="characters" maxlength="512" placeholder="TB-LEAF-01"></div><button class="gold">Получить яйцо</button></form><div id="qr-msg" class="msg" role="status"></div>'+
      '<details><summary>Коды для показа</summary><p>TB-LEAF-01 — зелёный малыш. TB-FLAME-02 — большой огненный дракон. Коды действуют один раз в этом браузере.</p></details></div>';
    const q=sel=>panel.querySelector(sel),msg=q('#qr-msg'),video=q('video'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
    let active=true,stream=null,timer=0;
    function stop(){clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;}
    function accept(value){
      const code=token(value);
      const error=code?Grove.redeem(code):'Не удалось прочитать код игрушки.';
      if(error){msg.textContent=error;return false;}
      stop();finish();return true;
    }
    function decode(image,w,h){
      const ratio=Math.min(1,1280/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
      ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
      return window.jsQR(pixels.data,pixels.width,pixels.height)?.data;
    }
    q('#code-form').onsubmit=e=>{e.preventDefault();accept(q('#qr-code').value);};
    q('#from-file').onclick=()=>q('#qr-file').click();
    q('#qr-file').onchange=async e=>{
      const file=e.target.files[0];if(!file)return;
      const url=URL.createObjectURL(file);
      try{const img=new Image();img.src=url;await img.decode();if(active){const result=decode(img,img.naturalWidth,img.naturalHeight);if(result)accept(result);else msg.textContent='QR не распознан. Выберите чёткий снимок целого квадрата.';}}
      catch{if(active)msg.textContent='Не удалось открыть изображение.';}finally{URL.revokeObjectURL(url);e.target.value='';}
    };
    q('#scan').onclick=async e=>{
      if(stream){stop();e.currentTarget.textContent='Включить камеру';return;}
      const button=q('#scan');button.disabled=true;
      try{
        const opened=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
        if(!active){opened.getTracks().forEach(t=>t.stop());return;}
        stream=opened;video.srcObject=stream;video.hidden=false;await video.play();button.textContent='Выключить камеру';msg.textContent='Поместите QR в кадр.';
        function read(){if(!stream||!active)return;if(video.readyState>=2){const value=decode(video,video.videoWidth,video.videoHeight);if(value&&accept(value))return;}timer=setTimeout(read,190);}read();
      }catch{stop();if(active)msg.textContent='Камера недоступна. Можно открыть фото QR или ввести код.';}finally{button.disabled=false;}
    };
    return ()=>{active=false;stop();};
  }
  window.ToyQR={token,open};
})();
