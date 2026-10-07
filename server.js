// ============================================================
// SERVER SPMB 2027/2028
// LOGIN ADMIN + DATA PENDAFTAR
// SMK BINA NUSANTARA KEBUMEN
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");


const PORT = process.env.PORT || 3001;

// ============================================================
// LOKASI WEBSITE DAN DATABASE
// ============================================================

const ROOT = __dirname;
const SPMB_FOLDER = path.join(ROOT, "spmb");
const DATA_FILE = path.join(ROOT, "data.json");

// ============================================================
// AKUN ADMIN
// ============================================================

const ADMIN_USER = process.env.SPMB_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.SPMB_ADMIN_PASS || "SPMB2027!";

// Session login disimpan di RAM
const sessions = new Map();

// ============================================================
// DATABASE
// ============================================================

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
}

function bacaData() {
    try {
        const isi = fs.readFileSync(DATA_FILE, "utf8");
        const data = JSON.parse(isi || "[]");

        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Gagal membaca database:", error.message);
        return [];
    }
}

function simpanData(data) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

// ============================================================
// NOMOR PENDAFTARAN
// ============================================================

function buatNomorPendaftaran() {

    const daftar = bacaData();

    let nomorTerakhir = 0;

    daftar.forEach(data => {

        if (!data.nomor) return;

        const bagian = String(data.nomor).split(".")[1];

        const nomor = parseInt(bagian, 10);

        if (!isNaN(nomor) && nomor > nomorTerakhir) {
            nomorTerakhir = nomor;
        }
    });

    return "27." +
        String(nomorTerakhir + 1).padStart(3, "0");
}

// ============================================================
// MIME TYPE
// ============================================================

function getContentType(filePath) {

    const ext = path.extname(filePath).toLowerCase();

    const types = {

        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",

        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".ico": "image/x-icon",

        ".mp4": "video/mp4",

        ".pdf": "application/pdf"
    };

    return types[ext] || "application/octet-stream";
}

// ============================================================
// RESPONSE JSON
// ============================================================

function kirimJSON(response, status, data, extraHeaders = {}) {

    response.writeHead(status, {

        "Content-Type":
            "application/json; charset=utf-8",

        "Cache-Control": "no-store",

        ...extraHeaders
    });

    response.end(JSON.stringify(data));
}

// ============================================================
// REDIRECT
// ============================================================

function redirect(response, location) {

    response.writeHead(302, {

        "Location": location,

        "Cache-Control": "no-store"
    });

    response.end();
}

// ============================================================
// COOKIE
// ============================================================

function bacaCookies(request) {

    const result = {};

    const raw = request.headers.cookie || "";

    raw.split(";").forEach(part => {

        const index = part.indexOf("=");

        if (index === -1) return;

        const key =
            part.slice(0, index).trim();

        const value =
            part.slice(index + 1).trim();

        try {

            result[key] =
                decodeURIComponent(value);

        } catch {

            result[key] = value;
        }
    });

    return result;
}

// ============================================================
// CEK LOGIN ADMIN
// ============================================================

function isAdmin(request) {

    const cookies = bacaCookies(request);

    const sid = cookies.spmb_admin;

    if (!sid) {
        return false;
    }

    const session = sessions.get(sid);

    if (!session) {
        return false;
    }

    if (Date.now() > session.expires) {

        sessions.delete(sid);

        return false;
    }

    return true;
}

// ============================================================
// BUAT SESSION
// ============================================================

function buatSessionCookie() {

    const sid =
        crypto.randomBytes(32).toString("hex");

    sessions.set(sid, {

        expires:
            Date.now() +
            8 * 60 * 60 * 1000
    });

    return (
        "spmb_admin=" +
        encodeURIComponent(sid) +
        "; HttpOnly" +
        "; SameSite=Lax" +
        "; Path=/" +
        "; Max-Age=28800"
    );
}

// ============================================================
// HAPUS SESSION
// ============================================================

function hapusSessionCookie(request) {

    const cookies = bacaCookies(request);

    const sid = cookies.spmb_admin;

    if (sid) {
        sessions.delete(sid);
    }

    return (
        "spmb_admin=;" +
        " HttpOnly" +
        "; SameSite=Lax" +
        "; Path=/" +
        "; Max-Age=0"
    );
}

// ============================================================
// BACA BODY
// ============================================================

