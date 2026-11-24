async function approveUser(id){
  let names=Object.keys(P||{});
  if(!names.length){alert("Нет программ");return}
  let h='<div style="padding:16px;background:#1a1a1a;border-radius:12px;margin:10px"><b>Выберите программы:</b>';
  names.forEach(n=>{h+='<label style="display:block;padding:10px 0;border-bottom:1px solid #333"><input type="checkbox" class="pc" value="'+n+'" style="margin-right:8px">'+n+'</label>'});
  h+='<button onclick="doApprove('+id+')" style="margin-top:12px;width:100%;padding:12px;background:#b8f000;color:#000;border:0;border-radius:8px;font-weight:700">Одобрить</button></div>';
  document.getElementById("workout").insertAdjacentHTML("afterbegin",h);
}
async function doApprove(id){
  let programs=[...document.querySelectorAll(".pc:checked")].map(c=>c.value);
  try{
    let r=await fetch("/api/admin/users/approve",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({id,programs})});
    if(r.ok){alert("Одобрено");location.reload()}else alert("Ошибка");
  }catch(e){alert(e.message)}
}
