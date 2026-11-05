/**
 * Google Apps Script API for the portfolio admin.
 *
 * Set Script Properties: SPREADSHEET_ID, ADMIN_USERNAME, ADMIN_PASSWORD.
 * Deploy as a Web App (execute as you; access: anyone), then set APPS_SCRIPT_URL
 * in Vercel. The password stays in Script Properties, never in the browser.
 */
const TAB = { settings: "Settings", projects: "Projects", gallery: "Gallery", links: "Links", messages: "Messages" };
const SESSION_SECONDS = 21600;

function doPost(event) {
  try {
    const input = JSON.parse((event && event.postData && event.postData.contents) || "{}");
    const output = handle_(input);
    return output_(Object.assign({ ok: true }, output));
  } catch (error) {
    return output_({ ok: false, error: error && error.message ? error.message : "Permintaan gagal." });
  }
}

function handle_(input) {
  const action = String(input.action || "");
  if (action === "login") return login_(input);
  if (action === "publicData") return readData_();
  if (action === "contact") return addMessage_(input.message);
  requireLogin_(input.token);
  if (action === "verifySession") return { authorized: true };
  if (action === "adminData") return readAdminData_();
  if (action === "saveSettings") return saveSettings_(input.settings);
  if (action === "saveItem") return saveItem_(input.type, input.item);
  if (action === "deleteItem") return deleteItem_(input.type, input.id);
  if (action === "deleteMessage") return deleteMessage_(input.id);
  throw new Error("Aksi tidak dikenali.");
}

function login_(input) {
  const properties = PropertiesService.getScriptProperties();
  const expectedUser = properties.getProperty("ADMIN_USERNAME");
  const expectedPassword = properties.getProperty("ADMIN_PASSWORD");
  if (!expectedUser || !expectedPassword) throw new Error("ADMIN_USERNAME dan ADMIN_PASSWORD belum dikonfigurasi di Script Properties.");
  if (!constantEqual_(String(input.username || ""), expectedUser) ||
      !constantEqual_(String(input.password || ""), expectedPassword)) {
    throw new Error("Username atau password salah.");
  }
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put("session:" + token, expectedUser, SESSION_SECONDS);
  return { token: token, username: expectedUser };
}

function requireLogin_(token) {
  if (!token || !CacheService.getScriptCache().get("session:" + String(token))) {
    throw new Error("Sesi admin tidak valid atau telah berakhir. Silakan masuk kembali.");
  }
}

function readData_() {
  initializeItems_(TAB.gallery, [
    ["1", "ZAKI ANSYARI", "HAI NAMA SAYA ZAKI", "assets/1.jpeg"],
    ["2", "ZAKI ANSYARI", "HAI NAMA SAYA ZAKI", "assets/2.jpeg"],
    ["3", "ZAKI ANSYARI", "HAI NAMA SAYA ZAKI", "assets/3.jpeg"],
    ["4", "ZAKI ANSYARI", "HAI NAMA SAYA ZAKI", "assets/4.jpeg"],
    ["5", "ZAKI ANSYARI", "HAI NAMA SAYA ZAKI", "assets/5.jpeg"],
    ["6", "ZAKI ANSYARI", "HAI NAMA SAYA ZAKI", "assets/6.jpeg"]
  ]);
  initializeItems_(TAB.links, [
    ["cloud", "CLOUD", "https://websitezakiansyari.vercel.app/cloud.html"],
    ["game", "GAME", "https://websitezakiansyari.vercel.app/game/snack.html"],
    ["pdf", "FILE TO PDF", "https://websitezakiansyari.vercel.app/filetopdf.htm"],
    ["schedule", "JADWAL KEGIATAN", "https://websitezakiansyari.vercel.app/jadwalkegiatan.html"],
    ["finance", "KEUANGAN", "https://websitezakiansyari.vercel.app/keuangan.html"]
  ]);
  return {
    settings: readSettings_(),
    projects: readRows_(TAB.projects),
    gallery: readRows_(TAB.gallery),
    links: readRows_(TAB.links)
  };
}

function readAdminData_() {
  const data = readData_();
  data.messages = readRows_(TAB.messages).reverse();
  return data;
}

function initializeItems_(name, defaults) {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty("SPREADSHEET_ID") || "";
  const marker = "initialized_" + name + "_" + spreadsheetId;
  if (properties.getProperty(marker)) return;
  const sheet = sheet_(name);
  if (sheet.getLastRow() === 1 && defaults.length) {
    sheet.getRange(2, 1, defaults.length, defaults[0].length).setValues(defaults);
  }
  properties.setProperty(marker, "true");
}

function readSettings_() {
  const rows = readRows_(TAB.settings);
  return rows.reduce(function (settings, row) {
    settings[row.key] = parseValue_(row.value);
    return settings;
  }, {});
}

