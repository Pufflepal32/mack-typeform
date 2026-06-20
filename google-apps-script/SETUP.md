# Connect the form to a Google Sheet (~90 seconds)

The form sends each submission to a **Google Apps Script web app** — a free webhook
that lives on your own Google account. No server, no cost, no third-party service.

## Steps

1. **Create a Google Sheet.** Go to [sheets.new](https://sheets.new). Name it
   anything (e.g. "Carpenter Intakes"). Leave it empty — columns are created automatically.

2. **Open the script editor.** In the sheet: **Extensions → Apps Script**.

3. **Paste the code.** Delete the sample `myFunction()` code, then paste the entire
   contents of [`Code.gs`](./Code.gs). Click the **Save** (💾) icon.

4. **Deploy as a web app.**
   - Click **Deploy → New deployment**.
   - Click the gear ⚙ → choose **Web app**.
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`  ← required so the form can post to it
   - Click **Deploy**.

5. **Authorize.** Google will ask for permission (it's your own script). Click
   **Authorize access → pick your account → Advanced → Go to (project) → Allow**.

6. **Copy the URL.** You'll get a **Web app URL** ending in `/exec`. Copy it.

7. **Paste it into the form.** Open `index.html`, find this line near the top of the
   `<script>` section, and paste your URL between the quotes:

   ```js
   const WEBHOOK_URL = "https://script.google.com/macros/s/AKfy.../exec";
   ```

   Save, commit, and push (`git add -A && git commit -m "add webhook url" && git push`).
   Netlify redeploys automatically.

## Test it

Open the deployed form, fill out a few fields, and hit **Submit** on the review screen.
A new row should appear in your sheet within a second or two. The end screen will show
**"✅ Sent!"** on success.

## Notes

- **Each submission = one row.** The first row is a header. Columns grow automatically
  as new questions appear (the form's conditional logic means submissions can differ).
- **`business_name`** and **`timestamp`** are always the first two columns for easy scanning.
- If you change `Code.gs` later, you must **Deploy → Manage deployments → Edit → New
  version** for changes to go live (the `/exec` URL stays the same).
- Want an **email on every new lead?** In Apps Script add a trigger, or tell Claude to
  add a `MailApp.sendEmail(...)` line to `doPost`.
- **Leaving `WEBHOOK_URL` blank** keeps the form working in local-only mode — answers
  save in the browser and the user copies/downloads the JSON manually.
