import asyncio
import json
import os
import sys
import time
from typing import Dict, Any, List, Optional
import httpx
from backend.app.services.ssrf_guard import validate_url_safe

class MCPClientInstance:
    """Manages an active stdio connection to an MCP server process."""
    def __init__(self, server_id: int, command: str, args: List[str], env: Dict[str, str]):
        self.server_id = server_id
        self.command = command
        self.args = args or []
        self.env = env or {}
        self.proc: Optional[asyncio.subprocess.Process] = None
        self._lock = asyncio.Lock()
        self._req_id = 1
        self.server_info: Dict[str, Any] = {}
        self.capabilities: Dict[str, Any] = {}

    async def start(self) -> Dict[str, Any]:
        """Spawn the process and send initialize handshake."""
        full_env = os.environ.copy()
        full_env.update(self.env)
        
        # Ensure python path / unbuffered IO
        full_env["PYTHONUNBUFFERED"] = "1"
        
        cmd = self.command
        # If running python3 and target is relative, resolve
        resolved_args = []
        for arg in self.args:
            resolved_args.append(arg)
            
        self.proc = await asyncio.create_subprocess_exec(
            cmd,
            *resolved_args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=full_env
        )

        # Send initialize
        init_res = await self._send_request("initialize", {
            "protocolVersion": "2024-11-05",
            "clientInfo": {
                "name": "OpenSense-Labs-MCP-Hub",
                "version": "1.0.0"
            },
            "capabilities": {
                "tools": {},
                "resources": {},
                "prompts": {}
            }
        })

        self.server_info = init_res.get("serverInfo", {})
        self.capabilities = init_res.get("capabilities", {})

        # Send initialized notification
        await self._send_notification("notifications/initialized", {})
        return init_res

    async def _send_request(self, method: str, params: Dict[str, Any], timeout: float = 12.0) -> Dict[str, Any]:
        async with self._lock:
            if not self.proc or self.proc.returncode is not None:
                raise RuntimeError(f"MCP server process #{self.server_id} is not running.")

            current_id = self._req_id
            self._req_id += 1

            payload = {
                "jsonrpc": "2.0",
                "id": current_id,
                "method": method,
                "params": params
            }

            data = (json.dumps(payload) + "\n").encode()
            self.proc.stdin.write(data)
            await self.proc.stdin.drain()

            try:
                line_bytes = await asyncio.wait_for(self.proc.stdout.readline(), timeout=timeout)
                if not line_bytes:
                    err_out = ""
                    if self.proc.stderr:
                        try:
                            err_out = (await asyncio.wait_for(self.proc.stderr.read(1024), timeout=1.0)).decode()
                        except Exception:
                            pass
                    raise RuntimeError(f"Server closed connection unexpectedly. Stderr: {err_out}")

                response = json.loads(line_bytes.decode().strip())
                if "error" in response:
                    raise RuntimeError(f"MCP Error: {response['error'].get('message', 'Unknown error')}")

                return response.get("result", {})
            except asyncio.TimeoutError:
                raise TimeoutError(f"MCP server request '{method}' timed out after {timeout}s.")

    async def _send_notification(self, method: str, params: Dict[str, Any]):
        if not self.proc or self.proc.returncode is not None:
            return
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        }
        data = (json.dumps(payload) + "\n").encode()
        self.proc.stdin.write(data)
        await self.proc.stdin.drain()

    async def list_tools(self) -> List[Dict[str, Any]]:
        res = await self._send_request("tools/list", {})
        return res.get("tools", [])

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        return await self._send_request("tools/call", {
            "name": name,
            "arguments": arguments
        }, timeout=25.0)

    async def list_resources(self) -> List[Dict[str, Any]]:
        res = await self._send_request("resources/list", {})
        return res.get("resources", [])

    async def read_resource(self, uri: str) -> Dict[str, Any]:
        return await self._send_request("resources/read", {"uri": uri})

    async def list_prompts(self) -> List[Dict[str, Any]]:
        res = await self._send_request("prompts/list", {})
        return res.get("prompts", [])

    async def get_prompt(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        return await self._send_request("prompts/get", {"name": name, "arguments": arguments})

    async def stop(self):
        async with self._lock:
            if self.proc and self.proc.returncode is None:
                try:
                    self.proc.terminate()
                    await asyncio.wait_for(self.proc.wait(), timeout=3.0)
                except Exception:
                    try:
                        self.proc.kill()
                    except Exception:
                        pass
            self.proc = None


class MCPServiceManager:
    """Singleton service to manage all active MCP server client instances."""
    def __init__(self):
        self._instances: Dict[int, MCPClientInstance] = {}

    async def connect_server(self, server_id: int, command: str, args: List[str], env: Dict[str, str], transport_type: str = "stdio", endpoint_url: Optional[str] = None) -> Dict[str, Any]:
        # Disconnect existing if any
        await self.disconnect_server(server_id)

        if transport_type == "http_sse":
            if not endpoint_url:
                raise ValueError("Endpoint URL is required for http_sse transport.")
            safe, reason = validate_url_safe(endpoint_url, allow_local_dev=True)
            if not safe:
                raise ValueError(f"SSRF Safety block: {reason}")
            
            # Simple ping test
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(endpoint_url)
                return {"status": "connected", "endpoint": endpoint_url, "http_code": resp.status_code}

        # stdio transport
        instance = MCPClientInstance(server_id, command, args, env)
        init_res = await instance.start()
        self._instances[server_id] = instance
        return init_res

    async def disconnect_server(self, server_id: int):
        if server_id in self._instances:
            inst = self._instances.pop(server_id)
            await inst.stop()

    def get_instance(self, server_id: int) -> Optional[MCPClientInstance]:
        return self._instances.get(server_id)

    def is_connected(self, server_id: int) -> bool:
        inst = self._instances.get(server_id)
        return inst is not None and inst.proc is not None and inst.proc.returncode is None

    async def list_tools_for_server(self, server_id: int) -> List[Dict[str, Any]]:
        inst = self._instances.get(server_id)
        if not inst:
            raise RuntimeError(f"Server #{server_id} is disconnected. Please connect it first.")
        return await inst.list_tools()

    async def execute_tool(self, server_id: int, tool_name: str, arguments: Dict[str, Any]) -> tuple[Any, float]:
        inst = self._instances.get(server_id)
        if not inst:
            raise RuntimeError(f"Server #{server_id} is disconnected.")
        start_t = time.perf_counter()
        result = await inst.call_tool(tool_name, arguments)
        duration_ms = (time.perf_counter() - start_t) * 1000.0
        return result, round(duration_ms, 2)

    async def list_resources_for_server(self, server_id: int) -> List[Dict[str, Any]]:
        inst = self._instances.get(server_id)
        if not inst:
            return []
        return await inst.list_resources()

    async def read_resource_for_server(self, server_id: int, uri: str) -> Dict[str, Any]:
        inst = self._instances.get(server_id)
        if not inst:
            raise RuntimeError(f"Server #{server_id} is disconnected.")
        return await inst.read_resource(uri)

    async def list_prompts_for_server(self, server_id: int) -> List[Dict[str, Any]]:
        inst = self._instances.get(server_id)
        if not inst:
            return []
        return await inst.list_prompts()

    async def get_prompt_for_server(self, server_id: int, prompt_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        inst = self._instances.get(server_id)
        if not inst:
            raise RuntimeError(f"Server #{server_id} is disconnected.")
        return await inst.get_prompt(prompt_name, arguments)

mcp_manager = MCPServiceManager()
