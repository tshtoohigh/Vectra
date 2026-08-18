#!/bin/bash
# ============================================================================
# PolyTrack AWS Backend Deployment Script
# ============================================================================
# Run this ENTIRE script in AWS CloudShell (paste it all at once).
#
# What it creates:
#   1. SNS Topic (PolyTrackAlerts) + email subscription
#   2. DynamoDB table key schema update (if needed)
#   3. Three Lambda functions (using LabRole):
#      - PolyTrack_TaskCRUD        (DynamoDB read/write)
#      - PolyTrack_AIDecompose     (DynamoDB read/write + milestone logic)
#      - PolyTrack_DeadlineChecker (DynamoDB scan + SNS publish)
#   4. API Gateway REST API with all routes
#   5. EventBridge scheduled rule (every 3 hours → DeadlineChecker)
#
# Services used: DynamoDB, Lambda, API Gateway, SNS, EventBridge
# ============================================================================

set -e

echo "============================================"
echo "  PolyTrack AWS Backend Deployment"
echo "============================================"
echo ""

# --- Configuration ---
REGION="us-east-1"
ACCOUNT_ID="037389780625"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/LabRole"
TABLE_NAME="Vectra"
SNS_TOPIC_NAME="PolyTrackAlerts"
API_NAME="PolyTrackAPI"
STAGE_NAME="prod"

# Lambda function names
FN_CRUD="PolyTrack_TaskCRUD"
FN_AI="PolyTrack_AIDecompose"
FN_CHECKER="PolyTrack_DeadlineChecker"

echo "Region:     $REGION"
echo "Account:    $ACCOUNT_ID"
echo "Role:       $ROLE_ARN"
echo "Table:      $TABLE_NAME"
echo ""

# ============================================================================
# STEP 1: Create SNS Topic
# ============================================================================
echo "━━━ STEP 1: Creating SNS Topic ━━━"

TOPIC_ARN=$(aws sns create-topic --name $SNS_TOPIC_NAME --region $REGION --query 'TopicArn' --output text)
echo "✓ SNS Topic created: $TOPIC_ARN"

# Prompt for email subscription
read -p "Enter your email for deadline alerts (or press Enter to skip): " USER_EMAIL
if [ -n "$USER_EMAIL" ]; then
    aws sns subscribe \
        --topic-arn "$TOPIC_ARN" \
        --protocol email \
        --notification-endpoint "$USER_EMAIL" \
        --region $REGION
    echo "✓ Subscription request sent to $USER_EMAIL"
    echo "  ⚠️  CHECK YOUR EMAIL and click 'Confirm subscription' link!"
fi

echo ""

# ============================================================================
# STEP 2: Verify DynamoDB Table
# ============================================================================
echo "━━━ STEP 2: Verifying DynamoDB Table ━━━"

# Check if table exists and has correct schema
TABLE_STATUS=$(aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION --query 'Table.TableStatus' --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$TABLE_STATUS" = "NOT_FOUND" ]; then
    echo "Creating DynamoDB table '$TABLE_NAME'..."
    aws dynamodb create-table \
        --table-name $TABLE_NAME \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --region $REGION
    echo "Waiting for table to become active..."
    aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION
    echo "✓ DynamoDB table created with PK/SK schema"
else
    echo "✓ DynamoDB table '$TABLE_NAME' exists (status: $TABLE_STATUS)"
    # Check the key schema
    KEY_SCHEMA=$(aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION --query 'Table.KeySchema' --output json)
    echo "  Key schema: $KEY_SCHEMA"
    
    # Check if table has PK/SK or needs recreation
    HAS_PK=$(echo "$KEY_SCHEMA" | grep -c "PK" || true)
    if [ "$HAS_PK" = "0" ]; then
        echo ""
        echo "⚠️  WARNING: Table exists but doesn't have PK/SK schema."
        echo "  The app needs: PK (String, HASH) + SK (String, RANGE)"
        echo "  Deleting and recreating table..."
        aws dynamodb delete-table --table-name $TABLE_NAME --region $REGION
        echo "  Waiting for deletion..."
        aws dynamodb wait table-not-exists --table-name $TABLE_NAME --region $REGION
        echo "  Creating with correct schema..."
        aws dynamodb create-table \
            --table-name $TABLE_NAME \
            --attribute-definitions \
                AttributeName=PK,AttributeType=S \
                AttributeName=SK,AttributeType=S \
            --key-schema \
                AttributeName=PK,KeyType=HASH \
                AttributeName=SK,KeyType=RANGE \
            --billing-mode PAY_PER_REQUEST \
            --region $REGION
        aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION
        echo "✓ Table recreated with correct PK/SK schema"
    fi
fi

echo ""

# ============================================================================
# STEP 3: Create Lambda Functions
# ============================================================================
echo "━━━ STEP 3: Creating Lambda Functions ━━━"

# --- 3a: Task CRUD Lambda ---
echo "Creating $FN_CRUD..."

mkdir -p /tmp/lambda_crud
cat > /tmp/lambda_crud/lambda_function.py << 'CRUD_EOF'
"""
PolyTrack Task CRUD Lambda Function
"""
import json
import boto3
import uuid
from datetime import datetime, timezone
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Vectra')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

def response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        'body': json.dumps(body, cls=DecimalEncoder),
    }

