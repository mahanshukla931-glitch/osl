# OpenSense Labs MCP Hub

An enterprise-grade, production-ready Model Context Protocol (MCP 2.4) integration and autonomous AI management platform, designed exclusively for **OpenSense Labs**.

---

## 🚀 Key Highlights & OpenSense Labs Exclusive Security

- **Restricted Access Policy:** Registration and sign-in are strictly restricted to verified `@opensenselabs.com` corporate accounts. Outsider domains are rejected with `403 Forbidden`.
- **Official Model Context Protocol (MCP 2.4):** Manages `stdio` subprocesses and Streamable HTTP endpoints.
- **Built-in OpenSense Ops MCP Server:** Pre-seeded with 4 tools (`opensense_system_diagnostics`, `opensense_office_time`, `opensense_text_analyzer`, `opensense_json_transformer`), 2 live resources, and 2 prompt templates.
- **Autonomous AI Chat:** Multi-session AI agent with context-aware tool calling. Autonomously selects, prepares arguments for, and executes connected MCP tools with human-in-the-loop approval controls.
- **AES-Fernet Secret Encryption:** External AI provider keys (OpenAI, Anthropic, Groq, Ollama) and custom API credentials are encrypted at rest using server-side AES-128-CBC/Fernet keys and masked in the UI.
- **SSRF Defense:** Prevents Server-Side Request Forgery by disallowing private subnet routing (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, and cloud metadata `169.254.169.254`).
- **Real-Time Audit Trail:** Persistent SQLite / SQLAlchemy database logging all tool runs, logins, timings, and configuration events.

---

## 🛠 Tech Stack

- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React
- **Backend:** Python 3.10+, FastAPI, Async SQLAlchemy, SQLite (`aiosqlite`)
- **Protocol:** Model Context Protocol (MCP) JSON-RPC 2.0 stdio & HTTP/SSE
- **Security:** JWT authentication, passlib bcrypt, cryptography (Fernet), SSRF guard
- **Containerization:** Docker & Docker Compose

---

## 🔑 Default Seed Credentials

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `admin@opensenselabs.com` | `OpenSense@2026!` |
| **Software Engineer** | `developer@opensenselabs.com` | `OpenSense@2026!` |

> *Note: You can also register any new account ending in `@opensenselabs.com` directly from the onboarding page.*

---

## 🏃 Quick Start (Local Run)

### 1. Start Services
Make the startup script executable and run:
```bash
chmod +x start.sh
./start.sh
```

This launches:
- **FastAPI Backend:** [http://localhost:8000](http://localhost:8000) (Interactive Swagger Docs at [http://localhost:8000/docs](http://localhost:8000/docs))
- **Next.js Dashboard:** [http://localhost:3000](http://localhost:3000)

---

## 🐳 Docker Support

To run the full stack via Docker Compose:
```bash
docker-compose up --build
```

---

## 📱 Core Pages & Functionality

1. **Dashboard (`/`):** Real-time metrics on active MCP servers, discovered tools, custom APIs, success rate, and 7-day invocation chart.
2. **MCP Servers (`/servers`):** Start, restart, disconnect, test, and add stdio subprocesses or Streamable HTTP servers.
3. **Tools Explorer (`/tools`):** Discover all tools dynamically with schema-driven input forms, risk confirmation, and JSON execution outputs.
4. **MCP Resources (`/resources`):** Browse live guidelines, telemetry, and documents exposed by MCP servers.
5. **MCP Prompts (`/prompts`):** Fill arguments and render PR code review or incident postmortem templates.
6. **AI Chat Hub (`/chat`):** Chat with autonomous agent that executes connected MCP tools in real-time.
7. **Custom APIs (`/custom-apis`):** Register REST APIs with SSRF protection and expose them as callable MCP tools.
8. **Audit Trail (`/logs`):** Search and filter all tool calls, status codes, and execution timings.
9. **Settings (`/settings`):** Configure encrypted AI model providers (OpenAI, Anthropic, Groq, Ollama) and safely export/import non-secret JSON topology.
10. **Admin Panel (`/admin`):** Super admin controls for OpenSense team member roles and accounts.
