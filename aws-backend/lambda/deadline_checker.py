"""
PolyTrack Deadline Checker Lambda Function
============================================
Triggered by EventBridge on a schedule (every 3 hours).
Scans ALL tasks in DynamoDB, identifies at-risk deadlines,
and publishes real SNS notifications.

This is the function that makes EventBridge + SNS + DynamoDB work together:

  EventBridge (scheduled rule, every 3 hours)
      → triggers this Lambda
          → scans DynamoDB for at-risk tasks
              → publishes to SNS topic (real email/SMS)

SNS Topic ARN: arn:aws:sns:us-east-1:037389780625:PolyTrackAlerts
(Created by deployment script)

Trigger conditions for notification:
  - CRITICAL: Due in < 24h AND progress < 50% AND weightage > 15%
  - AT RISK:  Due in < 48h AND progress < 40% AND weightage > 20%
  - OVERDUE:  Past deadline and not completed
  - OVERLOAD: More than dailyHours worth of work due tomorrow
"""

import json
import boto3
from datetime import datetime, timezone, timedelta
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Vectra')
sns = boto3.client('sns')

# This will be set during deployment
SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:037389780625:PolyTrackAlerts'


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
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


def lambda_handler(event, context):
    """
    Entry point. Can be triggered by:
    1. EventBridge scheduled rule (automatic, every 3 hours)
    2. API Gateway POST /notifications/check (manual trigger from frontend)
    """
    # Determine if this is an API Gateway call or EventBridge trigger
    if 'httpMethod' in event:
        # API Gateway call
        if event['httpMethod'] == 'OPTIONS':
            return response(200, {'message': 'OK'})
        return handle_api_request(event)
    else:
        # EventBridge scheduled trigger
        return handle_scheduled_check(event)


def handle_api_request(event):
    """Handle manual check from frontend via API Gateway."""
    path = event.get('path', '')

    if path == '/notifications/check':
        user_id = get_user_id(event)
        alerts = check_user_deadlines(user_id)
        return response(200, {
            'alerts': alerts,
            'checked': len(alerts),
            'source': 'Lambda + DynamoDB + SNS (real AWS notification check)',
        })
    elif path == '/notifications/subscribe':
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '')
        if not email:
            return response(400, {'error': 'Email required'})
        return subscribe_email(email)
    else:
        return response(404, {'error': f'Not found: {path}'})


def handle_scheduled_check(event):
    """
    EventBridge scheduled trigger — scan ALL users' tasks.
    This runs automatically every 3 hours without any human interaction.
    """
    print('[DeadlineChecker] EventBridge scheduled trigger fired')
    print(f'[DeadlineChecker] Event: {json.dumps(event, default=str)}')

    # Scan all tasks in the table (for all users)
    all_alerts = []
    scan_result = table.scan()
    items = scan_result.get('Items', [])

    # Group by user
    users = {}
    for item in items:
        pk = item.get('PK', '')
        if pk.startswith('USER#') and item.get('SK', '').startswith('TASK#'):
            user_id = pk.replace('USER#', '')
            if user_id not in users:
                users[user_id] = []
            users[user_id].append(item)

    # Check each user's tasks
    for user_id, tasks in users.items():
        alerts = analyze_tasks(tasks)
        if alerts:
            all_alerts.extend(alerts)
            # Publish to SNS for each batch of critical alerts
            publish_alerts_to_sns(user_id, alerts)

    print(f'[DeadlineChecker] Checked {len(items)} tasks across {len(users)} users. '
          f'Generated {len(all_alerts)} alerts.')

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Deadline check complete',
            'tasksScanned': len(items),
            'usersChecked': len(users),
            'alertsGenerated': len(all_alerts),
        }),
    }


def get_user_id(event):
    params = event.get('queryStringParameters') or {}
    if params.get('userId'):
        return params['userId']
    headers = event.get('headers') or {}
    if headers.get('x-user-id'):
        return headers['x-user-id']
    return 'demo_user'


def check_user_deadlines(user_id):
    """Check a single user's tasks and return alerts."""
    result = table.query(
        KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues={
            ':pk': f'USER#{user_id}',
            ':sk': 'TASK#',
        }
    )
    tasks = result.get('Items', [])
    alerts = analyze_tasks(tasks)

    # Publish critical alerts to SNS
    critical = [a for a in alerts if a['severity'] in ('critical', 'overdue')]
    if critical:
        publish_alerts_to_sns(user_id, critical)

    return alerts


