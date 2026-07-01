# The Groves Inspection App — Complete Setup Guide
### Electron (Windows 10) + Supabase Backend

---

## What You'll Have When Done
- A Windows `.exe` installer that installs the app like any normal program
- Multi-user login (inspectors + admins) with roles
- All inspection data saved to the cloud (Supabase)
- Shared pricing config — admin changes instantly visible to all users
- Automatic email reports on submission (via Resend)
- Works on any Windows 10/11 PC after install

**Estimated time: 2–3 hours for first-time setup**

---

## Files You Need (all previously downloaded)
| File | Where it goes |
|------|--------------|
| `App.jsx` | `src/App.jsx` |
| `electron-main.js` | `electron/main.js` |
| `package-electron.json` | `package.json` (rename it) |
| `vite.config.js` | `vite.config.js` |
| `schema.sql` | Run in Supabase SQL Editor |
| `send-inspection-email.ts` | `supabase/functions/send-inspection-email/index.ts` |

---

## PHASE 1 — Install Tools (30 min, one-time)

### Step 1 · Install Node.js
1. Go to **https://nodejs.org**
2. Download the **LTS** version (left green button)
3. Run the installer — accept all defaults
4. Verify: open Command Prompt, type `node --version` → should show `v20.x.x`

### Step 2 · Install Supabase CLI
In Command Prompt:
```
npm install -g supabase
```
Verify: `supabase --version` → should show a version number

### Step 3 · Install Git (optional but recommended)
1. Go to **https://git-scm.com/download/win**
2. Download and install — accept all defaults

---

## PHASE 2 — Create the Project (15 min)

Open Command Prompt and run these commands one at a time:

```bash
# 1. Create the project folder
npm create vite@latest groves-inspection -- --template react
cd groves-inspection

# 2. Install all dependencies
npm install

# 3. Install Supabase client
npm install @supabase/supabase-js
```

### Now place your downloaded files:

```
groves-inspection/           ← your project folder
│
├── electron/
│   └── main.js              ← paste contents of electron-main.js here
│
├── supabase/
│   └── functions/
│       └── send-inspection-email/
│           └── index.ts     ← paste contents of send-inspection-email.ts here
│
├── src/
│   ├── App.jsx              ← replace with your downloaded App.jsx
│   └── main.jsx             ← already exists, leave it alone
│
├── index.html               ← already exists, leave it alone
├── package.json             ← replace with contents of package-electron.json
└── vite.config.js           ← replace with your downloaded vite.config.js
```

### Reinstall after replacing package.json:
```bash
npm install
```

---

## PHASE 3 — Supabase Setup (45 min)

### Step 1 · Create a Supabase account and project
1. Go to **https://supabase.com** → Sign Up (free)
2. Click **New Project**
3. Fill in:
   - **Name:** `groves-inspection`
   - **Database Password:** choose a strong password and save it somewhere
   - **Region:** pick the closest to you (e.g. US East)
4. Click **Create new project** and wait ~2 minutes

### Step 2 · Run the database schema
1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open `schema.sql` on your computer, select all, copy it
4. Paste it into the SQL Editor
5. Click **Run** (green button)
6. You should see "Success. No rows returned"

### Step 3 · Create your organization
Still in SQL Editor, run this (replace `The Groves` with your company name):
```sql
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'The Groves');
```
> 💡 Write down the ID: `00000000-0000-0000-0000-000000000001`
> (You can use any UUID you like — this is just an easy-to-remember example)

### Step 4 · Create your first admin user
1. In Supabase left sidebar → **Authentication** → **Users**
2. Click **Invite user**
3. Enter your email address → click **Send invite**
4. Check your email and click the link — you'll be asked to set a password
5. After setting your password, go back to Supabase
6. In **Authentication → Users**, find your user and copy the UUID
   (looks like: `a1b2c3d4-e5f6-...`)

### Step 5 · Link your user to the organization
Back in SQL Editor, run this (replace both UUIDs and the email):
```sql
INSERT INTO profiles (id, org_id, role, email, full_name)
VALUES (
  'PASTE-YOUR-USER-UUID-HERE',
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'your@email.com',
  'Your Name'
);
```

