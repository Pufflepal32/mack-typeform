/**
 * Google Sheets webhook for the Carpenter / Home Builder intake form.
 *
 * SETUP (one time, ~90 seconds — see google-apps-script/SETUP.md):
 *   1. Make a new Google Sheet.
 *   2. Extensions -> Apps Script. Delete the sample, paste THIS file, Save.
 *   3. Deploy -> New deployment -> type "Web app".
 *        Execute as: Me
 *        Who has access: Anyone
 *   4. Authorize, copy the /exec Web app URL.
 *   5. Paste that URL into WEBHOOK_URL at the top of index.html.
 *
 * Each form submission becomes one row. Columns are created automatically and
 * grow as new questions appear (the form's conditional logic means different
 * submissions can have different questions).
 */

var SHEET_NAME = 'Intakes';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    var payload = JSON.parse(e.postData.contents);
    var meta = payload.meta || {};
    var flat = flatten(payload.answers || {});
    var sessionId = meta.sessionId || '';
    var status = meta.status || 'complete';   // 'partial' (live save) or 'complete' (submitted)

    // ----- header row (auto-grows with new questions) -----
    var BASE = ['timestamp', 'status', 'sessionId', 'business_name', 'answers_for_gpt'];
    var headers = sheet.getLastRow() === 0
      ? []
      : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (headers.length === 0) {
      headers = BASE.concat(Object.keys(flat));
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    } else {
      var added = false;
      BASE.concat(Object.keys(flat)).forEach(function (k) {
        if (headers.indexOf(k) === -1) { headers.push(k); added = true; }
      });
      if (added) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // ----- build the row in header order -----
    var row = headers.map(function (h) {
      if (h === 'timestamp') return new Date();
      if (h === 'status') return status;
      if (h === 'sessionId') return sessionId;
      if (h === 'business_name') return flat['biz_name'] || '';
      if (h === 'answers_for_gpt') return meta.summary || '';
      return flat[h] !== undefined ? flat[h] : '';
    });

    // ----- upsert: update this person's existing row, or add a new one -----
    var targetRow = 0;
    var sidCol = headers.indexOf('sessionId');
    if (sessionId && sidCol !== -1 && sheet.getLastRow() > 1) {
      var ids = sheet.getRange(2, sidCol + 1, sheet.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === sessionId) { targetRow = i + 2; break; }
      }
    }
    if (targetRow) {
      sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
      targetRow = sheet.getLastRow();
    }

    return json({ result: 'success', row: targetRow, status: status });
  } catch (err) {
    return json({ result: 'error', error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Friendly message if someone opens the URL in a browser (GET).
function doGet() {
  return json({ result: 'ok', message: 'Carpenter intake webhook is live. POST form JSON here.' });
}

// Flatten { section: { id: {q, a} } } -> { id: "answer text" }
function flatten(answers) {
  var flat = {};
  Object.keys(answers).forEach(function (sec) {
    var qs = answers[sec] || {};
    Object.keys(qs).forEach(function (id) {
      var a = qs[id] ? qs[id].a : '';
      if (a && typeof a === 'object') {
        if (a.selected) {
          a = a.selected.join(', ') + (a.other ? ' | Other: ' + a.other : '');
        } else if (a.other !== undefined) {
          a = 'Other: ' + a.other;
        } else {
          a = JSON.stringify(a);
        }
      } else if (Array.isArray(a)) {
        a = a.join(', ');
      }
      flat[id] = (a === null || a === undefined) ? '' : a;
    });
  });
  return flat;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   In-sheet menu: copy one person's answers to paste into GPT.
   Appears as "📋 Intake Tools" after you reload the sheet.
   ============================================================ */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📋 Intake Tools')
    .addItem('Copy selected row for GPT', 'copyRowForGpt')
    .addToUi();
}

function copyRowForGpt() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveRange().getRow();
  if (row < 2) {
    ui.alert('Click any cell in a submission row first (row 2 or below), then run this again.');
    return;
  }
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values  = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  // Prefer the pre-formatted answers_for_gpt cell; otherwise build from columns.
  var gptCol = headers.indexOf('answers_for_gpt');
  var text;
  if (gptCol !== -1 && values[gptCol]) {
    text = String(values[gptCol]);
  } else {
    var skip = ['answers_for_gpt', 'sessionId', 'status'];
    var lines = [];
    for (var i = 0; i < headers.length; i++) {
      if (skip.indexOf(headers[i]) !== -1) continue;
      if (values[i] !== '' && values[i] !== null) lines.push(headers[i] + ': ' + values[i]);
    }
    text = lines.join('\n');
  }
  showCopyDialog(text, values[headers.indexOf('business_name')] || ('Row ' + row));
}

function showCopyDialog(text, title) {
  var safe = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif">' +
    '<p style="margin:0 0 8px;color:#555">Select-all is done for you — just click <b>Copy</b>, then paste into GPT.</p>' +
    '<textarea id="t" style="width:100%;height:300px;font-family:monospace;font-size:12px;' +
    'border:1px solid #ccc;border-radius:8px;padding:8px;box-sizing:border-box">' + safe + '</textarea>' +
    '<div style="margin-top:10px">' +
    '<button onclick="copyIt()" style="background:#1f6feb;color:#fff;border:none;border-radius:8px;' +
    'padding:10px 18px;font-size:14px;cursor:pointer">Copy</button> ' +
    '<button onclick="google.script.host.close()" style="background:#eee;border:none;border-radius:8px;' +
    'padding:10px 18px;font-size:14px;cursor:pointer">Close</button>' +
    '<span id="ok" style="margin-left:10px;color:#16a34a;font-weight:bold"></span>' +
    '</div></div>' +
    '<script>function copyIt(){var t=document.getElementById("t");t.select();' +
    'document.execCommand("copy");document.getElementById("ok").textContent="Copied!";}' +
    'window.onload=function(){document.getElementById("t").select();};<\/script>'
  ).setWidth(560).setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, 'Copy answers for GPT — ' + title);
}
