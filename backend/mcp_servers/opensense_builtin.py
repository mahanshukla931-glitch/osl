#!/usr/bin/env python3
"""
OpenSense Labs Built-in Model Context Protocol (MCP) Server.
Standard stdio JSON-RPC 2.0 transport implementation.
Provides tools, resources, and prompt templates for OpenSense Labs team members.
"""
import sys
import json
import os
import platform
import datetime

SERVER_NAME = "OpenSense Labs Ops MCP"
SERVER_VERSION = "2.4.0"

# Tools Registry
TOOLS = [
    {
        "name": "opensense_system_diagnostics",
        "description": "Inspect host telemetry, Python environment, memory estimates, and OS runtime info.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "verbose": {"type": "boolean", "description": "Include environment variable keys and path details"}
            }
        }
    },
    {
        "name": "opensense_office_time",
        "description": "Get current wall-clock time and timezone offsets across OpenSense Labs headquarters and remote hubs.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "region": {
                    "type": "string",
                    "description": "Specific region: 'all', 'india_hq', 'us_east', 'uk_london'",
                    "enum": ["all", "india_hq", "us_east", "uk_london"]
                }
            }
        }
    },
    {
        "name": "opensense_text_analyzer",
        "description": "Analyze text content for sentiment polarity, keyword density, word count, and reading time.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to analyze"}
            },
            "required": ["text"]
        }
    },
    {
        "name": "opensense_json_transformer",
        "description": "Validate, format, flatten or extract keys from structured JSON data.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "raw_json": {"type": "string", "description": "Raw JSON string"},
                "action": {
                    "type": "string",
                    "enum": ["pretty_print", "keys_list", "validate_only"],
                    "description": "Action to perform on the JSON"
                }
            },
            "required": ["raw_json"]
        }
    },
    {
        "name": "opensense_contact_directory",
        "description": "Search or retrieve OpenSense Labs team member contact details, phone numbers, and departments.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query by name, department, or role"}
            }
        }
    },
    {
        "name": "opensense_make_phone_call",
        "description": "Initiate an interactive live phone call or dialer connection to an OpenSense team contact or phone number.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "contact_name": {"type": "string", "description": "Name of the person or department to call"},
                "phone": {"type": "string", "description": "Phone number with country code"},
                "department": {"type": "string", "description": "Department or role of the contact"}
            },
            "required": ["contact_name", "phone"]
        }
    }
]

# Resources Registry
RESOURCES = [
    {
        "uri": "opensense://handbook/engineering_standards",
        "name": "OpenSense Labs Engineering Standards",
        "mimeType": "text/markdown",
        "description": "Architecture, code review, and MCP protocol integration guidelines."
    },
    {
        "uri": "opensense://telemetry/node_status",
        "name": "Platform Node Telemetry",
        "mimeType": "application/json",
        "description": "Real-time telemetry and service boundary parameters."
    }
]

# Prompts Registry
PROMPTS = [
    {
        "name": "opensense_code_review",
        "description": "Generate an OpenSense Labs structured Pull Request review with security, performance, and style checks.",
        "arguments": [
            {"name": "code_diff", "description": "Code snippet or git diff to review", "required": True},
            {"name": "language", "description": "Programming language (e.g. Python, TypeScript)", "required": False}
        ]
    },
    {
        "name": "opensense_incident_report",
        "description": "Create a standardized DevOps incident postmortem document.",
        "arguments": [
            {"name": "service_name", "description": "Affected service or MCP node", "required": True},
            {"name": "impact_summary", "description": "Brief description of customer or team impact", "required": True}
        ]
    }
]


