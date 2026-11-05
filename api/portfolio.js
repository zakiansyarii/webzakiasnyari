const crypto = require("node:crypto");

const ALLOWED_ACTIONS = new Set([
  "publicData",
  "login",
  "adminData",
  "verifySession",
  "saveSettings",
  "saveItem",
  "deleteItem",
  "deleteMessage",
  "contact",
  "cloudinarySignature"
]);

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ ok: false, error: "Metode tidak diizinkan." });
  }

  const endpoint = process.env.APPS_SCRIPT_URL || "";
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(endpoint)) {
    return response.status(503).json({
      ok: false,
      error: "Backend belum dikonfigurasi. Isi environment variable APPS_SCRIPT_URL di Vercel."
    });
  }

  let payload;
  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  } catch {
    return response.status(400).json({ ok: false, error: "Format permintaan tidak valid." });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !ALLOWED_ACTIONS.has(payload.action)) {
    return response.status(400).json({ ok: false, error: "Aksi tidak dikenali." });
  }

  if (payload.action === "cloudinarySignature") {
    return createCloudinarySignature(payload, endpoint, response);
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    if (!upstream.ok) {
      return response.status(502).json({ ok: false, error: "Google Apps Script tidak dapat memproses permintaan." });
    }

    let result;
    try {
      result = await upstream.json();
    } catch {
      return response.status(502).json({ ok: false, error: "Respons Google Apps Script tidak valid." });
    }
    return response.status(200).json(result);
  } catch {
    return response.status(502).json({ ok: false, error: "Tidak dapat menghubungi Google Apps Script." });
  }
};

async function createCloudinarySignature(payload, endpoint, response) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  if (!cloudName || !apiKey || !apiSecret) {
    return response.status(503).json({
      ok: false,
      error: "Upload belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di Vercel."
    });
  }

  const folder = payload.folder;
  if (!["gallery", "projects", "profile"].includes(folder)) {
    return response.status(400).json({ ok: false, error: "Folder upload tidak valid." });
  }
  if (typeof payload.token !== "string" || !payload.token) {
    return response.status(401).json({ ok: false, error: "Sesi admin tidak valid. Silakan masuk kembali." });
  }

  try {
    const verification = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "verifySession", token: payload.token })
    });
    if (!verification.ok) {
      return response.status(502).json({ ok: false, error: "Tidak dapat memverifikasi sesi admin." });
    }

    const result = await verification.json();
    if (!result.ok) {
      return response.status(401).json({ ok: false, error: result.error || "Sesi admin tidak valid. Silakan masuk kembali." });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const uploadFolder = "portfolio/" + folder;
    const parameters = { folder: uploadFolder, timestamp: String(timestamp) };
    const signatureBase = Object.keys(parameters).sort()
      .map((key) => key + "=" + parameters[key])
      .join("&");
    const signature = crypto.createHash("sha1")
      .update(signatureBase + apiSecret)
      .digest("hex");

    return response.status(200).json({
      ok: true,
      cloudName,
      apiKey,
      timestamp,
      folder: uploadFolder,
      signature
    });
  } catch {
    return response.status(502).json({ ok: false, error: "Tidak dapat memverifikasi sesi admin ke Google Apps Script." });
  }
}