def get_user_id(event):
    params = event.get('queryStringParameters') or {}
    if params.get('userId'): return params['userId']
    headers = event.get('headers') or {}
    if headers.get('x-user-id'): return headers['x-user-id']
    return 'demo_user'

def lambda_handler(event, context):
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')
    if http_method == 'OPTIONS':
        return response(200, {'message': 'OK'})
    try:
        if path == '/tasks' and http_method == 'GET':
            return list_tasks(event)
        elif path == '/tasks' and http_method == 'POST':
            return create_task(event)
        elif path.startswith('/tasks/') and http_method == 'GET':
            return get_task(event, path.split('/tasks/')[1])
        elif path.startswith('/tasks/') and http_method == 'PUT':
            return update_task(event, path.split('/tasks/')[1])
        elif path.startswith('/tasks/') and http_method == 'DELETE':
            return delete_task(event, path.split('/tasks/')[1])
        else:
            return response(404, {'error': f'Not found: {http_method} {path}'})
    except Exception as e:
        print(f'Error: {str(e)}')
        return response(500, {'error': str(e)})

def list_tasks(event):
    user_id = get_user_id(event)
    result = table.query(
        KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues={':pk': f'USER#{user_id}', ':sk': 'TASK#'}
    )
    tasks = [{k: v for k, v in item.items() if k not in ('PK', 'SK')} for item in result.get('Items', [])]
    return response(200, {'tasks': tasks, 'count': len(tasks)})

def create_task(event):
    user_id = get_user_id(event)
    body = json.loads(event.get('body', '{}'))
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    task = {
        'PK': f'USER#{user_id}', 'SK': f'TASK#{task_id}',
        'id': task_id,
        'title': body.get('title', 'Untitled task'),
        'moduleCode': body.get('moduleCode', ''),
        'moduleName': body.get('moduleName', ''),
        'taskType': body.get('taskType', 'Assignment'),
        'deadline': body.get('deadline', ''),
        'hours': Decimal(str(body.get('hours', 4))),
        'weightage': Decimal(str(body.get('weightage', 10))),
        'isGroup': body.get('isGroup', False),
        'notes': body.get('notes', ''),
        'progress': Decimal(str(body.get('progress', 0))),
        'status': body.get('status', 'Pending'),
        'subtasks': body.get('subtasks', []),
        'createdAt': now, 'updatedAt': now,
    }
    table.put_item(Item=task)
    result = {k: v for k, v in task.items() if k not in ('PK', 'SK')}
    return response(201, {'task': result, 'message': 'Task created in DynamoDB'})

def get_task(event, task_id):
    user_id = get_user_id(event)
    result = table.get_item(Key={'PK': f'USER#{user_id}', 'SK': f'TASK#{task_id}'})
    item = result.get('Item')
    if not item: return response(404, {'error': 'Task not found'})
    return response(200, {'task': {k: v for k, v in item.items() if k not in ('PK', 'SK')}})