def execute_tool(name: str, arguments: dict) -> dict:
    if name == "opensense_system_diagnostics":
        verbose = arguments.get("verbose", False)
        return {
            "platform": platform.platform(),
            "python_version": sys.version.split()[0],
            "hostname": platform.node(),
            "architecture": platform.machine(),
            "server_timestamp_utc": datetime.datetime.utcnow().isoformat() + "Z",
            "active_mcp_protocol": "2024-11-05",
            "os_environment_keys": list(os.environ.keys()) if verbose else len(os.environ),
            "status": "HEALTHY",
            "organization": "OpenSense Labs"
        }
    
    elif name == "opensense_office_time":
        now_utc = datetime.datetime.utcnow()
        india_time = now_utc + datetime.timedelta(hours=5, minutes=30)
        us_time = now_utc - datetime.timedelta(hours=5)
        uk_time = now_utc
        
        region = arguments.get("region", "all")
        result = {}
        if region in ("all", "india_hq"):
            result["OpenSense_India_HQ_IST"] = india_time.strftime("%Y-%m-%d %H:%M:%S (UTC+5:30)")
        if region in ("all", "us_east"):
            result["OpenSense_US_East_EST"] = us_time.strftime("%Y-%m-%d %H:%M:%S (UTC-5:00)")
        if region in ("all", "uk_london"):
            result["OpenSense_UK_GMT"] = uk_time.strftime("%Y-%m-%d %H:%M:%S (UTC+0:00)")
        return result
    
    elif name == "opensense_text_analyzer":
        text = arguments.get("text", "")
        words = text.split()
        word_count = len(words)
        char_count = len(text)
        reading_time_sec = round((word_count / 200) * 60, 1)
        
        # Simple sentiment heuristic
        positive_words = {"great", "good", "excellent", "fast", "secure", "success", "innovative", "reliable", "bright"}
        negative_words = {"bad", "slow", "error", "failed", "bug", "issue", "risk", "critical", "crash"}
        
        lower_words = [w.lower().strip(".,!?;:") for w in words]
        pos_count = sum(1 for w in lower_words if w in positive_words)
        neg_count = sum(1 for w in lower_words if w in negative_words)
        
        sentiment = "Neutral"
        if pos_count > neg_count:
            sentiment = "Positive"
        elif neg_count > pos_count:
            sentiment = "Needs Attention / Negative"
            
        return {
            "word_count": word_count,
            "character_count": char_count,
            "estimated_reading_time_seconds": reading_time_sec,
            "sentiment": sentiment,
            "positive_keywords_found": pos_count,
            "critical_keywords_found": neg_count
        }

    elif name == "opensense_json_transformer":
        raw = arguments.get("raw_json", "{}")
        action = arguments.get("action", "pretty_print")
        try:
            parsed = json.loads(raw)
            if action == "validate_only":
                return {"valid": True, "type": type(parsed).__name__}
            elif action == "keys_list":
                if isinstance(parsed, dict):
                    return {"valid": True, "top_level_keys": list(parsed.keys()), "count": len(parsed)}
                return {"valid": True, "is_list_length": len(parsed)}
            else:
                return {"valid": True, "formatted": json.dumps(parsed, indent=2)}
        except Exception as e:
            return {"valid": False, "error": str(e)}

    elif name == "opensense_contact_directory":
        telecom_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "telecom_config.json"))
        directory = []
        enabled = True
        try:
            if os.path.exists(telecom_file):
                with open(telecom_file, "r", encoding="utf-8") as tf:
                    tdata = json.load(tf)
                    enabled = tdata.get("enabled", True)
                    directory = tdata.get("contacts", [])
        except Exception:
            pass

        if not enabled:
            return {
                "status": "disabled_by_admin",
                "enabled": False,
                "message": "⚠️ OpenSense Calling Setup is currently turned OFF by Admin. Admin needs to enable calling in Settings.",
                "contacts": []
            }

        q = arguments.get("query", "").lower().strip()
        if q:
            matches = [c for c in directory if q in c.get("name", "").lower() or q in c.get("department", "").lower() or q in c.get("role", "").lower()]
            return {"total_matches": len(matches), "contacts": matches, "admin_setup_enabled": True}
        return {"total_contacts": len(directory), "contacts": directory, "admin_setup_enabled": True}

    elif name == "opensense_make_phone_call":
        telecom_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "telecom_config.json"))
        enabled = True
        try:
            if os.path.exists(telecom_file):
                with open(telecom_file, "r", encoding="utf-8") as tf:
                    tdata = json.load(tf)
                    enabled = tdata.get("enabled", True)
        except Exception:
            pass

        if not enabled:
            return {
                "call_id": "error",
                "status": "blocked",
                "enabled": False,
                "message": "⚠️ Admin has not enabled OpenSense Calling Setup. Team members cannot make calls until Admin enables it in Settings."
            }

        contact_name = arguments.get("contact_name", "OpenSense Contact")
        phone = arguments.get("phone", "")
        department = arguments.get("department", "OpenSense Labs")
        call_id = f"call_{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        clean_phone = phone.replace(" ", "").replace("-", "")
        tel_uri = f"tel:{clean_phone}"

        return {
            "call_id": call_id,
            "status": "ringing",
            "contact_name": contact_name,
            "phone": phone,
            "tel_uri": tel_uri,
            "department": department,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "message": f"Connecting phone call to {contact_name} ({phone})..."
        }
            
    raise ValueError(f"Unknown tool name: {name}")


