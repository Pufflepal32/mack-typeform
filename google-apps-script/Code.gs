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
    var flat = flatten(payload.answers || {});

    // ----- header row (auto-grows with new questions) -----
    var headers = sheet.getLastRow() === 0
      ? []
      : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (headers.length === 0) {
      headers = ['timestamp', 'business_name'].concat(Object.keys(flat));
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    } else {
      var added = false;
      Object.keys(flat).forEach(function (k) {
        if (headers.indexOf(k) === -1) { headers.push(k); added = true; }
      });
      if (added) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // ----- build the row in header order -----
    var row = headers.map(function (h) {
      if (h === 'timestamp') return new Date();
      if (h === 'business_name') return flat['biz_name'] || '';
      return flat[h] !== undefined ? flat[h] : '';
    });
    sheet.appendRow(row);

    return json({ result: 'success', row: sheet.getLastRow() });
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