def update_task(event, task_id):
    user_id = get_user_id(event)
    body = json.loads(event.get('body', '{}'))
    update_parts, attr_names, attr_values = [], {}, {}
    for field in ['title','moduleCode','moduleName','taskType','deadline','hours','weightage','isGroup','notes','progress','status','subtasks']:
        if field in body:
            update_parts.append(f'#{field} = :{field}')
            attr_names[f'#{field}'] = field
            val = body[field]
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                val = Decimal(str(val))
            attr_values[f':{field}'] = val
    update_parts.append('#updatedAt = :updatedAt')
    attr_names['#updatedAt'] = 'updatedAt'
    attr_values[':updatedAt'] = datetime.now(timezone.utc).isoformat()
    result = table.update_item(
        Key={'PK': f'USER#{user_id}', 'SK': f'TASK#{task_id}'},
        UpdateExpression='SET ' + ', '.join(update_parts),
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
        ReturnValues='ALL_NEW',
    )
    item = result.get('Attributes', {})
    return response(200, {'task': {k: v for k, v in item.items() if k not in ('PK', 'SK')}, 'message': 'Task updated in DynamoDB'})

def delete_task(event, task_id):
    user_id = get_user_id(event)
    table.delete_item(Key={'PK': f'USER#{user_id}', 'SK': f'TASK#{task_id}'})
    return response(200, {'message': f'Task {task_id} deleted from DynamoDB'})
CRUD_EOF

cd /tmp/lambda_crud && zip -j /tmp/task_crud.zip lambda_function.py
aws lambda create-function \
    --function-name $FN_CRUD \
    --runtime python3.10 \
    --role $ROLE_ARN \
    --handler lambda_function.lambda_handler \
    --zip-file fileb:///tmp/task_crud.zip \
    --timeout 30 \
    --memory-size 128 \
    --region $REGION 2>/dev/null || \
aws lambda update-function-code \
    --function-name $FN_CRUD \
    --zip-file fileb:///tmp/task_crud.zip \
    --region $REGION

echo "✓ $FN_CRUD deployed"

# --- 3b: AI Decompose Lambda ---
echo "Creating $FN_AI..."

mkdir -p /tmp/lambda_ai
cat > /tmp/lambda_ai/lambda_function.py << 'AI_EOF'
"""
PolyTrack AI Decompose Lambda Function
"""
import json
import boto3
import re
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Vectra')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

def response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        'body': json.dumps(body, cls=DecimalEncoder),
    }

def get_user_id(event):
    params = event.get('queryStringParameters') or {}
    if params.get('userId'): return params['userId']
    headers = event.get('headers') or {}
    if headers.get('x-user-id'): return headers['x-user-id']
    return 'demo_user'

def lambda_handler(event, context):
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')
    if http_method == 'OPTIONS':
        return response(200, {'message': 'OK'})
    try:
        if '/ai/decompose/' in path and http_method == 'POST':
            task_id = path.split('/ai/decompose/')[1]
            return decompose_task(event, task_id)
        elif path == '/ai/parse' and http_method == 'POST':
            return parse_natural_language(event)
        elif path == '/ai/rebalance' and http_method == 'POST':
            return rebalance_workload(event)
        else:
            return response(404, {'error': f'Not found: {http_method} {path}'})
    except Exception as e:
        print(f'Error: {str(e)}')
        return response(500, {'error': str(e)})

