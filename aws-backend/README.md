# PolyTrack AWS Backend — Deployment Guide

This guide walks you through deploying the **real AWS backend** for PolyTrack.
After completing these steps, your app will genuinely use 5 AWS services:

| # | Service | What It Does |
|---|---------|--------------|
| 1 | **DynamoDB** | Stores all tasks (replaces localStorage) |
| 2 | **Lambda** | 3 functions that process your data server-side |
| 3 | **API Gateway** | REST API your frontend calls over HTTPS |
| 4 | **SNS** | Sends real email alerts when deadlines are at risk |
| 5 | **EventBridge** | Scheduled rule that checks deadlines every 3 hours |

---

## Prerequisites

- AWS Academy Learner Lab with active session (green circle)
- Access to AWS CloudShell (top-right terminal icon in AWS Console)
- Your Netlify site already deployed (or localhost for testing)

---

## Step 1: Deploy the Backend (5 minutes)

### 1a. Open AWS CloudShell

1. Log into your AWS Academy Learner Lab
2. Click **Start Lab** (wait for green indicator)
3. Click **AWS** to open the console
4. Click the **CloudShell** icon (top-right, looks like `>_`)

### 1b. Run the deployment script

Copy the **entire** `deploy.sh` script and paste it into CloudShell:

```bash
# In CloudShell, paste the contents of aws-backend/deploy.sh
```

The script will:
- Create an SNS topic and ask for your email
- Verify/create the DynamoDB table with correct schema (PK + SK)
- Deploy 3 Lambda functions
- Create API Gateway with all routes and CORS
- Create an EventBridge scheduled rule
- Print your API URL at the end

### 1c. Note your API URL

At the end, you'll see something like:
```
API Gateway URL: https://abc123def.execute-api.us-east-1.amazonaws.com/prod
```

**Copy this URL** — you need it for Step 2.

---

## Step 2: Connect Your Frontend

### Option A: Netlify (production)

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your PolyTrack site
3. Go to **Site configuration** → **Environment variables**
4. Add a new variable:
   - Key: `VITE_API_URL`
   - Value: `https://abc123def.execute-api.us-east-1.amazonaws.com/prod`
5. **Trigger a redeploy**: Deploys → Trigger deploy → Deploy site

### Option B: Local development

Create a `.env` file in your project root:
```bash
VITE_API_URL=https://abc123def.execute-api.us-east-1.amazonaws.com/prod
```

Then run:
```bash
npm run dev
```

---

## Step 3: Confirm Email Subscription (SNS)

1. Check your email inbox for a message from **AWS Notifications**
2. Click **Confirm subscription**
3. You'll now receive real email alerts when deadlines are at risk

---

## Step 4: Test It's Working

### Quick test from CloudShell:
```bash
# Replace with your actual API URL
API_URL="https://abc123def.execute-api.us-east-1.amazonaws.com/prod"

# Create a task (goes to DynamoDB)
curl -s -X POST "$API_URL/tasks?userId=demo_user" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test AWS Integration","taskType":"Assignment","deadline":"2026-08-19T23:59:00Z","hours":4,"weightage":30}' | python3 -m json.tool

# List tasks (reads from DynamoDB)
curl -s "$API_URL/tasks?userId=demo_user" | python3 -m json.tool

# Check notifications (scans DynamoDB, may publish to SNS)
curl -s -X POST "$API_URL/notifications/check?userId=demo_user" | python3 -m json.tool
```

### From your browser:
1. Open your PolyTrack site
2. Open browser DevTools (F12) → Console
3. Add a task — you should see: `[DynamoDB] Task created: task_xxxxx`
4. Refresh the page — tasks persist (loaded from DynamoDB, not localStorage)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Netlify)                                                  │
│  React app calls API Gateway via VITE_API_URL                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API GATEWAY (PolyTrackAPI)                                          │
│  Routes:                                                             │
│    GET/POST    /tasks              → PolyTrack_TaskCRUD Lambda       │
│    GET/PUT/DEL /tasks/{id}         → PolyTrack_TaskCRUD Lambda       │
│    POST        /ai/parse           → PolyTrack_AIDecompose Lambda    │
│    POST        /ai/decompose/{id}  → PolyTrack_AIDecompose Lambda    │
│    POST        /ai/rebalance       → PolyTrack_AIDecompose Lambda    │
│    POST        /notifications/check     → PolyTrack_DeadlineChecker  │
│    POST        /notifications/subscribe → PolyTrack_DeadlineChecker  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌──────────────────┐ ┌─────────────────┐ ┌──────────────────────┐
│ PolyTrack_       │ │ PolyTrack_      │ │ PolyTrack_           │
│ TaskCRUD         │ │ AIDecompose     │ │ DeadlineChecker      │
│                  │ │                 │ │                      │
│ • Create task    │ │ • Parse NL text │ │ • Scan all tasks     │
│ • Read tasks     │ │ • Decompose     │ │ • Find at-risk ones  │
│ • Update task    │ │   into steps    │ │ • Publish SNS alert  │
│ • Delete task    │ │ • Rebalance     │ │ • Subscribe emails   │
│                  │ │   workload      │ │                      │
└────────┬─────────┘ └────────┬────────┘ └───────┬──────┬───────┘
         │                    │                   │      │
         ▼                    ▼                   ▼      ▼