function bacaBody(request, callback) {

    let body = "";

    let terlaluBesar = false;

    request.on("data", chunk => {

        body += chunk;

        if (body.length > 1024 * 1024) {

            terlaluBesar = true;

            request.destroy();
        }
    });

    request.on("end", () => {

        if (terlaluBesar) {

            callback(
                new Error("Data terlalu besar.")
            );

            return;
        }

        callback(null, body);
    });

    request.on("error", error => {

        callback(error);
    });
}

// ============================================================
// CEK ALAMAT ADMIN
// ============================================================

function isAdminPath(pathname) {

    return (

        pathname === "/admin.html" ||

        pathname === "/SERVER/admin.html" ||

        pathname === "/spmb/admin.html"
    );
}

// ============================================================
// CEK ALAMAT LOGIN
// ============================================================

function isLoginPath(pathname) {

    return (

        pathname === "/login-admin.html" ||

        pathname === "/spmb/login-admin.html"
    );
}

// ============================================================
// SERVER
// ============================================================

const server = http.createServer(
    (request, response) => {

        const parsed =
            url.parse(request.url, true);

        const pathname =
            parsed.pathname;

        // ====================================================
        // LOGIN PAGE
        // ====================================================

        if (
            request.method === "GET" &&
            isLoginPath(pathname)
        ) {

            const loginFile =
                path.join(
                    SPMB_FOLDER,
                    "login-admin.html"
                );

            fs.readFile(
                loginFile,
                (error, content) => {

                    if (error) {

                        response.writeHead(404, {

                            "Content-Type":
                                "text/plain; charset=utf-8"
                        });

                        response.end(
                            "Halaman login tidak ditemukan."
                        );

                        return;
                    }

                    response.writeHead(200, {

                        "Content-Type":
                            "text/html; charset=utf-8",

                        "Cache-Control":
                            "no-store"
                    });

                    response.end(content);
                }
            );

            return;
        }

        // ====================================================
        // CEK STATUS LOGIN
        // ====================================================

        if (
            request.method === "GET" &&
            pathname === "/api/admin/status"
        ) {

            kirimJSON(response, 200, {

                ok: true,

                loggedIn:
                    isAdmin(request)
            });

            return;
        }

        // ====================================================
        // LOGIN ADMIN
        // ====================================================

        if (
            request.method === "POST" &&
            pathname === "/api/admin/login"
        ) {

            bacaBody(
                request,
                (error, body) => {

                    if (error) {

                        kirimJSON(
                            response,
                            413,
                            {
                                ok: false,
                                message:
                                    "Data login terlalu besar."
                            }
                        );

                        return;
                    }

                    try {

                        const data =
                            JSON.parse(body || "{}");

                        const username =
                            String(
                                data.username || ""
                            ).trim();

                        const password =
                            String(
                                data.password || ""
                            );

                        if (

                            username !==
                            ADMIN_USER ||

                            password !==
                            ADMIN_PASS

                        ) {

                            kirimJSON(
                                response,
                                401,
                                {

                                    ok: false,

                                    message:
                                        "Username atau password salah."
                                }
                            );

                            return;
                        }

                        kirimJSON(

                            response,

                            200,

                            {

                                ok: true,

                                message:
                                    "Login berhasil."
                            },

                            {

                                "Set-Cookie":
                                    buatSessionCookie()
                            }
                        );

                    } catch (error) {

                        kirimJSON(
                            response,
                            400,
                            {

                                ok: false,

                                message:
                                    "Format login tidak valid."
                            }
                        );
                    }
                }
            );

            return;
        }

        // ====================================================
        // LOGOUT
        // ====================================================

        if (
            request.method === "POST" &&
            pathname === "/api/admin/logout"
        ) {

            kirimJSON(

                response,

                200,

                {

                    ok: true,

                    message:
                        "Logout berhasil."
                },

                {

                    "Set-Cookie":
                        hapusSessionCookie(request)
                }
            );

            return;
        }

        // ====================================================
        // ADMIN
        // INI PENTING:
        // /spmb/admin.html SEKARANG WAJIB LOGIN
        // ====================================================

        if (
            request.method === "GET" &&
            isAdminPath(pathname)
        ) {

            if (!isAdmin(request)) {

                redirect(
                    response,
                    "/spmb/login-admin.html"
                );

                return;
            }

            const adminFile =
                path.join(
                    SPMB_FOLDER,
                    "admin.html"
                );

            fs.readFile(
                adminFile,
                (error, content) => {

                    if (error) {

                        response.writeHead(
                            404,
                            {
                                "Content-Type":
                                    "text/plain; charset=utf-8"
                            }
                        );

                        response.end(
                            "admin.html tidak ditemukan."
                        );

                        return;
                    }

                    response.writeHead(
                        200,
                        {

                            "Content-Type":
                                "text/html; charset=utf-8",

                            "Cache-Control":
                                "no-store"
                        }
                    );

                    response.end(content);
                }
            );

            return;
        }

        // ====================================================
        // NOMOR PENDAFTARAN
        // PUBLIC
        // ====================================================

        if (

            request.method === "GET" &&

            pathname ===
                "/api/nomor-pendaftaran"

        ) {

            kirimJSON(
                response,
                200,
                {

                    success: true,

                    no_pendaftaran:
                        buatNomorPendaftaran()
                }
            );

            return;
        }

        // ====================================================
        // SIMPAN DATA PENDAFTAR
        // PUBLIC
        // ====================================================

        if (

            request.method === "POST" &&

            pathname ===
                "/api/pendaftar"

        ) {

            bacaBody(
                request,
                (error, body) => {

                    if (error) {

                        kirimJSON(
                            response,
                            413,
                            {

                                ok: false,

                                message:
                                    "Data terlalu besar."
                            }
                        );

                        return;
                    }

                    try {

                        const data =
                            JSON.parse(body || "{}");

                        if (

                            !data.nama ||

                            !data.nik ||

                            !data.jurusan

                        ) {

                            kirimJSON(
                                response,
                                400,
                                {

                                    ok: false,

                                    message:
                                        "Nama, NIK, dan jurusan wajib diisi."
                                }
                            );

                            return;
                        }

                        const daftar =
                            bacaData();

                        const sudahAda =
                            daftar.some(
                                item =>
                                    String(
                                        item.nik || ""
                                    ) ===
                                    String(
                                        data.nik
                                    )
                            );

                        if (sudahAda) {

                            kirimJSON(
                                response,
                                400,
                                {

                                    ok: false,

                                    message:
                                        "NIK tersebut sudah terdaftar."
                                }
                            );

                            return;
                        }

                        const dataBaru = {

                            nomor:
                                buatNomorPendaftaran(),

                            nama:
                                data.nama,

                            nik:
                                data.nik,

                            jk:
                                data.jk || "",

                            tempatLahir:
                                data.tempatLahir || "",

                            tanggalLahir:
                                data.tanggalLahir || "",

                            asalSekolah:
                                data.asalSekolah || "",

                            ayah:
                                data.ayah || "",

                            ibu:
                                data.ibu || "",

                            wa:
                                data.wa || "",

                            jurusan:
                                data.jurusan || "",

                            pilihan1:
                                data.pilihan1 ||
                                data.jurusan ||
                                "",

                            pilihan2:
                                data.pilihan2 ||
                                "",

                            waktu:
                                new Date()
                                    .toLocaleString(
                                        "id-ID"
                                    )
                        };

                        daftar.push(dataBaru);

                        simpanData(daftar);

                        kirimJSON(
                            response,
                            200,
                            {

                                ok: true,

                                success: true,

                                message:
                                    "Data berhasil disimpan.",

                                data:
                                    dataBaru
                            }
                        );

                    } catch (error) {

                        console.error(
                            "Error simpan:",
                            error
                        );

                        kirimJSON(
                            response,
                            500,
                            {

                                ok: false,

                                message:
                                    "Terjadi kesalahan saat menyimpan data."
                            }
                        );
                    }
                }
            );

            return;
        }

        // ====================================================
        // DATA PENDAFTAR
        // KHUSUS ADMIN
        // ====================================================

        if (

            request.method === "GET" &&

            pathname ===
                "/api/pendaftar"

        ) {

            if (!isAdmin(request)) {

                kirimJSON(
                    response,
                    401,
                    {

                        ok: false,

                        message:
                            "Akses admin diperlukan."
                    }
                );

                return;
            }

            kirimJSON(
                response,
                200,
                bacaData()
            );

            return;
        }
// ====================================================
// KONTAK SEKOLAH
// ====================================================

if (
    request.method === "POST" &&
    pathname === "/api/contact"
) {
    bacaBody(request, async (error, body) => {

        if (error) {
            kirimJSON(response, 413, {
                ok: false,
                message: "Data terlalu besar."
            });
            return;
        }

        try {
            const data = JSON.parse(body || "{}");

            const nama = String(data.nama || "").trim();
            const email = String(data.email || "").trim();
            const pesan = String(data.pesan || "").trim();

            if (!nama || !email || !pesan) {
                kirimJSON(response, 400, {
                    ok: false,
                    message: "Nama, email, dan pesan wajib diisi."
                });
                return;
            }

            console.log("Pesan kontak diterima:");
            console.log("Nama :", nama);
            console.log("Email:", email);
            console.log("Pesan:", pesan);

            kirimJSON(response, 200, {
                ok: true,
                message: "Pesan berhasil diterima."
            });

        } catch (error) {

            console.error("Error contact:", error);

            kirimJSON(response, 500, {
                ok: false,
                message: "Terjadi kesalahan pada server."
            });
        }
    });

    return;
}
        // ====================================================
        // STATIC WEBSITE
        // ====================================================

        let filePath;

        if (
            pathname === "/" ||
            pathname === ""
        ) {

            filePath =
                path.join(
                    ROOT,
                    "index.html"
                );

        } else if (

            pathname === "/spmb" ||
            pathname === "/spmb/"

        ) {

            filePath =
                path.join(
                    SPMB_FOLDER,
                    "index.html"
                );

        } else if (
            pathname.startsWith("/spmb/")
        ) {

            const relativePath =
                decodeURIComponent(
                    pathname.substring(
                        "/spmb/".length
                    )
                );

            filePath =
                path.join(
                    SPMB_FOLDER,
                    relativePath
                );

        } else {

            const relativePath =
                decodeURIComponent(pathname);

            filePath =
                path.join(
                    ROOT,
                    relativePath
                );
        }

        // ====================================================
        // KEAMANAN PATH
        // ====================================================

        const normalized =
            path.normalize(filePath);

        const allowedRoots = [

            path.normalize(ROOT),

            path.normalize(SPMB_FOLDER)
        ];

        const aman =
            allowedRoots.some(root =>

                normalized === root ||

                normalized.startsWith(
                    root + path.sep
                )
            );

        if (!aman) {

            response.writeHead(
                403,
                {
                    "Content-Type":
                        "text/plain; charset=utf-8"
                }
            );

            response.end(
                "Akses ditolak."
            );

            return;
        }

        // ====================================================
        // PENGAMANAN TAMBAHAN
        // ADMIN TIDAK BOLEH LOLOS DARI STATIC
        // ====================================================

        const relative =
            path
                .relative(
                    SPMB_FOLDER,
                    normalized
                )
                .replace(/\\/g, "/");

        if (
            relative === "admin.html"
        ) {

            if (!isAdmin(request)) {

                redirect(
                    response,
                    "/spmb/login-admin.html"
                );

                return;
            }
        }

        // ====================================================
        // KIRIM FILE
        // ====================================================

        fs.readFile(
            filePath,
            (error, content) => {

                if (error) {

                    response.writeHead(
                        404,
                        {
                            "Content-Type":
                                "text/plain; charset=utf-8"
                        }
                    );

                    response.end(
                        "Halaman tidak ditemukan."
                    );

                    return;
                }

                response.writeHead(
                    200,
                    {

                        "Content-Type":
                            getContentType(
                                filePath
                            ),

                        "Cache-Control":
                            relative === "admin.html"
                                ? "no-store"
                                : "no-cache"
                    }
                );

                response.end(content);
            }
        );
    }
);

// ============================================================
// JALANKAN SERVER
// ============================================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");

        console.log(
            "======================================"
        );

        console.log(
            "       SPMB WEB 2027/2028"
        );

        console.log(
            "       SMK BINA NUSANTARA KEBUMEN"
        );

        console.log(
            "======================================"
        );

        console.log("");

        console.log(
            "Server aktif:"
        );

        console.log(
            "http://localhost:" + PORT
        );

        console.log("");

        console.log(
            "Form SPMB:"
        );

        console.log(
            "http://localhost:" +
            PORT +
            "/spmb/"
        );

        console.log("");

        console.log(
            "Admin:"
        );

        console.log(
            "http://localhost:" +
            PORT +
            "/spmb/admin.html"
        );

        console.log("");

        console.log(
            "Login admin:"
        );

        console.log(
            "Username : " +
            ADMIN_USER
        );

        console.log(
            "Password : " +
            ADMIN_PASS
        );

        console.log("");

        console.log(
            "Database:"
        );

        console.log(
            DATA_FILE
        );

        console.log("");
    }
);