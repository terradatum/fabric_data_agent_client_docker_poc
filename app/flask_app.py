#!/usr/bin/env python3
"""
Flask Web Application for Fabric Data Agent Client

A simple web interface for interacting with Microsoft Fabric Data Agents.
Provides an input form where users can ask questions and see responses.
"""

import os
import json
import time
import uuid
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from azure.identity import DeviceCodeCredential
from openai import OpenAI
import secrets
import warnings
import requests

# Suppress OpenAI deprecation warnings
warnings.filterwarnings("ignore", category=DeprecationWarning, message=r".*Assistants API is deprecated.*")

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# Enable CORS for all routes - allows React frontend to communicate with Flask backend
CORS(app, resources={r"/*": {"origins": "*"}})

# Global variables
credential = None
token = None
auth_in_progress = False
device_code_info = None

def get_config():
    """Get configuration from environment variables."""
    TENANT_ID = os.getenv("TENANT_ID")
    DATA_AGENT_URL = os.getenv("DATA_AGENT_URL")

    if not TENANT_ID or not DATA_AGENT_URL:
        raise ValueError("TENANT_ID and DATA_AGENT_URL environment variables must be set")

    if TENANT_ID == "your-tenant-id-here" or DATA_AGENT_URL == "your-data-agent-url-here":
        raise ValueError("Please update TENANT_ID and DATA_AGENT_URL with your actual values")

    return TENANT_ID, DATA_AGENT_URL

def get_token():
    """Get or refresh authentication token."""
    global token, credential

    if credential is None:
        raise ValueError("Not authenticated. Please authenticate first.")

    # Check if token needs refresh (refresh 5 minutes before expiry)
    if token is None or token.expires_on <= (time.time() + 300):
        print("Refreshing token...")
        token = credential.get_token("https://api.fabric.microsoft.com/.default")
        print(f"Token refreshed, expires at: {time.ctime(token.expires_on)}")

    return token

def get_openai_client(data_agent_url):
    """Create an OpenAI client configured for Fabric Data Agent calls."""
    current_token = get_token()

    return OpenAI(
        api_key="",
        base_url=data_agent_url,
        default_query={"api-version": "2024-05-01-preview"},
        default_headers={
            "Authorization": f"Bearer {current_token.token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "ActivityId": str(uuid.uuid4())
        }
    )

def get_or_create_thread(data_agent_url, thread_name=None):
    """Get an existing thread or create a new thread."""
    if thread_name is None:
        thread_name = f'external-client-thread-{uuid.uuid4()}'

    if "aiskills" in data_agent_url:
        base_url = data_agent_url.replace("aiskills", "dataagents").removesuffix("/openai").replace("/aiassistant", "/__private/aiassistant")
    else:
        base_url = data_agent_url.removesuffix("/openai").replace("/aiassistant", "/__private/aiassistant")

    get_thread_url = f'{base_url}/threads/fabric?tag="{thread_name}"'
    current_token = get_token()

    headers = {
        "Authorization": f"Bearer {current_token.token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "ActivityId": str(uuid.uuid4())
    }

    response = requests.get(get_thread_url, headers=headers)
    response.raise_for_status()
    thread = response.json()
    thread["name"] = thread_name

    return thread

@app.route('/')
def index():
    """Render the main page with input form."""
    return render_template('index.html')

