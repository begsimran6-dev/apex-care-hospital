const APPT_API=window.__API_BASE__||"/api";
document.getElementById("appointmentForm")?.addEventListener("submit",async e=>{
  e.preventDefault();const m=document.getElementById("message");const token=localStorage.getItem("token");
  if(!token){m.textContent="Please login first.";return;}
  try{
    const res=await fetch(`${APPT_API}/appointments`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
      body:JSON.stringify({doctor_id:Number(document.getElementById("doctor_id").value),appointment_date:document.getElementById("appointment_date").value,reason:document.getElementById("reason").value})});
    const d=await res.json();if(!res.ok)throw new Error(d.message||`HTTP ${res.status}`);m.textContent=`Appointment created. ID: ${d.id}`;e.target.reset();
  }catch(err){m.textContent=err.message;}
});