def decompose_task(event, task_id):
    user_id = get_user_id(event)
    result = table.get_item(Key={'PK': f'USER#{user_id}', 'SK': f'TASK#{task_id}'})
    item = result.get('Item')
    if not item:
        return response(404, {'error': f'Task {task_id} not found in DynamoDB'})

    task_type = item.get('taskType', 'Assignment')
    total_hours = float(item.get('hours', 6))
    deadline_str = item.get('deadline', '')
    title = item.get('title', 'Untitled')

    now = datetime.now(timezone.utc)
    try:
        deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
    except:
        deadline = now + timedelta(days=7)
    days_available = max(1, (deadline - now).days)

    num_steps = min(5, max(3, round(total_hours / 2.5)))
    hours_per_step = round(total_hours / num_steps, 1)

    templates = {
        'Assignment': ['Research and gather references', 'Create outline and structure', 'Write first draft / implement', 'Review, edit, and refine', 'Final formatting and submit'],
        'Test': ['Review lecture notes and concepts', 'Practice with worked examples', 'Complete past papers timed', 'Identify and revise weak areas', 'Final revision and summary notes'],
        'Project': ['Requirements analysis and planning', 'Core development / implementation', 'Testing, debugging, iteration', 'Documentation and report', 'Final integration and submission'],
        'Presentation': ['Research topic and collect content', 'Create slide structure', 'Design slides with visuals', 'Rehearse delivery and timing', 'Final practice and backup prep'],
        'Practical': ['Review theory and procedures', 'Prepare environment and tools', 'Execute practical tasks', 'Document and analyze results', 'Write lab report and verify'],
    }

    steps = (templates.get(task_type) or templates['Assignment'])[:num_steps]
    subtasks = []
    for i, step_title in enumerate(steps):
        step_deadline = now + timedelta(days=((i + 1) * days_available / num_steps))
        subtasks.append({
            'id': f"sub_{uuid.uuid4().hex[:8]}",
            'title': step_title,
            'hours': hours_per_step,
            'done': False,
            'dueDate': step_deadline.isoformat(),
        })

    reasoning = f'Breaking "{title}" into {num_steps} milestones over {days_available} days. Each step ~{hours_per_step}h, distributing {total_hours}h evenly.'

    # Write back to DynamoDB
    table.update_item(
        Key={'PK': f'USER#{user_id}', 'SK': f'TASK#{task_id}'},
        UpdateExpression='SET subtasks = :st, updatedAt = :ua',
        ExpressionAttributeValues={':st': subtasks, ':ua': now.isoformat()}
    )

    return response(200, {'taskId': task_id, 'subtasks': subtasks, 'reasoning': reasoning, 'source': 'Lambda + DynamoDB (real AWS)'})

def parse_natural_language(event):
    body = json.loads(event.get('body', '{}'))
    input_text = body.get('input', '')
    if not input_text:
        return response(400, {'error': 'No input text provided'})

    lower = input_text.lower()
    task_type = 'Assignment'
    for t, kws in {'Test': ['test','quiz','exam','midterm','final'], 'Project': ['project','prototype','capstone'], 'Presentation': ['presentation','present','pitch','demo'], 'Practical': ['practical','lab','experiment','workshop']}.items():
        if any(kw in lower for kw in kws):
            task_type = t
            break

    weight_match = re.search(r'(\d+)\s*%', input_text, re.I)
    weightage = int(weight_match.group(1)) if weight_match else None

    module_match = re.search(r'\b([A-Z]{2,4}\s?\d{3,4})\b', input_text, re.I)
    module_code = module_match.group(1).replace(' ', '').upper() if module_match else ''

    hours_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b', input_text, re.I)
    hours = float(hours_match.group(1)) if hours_match else None

    now = datetime.now(timezone.utc)
    deadline = None
    if 'tomorrow' in lower:
        deadline = (now + timedelta(days=1)).replace(hour=23, minute=59, second=0).isoformat()
    else:
        day_match = re.search(r'next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)', lower)
        if day_match:
            days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
            target = days.index(day_match.group(1))
            diff = (target - now.weekday() + 7) % 7 or 7
            deadline = (now + timedelta(days=diff)).replace(hour=23, minute=59, second=0).isoformat()
        elif 'next week' in lower:
            deadline = (now + timedelta(days=7)).replace(hour=23, minute=59, second=0).isoformat()

    title = re.sub(r'(?:worth|weight(?:age)?)\s*\d+\s*%', '', input_text, flags=re.I)
    title = re.sub(r'\b[A-Z]{2,4}\s?\d{3,4}\b', '', title, flags=re.I)
    title = re.sub(r'\d+(?:\.\d+)?\s*(?:hours?|hrs?|h)\b', '', title, flags=re.I)
    title = re.sub(r'\b(?:due|by|before|taking|next\s+\w+|tomorrow|in\s+\d+\s+days?)\b.*$', '', title, flags=re.I)
    title = re.sub(r'\s+', ' ', title).strip()
    if not title or len(title) < 3:
        title = input_text[:50].strip()
    title = title[0].upper() + title[1:] if title else 'Untitled'

    return response(200, {'title': title, 'moduleCode': module_code, 'taskType': task_type, 'deadline': deadline, 'weightage': weightage, 'hours': hours, 'confidence': 0.85, 'source': 'Lambda (real AWS server-side parsing)', '_rawInput': input_text})