### Step 6 · Seed default pricing config
Run this to set up the default inspection pricing for your org:
```sql
INSERT INTO pricing_config (org_id, shared_items, bed_items, mults)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '[
    {"id":"keys","label":"Keys","group":"Entry","dirty":null,"replace":20,"perUnit":true},
    {"id":"blinds","label":"Blinds","group":"Windows","dirty":5,"replace":50},
    {"id":"windows","label":"Windows","group":"Windows","dirty":6,"replace":250},
    {"id":"cabinets","label":"Cabinets","group":"Kitchen","dirty":12,"replace":null},
    {"id":"cabTops","label":"Cabinet Tops","group":"Kitchen","dirty":8,"replace":400},
    {"id":"iceBox","label":"Ice Box","group":"Kitchen","dirty":10,"replace":null},
    {"id":"refrig","label":"Refrigerator","group":"Kitchen","dirty":10,"replace":null},
    {"id":"sink","label":"Sink","group":"Kitchen","dirty":5,"replace":null},
    {"id":"drainStops","label":"Drain Stops","group":"Plumbing","dirty":null,"replace":20,"fixed":true},
    {"id":"dwRacks","label":"D/W & Racks","group":"Kitchen","dirty":5,"replace":300},
    {"id":"stove","label":"Stove","group":"Kitchen","dirty":10,"replace":700},
    {"id":"eyePans","label":"Eye Pans","group":"Kitchen","dirty":3,"replace":40},
    {"id":"oven","label":"Oven","group":"Kitchen","dirty":10,"replace":700},
    {"id":"washer","label":"Washer","group":"Laundry","dirty":10,"replace":null},
    {"id":"dryer","label":"Dryer","group":"Laundry","dirty":10,"replace":null},
    {"id":"lintScreen","label":"Lint Screen","group":"Laundry","dirty":2,"replace":null},
    {"id":"floorsKit","label":"Kitchen Floors","group":"Floors","dirty":6,"replace":250},
    {"id":"floorsLiv","label":"Living Room Floors","group":"Floors","dirty":10,"replace":500},
    {"id":"deck","label":"Deck","group":"Exterior","dirty":10,"replace":null},
    {"id":"paintRockLK","label":"Paint / Rock (Liv/Kit)","group":"Walls","dirty":30,"replace":600},
    {"id":"doorsLivKit","label":"Doors (Liv/Kit)","group":"Doors","dirty":10,"replace":275},
    {"id":"furniture","label":"Furniture / Trash Removal","group":"Removal","dirty":null,"replace":100,"perUnit":true}
  ]'::jsonb,
  '[
    {"id":"carpet","label":"Carpet","dirty":10,"replace":500},
    {"id":"paintRock","label":"Paint / Rock","dirty":20,"replace":400},
    {"id":"doors","label":"Doors","dirty":10,"replace":275},
    {"id":"blinds","label":"Blinds","dirty":5,"replace":50},
    {"id":"windows","label":"Windows","dirty":6,"replace":250},
    {"id":"bathFloor","label":"Bath Floor","dirty":3,"replace":null,"bath":true},
    {"id":"sinkTub","label":"Sink / Tub","dirty":10,"replace":null,"bath":true},
    {"id":"bathPaint","label":"Bath Paint/Rock","dirty":10,"replace":200,"bath":true},
    {"id":"hvac","label":"HVAC","dirty":5,"replace":600},
    {"id":"flea","label":"Flea Treatment","dirty":null,"replace":75,"fixed":true}
  ]'::jsonb,
  '{"r02":0,"r3":0.5,"r4":0.75,"r510":1.0}'::jsonb
);
```

### Step 7 · Get your API keys
1. In Supabase left sidebar → **Project Settings** → **API**
2. Copy and save two values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key** (long string starting with `eyJ...`)

---

## PHASE 4 — Email Setup with Resend (20 min)

### Step 1 · Create a Resend account
1. Go to **https://resend.com** → Sign up free
2. In the Resend dashboard → **Domains** → **Add Domain**
3. Enter the domain you want to send from (e.g. `thegroves.com`)
4. Follow the DNS instructions to verify it (add records in your domain registrar)
   > 💡 If you don't have a domain yet, skip this — Resend gives you `onboarding@resend.dev`
   > to test with. Just use that temporarily and add a real domain later.
5. Go to **API Keys** → **Create API Key** → copy it (starts with `re_`)

### Step 2 · Update the email sender address
Open `supabase/functions/send-inspection-email/index.ts` in a text editor
Find this line:
```
from: "inspections@yourdomain.com",
```
Change it to your verified email address (or `onboarding@resend.dev` for testing)