@app.route('/auth/start', methods=['POST'])
def start_auth():
    """Start device code authentication flow."""
    global credential, auth_in_progress, device_code_info

    try:
        tenant_id, _ = get_config()

        auth_in_progress = True
        device_code_info = {}

        def device_code_callback(verification_uri, user_code, expires_in):
            """Callback to capture device code information."""
            device_code_info['verification_uri'] = verification_uri
            device_code_info['user_code'] = user_code
            device_code_info['expires_in'] = expires_in
            print(f"Device code: {user_code}")
            print(f"Visit: {verification_uri}")

        # Create credential with device code flow
        credential = DeviceCodeCredential(
            tenant_id=tenant_id,
            prompt_callback=device_code_callback
        )

        # Trigger token acquisition in background (don't wait for completion)
        import threading
        def acquire_token():
            global token, auth_in_progress
            try:
                token = credential.get_token("https://api.fabric.microsoft.com/.default")
                print("Authentication successful!")
            except Exception as e:
                print(f"Authentication failed: {e}")
            finally:
                auth_in_progress = False

        thread = threading.Thread(target=acquire_token)
        thread.daemon = True
        thread.start()

        # Wait briefly for device code info to be populated
        time.sleep(2)

        return jsonify({
            'success': True,
            'device_code': device_code_info.get('user_code'),
            'verification_uri': device_code_info.get('verification_uri'),
            'expires_in': device_code_info.get('expires_in')
        })

    except Exception as e:
        auth_in_progress = False
        print(f"Error starting authentication: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/auth/status', methods=['GET'])
def auth_status():
    """Check authentication status."""
    return jsonify({
        'authenticated': token is not None and token.expires_on > time.time(),
        'auth_in_progress': auth_in_progress
    })

@app.route('/ask', methods=['GET', 'POST'])
def ask_question():
    """Handle question submission and return agent response."""
    global token

    # Handle GET request - return usage info
    if request.method == 'GET':
        return jsonify({
            'endpoint': '/ask',
            'method': 'POST',
            'description': 'Ask a question to the Fabric Data Agent and get a simple response',
            'request_body': {
                'question': '(required) The question to ask',
                'thread_name': '(optional) Name for the conversation thread'
            },
            'example_curl': 'curl -X POST http://localhost:5000/ask -H "Content-Type: application/json" -d \'{"question": "What tables are available?"}\''
        })

    try:
        # Check if authenticated
        if token is None or token.expires_on <= time.time():
            return jsonify({
                'success': False,
                'error': 'Not authenticated. Please complete authentication first.',
                'needs_auth': True
            }), 401

        _, data_agent_url = get_config()

        data = request.get_json()
        question = data.get('question', '').strip()
        thread_name = data.get('thread_name', None)

        if not question:
            return jsonify({
                'success': False,
                'error': 'Question cannot be empty'
            }), 400

        # Create OpenAI client and process question
        client = get_openai_client(data_agent_url)
        assistant = client.beta.assistants.create(model="not used")

        thread = get_or_create_thread(data_agent_url, thread_name)

        client.beta.threads.messages.create(
            thread_id=thread['id'],
            role="user",
            content=question
        )

        run = client.beta.threads.runs.create(
            thread_id=thread['id'],
            assistant_id=assistant.id
        )

        # Monitor run
        start_time = time.time()
        timeout = 120
        while run.status in ["queued", "in_progress"]:
            if time.time() - start_time > timeout:
                break
            time.sleep(2)
            run = client.beta.threads.runs.retrieve(thread_id=thread['id'], run_id=run.id)

        # Get messages
        messages = client.beta.threads.messages.list(thread_id=thread['id'], order="asc")

        # Extract response
        responses = []
        for msg in messages.data:
            if msg.role == "assistant":
                try:
                    content = msg.content[0]
                    if hasattr(content, 'text'):
                        text_content = getattr(content, 'text', None)
                        if text_content is not None and hasattr(text_content, 'value'):
                            responses.append(text_content.value)
                except (IndexError, AttributeError):
                    pass

        response_text = "\n".join(responses) if responses else "No response received from the data agent."

        return jsonify({
            'success': True,
            'question': question,
            'response': response_text
        })

    except Exception as e:
        print(f"Error in /ask endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/run-details', methods=['GET', 'POST'])
def get_run_details():
    """
    Ask a question and return detailed run information including steps.
    Returns run steps, metadata, and SQL queries if lakehouse data source is used.
    """
    global token

    # Handle GET request - return usage info
    if request.method == 'GET':
        return jsonify({
            'endpoint': '/run-details',
            'method': 'POST',
            'description': 'Ask a question and return detailed run information including steps, messages, and SQL queries',
            'request_body': {
                'question': '(required) The question to ask',
                'thread_name': '(optional) Name for the conversation thread'
            },
            'response_fields': {
                'success': 'boolean - whether the request succeeded',
                'question': 'string - the question that was asked',
                'run_status': 'string - final status of the run (completed, failed, etc.)',
                'run_steps': 'object - detailed step-by-step execution info',
                'messages': 'object - full message history',
                'timestamp': 'number - when the request was processed',
                'sql_queries': '(optional) array - extracted SQL queries if lakehouse data source',
                'sql_data_previews': '(optional) array - data previews from query results',
                'data_retrieval_query': '(optional) string - the specific query that retrieved data'
            },
            'example_curl': 'curl -X POST http://localhost:5000/run-details -H "Content-Type: application/json" -d \'{"question": "What tables are available?"}\''
        })

    try:
        # Check if authenticated
        if token is None or token.expires_on <= time.time():
            return jsonify({
                'success': False,
                'error': 'Not authenticated. Please complete authentication first.',
                'needs_auth': True
            }), 401

        _, data_agent_url = get_config()

        data = request.get_json()
        question = data.get('question', '').strip()
        thread_name = data.get('thread_name', None)

        if not question:
            return jsonify({
                'success': False,
                'error': 'Question cannot be empty'
            }), 400

        # Create OpenAI client and process question
        client = get_openai_client(data_agent_url)
        assistant = client.beta.assistants.create(model="not used")

        thread = get_or_create_thread(data_agent_url, thread_name)

        client.beta.threads.messages.create(
            thread_id=thread['id'],
            role="user",
            content=question
        )

        run = client.beta.threads.runs.create(
            thread_id=thread['id'],
            assistant_id=assistant.id
        )

        # Monitor run
        start_time = time.time()
        timeout = 120
        while run.status in ["queued", "in_progress"]:
            if time.time() - start_time > timeout:
                break
            time.sleep(2)
            run = client.beta.threads.runs.retrieve(thread_id=thread['id'], run_id=run.id)

        # Get detailed run steps
        steps = client.beta.threads.runs.steps.list(
            thread_id=thread['id'],
            run_id=run.id
        )

        # Get messages
        messages = client.beta.threads.messages.list(thread_id=thread['id'], order="asc")

        # Extract SQL queries and data from steps
        sql_analysis = extract_sql_queries_with_data(steps)

        # Also try regex method as backup
        if not sql_analysis["queries"]:
            regex_queries = extract_sql_queries(steps)
            if regex_queries:
                sql_analysis["queries"] = regex_queries
                sql_analysis["data_retrieval_query"] = regex_queries[0] if regex_queries else None

        # Extract data from the final assistant message
        messages_data = messages.model_dump()
        assistant_messages = [msg for msg in messages_data.get('data', []) if msg.get('role') == 'assistant']
        if assistant_messages:
            latest_message = assistant_messages[-1]
            content = latest_message.get('content', [])
            if content and len(content) > 0:
                text_content = ""
                if isinstance(content[0], dict):
                    if 'text' in content[0]:
                        if isinstance(content[0]['text'], dict) and 'value' in content[0]['text']:
                            text_content = content[0]['text']['value']
                        else:
                            text_content = str(content[0]['text'])
                else:
                    text_content = str(content[0])

                if text_content:
                    text_data_preview = extract_data_from_text_response(text_content)
                    if text_data_preview:
                        if not sql_analysis["data_previews"] or not any(sql_analysis["data_previews"]):
                            sql_analysis["data_previews"] = [text_data_preview]
                        else:
                            sql_analysis["data_previews"].append(text_data_preview)

                        if not sql_analysis["data_retrieval_query"] and sql_analysis["queries"]:
                            sql_analysis["data_retrieval_query"] = sql_analysis["queries"][0]
                            sql_analysis["data_retrieval_query_index"] = 1

        # Build result
        result = {
            "success": True,
            "question": question,
            "run_status": run.status,
            "run_steps": steps.model_dump(),
            "messages": messages_data,
            "timestamp": time.time()
        }

        # Add SQL analysis if found
        if sql_analysis["queries"]:
            result["sql_queries"] = sql_analysis["queries"]
            result["sql_data_previews"] = sql_analysis["data_previews"]
            result["data_retrieval_query"] = sql_analysis["data_retrieval_query"]

        return jsonify(result)

    except Exception as e:
        print(f"Error in /run-details endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def extract_sql_queries_with_data(steps) -> dict:
    """
    Extract SQL queries from run steps using direct JSON parsing and output analysis.
    """
    import re

    sql_queries = []
    data_previews = []
    data_retrieval_query = None
    data_retrieval_query_index = None

    try:
        for step_idx, step in enumerate(steps.data):
            if hasattr(step, 'step_details') and step.step_details:
                step_details = step.step_details

                if hasattr(step_details, 'tool_calls') and step_details.tool_calls:
                    for tool_idx, tool_call in enumerate(step_details.tool_calls):
                        sql_from_args = extract_sql_from_function_args(tool_call)
                        if sql_from_args:
                            sql_queries.extend(sql_from_args)

                        sql_from_output = extract_sql_from_output(tool_call)
                        if sql_from_output:
                            sql_queries.extend(sql_from_output)

                        data_preview = extract_structured_data_from_output(tool_call)
                        if data_preview:
                            if sql_from_args or sql_from_output:
                                all_sql_this_call = sql_from_args + sql_from_output
                                data_retrieval_query = all_sql_this_call[-1] if all_sql_this_call else None
                                data_retrieval_query_index = len(sql_queries)

                        data_previews.append(data_preview)

    except Exception as e:
        print(f"Warning: Could not extract SQL queries: {e}")

    unique_queries = list(dict.fromkeys(sql_queries))

    return {
        "queries": unique_queries,
        "data_previews": data_previews,
        "data_retrieval_query": data_retrieval_query,
        "data_retrieval_query_index": data_retrieval_query_index
    }


def extract_sql_from_function_args(tool_call) -> list:
    """Extract SQL queries from tool call function arguments."""
    import re

    sql_queries = []

    try:
        if hasattr(tool_call, 'function') and tool_call.function:
            if hasattr(tool_call.function, 'arguments'):
                args_str = tool_call.function.arguments

                args = json.loads(args_str)

                if isinstance(args, dict):
                    sql_keys = ['sql', 'query', 'sql_query', 'statement', 'command', 'code']

                    for key in sql_keys:
                        if key in args and args[key]:
                            sql_query = str(args[key]).strip()
                            if sql_query and len(sql_query) > 10:
                                sql_queries.append(sql_query)

                    for key, value in args.items():
                        if isinstance(value, dict):
                            for nested_key in sql_keys:
                                if nested_key in value and value[nested_key]:
                                    sql_query = str(value[nested_key]).strip()
                                    if sql_query and len(sql_query) > 10:
                                        sql_queries.append(sql_query)

    except (json.JSONDecodeError, AttributeError) as e:
        try:
            args_str = str(tool_call.function.arguments)
            if any(keyword in args_str.upper() for keyword in ['SELECT', 'INSERT', 'UPDATE', 'DELETE']):
                sql_pattern = r'"(?:sql|query|statement|code)"\s*:\s*"([^"]+)"'
                matches = re.findall(sql_pattern, args_str, re.IGNORECASE)
                sql_queries.extend([match.strip() for match in matches if len(match.strip()) > 10])
        except Exception as parse_error:
            print(f"Warning: Could not parse tool call arguments: {parse_error}")

    return sql_queries


def extract_sql_from_output(tool_call) -> list:
    """Extract SQL queries from tool call output."""
    import re

    sql_queries = []

    try:
        if hasattr(tool_call, 'output') and tool_call.output:
            output_str = str(tool_call.output)

            try:
                output_json = json.loads(output_str)

                if isinstance(output_json, dict):
                    sql_keys = ['sql', 'query', 'sql_query', 'statement', 'command', 'code', 'generated_code']
                    for key in sql_keys:
                        if key in output_json and output_json[key]:
                            sql_query = str(output_json[key]).strip()
                            if sql_query and len(sql_query) > 10:
                                sql_queries.append(sql_query)

                    for key, value in output_json.items():
                        if isinstance(value, dict):
                            for nested_key in sql_keys:
                                if nested_key in value and value[nested_key]:
                                    sql_query = str(value[nested_key]).strip()
                                    if sql_query and len(sql_query) > 10:
                                        sql_queries.append(sql_query)

            except json.JSONDecodeError:
                pass

            if any(keyword in output_str.upper() for keyword in ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM']):
                sql_patterns = [
                    r'"(?:sql|query|statement|code|generated_code)"\s*:\s*"([^"]+)"',
                    r"'(?:sql|query|statement|code|generated_code)'\s*:\s*'([^']+)'",
                    r'(SELECT\s+.*?FROM\s+.*?)(?=\s*[;}"\'\n]|\s*$)',
                    r'(INSERT\s+INTO\s+.*?)(?=\s*[;}"\'\n]|\s*$)',
                    r'(UPDATE\s+.*?SET\s+.*?)(?=\s*[;}"\'\n]|\s*$)',
                    r'(DELETE\s+FROM\s+.*?)(?=\s*[;}"\'\n]|\s*$)'
                ]

                for pattern in sql_patterns:
                    matches = re.findall(pattern, output_str, re.IGNORECASE | re.DOTALL)
                    for match in matches:
                        clean_query = match.strip().replace('\\n', '\n').replace('\\t', '\t')
                        clean_query = re.sub(r'\s+', ' ', clean_query)
                        if len(clean_query) > 10:
                            sql_queries.append(clean_query)

    except Exception as e:
        print(f"Warning: Could not extract SQL from output: {e}")

    return sql_queries


def extract_structured_data_from_output(tool_call) -> list:
    """Extract structured data from tool call output using JSON parsing."""
    data_lines = []

    try:
        if hasattr(tool_call, 'output') and tool_call.output:
            output_str = str(tool_call.output)

            try:
                data = json.loads(output_str)

                if isinstance(data, list) and len(data) > 0:
                    if isinstance(data[0], dict):
                        headers = list(data[0].keys())
                        data_lines.append("| " + " | ".join(headers) + " |")
                        data_lines.append("|" + "---|" * len(headers))

                        for row in data[:10]:
                            values = [str(row.get(h, "")) for h in headers]
                            data_lines.append("| " + " | ".join(values) + " |")

                elif isinstance(data, dict):
                    if 'data' in data and isinstance(data['data'], list):
                        return format_list_data(data['data'])
                    elif 'results' in data and isinstance(data['results'], list):
                        return format_list_data(data['results'])
                    else:
                        data_lines.append("| Key | Value |")
                        data_lines.append("|---|---|")
                        for key, value in data.items():
                            data_lines.append(f"| {key} | {str(value)} |")

            except json.JSONDecodeError:
                data_lines = extract_data_preview(output_str)

    except Exception as e:
        print(f"Warning: Could not extract structured data: {e}")

    return data_lines


def format_list_data(data_list) -> list:
    """Format a list of data records into table format."""
    data_lines = []

    if len(data_list) > 0 and isinstance(data_list[0], dict):
        headers = list(data_list[0].keys())
        data_lines.append("| " + " | ".join(headers) + " |")
        data_lines.append("|" + "---|" * len(headers))

        for row in data_list[:10]:
            values = [str(row.get(h, "")) for h in headers]
            data_lines.append("| " + " | ".join(values) + " |")

    return data_lines


def extract_data_preview(text: str) -> list:
    """Extract data preview from text output."""
    import re

    data_lines = []

    try:
        json_pattern = r'\[[\s\S]*?\]'
        json_matches = re.findall(json_pattern, text)

        for match in json_matches:
            try:
                data = json.loads(match)
                if isinstance(data, list) and len(data) > 0:
                    if isinstance(data[0], dict):
                        headers = list(data[0].keys())
                        data_lines.append("| " + " | ".join(headers) + " |")
                        data_lines.append("|" + "---|" * len(headers))

                        for row in data[:10]:
                            values = [str(row.get(h, "")) for h in headers]
                            data_lines.append("| " + " | ".join(values) + " |")
                    break
            except json.JSONDecodeError:
                continue

        if not data_lines:
            lines = text.split('\n')
            table_lines = []

            for line in lines:
                if line.count('|') >= 2:
                    table_lines.append(line.strip())
                elif table_lines and line.strip() == "":
                    break
                elif table_lines and not line.strip().startswith('|'):
                    break

            if table_lines:
                data_lines = table_lines[:15]

        if not data_lines:
            lines = text.split('\n')
            csv_lines = []

            for line in lines:
                if ',' in line and len(line.split(',')) >= 2:
                    csv_lines.append(line.strip())
                    if len(csv_lines) >= 10:
                        break
                elif csv_lines:
                    break

            if len(csv_lines) > 1:
                data_lines = csv_lines

    except Exception as e:
        print(f"Warning: Could not extract data preview: {e}")

    return data_lines


def extract_markdown_table(text: str) -> str:
    """Extract raw markdown table from text."""
    lines = text.split('\n')
    table_lines = []
    in_table = False
    header_found = False

    for line in lines:
        line_stripped = line.strip()

        if '|' in line_stripped and ('---' in line_stripped or '-' in line_stripped and line_stripped.count('-') > 3):
            table_lines.append(line)
            in_table = True
            header_found = True
        elif '|' in line_stripped and (in_table or not header_found):
            table_lines.append(line)
            in_table = True
        elif in_table and line_stripped == '':
            table_lines.append(line)
        elif in_table and '|' not in line_stripped and line_stripped != '':
            break

    while table_lines and table_lines[-1].strip() == '':
        table_lines.pop()

    if len(table_lines) >= 2:
        return '\n'.join(table_lines)
    else:
        return ""


def extract_data_from_text_response(text_content: str) -> list:
    """Extract structured data from the assistant's text response."""
    import re

    markdown_table = extract_markdown_table(text_content)
    if markdown_table:
        return [markdown_table]

    data_lines = []

    try:
        lines = text_content.split('\n')

        numbered_pattern = r'^\d+\.\s+'
        data_rows = []

        for line in lines:
            line = line.strip()
            if re.match(numbered_pattern, line):
                clean_line = re.sub(numbered_pattern, '', line)
                data_rows.append(clean_line)

        if data_rows and len(data_rows) > 0:
            first_row = data_rows[0]
            if ':' in first_row:
                headers = []
                values_first_row = []

                pairs = first_row.split(', ')
                for pair in pairs:
                    if ':' in pair:
                        key, value = pair.split(':', 1)
                        headers.append(key.strip())
                        values_first_row.append(value.strip())

                if headers:
                    data_lines.append("| " + " | ".join(headers) + " |")
                    data_lines.append("|" + "---|" * len(headers))
                    data_lines.append("| " + " | ".join(values_first_row) + " |")

                    for row in data_rows[1:]:
                        values = []
                        pairs = row.split(', ')
                        for pair in pairs:
                            if ':' in pair:
                                _, value = pair.split(':', 1)
                                values.append(value.strip())

                        if len(values) == len(headers):
                            data_lines.append("| " + " | ".join(values) + " |")

                    return data_lines

            if not data_lines and data_rows:
                return [f"Row {i+1}: {row}" for i, row in enumerate(data_rows)]

        potential_table_lines = []
        for line in lines:
            line = line.strip()
            if line and ('|' in line or line.count(',') >= 2 or line.count(':') >= 2):
                potential_table_lines.append(line)

        if potential_table_lines and not data_lines:
            return potential_table_lines[:10]

    except Exception as e:
        print(f"Warning: Could not extract data from text response: {e}")

    return data_lines


def extract_sql_queries(steps) -> list:
    """Extract SQL queries from run steps when lakehouse data source is used."""
    import re

    sql_queries = []

    try:
        for step in steps.data:
            if hasattr(step, 'step_details') and step.step_details:
                step_details = step.step_details

                if hasattr(step_details, 'tool_calls') and step_details.tool_calls:
                    for tool_call in step_details.tool_calls:
                        if hasattr(tool_call, 'function') and tool_call.function:
                            if hasattr(tool_call.function, 'arguments'):
                                args_str = str(tool_call.function.arguments)
                                sql_queries.extend(find_sql_in_text(args_str))

                        if hasattr(tool_call, 'output') and tool_call.output:
                            output_str = str(tool_call.output)
                            sql_queries.extend(find_sql_in_text(output_str))

                step_str = str(step_details)
                sql_queries.extend(find_sql_in_text(step_str))

    except Exception as e:
        print(f"Warning: Could not extract SQL queries: {e}")

    seen = set()
    unique_queries = []
    for query in sql_queries:
        if query not in seen:
            seen.add(query)
            unique_queries.append(query)

    return unique_queries


def find_sql_in_text(text: str) -> list:
    """Find SQL queries in text using pattern matching."""
    import re

    sql_queries = []

    sql_patterns = [
        r'(SELECT\s+.*?FROM\s+.*?)(?=\s*;|\s*$|\s*\}|\s*\)|\s*,)',
        r'(INSERT\s+INTO\s+.*?)(?=\s*;|\s*$|\s*\}|\s*\))',
        r'(UPDATE\s+.*?SET\s+.*?)(?=\s*;|\s*$|\s*\}|\s*\))',
        r'(DELETE\s+FROM\s+.*?)(?=\s*;|\s*$|\s*\}|\s*\))',
        r'(CREATE\s+TABLE\s+.*?)(?=\s*;|\s*$|\s*\}|\s*\))',
        r'(ALTER\s+TABLE\s+.*?)(?=\s*;|\s*$|\s*\}|\s*\))',
        r'(DROP\s+TABLE\s+.*?)(?=\s*;|\s*$|\s*\}|\s*\))'
    ]

    for pattern in sql_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            clean_query = match.strip().replace('\n', ' ').replace('\t', ' ')
            clean_query = re.sub(r'\s+', ' ', clean_query)
            if len(clean_query) > 10:
                sql_queries.append(clean_query)

    return sql_queries


@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'authenticated': token is not None and token.expires_on > time.time() if token else False
    })

if __name__ == '__main__':
    try:
        port = int(os.getenv('PORT', 5000))
        print(f"Starting Flask server on port {port}...")
        print("Navigate to http://localhost:{port} to use the application.")
        app.run(host='0.0.0.0', port=port, debug=False)

    except Exception as e:
        print(f"Failed to start application: {e}")
        raise
