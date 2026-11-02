const AI_API=window.__API_BASE__||"/api";
const log=document.getElementById("chatLog");
function addMessage(cls,label,text){const div=document.createElement("div");div.className=`chat-row ${cls}`;div.innerHTML=`<strong>${label}</strong><div></div>`;div.querySelector("div").textContent=text;log.appendChild(div);log.scrollTop=log.scrollHeight;}
document.getElementById("chatForm").addEventListener("submit",async e=>{
  e.preventDefault();const input=document.getElementById("chatInput");const message=input.value.trim();if(!message)return;
  addMessage("chat-user","You",message);input.value="";
  try{const res=await fetch(`${AI_API}/ai/chat`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${localStorage.getItem("token") || ""}`},body:JSON.stringify({message})});const d=await res.json();if(!res.ok)throw new Error(d.message||`HTTP ${res.status}`);addMessage("chat-ai","APEX Care AI",d.reply);}
  catch(err){addMessage("chat-ai","APEX Care AI",`Request failed: ${err.message}`);}
});