def rebalance_workload(event):
    user_id = get_user_id(event)
    result = table.query(
        KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues={':pk': f'USER#{user_id}', ':sk': 'TASK#'}
    )
    tasks = result.get('Items', [])
    active = [t for t in tasks if t.get('status') != 'Completed']
    if not active:
        return response(200, {'suggestion': 'No active tasks. Add deadlines for workload advice.', 'source': 'Lambda + DynamoDB'})

    now = datetime.now(timezone.utc)
    urgent, heavy, ok = [], [], []
    for t in active:
        try:
            dl = datetime.fromisoformat(t.get('deadline','').replace('Z','+00:00'))
            hrs_left = (dl - now).total_seconds() / 3600
            remaining = float(t.get('hours',4)) * (1 - float(t.get('progress',0))/100)
            if hrs_left < 48 and remaining > 2: urgent.append(t)
            elif hrs_left < 120 and remaining > 4: heavy.append(t)
            else: ok.append(t)
        except:
            ok.append(t)

    parts = []
    if urgent: parts.append(f"URGENT: {', '.join([t.get('title','?')[:30] for t in urgent[:3]])} — focus here first.")
    if heavy: parts.append(f"Heavy: {', '.join([t.get('title','?')[:30] for t in heavy[:3]])} — start now to avoid crunch.")
    if ok: parts.append(f"{len(ok)} task(s) on track.")

    return response(200, {'suggestion': ' '.join(parts) or 'Workload looks manageable.', 'urgentCount': len(urgent), 'heavyCount': len(heavy), 'comfortableCount': len(ok), 'source': 'Lambda + DynamoDB (real workload analysis)'})
AI_EOF

cd /tmp/lambda_ai && zip -j /tmp/ai_decompose.zip lambda_function.py
aws lambda create-function \
    --function-name $FN_AI \
    --runtime python3.10 \
    --role $ROLE_ARN \
    --handler lambda_function.lambda_handler \
    --zip-file fileb:///tmp/ai_decompose.zip \
    --timeout 30 \
    --memory-size 128 \
    --region $REGION 2>/dev/null || \
aws lambda update-function-code \
    --function-name $FN_AI \
    --zip-file fileb:///tmp/ai_decompose.zip \
    --region $REGION

echo "✓ $FN_AI deployed"

# --- 3c: Deadline Checker Lambda ---
echo "Creating $FN_CHECKER..."

mkdir -p /tmp/lambda_checker
cat > /tmp/lambda_checker/lambda_function.py << CHECKER_EOF
"""
PolyTrack Deadline Checker Lambda — triggered by EventBridge + API Gateway
"""
import json
import boto3
from datetime import datetime, timezone
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Vectra')
sns = boto3.client('sns')
SNS_TOPIC_ARN = '${TOPIC_ARN}'

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

def response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        },
        'body': json.dumps(body, cls=DecimalEncoder),
    }

def get_user_id(event):
    params = event.get('queryStringParameters') or {}
    if params.get('userId'): return params['userId']
    headers = event.get('headers') or {}
    if headers.get('x-user-id'): return headers['x-user-id']
    return 'demo_user'

def lambda_handler(event, context):
    if 'httpMethod' in event:
        if event['httpMethod'] == 'OPTIONS':
            return response(200, {'message': 'OK'})
        return handle_api(event)
    else:
        return handle_scheduled(event)

def handle_api(event):
    path = event.get('path', '')
    if path == '/notifications/check':
        user_id = get_user_id(event)
        alerts = check_user(user_id)
        return response(200, {'alerts': alerts, 'checked': len(alerts), 'source': 'Lambda + DynamoDB + SNS'})
    elif path == '/notifications/subscribe':
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '')
        if not email: return response(400, {'error': 'Email required'})
        result = sns.subscribe(TopicArn=SNS_TOPIC_ARN, Protocol='email', Endpoint=email)
        return response(200, {'message': f'Subscription sent to {email}. Confirm in inbox.', 'source': 'SNS'})
    return response(404, {'error': 'Not found'})

def handle_scheduled(event):
    print('[DeadlineChecker] EventBridge trigger fired')
    scan_result = table.scan()
    items = scan_result.get('Items', [])
    users = {}
    for item in items:
        pk = item.get('PK', '')
        if pk.startswith('USER#') and item.get('SK', '').startswith('TASK#'):
            uid = pk.replace('USER#', '')
            users.setdefault(uid, []).append(item)
    total_alerts = 0
    for uid, tasks in users.items():
        alerts = analyze(tasks)
        if alerts:
            total_alerts += len(alerts)
            publish_sns(uid, alerts)
    return {'statusCode': 200, 'body': json.dumps({'scanned': len(items), 'users': len(users), 'alerts': total_alerts})}