### Step 3 · Deploy the edge function
In Command Prompt, inside your project folder:
```bash
# Login to Supabase CLI
supabase login
# (Opens browser — log in with your Supabase account)

# Link to your project (get the ref from your Supabase URL)
# Your URL looks like: https://app.supabase.com/project/abcdefgh
# The ref is the part after /project/
supabase link --project-ref YOUR-PROJECT-REF

# Deploy the email function
supabase functions deploy send-inspection-email

# Add your Resend API key as a secret
supabase secrets set RESEND_API_KEY=re_YOUR_KEY_HERE
```

---

## PHASE 5 — Connect the App to Supabase (5 min)

Create a file called `.env` in your project root folder:
```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Replace both values with what you copied in Phase 3, Step 7.

> ⚠️ Never share this file or commit it to GitHub.
> The anon key is safe to distribute in your compiled app —
> Supabase's Row Level Security protects your data.

---

## PHASE 6 — Test Everything (20 min)

### Test in the browser first
```bash
npm run dev
```
Open **http://localhost:5173** in your browser.

**Checklist:**
- [ ] Login screen appears
- [ ] You can log in with your admin email/password
- [ ] Dashboard loads showing your org
- [ ] Can create a new inspection
- [ ] Can submit and receive email report
- [ ] Admin → Settings shows pricing config
- [ ] Admin → Users shows your profile

### Test in Electron
```bash
npm run electron:dev
```
The app should open in a desktop window. Test the same checklist above.

---

## PHASE 7 — Build the Windows Installer (15 min)

### One command to build everything:
```bash
npm run electron:win
```

This will:
1. Build the React app (compiles all JSX, embeds Supabase keys)
2. Package it inside Electron
3. Create a Windows installer

**The installer appears at:**
```
groves-inspection/
└── dist-electron/
    └── The Groves Inspection Setup 1.0.0.exe   ← this is your installer
```

### Adding a custom icon (optional but professional)
1. Create a 256×256 pixel icon as a `.ico` file
2. Save it as `electron/icon.ico`
3. In `electron/main.js`, uncomment this line:
   ```js
   // icon: path.join(__dirname, "icon.ico"),
   ```
4. Rebuild with `npm run electron:win`

---

## PHASE 8 — Adding More Users

Users **cannot** self-register — they must be invited.
Do this directly from the Supabase dashboard (safest method):

1. Supabase → **Authentication** → **Users** → **Invite user**
2. Enter their email → Send invite
3. They receive an email, click the link, set their password
4. In SQL Editor, run this to add them to your org:

```sql
INSERT INTO profiles (id, org_id, role, email, full_name)
VALUES (
  'THEIR-USER-UUID',   -- find in Authentication → Users
  '00000000-0000-0000-0000-000000000001',
  'inspector',         -- or 'admin'
  'their@email.com',
  'Their Name'
);
```

5. They can now log in from any PC with the installed app

---

## Distribution

**To give the app to inspectors:**
- Copy `The Groves Inspection Setup 1.0.0.exe` to a USB drive or shared folder
- They double-click it, click Next → Install
- App appears in Start Menu as "The Groves Inspection"
- They log in with the credentials you set up for them

**To update the app:**
1. Make your code changes
2. Update the `"version"` in `package.json` (e.g. `"1.0.1"`)
3. Run `npm run electron:win` again
4. Distribute the new `.exe` — reinstalling over the old version works fine

---

## Quick Reference — All Commands

| What | Command |
|------|---------|
| Start browser dev server | `npm run dev` |
| Start Electron in dev mode | `npm run electron:dev` |
| Build Windows installer | `npm run electron:win` |
| Deploy email function | `supabase functions deploy send-inspection-email` |
| Update Resend key | `supabase secrets set RESEND_API_KEY=re_...` |

---

## Troubleshooting

**"Cannot find module" error when running npm run electron:dev**
→ Run `npm install` again

**Login works in browser but not in Electron**
→ Check that `.env` file is in the root folder (same level as `package.json`)

**Email not sending**
→ Check Supabase → Edge Functions → Logs for errors
→ Verify your Resend domain is confirmed (green checkmark in Resend dashboard)

**"App is not signed" warning on Windows**
→ Normal for self-distributed apps. Click "More info" → "Run anyway"
→ For no warning: purchase a Windows code signing certificate (~$200/year from DigiCert or Sectigo)

**White screen when app opens**
→ Check that `vite.config.js` has `base: "./"` — this is critical for Electron

**User can log in but sees no data**
→ Their profile row is missing from the `profiles` table — run the INSERT from Phase 8