def read_resource(uri: str) -> dict:
    if uri == "opensense://handbook/engineering_standards":
        return {
            "uri": uri,
            "mimeType": "text/markdown",
            "text": """# OpenSense Labs Engineering & MCP Protocol Standards
- **Mission:** High-performance, secure, and production-ready enterprise AI platforms.
- **MCP Integration:** Always validate inputs against JSON Schema, encrypt keys, and enforce human approval on state changes.
- **Access Policy:** Only verified team members with @opensenselabs.com email addresses are granted access."""
        }
    elif uri == "opensense://telemetry/node_status":
        return {
            "uri": uri,
            "mimeType": "application/json",
            "text": json.dumps({
                "node_status": "ONLINE",
                "uptime_hours": 142.5,
                "organization": "OpenSense Labs",
                "active_integrations": 14
            })
        }
    raise ValueError(f"Resource not found: {uri}")


def main():
    """Main stdio loop for JSON-RPC 2.0 communication."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id")
            method = req.get("method")
            params = req.get("params", {})
            
            # Handle methods
            if method == "initialize":
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "serverInfo": {
                            "name": SERVER_NAME,
                            "version": SERVER_VERSION
                        },
                        "capabilities": {
                            "tools": {"listChanged": False},
                            "resources": {"subscribe": False, "listChanged": False},
                            "prompts": {"listChanged": False}
                        }
                    }
                }
            elif method == "notifications/initialized":
                continue  # Notification, no response required
                
            elif method == "tools/list":
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "tools": TOOLS
                    }
                }
                
            elif method == "tools/call":
                tool_name = params.get("name")
                tool_args = params.get("arguments", {})
                try:
                    tool_output = execute_tool(tool_name, tool_args)
                    resp = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": json.dumps(tool_output, indent=2)
                                }
                            ],
                            "isError": False
                        }
                    }
                except Exception as ex:
                    resp = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [{"type": "text", "text": f"Execution error: {str(ex)}"}],
                            "isError": True
                        }
                    }
                    
            elif method == "resources/list":
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "resources": RESOURCES
                    }
                }
                
            elif method == "resources/read":
                res_uri = params.get("uri")
                try:
                    res_data = read_resource(res_uri)
                    resp = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "contents": [res_data]
                        }
                    }
                except Exception as ex:
                    resp = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {"code": -32602, "message": str(ex)}
                    }
                    
            elif method == "prompts/list":
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "prompts": PROMPTS
                    }
                }
                
            elif method == "prompts/get":
                prompt_name = params.get("name")
                prompt_args = params.get("arguments", {})
                found = next((p for p in PROMPTS if p["name"] == prompt_name), None)
                if found:
                    resp = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "description": found.get("description"),
                            "messages": [
                                {
                                    "role": "user",
                                    "content": {
                                        "type": "text",
                                        "text": f"Template: {prompt_name}\nArguments: {json.dumps(prompt_args, indent=2)}"
                                    }
                                }
                            ]
                        }
                    }
                else:
                    resp = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {"code": -32602, "message": f"Prompt not found: {prompt_name}"}
                    }
            elif method == "ping":
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {}}
            else:
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"Method not found: {method}"}
                }
                
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
        except Exception as e:
            err_resp = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"Parse error: {str(e)}"}
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