def check_user(user_id):
    result = table.query(
        KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues={':pk': f'USER#{user_id}', ':sk': 'TASK#'}
    )
    alerts = analyze(result.get('Items', []))
    critical = [a for a in alerts if a['severity'] in ('critical', 'overdue')]
    if critical: publish_sns(user_id, critical)
    return alerts

def analyze(tasks):
    now = datetime.now(timezone.utc)
    alerts = []
    for task in tasks:
        if task.get('status') == 'Completed': continue
        dl_str = task.get('deadline', '')
        if not dl_str: continue
        try:
            dl = datetime.fromisoformat(dl_str.replace('Z', '+00:00'))
        except: continue
        hrs = (dl - now).total_seconds() / 3600
        prog = float(task.get('progress', 0))
        wt = float(task.get('weightage', 10))
        title = task.get('title', '?')
        mod = task.get('moduleCode', '')
        tid = task.get('id', '')
        pfx = f"{mod} — " if mod else ""

        if hrs <= 0:
            alerts.append({'id': f'alert_{tid}_overdue', 'taskId': tid, 'severity': 'overdue', 'title': 'OVERDUE', 'message': f'{pfx}"{title}" was due {abs(round(hrs))}h ago.', 'timestamp': now.isoformat()})
        elif hrs < 24 and prog < 50 and wt > 15:
            alerts.append({'id': f'alert_{tid}_critical', 'taskId': tid, 'severity': 'critical', 'title': 'CRITICAL', 'message': f'{pfx}"{title}" due in {round(hrs)}h, only {int(prog)}% done. Worth {int(wt)}%.', 'timestamp': now.isoformat()})
        elif hrs < 48 and prog < 40 and wt > 20:
            alerts.append({'id': f'alert_{tid}_atrisk', 'taskId': tid, 'severity': 'at_risk', 'title': 'At risk', 'message': f'{pfx}"{title}" due in {round(hrs)}h, {int(prog)}% done. Carries {int(wt)}%.', 'timestamp': now.isoformat()})
        elif hrs < 72 and prog < 20 and wt > 10:
            alerts.append({'id': f'alert_{tid}_warning', 'taskId': tid, 'severity': 'warning', 'title': 'Approaching', 'message': f'{pfx}"{title}" due in {round(hrs/24,1)} days, not started.', 'timestamp': now.isoformat()})
    alerts.sort(key=lambda a: {'overdue':0,'critical':1,'at_risk':2,'warning':3}.get(a['severity'],9))
    return alerts

