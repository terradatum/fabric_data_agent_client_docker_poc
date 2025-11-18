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
from azure.identity import DeviceCodeCredential
from openai import OpenAI
import secrets
import warnings
import requests

# Suppress OpenAI deprecation warnings
warnings.filterwarnings("ignore", category=DeprecationWarning, message=r".*Assistants API is deprecated.*")

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

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

@app.route('/ask', methods=['POST'])
def ask_question():
    """Handle question submission and return agent response."""
    global token

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
