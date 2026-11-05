const ALLOWED_ACTIONS = new Set([
  "publicData",
  "login",
  "adminData",
  "saveSettings",
  "saveItem",
  "deleteItem",
  "deleteMessage",
  "contact"
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