def publish_sns(user_id, alerts):
    subject = f"PolyTrack: {len(alerts)} deadline(s) need attention"
    lines = ["PolyTrack Deadline Alert", "=" * 40, ""]
    for a in alerts[:5]:
        lines.append(f"[{a['severity'].upper()}] {a['title']}")
        lines.append(f"  {a['message']}")
        lines.append("")
    lines.append(f"Checked: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    try:
        sns.publish(TopicArn=SNS_TOPIC_ARN, Subject=subject[:100], Message="\n".join(lines))
        print(f'[SNS] Alert published for user {user_id}')
    except Exception as e:
        print(f'[SNS] Failed: {e}')
CHECKER_EOF

cd /tmp/lambda_checker && zip -j /tmp/deadline_checker.zip lambda_function.py
aws lambda create-function \
    --function-name $FN_CHECKER \
    --runtime python3.10 \
    --role $ROLE_ARN \
    --handler lambda_function.lambda_handler \
    --zip-file fileb:///tmp/deadline_checker.zip \
    --timeout 60 \
    --memory-size 128 \
    --region $REGION 2>/dev/null || \
aws lambda update-function-code \
    --function-name $FN_CHECKER \
    --zip-file fileb:///tmp/deadline_checker.zip \
    --region $REGION

echo "✓ $FN_CHECKER deployed"
echo ""

# ============================================================================
# STEP 4: Create API Gateway
# ============================================================================
echo "━━━ STEP 4: Creating API Gateway ━━━"

# Create the REST API
API_ID=$(aws apigateway create-rest-api \
    --name "$API_NAME" \
    --description "PolyTrack REST API - routes to Lambda functions" \
    --endpoint-configuration types=REGIONAL \
    --region $REGION \
    --query 'id' --output text)

echo "✓ API created: $API_ID"

# Get the root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/`].id' --output text)

# --- Helper function to create a resource + methods ---
create_resource_with_methods() {
    local PARENT_ID=$1
    local PATH_PART=$2
    local LAMBDA_ARN=$3
    local METHODS=$4  # comma-separated: GET,POST,PUT,DELETE

    RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $PARENT_ID \
        --path-part "$PATH_PART" \
        --region $REGION \
        --query 'id' --output text)

    # Add OPTIONS for CORS
    aws apigateway put-method --rest-api-id $API_ID --resource-id $RESOURCE_ID \
        --http-method OPTIONS --authorization-type NONE --region $REGION > /dev/null

    aws apigateway put-integration --rest-api-id $API_ID --resource-id $RESOURCE_ID \
        --http-method OPTIONS --type MOCK \
        --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
        --region $REGION > /dev/null

    aws apigateway put-method-response --rest-api-id $API_ID --resource-id $RESOURCE_ID \
        --http-method OPTIONS --status-code 200 \
        --response-parameters "method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false" \
        --region $REGION > /dev/null

    aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $RESOURCE_ID \
        --http-method OPTIONS --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization,x-user-id'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
        --region $REGION > /dev/null

    # Add each HTTP method
    IFS=',' read -ra METHOD_ARRAY <<< "$METHODS"
    for METHOD in "${METHOD_ARRAY[@]}"; do
        aws apigateway put-method --rest-api-id $API_ID --resource-id $RESOURCE_ID \
            --http-method $METHOD --authorization-type NONE --region $REGION > /dev/null

        aws apigateway put-integration --rest-api-id $API_ID --resource-id $RESOURCE_ID \
            --http-method $METHOD --type AWS_PROXY \
            --integration-http-method POST \
            --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
            --region $REGION > /dev/null
    done

    echo "$RESOURCE_ID"
}

# Lambda ARNs
CRUD_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FN_CRUD}"
AI_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FN_AI}"
CHECKER_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FN_CHECKER}"

# --- /tasks ---
echo "  Creating /tasks route..."
TASKS_ID=$(create_resource_with_methods $ROOT_ID "tasks" $CRUD_ARN "GET,POST")

# --- /tasks/{id} ---
echo "  Creating /tasks/{id} route..."
TASK_BY_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID --parent-id $TASKS_ID \
    --path-part "{id}" --region $REGION --query 'id' --output text)

for METHOD in GET PUT DELETE OPTIONS; do
    aws apigateway put-method --rest-api-id $API_ID --resource-id $TASK_BY_ID \
        --http-method $METHOD --authorization-type NONE --region $REGION > /dev/null

    if [ "$METHOD" = "OPTIONS" ]; then
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $TASK_BY_ID \
            --http-method OPTIONS --type MOCK \
            --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
            --region $REGION > /dev/null

        aws apigateway put-method-response --rest-api-id $API_ID --resource-id $TASK_BY_ID \
            --http-method OPTIONS --status-code 200 \
            --response-parameters "method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false" \
            --region $REGION > /dev/null

        aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $TASK_BY_ID \
            --http-method OPTIONS --status-code 200 \
            --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization,x-user-id'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
            --region $REGION > /dev/null
    else
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $TASK_BY_ID \
            --http-method $METHOD --type AWS_PROXY \
            --integration-http-method POST \
            --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${CRUD_ARN}/invocations" \
            --region $REGION > /dev/null
    fi
done

# --- /ai ---
echo "  Creating /ai routes..."
AI_ID=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $ROOT_ID \
    --path-part "ai" --region $REGION --query 'id' --output text)

# /ai/parse
PARSE_ID=$(create_resource_with_methods $AI_ID "parse" $AI_ARN "POST")

# /ai/rebalance
REBAL_ID=$(create_resource_with_methods $AI_ID "rebalance" $AI_ARN "POST")

# /ai/decompose
DECOMPOSE_ID=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $AI_ID \
    --path-part "decompose" --region $REGION --query 'id' --output text)

# /ai/decompose/{taskId}
DECOMPOSE_TASK_ID=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $DECOMPOSE_ID \
    --path-part "{taskId}" --region $REGION --query 'id' --output text)

