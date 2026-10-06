document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const fields = [...document.querySelectorAll("input[id],select[id],textarea[id]")]
    .filter(x => x.id !== "noPendaftaran");
  const status = $("status");

  async function getNomor(){
    try{
      const r = await fetch("/api/nomor");
      const d = await r.json();
      $("noPendaftaran").value = d.nomor;
    }catch(e){
      $("noPendaftaran").value = "27.001";
      status.textContent = "Server belum aktif. Jalankan Mulai_SPMB.bat.";
    }
  }

  function dataForm(){
    const d = {};
    fields.forEach(x => d[x.id] = x.value);
    return d;
  }

  async function simpan(){
    if(!$("nama").value.trim()){
      alert("Nama Lengkap wajib diisi.");
      $("nama").focus();
      return;
    }
    const payload = dataForm();
    payload.nomor = $("noPendaftaran").value;
    payload.tanggalDaftar = $("tanggalDaftar").value;

    try{
      const r = await fetch("/api/pendaftar", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const d = await r.json();
      if(!d.ok) throw new Error();
      $("noPendaftaran").value = d.data.nomor;
      status.textContent = "✓ DATA TERSIMPAN. No. Pendaftaran: " + d.data.nomor;
      status.style.cssText =
        "display:block;margin-top:15px;padding:12px;background:#e9f8ee;color:#176b35;border-radius:8px;font-weight:700";
    }catch(e){
      alert("Data belum tersimpan. Pastikan SPMB dijalankan melalui Mulai_SPMB.bat.");
    }
  }

  $("simpan")?.addEventListener("click", simpan);
  $("reset")?.addEventListener("click", async () => {
    if(confirm("Kosongkan formulir?")){
      fields.forEach(x => x.value = "");
      if($("tanggalDaftar")) $("tanggalDaftar").value = new Date().toISOString().slice(0,10);
      status.textContent = "";
      await getNomor();
    }
  });
  $("cetak")?.addEventListener("click", () => window.print());

  if($("tanggalDaftar") && !$("tanggalDaftar").value)
    $("tanggalDaftar").value = new Date().toISOString().slice(0,10);
  getNomor();
});