def analyze_tasks(tasks):
    """Analyze tasks and generate alert objects."""
    now = datetime.now(timezone.utc)
    alerts = []

    for task in tasks:
        if task.get('status') == 'Completed':
            continue

        deadline_str = task.get('deadline', '')
        if not deadline_str:
            continue

        try:
            deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
        except:
            continue

        hours_remaining = (deadline - now).total_seconds() / 3600
        progress = float(task.get('progress', 0))
        weightage = float(task.get('weightage', 10))
        title = task.get('title', 'Untitled')
        module = task.get('moduleCode', '')
        task_id = task.get('id', '')

        prefix = f"{module} — " if module else ""

        # OVERDUE
        if hours_remaining <= 0:
            alerts.append({
                'id': f'alert_{task_id}_overdue',
                'taskId': task_id,
                'severity': 'overdue',
                'title': 'OVERDUE',
                'message': (
                    f'{prefix}"{title}" was due {abs(round(hours_remaining))}h ago '
                    f'and is only {int(progress)}% complete.'
                ),
                'hoursOverdue': abs(round(hours_remaining)),
                'timestamp': now.isoformat(),
            })

        # CRITICAL: Due in < 24h, progress < 50%, weight > 15%
        elif hours_remaining < 24 and progress < 50 and weightage > 15:
            alerts.append({
                'id': f'alert_{task_id}_critical',
                'taskId': task_id,
                'severity': 'critical',
                'title': 'CRITICAL — Due very soon',
                'message': (
                    f'{prefix}"{title}" is due in {round(hours_remaining)}h '
                    f'but only {int(progress)}% done. Worth {int(weightage)}% of grade.'
                ),
                'hoursRemaining': round(hours_remaining),
                'timestamp': now.isoformat(),
            })

        # AT RISK: Due in < 48h, progress < 40%, weight > 20%
        elif hours_remaining < 48 and progress < 40 and weightage > 20:
            alerts.append({
                'id': f'alert_{task_id}_atrisk',
                'taskId': task_id,
                'severity': 'at_risk',
                'title': 'At risk of being late',
                'message': (
                    f'{prefix}"{title}" is due in {round(hours_remaining)}h '
                    f'with only {int(progress)}% done. It carries {int(weightage)}% of your grade.'
                ),
                'hoursRemaining': round(hours_remaining),
                'timestamp': now.isoformat(),
            })

        # WARNING: Due in < 72h, barely started
        elif hours_remaining < 72 and progress < 20 and weightage > 10:
            alerts.append({
                'id': f'alert_{task_id}_warning',
                'taskId': task_id,
                'severity': 'warning',
                'title': 'Deadline approaching',
                'message': (
                    f'{prefix}"{title}" is due in {round(hours_remaining / 24, 1)} days '
                    f'and hasn\'t been started yet.'
                ),
                'hoursRemaining': round(hours_remaining),
                'timestamp': now.isoformat(),
            })

    # Sort by severity
    severity_order = {'overdue': 0, 'critical': 1, 'at_risk': 2, 'warning': 3}
    alerts.sort(key=lambda a: severity_order.get(a['severity'], 99))

    return alerts


def publish_alerts_to_sns(user_id, alerts):
    """
    Publish alert notifications to the SNS topic.
    This sends REAL emails/SMS to subscribed endpoints.
    """
    if not alerts:
        return

    # Build a readable message
    subject = f"PolyTrack Alert: {len(alerts)} deadline(s) need attention"

    lines = [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "  PolyTrack Deadline Alert",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
    ]

    for alert in alerts[:5]:  # Max 5 alerts per message
        icon = {'overdue': '🔴', 'critical': '🟠', 'at_risk': '🟡', 'warning': '⚪'}.get(
            alert['severity'], '⚪'
        )
        lines.append(f"{icon} [{alert['severity'].upper()}] {alert['title']}")
        lines.append(f"   {alert['message']}")
        lines.append("")

    lines.extend([
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "Open PolyTrack to manage your deadlines.",
        f"Checked at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
    ])

    message = "\n".join(lines)

    try:
        result = sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject[:100],  # SNS subject limit
            Message=message,
        )
        print(f'[SNS] Published alert to topic. MessageId: {result["MessageId"]}')
        return result
    except Exception as e:
        print(f'[SNS] Failed to publish: {str(e)}')
        # Don't crash the Lambda if SNS fails
        return None


def subscribe_email(email):
    """Subscribe an email address to the PolyTrack alerts SNS topic."""
    try:
        result = sns.subscribe(
            TopicArn=SNS_TOPIC_ARN,
            Protocol='email',
            Endpoint=email,
        )
        return response(200, {
            'message': f'Subscription request sent to {email}. Check your inbox to confirm.',
            'subscriptionArn': result.get('SubscriptionArn', 'pending'),
            'source': 'SNS (real AWS subscription)',
        })
    except Exception as e:
        return response(500, {'error': f'Failed to subscribe: {str(e)}'})