for METHOD in POST OPTIONS; do
    aws apigateway put-method --rest-api-id $API_ID --resource-id $DECOMPOSE_TASK_ID \
        --http-method $METHOD --authorization-type NONE --region $REGION > /dev/null

    if [ "$METHOD" = "OPTIONS" ]; then
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $DECOMPOSE_TASK_ID \
            --http-method OPTIONS --type MOCK \
            --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
            --region $REGION > /dev/null

        aws apigateway put-method-response --rest-api-id $API_ID --resource-id $DECOMPOSE_TASK_ID \
            --http-method OPTIONS --status-code 200 \
            --response-parameters "method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false" \
            --region $REGION > /dev/null

        aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $DECOMPOSE_TASK_ID \
            --http-method OPTIONS --status-code 200 \
            --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization,x-user-id'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'POST,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
            --region $REGION > /dev/null
    else
        aws apigateway put-integration --rest-api-id $API_ID --resource-id $DECOMPOSE_TASK_ID \
            --http-method $METHOD --type AWS_PROXY \
            --integration-http-method POST \
            --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${AI_ARN}/invocations" \
            --region $REGION > /dev/null
    fi
done

# --- /notifications ---
echo "  Creating /notifications routes..."
NOTIF_ID=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $ROOT_ID \
    --path-part "notifications" --region $REGION --query 'id' --output text)

# /notifications/check
CHECK_ID=$(create_resource_with_methods $NOTIF_ID "check" $CHECKER_ARN "POST")

# /notifications/subscribe
SUB_ID=$(create_resource_with_methods $NOTIF_ID "subscribe" $CHECKER_ARN "POST")

# --- Deploy the API ---
echo "  Deploying API to stage '$STAGE_NAME'..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name $STAGE_NAME \
    --region $REGION > /dev/null

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}"
echo "✓ API deployed at: $API_URL"

# --- Grant API Gateway permission to invoke Lambdas ---
echo "  Granting API Gateway → Lambda permissions..."

for FN in $FN_CRUD $FN_AI $FN_CHECKER; do
    aws lambda add-permission \
        --function-name $FN \
        --statement-id "apigateway-invoke-$(date +%s)-${RANDOM}" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
        --region $REGION 2>/dev/null || true
done

echo "✓ Lambda permissions configured"
echo ""

# ============================================================================
# STEP 5: Create EventBridge Scheduled Rule
# ============================================================================
echo "━━━ STEP 5: Creating EventBridge Scheduled Rule ━━━"

RULE_NAME="PolyTrack_DeadlineCheck"

aws events put-rule \
    --name $RULE_NAME \
    --schedule-expression "rate(3 hours)" \
    --state ENABLED \
    --description "Checks PolyTrack deadlines every 3 hours and sends SNS alerts" \
    --region $REGION > /dev/null

aws events put-targets \
    --rule $RULE_NAME \
    --targets "Id=DeadlineCheckerTarget,Arn=arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FN_CHECKER}" \
    --region $REGION > /dev/null

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission \
    --function-name $FN_CHECKER \
    --statement-id "eventbridge-invoke-$(date +%s)" \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${RULE_NAME}" \
    --region $REGION 2>/dev/null || true

echo "✓ EventBridge rule '$RULE_NAME' created (runs every 3 hours)"
echo ""

# ============================================================================
# DONE!
# ============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           PolyTrack Backend Deployed Successfully!          ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  API Gateway URL:                                           ║"
echo "║  $API_URL"
echo "║                                                              ║"
echo "║  Services Active:                                           ║"
echo "║  ✓ DynamoDB  — Table 'Vectra' (task storage)               ║"
echo "║  ✓ Lambda    — 3 functions (CRUD, AI, Checker)             ║"
echo "║  ✓ API GW    — REST API with CORS                          ║"
echo "║  ✓ SNS       — PolyTrackAlerts topic                       ║"
echo "║  ✓ EventBridge — 3-hour deadline sweep                     ║"
echo "║                                                              ║"
echo "║  NEXT STEP:                                                 ║"
echo "║  Set this in your Netlify environment variables:            ║"
echo "║  VITE_API_URL = $API_URL"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Test it right now:"
echo "  curl -s ${API_URL}/tasks?userId=demo_user | python3 -m json.tool"
echo ""