┌─────────────────────────────────────────┐  ┌──────────────┐
│  DynamoDB (Table: Vectra)                │  │  SNS Topic   │
│  PK: USER#<userId>  SK: TASK#<taskId>   │  │  (email)     │
│  All task data stored here              │  │              │
└─────────────────────────────────────────┘  └──────────────┘
                                                     ▲
                                                     │ triggers
┌─────────────────────────────────────────────────────────────────────┐
│  EventBridge Rule: PolyTrack_DeadlineCheck                           │
│  Schedule: rate(3 hours)                                             │
│  Target: PolyTrack_DeadlineChecker Lambda                           │
│                                                                      │
│  Every 3 hours, automatically:                                       │
│    1. Scans ALL tasks in DynamoDB                                    │
│    2. Identifies overdue/critical/at-risk deadlines                  │
│    3. Publishes alerts to SNS → sends real email notifications       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## How Each Service Is Actually Used

### 1. DynamoDB
- **Table**: `Vectra`
- **Keys**: `PK = USER#<userId>`, `SK = TASK#<taskId>`
- **Operations**: Put, Get, Query, Update, Delete, Scan
- **Proof**: Add a task in the app → check DynamoDB in AWS Console → it's there

### 2. Lambda (3 functions)
- **PolyTrack_TaskCRUD**: All CRUD operations, reads/writes DynamoDB
- **PolyTrack_AIDecompose**: Parses text, generates milestones, writes back to DynamoDB
- **PolyTrack_DeadlineChecker**: Scans DynamoDB, publishes to SNS
- **Proof**: Check CloudWatch Logs in AWS Console after making a request

### 3. API Gateway
- **Name**: `PolyTrackAPI`
- **Stage**: `prod`
- **Routes**: 7 endpoints with full CORS support
- **Proof**: Hit the URL with curl and get real data back

### 4. SNS
- **Topic**: `PolyTrackAlerts`
- **Protocol**: Email subscription
- **Trigger**: When DeadlineChecker Lambda finds at-risk tasks
- **Proof**: Create a task due in <24 hours → trigger notification check → get email

### 5. EventBridge
- **Rule**: `PolyTrack_DeadlineCheck`
- **Schedule**: Every 3 hours (`rate(3 hours)`)
- **Target**: `PolyTrack_DeadlineChecker` Lambda
- **Proof**: Check EventBridge rules in AWS Console, see invocation metrics in CloudWatch

---

## Troubleshooting

### "Task not appearing after refresh"
- Check browser console for `[DynamoDB]` messages
- Verify `VITE_API_URL` is set correctly (no trailing slash)
- Test the API directly with curl

### "CORS error in browser"
- The API Gateway has CORS configured, but verify with:
  ```bash
  curl -s -X OPTIONS "$API_URL/tasks" -H "Origin: https://yoursite.netlify.app" -v 2>&1 | grep -i "access-control"
  ```

### "Lambda timeout"
- Check CloudWatch Logs: AWS Console → CloudWatch → Log groups → `/aws/lambda/PolyTrack_TaskCRUD`

### "SNS email not arriving"
- Confirm subscription was clicked
- Check spam/junk folder
- Verify topic in AWS Console → SNS → Topics

### "DynamoDB table schema mismatch"
- The deploy script handles this automatically
- If needed, delete and recreate: the script checks for PK/SK schema

---

## Cleanup (Optional)

To remove all resources:
```bash
# Delete Lambda functions
aws lambda delete-function --function-name PolyTrack_TaskCRUD
aws lambda delete-function --function-name PolyTrack_AIDecompose
aws lambda delete-function --function-name PolyTrack_DeadlineChecker

# Delete API Gateway
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='PolyTrackAPI'].id" --output text)
aws apigateway delete-rest-api --rest-api-id $API_ID

# Delete EventBridge rule
aws events remove-targets --rule PolyTrack_DeadlineCheck --ids DeadlineCheckerTarget
aws events delete-rule --name PolyTrack_DeadlineCheck

# Delete SNS topic
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:037389780625:PolyTrackAlerts

# Delete DynamoDB table (WARNING: deletes all data)
aws dynamodb delete-table --table-name Vectra
```

---

## File Structure

```
aws-backend/
├── deploy.sh                    ← Run this in CloudShell (does everything)
├── README.md                    ← You are here
└── lambda/
    ├── task_crud.py             ← Lambda: Task CRUD → DynamoDB
    ├── ai_decompose.py          ← Lambda: AI parsing/decompose → DynamoDB
    └── deadline_checker.py      ← Lambda: Deadline scan → DynamoDB + SNS
```

Frontend integration (already updated):
```
src/services/aws/
├── apiGateway.js               ← Sends real HTTPS requests to API Gateway
├── dynamoClient.js             ← Routes through API Gateway → Lambda → DynamoDB
├── bedrockClient.js            ← Calls AI Lambda for parsing/decomposition
├── snsNotifier.js              ← Calls notification Lambda (triggers real SNS)
├── eventBridgeScheduler.js     ← Documents real EventBridge rule + local UI polling
├── cognitoAuth.js              ← Auth (localStorage for demo, ready for Cognito)
├── textractClient.js           ← Document OCR (mock, Textract needs S3)
└── index.js                    ← Barrel exports
```
