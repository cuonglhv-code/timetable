# Google Calendar Integration: Service Account Setup

## Prerequisites
- Google Workspace for Education admin access
- Google Cloud Project with billing enabled (free tier sufficient)

## Step 1: Create Google Cloud Project
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **New Project** (or select existing)
3. Name: `Timetable Manager`
4. Click **Create**

## Step 2: Enable Calendar API
1. In your project, navigate to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click **Enable**

## Step 3: Create Service Account
1. Navigate to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
   - Name: `timetable-sync-sa`
   - Description: "Syncs class timetables to teacher calendars"
3. Click **Create and Continue**
4. Skip role assignment → Click **Done**

## Step 4: Generate Service Account Key
1. Find the new service account (`timetable-sync-sa@...`)
2. Click on it → **Keys** tab → **Add Key** → **Create new key**
3. Choose **JSON** → Click **Create**
4. The JSON key file will download automatically
5. **Store this file securely** - it contains your private key

## Step 5: Enable Domain-Wide Delegation
1. In the Service Account details page
2. Find **Domain-wide Delegation** section
3. Click **Enable G Suite Domain-wide Delegation**
4. Copy the **Client ID** (numeric, e.g., `123456789012`)

## Step 6: Configure OAuth Consent Screen
1. Navigate to **APIs & Services** → **OAuth consent screen**
2. User Type: **Internal** (restricted to your Workspace domain)
3. Fill in required fields:
   - App name: "Timetable Manager"
   - User support email: your admin email
   - Developer contact email: your admin email
4. Click **Save and Continue**
5. Skip scopes (DWD handles this) → Click **Save and Continue**
6. Click **Back to Dashboard**

## Step 7: Admin Console Delegation
1. Go to [Google Admin Console](https://admin.google.com)
2. Navigate to **Security** → **Access and data control** → **API controls**
3. Click **Manage Domain Wide Delegation**
4. Click **Add new**
5. Enter:
   - **Client ID**: The numeric Client ID from Step 5
   - **OAuth Scopes**: 
     ```
     https://www.googleapis.com/auth/calendar.events
     https://www.googleapis.com/auth/calendar.settings
     ```
6. Click **Authorize**
7. Wait ~5 minutes for propagation

## Step 8: Encrypt Service Account Key
1. Copy the downloaded JSON key file to your project root
2. Generate an encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Run the encryption script:
   ```bash
   node scripts/encrypt-key.js --input timetable-sync-sa-key.json --key YOUR_ENCRYPTION_KEY
   ```
4. Copy the encrypted output

## Step 9: Configure Environment Variables
Add to `.env`:
```env
ENCRYPTION_KEY=<your-32-byte-hex-key>
GOOGLE_SERVICE_ACCOUNT_EMAIL=timetable-sync-sa@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY_ENCRYPTED=<encrypted-output-from-step-8>
GOOGLE_DELEGATED_DOMAIN=school.edu
GOOGLE_CALENDAR_API_SCOPES=calendar.events,calendar.settings
```

## Verification
1. Run the database migration:
   ```bash
   npx prisma migrate dev
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Navigate to Admin → Centres → Google Settings
4. Enter your credentials and click "Test Connection"
5. Expected: Success message with domain verification status

## Troubleshooting
| Issue | Solution |
|-------|----------|
| `invalid_grant` | Wait 5 minutes for DWD propagation; verify scope spelling |
| `forbidden` | Confirm teacher email exists in domain; check DWD admin approval |
| `quotaExceeded` | Implement exponential backoff; request quota increase |
| `key_invalid` | Re-encrypt the service account key with correct ENCRYPTION_KEY |
| `domain_not_verified` | Ensure GOOGLE_DELEGATED_DOMAIN matches your Workspace domain exactly |

## Security Notes
- Never commit `.env` or service account keys to version control
- Rotate service account keys every 90 days
- Monitor Google Cloud Console for unusual API usage
- Use separate service accounts for staging and production