function parseValue_(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function readRows_(name) {
  const sheet = sheet_(name);
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(function (value) { return String(value).trim(); });
  return values.slice(1).filter(function (row) {
    return row.some(function (value) { return value !== ""; });
  }).map(function (row) {
    return headers.reduce(function (object, header, index) {
      if (header) object[header] = row[index] || "";
      return object;
    }, {});
  });
}

function saveSettings_(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) throw new Error("Pengaturan tidak valid.");
  const sheet = sheet_(TAB.settings);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 2).setValues([["key", "value"]]);
  const rows = Object.keys(settings).map(function (key) {
    const value = settings[key];
    if (typeof value === "object" && value !== null) throw new Error("Nilai pengaturan tidak valid.");
    return [key, String(value)];
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  return { saved: true };
}

function saveItem_(type, item) {
  const name = type === "projects" ? TAB.projects : type === "gallery" ? TAB.gallery : type === "links" ? TAB.links : "";
  if (!name || !item || typeof item !== "object" || Array.isArray(item)) throw new Error("Jenis atau data konten tidak valid.");
  const sheet = sheet_(name);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const required = type === "projects" ? ["title", "description"]
    : type === "gallery" ? ["title", "image"] : ["title", "url"];
  required.forEach(function (field) {
    if (!String(item[field] || "").trim()) throw new Error("Kolom " + field + " wajib diisi.");
    if (headers.indexOf(field) === -1) throw new Error("Header " + field + " tidak ditemukan di sheet " + name + ".");
  });
  if (headers.indexOf("id") === -1) throw new Error("Kolom id tidak ditemukan di sheet " + name + ".");
  const id = String(item.id || Utilities.getUuid());
  const idColumn = headers.indexOf("id") + 1;
  const lastRow = sheet.getLastRow();
  let rowNumber = lastRow + 1;
  if (item.id && lastRow > 1) {
    const existing = sheet.getRange(2, idColumn, lastRow - 1, 1).getDisplayValues();
    const index = existing.findIndex(function (row) { return row[0] === id; });
    if (index >= 0) rowNumber = index + 2;
  }
  const row = headers.map(function (header) {
    if (header === "id") return id;
    return item[header] === undefined ? "" : String(item[header]);
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  return { item: Object.assign({}, item, { id: id }) };
}

function deleteItem_(type, id) {
  const name = type === "projects" ? TAB.projects : type === "gallery" ? TAB.gallery : type === "links" ? TAB.links : "";
  if (!name || !id) throw new Error("Jenis atau ID konten tidak valid.");
  const sheet = sheet_(name);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const idColumn = headers.indexOf("id") + 1;
  if (!idColumn) throw new Error("Kolom id tidak ditemukan di sheet " + name + ".");
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("Konten tidak ditemukan.");
  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getDisplayValues();
  const index = ids.findIndex(function (row) { return row[0] === String(id); });
  if (index < 0) throw new Error("Konten tidak ditemukan.");
  sheet.deleteRow(index + 2);
  return { deleted: true };
}

function addMessage_(message) {
  if (!message || typeof message !== "object") throw new Error("Data pesan tidak valid.");
  const name = clean_(message.name, 100);
  const email = clean_(message.email, 200);
  const body = clean_(message.message, 3000);
  if (!name || !email || !body) throw new Error("Semua kolom kontak wajib diisi.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Alamat email tidak valid.");
  sheet_(TAB.messages).appendRow([Utilities.getUuid(), new Date(), name, email, body]);
  return { received: true };
}

function sheet_(name) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) throw new Error("SPREADSHEET_ID belum dikonfigurasi di Script Properties.");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    const headers = name === TAB.settings ? ["key", "value"]
      : name === TAB.projects ? ["id", "title", "category", "year", "description", "image", "url"]
      : name === TAB.gallery ? ["id", "title", "description", "image"]
        : name === TAB.links ? ["id", "title", "url"]
            : ["id", "createdAt", "name", "email", "message"];
    sheet.appendRow(headers);
  }
  if (name === TAB.messages) ensureMessageIds_(sheet);
  return sheet;
}

function ensureMessageIds_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  if (headers.indexOf("id") !== -1) return;
  sheet.insertColumnBefore(1);
  sheet.getRange(1, 1).setValue("id");
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = Array.from({ length: lastRow - 1 }, function () { return [Utilities.getUuid()]; });
    sheet.getRange(2, 1, ids.length, 1).setValues(ids);
  }
}

function deleteMessage_(id) {
  if (!id) throw new Error("ID pesan tidak valid.");
  const sheet = sheet_(TAB.messages);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const idColumn = headers.indexOf("id") + 1;
  const lastRow = sheet.getLastRow();
  if (!idColumn || lastRow < 2) throw new Error("Pesan tidak ditemukan.");
  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getDisplayValues();
  const index = ids.findIndex(function (row) { return row[0] === String(id); });
  if (index < 0) throw new Error("Pesan tidak ditemukan.");
  sheet.deleteRow(index + 2);
  return { deleted: true };
}

function clean_(value, limit) {
  return String(value || "").trim().slice(0, limit);
}

function constantEqual_(actual, expected) {
  if (actual.length !== expected.length) return false;
  let result = 0;
  for (let index = 0; index < actual.length; index += 1) {
    result |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return result === 0;
}

function output_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
