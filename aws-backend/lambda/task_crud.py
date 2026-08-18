"""
PolyTrack Task CRUD Lambda Function
====================================
Handles all task operations against DynamoDB table 'Vectra'.

Routes:
  GET    /tasks           → list all tasks for a user
  POST   /tasks           → create a new task
  PUT    /tasks/{id}      → update an existing task
  DELETE /tasks/{id}      → delete a task
  GET    /tasks/{id}      → get a single task

DynamoDB Key Schema:
  PK: USER#<userId>
  SK: TASK#<taskId>
"""

import json
import boto3
import uuid
import time
from datetime import datetime, timezone
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Vectra')


class DecimalEncoder(json.JSONEncoder):
    """Handle Decimal types from DynamoDB."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super().default(obj)


def response(status_code, body):
    """Return a properly formatted API Gateway response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        'body': json.dumps(body, cls=DecimalEncoder),
    }


def get_user_id(event):
    """Extract user ID from path, query params, or headers."""
    # From query string
    params = event.get('queryStringParameters') or {}
    if params.get('userId'):
        return params['userId']
    # From headers (set by frontend)
    headers = event.get('headers') or {}
    if headers.get('x-user-id'):
        return headers['x-user-id']
    # Default demo user
    return 'demo_user'


def lambda_handler(event, context):
    """Main Lambda entry point - routes to appropriate handler."""
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')
    
    # Handle CORS preflight
    if http_method == 'OPTIONS':
        return response(200, {'message': 'OK'})

    try:
        # Route based on method and path
        if path == '/tasks' and http_method == 'GET':
            return list_tasks(event)
        elif path == '/tasks' and http_method == 'POST':
            return create_task(event)
        elif path.startswith('/tasks/') and http_method == 'GET':
            task_id = path.split('/tasks/')[1]
            return get_task(event, task_id)
        elif path.startswith('/tasks/') and http_method == 'PUT':
            task_id = path.split('/tasks/')[1]
            return update_task(event, task_id)
        elif path.startswith('/tasks/') and http_method == 'DELETE':
            task_id = path.split('/tasks/')[1]
            return delete_task(event, task_id)
        else:
            return response(404, {'error': f'Not found: {http_method} {path}'})
    except Exception as e:
        print(f'Error: {str(e)}')
        return response(500, {'error': str(e)})


def list_tasks(event):
    """GET /tasks - List all tasks for the user."""
    user_id = get_user_id(event)
    
    result = table.query(
        KeyConditionExpression='PK = :pk AND begins_with(SK, :sk_prefix)',
        ExpressionAttributeValues={
            ':pk': f'USER#{user_id}',
            ':sk_prefix': 'TASK#',
        }
    )
    
    tasks = []
    for item in result.get('Items', []):
        task = {k: v for k, v in item.items() if k not in ('PK', 'SK')}
        tasks.append(task)
    
    return response(200, {'tasks': tasks, 'count': len(tasks)})


def create_task(event):
    """POST /tasks - Create a new task."""
    user_id = get_user_id(event)
    body = json.loads(event.get('body', '{}'))
    
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    task = {
        'PK': f'USER#{user_id}',
        'SK': f'TASK#{task_id}',
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
        'createdAt': now,
        'updatedAt': now,
    }
    
    table.put_item(Item=task)
    
    # Return task without DynamoDB keys
    result = {k: v for k, v in task.items() if k not in ('PK', 'SK')}
    return response(201, {'task': result, 'message': 'Task created in DynamoDB'})


def get_task(event, task_id):
    """GET /tasks/{id} - Get a single task."""
    user_id = get_user_id(event)
    
    result = table.get_item(
        Key={
            'PK': f'USER#{user_id}',
            'SK': f'TASK#{task_id}',
        }
    )
    
    item = result.get('Item')
    if not item:
        return response(404, {'error': 'Task not found'})
    
    task = {k: v for k, v in item.items() if k not in ('PK', 'SK')}
    return response(200, {'task': task})


def update_task(event, task_id):
    """PUT /tasks/{id} - Update a task."""
    user_id = get_user_id(event)
    body = json.loads(event.get('body', '{}'))
    
    # Build update expression dynamically
    update_parts = []
    attr_names = {}
    attr_values = {}
    
    allowed_fields = [
        'title', 'moduleCode', 'moduleName', 'taskType', 'deadline',
        'hours', 'weightage', 'isGroup', 'notes', 'progress', 'status', 'subtasks'
    ]
    
    for field in allowed_fields:
        if field in body:
            placeholder = f'#{field}'
            value_key = f':{field}'
            update_parts.append(f'{placeholder} = {value_key}')
            attr_names[placeholder] = field
            # Convert numbers to Decimal for DynamoDB
            val = body[field]
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                val = Decimal(str(val))
            attr_values[value_key] = val
    
    # Always update timestamp
    update_parts.append('#updatedAt = :updatedAt')
    attr_names['#updatedAt'] = 'updatedAt'
    attr_values[':updatedAt'] = datetime.now(timezone.utc).isoformat()
    
    if not update_parts:
        return response(400, {'error': 'No fields to update'})
    
    result = table.update_item(
        Key={
            'PK': f'USER#{user_id}',
            'SK': f'TASK#{task_id}',
        },
        UpdateExpression='SET ' + ', '.join(update_parts),
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
        ReturnValues='ALL_NEW',
    )
    
    item = result.get('Attributes', {})
    task = {k: v for k, v in item.items() if k not in ('PK', 'SK')}
    return response(200, {'task': task, 'message': 'Task updated in DynamoDB'})


def delete_task(event, task_id):
    """DELETE /tasks/{id} - Delete a task."""
    user_id = get_user_id(event)
    
    table.delete_item(
        Key={
            'PK': f'USER#{user_id}',
            'SK': f'TASK#{task_id}',
        }
    )
    
    return response(200, {'message': f'Task {task_id} deleted from DynamoDB'})
