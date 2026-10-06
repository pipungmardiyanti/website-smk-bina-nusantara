const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3001;
const ROOT = __dirname;
const DB = path.join(ROOT, "data.json");

if (!fs.existsSync(DB)) fs.writeFileSync(DB, "[]", "utf8");

function readDB(){
  try { return JSON.parse(fs.readFileSync(DB, "utf8")); }
  catch(e) { return []; }
}
function writeDB(data){
  fs.writeFileSync(DB, JSON.stringify(data, null, 2), "utf8");
}
function nextNo(){
  const data = readDB();
  let max = 0;
  for(const x of data){
    const m = String(x.nomor || "").match(/27\.(\d+)/);
    if(m) max = Math.max(max, Number(m[1]));
  }
  return "27." + String(max + 1).padStart(3, "0");
}
function json(res, code, obj){
  res.writeHead(code, {"Content-Type":"application/json; charset=utf-8"});
  res.end(JSON.stringify(obj));
}
function mime(p){
  if(p.endsWith(".html")) return "text/html; charset=utf-8";
  if(p.endsWith(".css")) return "text/css; charset=utf-8";
  if(p.endsWith(".js")) return "application/javascript; charset=utf-8";
  if(p.endsWith(".json")) return "application/json; charset=utf-8";
  if(p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if(p.endsWith(".png")) return "image/png";
  if(p.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}
const server = http.createServer((req,res)=>{
  const url = new URL(req.url, "http://localhost");

  if(req.method === "GET" && url.pathname === "/api/nomor")
    return json(res,200,{nomor:nextNo()});

  if(req.method === "GET" && url.pathname === "/api/pendaftar"){
    return json(res,200,readDB());
  }

  if(req.method === "POST" && url.pathname === "/api/pendaftar"){
    let body="";
    req.on("data", c => body += c);
    req.on("end", ()=>{
      try{
        const incoming = JSON.parse(body || "{}");
        const data = readDB();
        const record = {...incoming, nomor:nextNo(), disimpan:new Date().toISOString()};
        data.push(record);
        writeDB(data);
        json(res,200,{ok:true,data:record});
      }catch(e){
        json(res,500,{ok:false,error:"Gagal menyimpan data"});
      }
    });
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if(pathname === "/") pathname = "/index.html";
  const file = path.normalize(path.join(ROOT, pathname));
  if(!file.startsWith(path.normalize(ROOT))) return res.end("Akses ditolak");

  fs.readFile(file,(err,data)=>{
    if(err){ res.writeHead(404); return res.end("File tidak ditemukan"); }
    res.writeHead(200,{"Content-Type":mime(file)});
    res.end(data);
  });
});

server.listen(PORT,"127.0.0.1",()=>{
  console.log("");
  console.log("======================================");
  console.log(" SPMB SMK BINA NUSANTARA 2027/2028");
  console.log(" http://localhost:"+PORT);
  console.log("======================================");
});
