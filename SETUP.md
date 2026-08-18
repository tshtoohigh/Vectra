# PolyTrack Setup — Connect to Real AWS

This guide gets your app talking to **real DynamoDB and SNS** in under 5 minutes.

---

## What You Need

- AWS Academy Learner Lab (with active session)
- Your Netlify site (already deployed)

---

## Step 1: Get Your AWS Credentials

1. Go to your **Learner Lab** page
2. Click **Start Lab** (wait for green circle)
3. Click **AWS Details** (on the right side)
4. Click **Show** next to "AWS CLI"
5. You'll see something like:

```
[default]
aws_access_key_id=ASIAXYZ123456789
aws_secret_access_key=abcdef1234567890abcdef1234567890
aws_session_token=very_long_string_here...
```

**Copy those 3 values.** You need them for Step 2.

---

## Step 2: Add Credentials to Netlify

1. Go to **https://app.netlify.com** → your PolyTrack site
2. Click **Site configuration** → **Environment variables**
3. Add these 3 variables:

| Key | Value |
|-----|-------|
| `VITE_AWS_ACCESS_KEY_ID` | The `aws_access_key_id` value |
| `VITE_AWS_SECRET_ACCESS_KEY` | The `aws_secret_access_key` value |
| `VITE_AWS_SESSION_TOKEN` | The `aws_session_token` value |

4. Optionally add:

| Key | Value |
|-----|-------|
| `VITE_AWS_REGION` | `us-east-1` |
| `VITE_SNS_TOPIC_ARN` | `arn:aws:sns:us-east-1:037389780625:PolyTrackAlerts` |

---

## Step 3: Redeploy

1. In Netlify, go to **Deploys**
2. Click **Trigger deploy** → **Deploy site**
3. Wait 1-2 minutes for it to finish

---

## Step 4: Test It

1. Open your PolyTrack site
2. Sign up with any email/password
3. Add a task
4. Open browser DevTools (F12 → Console)
5. You should see messages like:
   ```
   [DynamoDB] PutCommand: TASK#task_abc123 created
   ```
6. Refresh the page — your task is still there (loaded from DynamoDB!)

---

## Step 5: Verify in AWS Console (optional)

1. Go to your AWS Console → DynamoDB → Tables → **Vectra**
2. Click **Explore table items**
3. You should see your tasks and user profile stored there!

---

## How It Works

```
Your Browser (React app)
    ↓ AWS SDK (direct HTTPS calls)
DynamoDB (table: Vectra)
    ├── PK: USER#email, SK: PROFILE     → your account
    ├── PK: USER#email, SK: TASK#id     → your tasks
    └── PK: USER#email, SK: MODULE#code → your modules

SNS (topic: PolyTrackAlerts)
    → sends real email when deadlines are critical
```

Every action in the app makes a **real AWS API call**:

| Action | AWS Operation |
|--------|---------------|
| Sign up | DynamoDB PutCommand (create profile) |
| Sign in | DynamoDB GetCommand (verify credentials) |
| Add task | DynamoDB PutCommand |
| Edit task | DynamoDB UpdateCommand |
| Delete task | DynamoDB DeleteCommand |
| Load tasks | DynamoDB QueryCommand |
| Decompose task | DynamoDB GetCommand + UpdateCommand |
| Check deadlines | DynamoDB QueryCommand + SNS PublishCommand |
| Subscribe to alerts | SNS SubscribeCommand |

---

## ⚠️ Important: Credentials Expire!

Learner Lab credentials **expire every 4 hours** (or when you stop the lab).

When they expire:
1. Your app will fall back to localStorage (still works, just not saving to AWS)
2. To reconnect: get new credentials from AWS Details and update Netlify env vars

---

## For Local Development

Instead of Netlify, create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then paste your credentials into `.env` and run:

```bash
npm install
npm run dev
```

---

## Troubleshooting

### "Tasks disappear after refresh"
→ Credentials expired. Get new ones from Learner Lab → AWS Details.

### "No [DynamoDB] messages in console"
→ Check that VITE_AWS_ACCESS_KEY_ID is set. The app falls back to localStorage silently when credentials are missing.

### "AccessDeniedException"
→ Your lab session expired. Click Start Lab again, get new credentials.

### "Table not found"
→ Make sure the DynamoDB table is named exactly `Vectra` with PK (String) and SK (String).
