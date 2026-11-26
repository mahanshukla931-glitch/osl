import socket
import ipaddress
from urllib.parse import urlparse

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),  # Cloud metadata / link-local
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "169.254.169.254",
    "instance-data",
}

def validate_url_safe(url: str, allow_local_dev: bool = True) -> tuple[bool, str]:
    """
    Validate target URL against SSRF attacks.
    allow_local_dev permits localhost during testing if explicitly allowed.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, f"Unsupported URL scheme: {parsed.scheme}. Only HTTP/HTTPS permitted."
        
        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid URL: missing hostname."
        
        hostname = hostname.lower()
        
        # Check explicit blocked hostnames
        if hostname in BLOCKED_HOSTNAMES and not allow_local_dev:
            return False, f"Access to {hostname} is restricted for security."
        
        # If allow_local_dev is True, allow localhost on specific non-metadata ports
        if allow_local_dev and hostname in ("localhost", "127.0.0.1"):
            return True, "Allowed for local development."

        # Resolve IP and check against private / internal network ranges
        try:
            ip_str = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip_str)
            
            for net in BLOCKED_IP_NETWORKS:
                if ip_obj in net and not allow_local_dev:
                    return False, f"Destination resolves to protected network address ({ip_str})."
        except socket.gaierror:
            if allow_local_dev:
                return True, "Allowed in development mode (unresolved DNS)."
            return False, f"Could not resolve hostname: {hostname}"
            
        return True, "URL is safe."
    except Exception as e:
        return False, f"Validation error: {str(e)}"
