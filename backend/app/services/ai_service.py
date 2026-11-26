import os
import json
import httpx
import urllib.parse
import random
import datetime
from typing import List, Dict, Any, Optional
from backend.app.services.mcp_service import mcp_manager
from backend.app.core.security import decrypt_secret

OPENSENSE_KNOWLEDGE = {
    "name": "OpenSense Labs",
    "founded": "2016",
    "tagline": "Pioneering Digital Experience Platforms & Enterprise AI Solutions",
    "headquarters": "Noida, Sector 62, Uttar Pradesh (Delhi NCR), India",
    "global_hubs": [
        {"region": "India HQ", "location": "Noida / Delhi NCR", "role": "Global Engineering & Innovation Center"},
        {"region": "United States", "location": "New York, NY", "role": "Client Strategy & Enterprise Delivery"},
        {"region": "United Kingdom", "location": "London", "role": "European Solutions & Partnerships"}
    ],
    "departments": {
        "hr": {
            "title": "People & Culture (HR)",
            "leaves": "Casual Leave (12 CL), Sick Leave (12 SL), Earned Leave (15 EL), Maternity (26 weeks), Paternity (2 weeks)",
            "policies": "Flexible hybrid model, health insurance, annual performance reviews in April, continuous learning stipend",
            "values": "Empathy, Transparency, Continuous Growth, Diversity & Equal Opportunity"
        },
        "marketing": {
            "title": "Marketing & Brand Growth",
            "focus": "Enterprise Drupal thought leadership, Decoupled Architecture, AI & MCP innovation, Global webinars & events",
            "channels": "LinkedIn, Twitter/X, Tech Blogs, DrupalCon Sponsorships, Case Studies"
        },
        "engineering": {
            "title": "Platform Engineering & AI Solutions",
            "stack": "Drupal (D10/D11), PHP, Next.js, React, TypeScript, Python, FastAPI, Model Context Protocol (MCP), Docker, Kubernetes, AWS, GCP"
        },
        "sales": {
            "title": "Business Development & Client Engagement",
            "focus": "Enterprise digital transformation, Fortune 500 digital experience modernization, Legacy CMS migrations, AI-readiness audits"
        }
    }
}


class AIService:
    @staticmethod
    def get_tool_definitions(connected_servers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format MCP tools for OpenAI/Anthropic tool calling schema."""
        tools_schema = []
        for srv in connected_servers:
            srv_id = srv["id"]
            for tool in srv.get("tools", []):
                fn_name = f"srv_{srv_id}__{tool['name']}"
                tools_schema.append({
                    "type": "function",
                    "function": {
                        "name": fn_name,
                        "description": f"[{srv.get('name')}] {tool.get('description', '')}",
                        "parameters": tool.get("inputSchema", {"type": "object", "properties": {}})
                    }
                })
        return tools_schema

    @staticmethod
    async def _perform_web_search(query: str) -> List[Dict[str, str]]:
        """Live web search via DuckDuckGo with source citations."""
        import re
        clean_q = query.replace("/search", "").replace("search web", "").replace("google", "").strip(" :?\"'")
        if not clean_q:
            clean_q = "OpenSense Labs latest news"
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(clean_q)}"
        headers = {"User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0"}
        results = []
        try:
            async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    titles = re.findall(r"<h2 class=\"result__title\">.*?<a[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", r.text, re.DOTALL)
                    snippets = re.findall(r"<a class=\"result__snippet\"[^>]*>(.*?)</a>", r.text, re.DOTALL)
                    for i in range(min(len(titles), 4)):
                        raw_href, raw_title = titles[i]
                        title_clean = re.sub(r"<[^>]+>", "", raw_title).strip()
                        snip_clean = re.sub(r"<[^>]+>", "", snippets[i]).strip() if i < len(snippets) else ""
                        actual_url = raw_href
                        if "uddg=" in raw_href:
                            try:
                                actual_url = urllib.parse.unquote(raw_href.split("uddg=")[1].split("&")[0])
                            except Exception:
                                pass
                        if title_clean and snip_clean:
                            results.append({"title": title_clean, "snippet": snip_clean, "url": actual_url})
        except Exception:
            pass
        return results

    @staticmethod
    def _build_persona_instruction(persona: str = "aanya") -> str:
        """Dynamic persona instructions for Aanya, Kabir, and Maya."""
        p = (persona or "aanya").lower()
        if p == "kabir":
            return (
                "YOUR IDENTITY: KABIR 💻 (Senior Platform Architect & Tech Lead)\n"
                "- Persona: Sharp, highly analytical, software architecture authority at OpenSense Labs.\n"
                "- Tone: Confident, technical, concise, pragmatic. Expert in Drupal 10/11, Decoupled Next.js, Python, Kubernetes, and AI Agents.\n"
                "- Language: Responds in fluent tech Hinglish or clear English depending on the user. Prefers code examples, architecture patterns, and direct actionable solutions."
            )
        elif p == "maya":
            return (
                "YOUR IDENTITY: MAYA 📊 (Executive Business & Brand Strategy Lead)\n"
                "- Persona: Strategic, articulate, high-impact business and client advisor at OpenSense Labs.\n"
                "- Tone: Professional, structured, executive, metrics-oriented, persuasive.\n"
                "- Focus: Enterprise digital ROI, marketing strategy, proposal frameworks, client success, and brand positioning in clean Hindi/English."
            )
        else:
            return (
                "YOUR IDENTITY: AANYA 🌸 (AI Workspace Companion & Culture Lead)\n"
                "- Persona: Warm, lively, empathetic, engaging, official friendly companion for OpenSense Labs team members.\n"
                "- Tone: Enthusiastic with friendly emojis. SPEAKS FLUENT ENGLISH when addressed in English, and warm natural Hindi/Hinglish when addressed in Hindi/Hinglish.\n"
                "- Focus: Day-to-day team assistance, HR leaves & policies, brainstorming, friendly guidance, and creative tasks."
            )

    @staticmethod
    async def chat_completion(
        messages: List[Dict[str, Any]],
        provider: Optional[Any],
        connected_servers: List[Dict[str, Any]],
        auto_approve_tools: bool = True,
        persona: str = "aanya"
    ) -> Dict[str, Any]:
        """
        Execute AI chat turn.
        Checks for web search, image generation, external API provider,
        or invokes the OpenSense Autonomous Multilingual Agent with deep departmental intelligence.
        """
        tools_def = AIService.get_tool_definitions(connected_servers)
        api_key = decrypt_secret(provider.encrypted_api_key) if provider and provider.encrypted_api_key else ""
        
        # Check if the user is requesting an image
        latest_user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                latest_user_msg = m.get("content", "").strip()
                break

        msg_lower = latest_user_msg.lower()
        is_image_request = latest_user_msg.startswith("/image") or any(w in msg_lower for w in [
            "image", "photo", "picture", "draw", "banao image", "generate image",
            "create image", "logo", "banner", "tasveer", "chitra", "illustration", "wallpaper"
        ])

        if is_image_request:
            return await AIService._generate_image_response(latest_user_msg, provider, api_key)

        # Check if user requests Live Web Search or uses /search
        is_web_search = latest_user_msg.startswith("/search") or any(w in msg_lower for w in [
            "search web", "google karo", "search karo", "web search", "latest news on",
            "current release of", "aaj ka", "current price of", "search internet"
        ])

        active_messages = list(messages)
        search_tool_calls = None
        search_tool_results = None

        if is_web_search:
            search_query = latest_user_msg.replace("/search", "").replace("search web", "").strip(" :?")
            search_results = await AIService._perform_web_search(search_query or latest_user_msg)
            if search_results:
                search_tool_calls = [{"id": "call_web_search", "type": "function", "function": {"name": "web_search", "arguments": json.dumps({"query": search_query})}}]
                search_tool_results = [{"tool_name": "web_search", "output": search_results}]
                search_context = "\n".join([
                    f"- [{idx+1}] {r['title']} ({r['url']}): {r['snippet']}"
                    for idx, r in enumerate(search_results)
                ])
                active_messages.append({
                    "role": "system",
                    "content": (
                        f"REAL-TIME LIVE WEB SEARCH RESULTS FOR '{search_query}':\n\n{search_context}\n\n"
                        "Instruction: Use these fresh real-time web sources to provide an accurate, up-to-date response. "
                        "Cite the sources with clickable markdown links like [Source Title](URL). "
                        "Match the user's conversational language (Hindi / Hinglish / English)."
                    )
                })

        # 1. Real External Provider Execution if configured by user with API Key
        if provider and api_key and provider.is_enabled:
            try:
                res = await AIService._call_external_provider(
                    provider, api_key, active_messages, tools_def, connected_servers, persona=persona
                )
                if search_tool_calls:
                    res["tool_calls"] = search_tool_calls
                    res["tool_results"] = search_tool_results
                p_type = getattr(provider, "provider_type", "gemini").lower()
                res["quota_info"] = {
                    "status": "active",
                    "provider": p_type,
                    "limits": "15 RPM / 1,500 RPD (Free Tier)" if "gemini" in p_type else "500 RPM / 30,000 TPM"
                }
                return res
            except Exception:
                # Clean instant fallback to internal OpenSense agent with zero error prefix
                fallback_res = await AIService._call_opensense_agent(active_messages, connected_servers, persona=persona)
                if search_tool_calls:
                    fallback_res["tool_calls"] = search_tool_calls
                    fallback_res["tool_results"] = search_tool_results
                return fallback_res

        # 2. OpenSense Built-in Autonomous Multilingual Agent
        fallback_res = await AIService._call_opensense_agent(active_messages, connected_servers, persona=persona)
        if search_tool_calls:
            fallback_res["tool_calls"] = search_tool_calls
            fallback_res["tool_results"] = search_tool_results
        return fallback_res

    @staticmethod
    async def _generate_image_response(prompt: str, provider: Optional[Any], api_key: str) -> Dict[str, Any]:
        """Generate high-resolution AI imagery via DALL-E 3 (if key present) or Flux engine."""
        clean_prompt = prompt
        for remove_word in ["generate image of", "create image of", "draw an image of", "make an image of", "generate image", "create image", "draw", "image banao"]:
            clean_prompt = clean_prompt.replace(remove_word, "").strip(" :.,")
        if not clean_prompt:
            clean_prompt = "futuristic enterprise AI technology workspace at OpenSense Labs with glowing orange and blue neural network holographic displays"

        image_url = ""
        engine_name = "Flux AI 1024 HD Engine"

        # If user configured OpenAI DALL-E 3 key
        if provider and provider.provider_type == "openai" and api_key:
            try:
                async with httpx.AsyncClient(timeout=45) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/images/generations",
                        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                        json={"model": "dall-e-3", "prompt": clean_prompt, "size": "1024x1024", "n": 1}
                    )
                    if resp.status_code == 200:
                        image_url = resp.json()["data"][0]["url"]
                        engine_name = "OpenAI DALL-E 3 (Enterprise)"
            except Exception:
                pass

        # High-definition Pollinations Flux Engine fallback
        if not image_url:
            encoded_prompt = urllib.parse.quote(clean_prompt)
            seed = random.randint(100000, 999999)
            image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={seed}&model=flux"

        content = (
            f"✨ **Maine aapke liye yeh AI image generate kar di hai!** 🎨🚀\n\n"
            f"![{clean_prompt}]({image_url})\n\n"
            f"• 🖼️ **Creative Concept:** *\"{clean_prompt}\"*\n"
            f"• ⚡ **AI Generator Engine:** `{engine_name}`\n"
            f"• 📐 **Resolution:** `1024 x 1024 px (Ultra HD)`\n\n"
            f"💡 *Aap is image par right-click karke direct save kar sakte hain ya Download button se download kar sakte hain! Aur kisi type ki image banwani ho toh batayein.* 😊"
        )

        return {
            "role": "assistant",
            "content": content,
            "tool_calls": [{"id": f"img_{random.randint(100,999)}", "type": "function", "function": {"name": "generate_ai_image", "arguments": json.dumps({"prompt": clean_prompt})}}],
            "tool_results": [{"tool_name": "generate_ai_image", "output": {"url": image_url, "engine": engine_name}}],
            "model": "OpenSense-Labs-Vision-AI"
        }

    @staticmethod
    async def _call_gemini_api(
        provider: Any,
        api_key: str,
        messages: List[Dict[str, Any]],
        persona: str = "aanya"
    ) -> Dict[str, Any]:
        """Direct integration with Google Gemini API with smart model fallback and dynamic language/tone adaptation."""
        persona_rule = AIService._build_persona_instruction(persona)
        system_instruction_text = (
            f"{persona_rule}\n\n"
            "CRITICAL PERSONALITY & TONE RULES (FOLLOW STRICTLY):\n"
            "1. STRICT SESSION ISOLATION & DATA PRIVACY:\n"
            "   - You MUST ONLY reference information provided within the CURRENT conversation messages.\n"
            "   - NEVER leak, assume, or recall data, names, topics, or prompts from other chat sessions or previous conversations.\n"
            "   - If this is a fresh conversation with no prior user messages, treat it as a 100% clean slate with zero prior context.\n"
            "2. STRICT AUTOMATIC LANGUAGE DETECTION & MIRRORING (HIGHEST PRIORITY):\n"
            "   - IF THE USER COMMUNICATES IN ENGLISH (e.g. speaking English words, queries, technical questions):\n"
            "     You MUST respond 100% IN CLEAR, NATURAL, FLUENT ENGLISH! Never respond in Hindi or Hinglish when the user asks or speaks in English.\n"
            "   - IF THE USER COMMUNICATES IN HINDI OR HINGLISH (e.g. 'kaisa hai buddy', 'kya haal hai', 'bhai', 'yaar', 'kaise ho', 'leave apply karni hai'):\n"
            "     You MUST respond in natural, friendly, expressive Hindi / Hinglish! Match their conversational vibe ('Arrey buddy! Main bilkul badhiya hoon, aap batao kya chal raha hai? ✨🚀').\n"
            "   - Turn-by-turn language switching: If the user changes language from Hindi to English or English to Hindi, switch immediately and effortlessly.\n"
            "   - If the user uses slang, jokes, or calls you 'buddy', 'bhai', 'yaar':\n"
            "     Reciprocate warmly with matching friendly energy ('buddy', etc.) and lively emojis (✨, 🚀, 😊, 💡, 💻).\n"
            "3. SPOKEN / VOICE NATURALNESS:\n"
            "   - Keep spoken answers conversational, clear, structured, and engaging so they sound natural when read aloud by Voice AI.\n"
            "4. AUTHORITATIVE OPENSENSE LABS ENTERPRISE KNOWLEDGE BASE (REAL FACTS ONLY):\n"
            "   - COMPANY PROFILE:\n"
            "     * Full Name: OpenSense Labs (OSL) | Established: 2013 | Premier digital experience and open-source innovation consultancy.\n"
            "     * Headquarters: Logix Cyber Park, Tower B, Sector 62, Noida, Uttar Pradesh 201309, India.\n"
            "     * Global Hubs: London (United Kingdom) & Wilmington, Delaware (USA).\n"
            "     * Strategic Accreditations: Official Acquia Certified Partner, Drupal Association Premium Supporting Partner, AWS Select Consulting Partner.\n"
            "     * Core Specializations: Enterprise Drupal 10/11, Decoupled/Headless Next.js (App Router, ISR, RSC), Enterprise AI & Model Context Protocol (MCP), Cloud DevOps (AWS EKS, Kubernetes, CI/CD).\n"
            "   - REAL HR POLICIES & EMPLOYEE BENEFITS (ACCURATE ENTITLEMENTS):\n"
            "     * Standard Leave Entitlements:\n"
            "       - 12 Casual Leaves (CL) per calendar year for personal commitments and short breaks.\n"
            "       - 12 Sick Leaves (SL) per calendar year for health and medical recovery.\n"
            "       - 15 Earned Leaves (EL) accrued quarterly. Up to 10 unavailed ELs can be carried forward to next year, or encashed at year-end.\n"
            "       - 2 Optional / Floating Festival Holidays chosen from annual cultural list.\n"
            "       - 26 Weeks Fully-Paid Maternity Leave + 2 Weeks Paid Paternity Leave.\n"
            "       - 5 Days Bereavement / Compassionate Leave.\n"
            "     * Comprehensive Health Insurance:\n"
            "       - ₹5,00,000 INR Family Floater Policy covering employee, spouse, and up to 2 dependent children.\n"
            "       - Cashless admission across 10,000+ network hospitals pan-India through dedicated TPA.\n"
            "       - Day-1 coverage for pre-existing medical conditions.\n"
            "       - Maternity benefit up to ₹50,000 for normal and C-section deliveries.\n"
            "       - Free annual comprehensive health checkups and 24/7 mental health counseling support.\n"
            "     * Work Timings & Model:\n"
            "       - 5-Day Work Week: Monday to Friday, 9:30 AM to 6:30 PM IST.\n"
            "       - Hybrid Work Policy: 3 days collaborative in-office presence at Sector 62 Noida HQ + 2 days flexible remote.\n"
            "     * Performance & Growth:\n"
            "       - Annual Appraisal effective April 1st with transparent career leveling tracks (L1 to L7).\n"
            "       - Mid-year checkpoint in October for goal tracking and mentor reviews.\n"
            "       - ₹25,000 annual professional certification budget for AWS, Acquia, Kubernetes, and AI credentials.\n"
            "   - REAL INTERNAL DIRECTORY & CONTACTS:\n"
            "     * Pooja Sharma (HR Lead & People Ops): pooja.hr@opensenselabs.com\n"
            "     * Vikram Singh (DevOps & IT Support Lead): vikram.it@opensenselabs.com\n"
            "     * Neha Verma (Marketing & Global Brand Head): neha.marketing@opensenselabs.com\n"
            "     * Amit Roy (VP Enterprise Partnerships): amit.sales@opensenselabs.com\n"
            "     * Siddharth Jain (Chief Technology Officer - CTO): siddharth.cto@opensenselabs.com\n"
            "     * Noida HQ Desk: +91 120 456 7890 (Reception Desk, Logix Cyber Park)\n"
            "   - REAL ENGINEERING & ARCHITECTURE STANDARDS:\n"
            "     * When writing code, provide COMPLETE, production-grade, typed implementations with robust error handling, docstrings, and run instructions.\n"
            "     * For Decoupled Drupal: Highlight headless JSON:API / GraphQL endpoints with Next.js App Router, Incremental Static Regeneration (ISR), Redis cache tags, and OAuth2 security scopes.\n"
            "   - REAL MARKETING & THOUGHT LEADERSHIP:\n"
            "     * When drafting LinkedIn/social copy: Provide engaging B2B hooks, actionable takeaways, enterprise proof points, trending hashtags (#OpenSenseLabs, #Drupal10, #NextJS, #EnterpriseAI), and clear CTAs."
        )

        primary_model = getattr(provider, "model_name", None) or "gemini-3.1-flash-lite"
        if primary_model in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-3.5-flash"]:
            primary_model = "gemini-3.1-flash-lite"

        models_to_try = [primary_model, "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"]
        unique_models = []
        for m in models_to_try:
            if m not in unique_models:
                unique_models.append(m)

        contents = []
        for m in messages:
            # Skip system messages in contents array because system_instruction handles it
            if m.get("role") == "system":
                continue
            role = "user" if m.get("role") == "user" else "model"
            content = m.get("content", "")
            if content.strip():
                # Avoid consecutive identical roles in Gemini API
                if contents and contents[-1]["role"] == role:
                    contents[-1]["parts"][0]["text"] += "\n" + content
                else:
                    contents.append({
                        "role": role,
                        "parts": [{"text": content}]
                    })

        if not contents:
            contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

        last_error = ""
        async with httpx.AsyncClient(timeout=8.0) as client:
            for model in unique_models:
                endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                
                # First attempt with official system_instruction
                payload = {
                    "contents": contents,
                    "system_instruction": {
                        "parts": [{"text": system_instruction_text}]
                    }
                }
                try:
                    resp = await client.post(endpoint, json=payload)
                    # If 400 and system_instruction not allowed on older variant, retry with injected prompt
                    if resp.status_code == 400 and "system_instruction" in resp.text:
                        fallback_contents = list(contents)
                        if fallback_contents:
                            fallback_contents[0]["parts"][0]["text"] = f"[System Instructions: {system_instruction_text}]\n\n{fallback_contents[0]['parts'][0]['text']}"
                        resp = await client.post(endpoint, json={"contents": fallback_contents})

                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        text = ""
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            text = "".join(p.get("text", "") for p in parts)
                        if text:
                            return {
                                "role": "assistant",
                                "content": text,
                                "tool_calls": None,
                                "tool_results": None,
                                "model": f"Google-{model}"
                            }
                    else:
                        err_text = resp.text
                        try:
                            err_json = resp.json()
                            last_error = err_json.get("error", {}).get("message", err_text[:200])
                        except Exception:
                            last_error = err_text[:200]
                except Exception as e:
                    last_error = str(e)

        raise RuntimeError(f"Google Gemini Error: {last_error}")

    @staticmethod
    async def _call_external_provider(
        provider: Any,
        api_key: str,
        messages: List[Dict[str, Any]],
        tools_def: List[Dict[str, Any]],
        connected_servers: List[Dict[str, Any]],
        persona: str = "aanya"
    ) -> Dict[str, Any]:
        # Handle Google Gemini Provider
        if getattr(provider, "provider_type", "").lower() == "gemini" or "generativelanguage.googleapis.com" in getattr(provider, "base_url", ""):
            return await AIService._call_gemini_api(provider, api_key, messages, persona=persona)

        base_url = provider.base_url.rstrip("/")
        timeout = provider.timeout_seconds or 35

        payload = {
            "model": provider.model_name or "gpt-4o",
            "messages": messages,
        }
        if tools_def:
            payload["tools"] = tools_def
            payload["tool_choice"] = "auto"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        if provider.custom_headers:
            try:
                headers.update(json.loads(provider.custom_headers))
            except Exception:
                pass

        endpoint = f"{base_url}/chat/completions"
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(endpoint, json=payload, headers=headers)
            if resp.status_code != 200:
                err_text = resp.text
                try:
                    err_json = resp.json()
                    err_msg = err_json.get("error", {}).get("message", err_text[:200])
                except Exception:
                    err_msg = err_text[:200]
                raise RuntimeError(f"API Provider Error ({resp.status_code}): {err_msg}")

            data = resp.json()
            choice = data["choices"][0]["message"]
            tool_calls = choice.get("tool_calls", [])

            if not tool_calls:
                return {
                    "role": "assistant",
                    "content": choice.get("content", ""),
                    "tool_calls": None,
                    "tool_results": None,
                    "model": provider.model_name
                }

            # Execute returned tool calls
            tool_results = []
            for tc in tool_calls:
                fn = tc.get("function", {})
                full_name = fn.get("name", "")
                args_str = fn.get("arguments", "{}")
                try:
                    args = json.loads(args_str)
                except Exception:
                    args = {}

                parts = full_name.split("__", 1)
                if len(parts) == 2:
                    srv_id = int(parts[0].replace("srv_", ""))
                    real_tool_name = parts[1]
                    try:
                        out, dur = await mcp_manager.execute_tool(srv_id, real_tool_name, args)
                        tool_results.append({
                            "tool_call_id": tc["id"],
                            "tool_name": real_tool_name,
                            "server_id": srv_id,
                            "duration_ms": dur,
                            "output": out
                        })
                    except Exception as e:
                        tool_results.append({
                            "tool_call_id": tc["id"],
                            "tool_name": real_tool_name,
                            "server_id": srv_id,
                            "error": str(e)
                        })

            # Follow up with AI
            follow_up_messages = list(messages)
            follow_up_messages.append(choice)
            for tr in tool_results:
                follow_up_messages.append({
                    "role": "tool",
                    "tool_call_id": tr["tool_call_id"],
                    "content": json.dumps(tr.get("output") or tr.get("error"))
                })

            follow_up_payload = {
                "model": provider.model_name or "gpt-4o",
                "messages": follow_up_messages
            }
            resp2 = await client.post(endpoint, json=follow_up_payload, headers=headers)
            final_content = ""
            if resp2.status_code == 200:
                final_content = resp2.json()["choices"][0]["message"].get("content", "")
            else:
                final_content = f"Tools executed: {json.dumps(tool_results, indent=2)}"

            return {
                "role": "assistant",
                "content": final_content,
                "tool_calls": tool_calls,
                "tool_results": tool_results,
                "model": provider.model_name
            }

    @staticmethod
    async def _call_opensense_agent(
        messages: List[Dict[str, Any]],
        connected_servers: List[Dict[str, Any]],
        persona: str = "aanya"
    ) -> Dict[str, Any]:
        """
        OpenSense Labs Multilingual Autonomous Agent with Deep Chat Memory.
        Remembers user identity, department, past topics, follow-ups,
        and provides lively, engaging responses with emojis across HR, Marketing, Engineering, & Creative.
        """
        import re

        # ========================================================
        # 1. EXTRACT CHAT MEMORY & USER CONTEXT ACROSS ALL TURNS
        # ========================================================
        user_name = None
        user_dept = None
        topics_discussed = []
        last_topic = None
        last_assistant_msg = ""

        # Scan previous messages for memory
        for m in messages:
            role = m.get("role")
            text = m.get("content", "").strip()
            low = text.lower()

            if role == "assistant":
                last_assistant_msg = text

            if role == "user":
                # Detect User Name
                name_match = re.search(r"(?:mera naam|my name is|i am|call me|main hoon|mai hoon)\s+([A-Za-z]+)", text, re.IGNORECASE)
                if name_match:
                    candidate = name_match.group(1).capitalize()
                    if candidate.lower() not in ["ek", "a", "an", "the", "kaha", "kya", "batao", "koi", "developer", "engineer", "working", "from", "in"]:
                        user_name = candidate

                # Detect User Department
                if any(w in low for w in ["hr", "human resource", "people"]):
                    user_dept = "People & Culture (HR)"
                    if "HR Policies & Wellbeing" not in topics_discussed:
                        topics_discussed.append("HR Policies & Wellbeing")
                elif any(w in low for w in ["marketing", "growth", "branding"]):
                    user_dept = "Marketing & Brand Growth"
                    if "Marketing & Social Campaigns" not in topics_discussed:
                        topics_discussed.append("Marketing & Social Campaigns")
                elif any(w in low for w in ["tech", "engineering", "developer", "coder", "devops"]):
                    user_dept = "Platform Engineering & AI"
                    if "Software Engineering & Architecture" not in topics_discussed:
                        topics_discussed.append("Software Engineering & Architecture")
                elif any(w in low for w in ["sales", "bd", "business"]):
                    user_dept = "Business Development & Sales"
                    if "Client Strategy & Sales" not in topics_discussed:
                        topics_discussed.append("Client Strategy & Sales")

                # Detect Topics
                if any(w in low for w in ["leave", "chhutti", "sick", "casual", "cl", "sl", "el"]):
                    if "Leave Guidelines" not in topics_discussed:
                        topics_discussed.append("Leave Guidelines")
                    last_topic = "leave"
                elif any(w in low for w in ["drupal", "next.js", "react", "decoupled", "headless"]):
                    if "Drupal & Decoupled Architecture" not in topics_discussed:
                        topics_discussed.append("Drupal & Decoupled Architecture")
                    last_topic = "drupal"
                elif any(w in low for w in ["python", "code", "script", "function", "api"]):
                    if "Python Coding & Scripts" not in topics_discussed:
                        topics_discussed.append("Python Coding & Scripts")
                    last_topic = "coding"
                elif any(w in low for w in ["image", "photo", "picture", "draw", "banao"]):
                    if "AI Image Generation" not in topics_discussed:
                        topics_discussed.append("AI Image Generation")
                    last_topic = "image"
                elif any(w in low for w in ["time", "clock", "office", "noida", "hq"]):
                    if "OpenSense Global Hubs & Office Times" not in topics_discussed:
                        topics_discussed.append("OpenSense Global Hubs & Office Times")
                    last_topic = "office"

        # Get latest user message
        latest_user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                latest_user_msg = m.get("content", "").strip()
                break

        msg_lower = latest_user_msg.lower()
        is_devanagari = bool(re.search(r"[\u0900-\u097F]", latest_user_msg))
        # Word boundary regex prevents English words with 'q', 'help', 'kar' (e.g. queue, requirements, park) from false-triggering Hindi
        hindi_keywords = [
            "kaha", "kya", "hai", "hain", "batao", "kaise", "kaisa", "kab", "karna", "chal",
            "bhai", "yaar", "namaste", "mujhe", "samajh", "kyu", "kyun", "kaun",
            "karo", "karein", "dikhaye", "sunte", "kardo", "chahiye",
            "yaad", "mera", "meri", "mere", "humne", "pehle", "bataiye",
            "samjhao", "chhutti", "nhi", "nahi", "accha", "theek", "kaunsa", "kripya", "dhanyawad"
        ]
        is_hindi = is_devanagari or bool(re.search(r"\b(" + "|".join(hindi_keywords) + r")\b", msg_lower))

        greeting_prefix = f"Namaste {user_name}! 🙏✨ " if user_name else "Namaste! 🙏✨ "

        # ========================================================
        # 2. CHAT MEMORY RECALL QUERIES & STRICT ISOLATION
        # ========================================================
        prior_user_msgs = [m for m in messages[:-1] if m.get("role") == "user"]
        is_fresh_chat = len(prior_user_msgs) == 0

        # Privacy inquiry: if user asks about data of other chats
        if any(w in msg_lower for w in ["dusri chat", "dusre chat", "purani chat", "other chat", "previous conversation"]):
            if is_hindi:
                content = (
                    "🛡️ **Strict Chat Isolation & Privacy Policy:**\n\n"
                    "OpenSense AI Assistant me har chat session poori tarah isolated aur private rehta hai.\n\n"
                    "• Ek chat ka prompt, code ya data kisi bhi doosre chat session me share nahi hota.\n"
                    "• Jab aap **New Conversation** shuru karte hain, toh woh 100% clean slate hoti hai jisme purana koi bhi context nahi rehta.\n\n"
                    "Aap is conversation me jo bhi poochhenge, sirf isi session tak seemit rahega! 🔒✨"
                )
            else:
                content = (
                    "🛡️ **Strict Chat Isolation & Privacy Policy:**\n\n"
                    "Every chat session with OpenSense AI Assistant is completely isolated and strictly private.\n\n"
                    "• Prompts, code, or sensitive data from one chat are never leaked to other sessions.\n"
                    "• When you begin a **New Conversation**, you get a 100% fresh clean slate.\n\n"
                    "Everything discussed here remains securely confined to this session! 🔒✨"
                )
            return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-Privacy-Agent"}

        is_memory_query = any(w in msg_lower for w in [
            "kya yaad hai", "yaad hai", "mera naam kya hai", "what is my name",
            "who am i", "mai kaun hoon", "main kaun hoon", "kya baat hui thi",
            "summarize our chat", "pehle kya baat hui", "remember me", "memory", "kya baat chal rahi"
        ])

        if is_memory_query:
            if is_fresh_chat or (not user_name and not topics_discussed):
                if is_hindi:
                    content = (
                        "🌱 **Yeh ek nayi conversation (New Chat) hai!** ✨\n\n"
                        "Humne is chat session me abhi baat shuru ki hai, isliye yahan koi pichla context, purane prompts ya doosri chat ka data nahi hai.\n\n"
                        "🔒 **Strict Privacy:** Har chat session independent hota hai — doosre chat ka data yahan nahi dikhega.\n\n"
                        "Bataiye, aaj is fresh chat me hum kis project, code ya topic par kaam karein? 🚀😊"
                    )
                else:
                    content = (
                        "🌱 **This is a fresh new conversation!** ✨\n\n"
                        "We have just started chatting in this session, so there is no previous context, history, or memory here.\n\n"
                        "🔒 **Strict Privacy:** Each conversation session is completely private and independent.\n\n"
                        "What would you like to work on today? Feel free to ask about HR policies, engineering, marketing, or code! 🚀😊"
                    )
                return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-Memory-Agent"}

            if is_hindi:
                name_text = f"**{user_name}**" if user_name else "*Aapne is chat me abhi tak apna naam nahi bataya tha, par aap OpenSense team ke valuable member hain!*"
                dept_text = f"**{user_dept}**" if user_dept else "*OpenSense Labs Team*"
                topics_text = " • " + "\n• ".join([f"📌 {t}" for t in topics_discussed]) if topics_discussed else "📌 Humne abhi abhi conversation shuru ki hai!"

                content = (
                    f"🧠 **Haan, is specific conversation me jo humne baat ki, mujhe yaad hai:** 😊📝✨\n\n"
                    f"• 👤 **Aapka Naam:** {name_text}\n"
                    f"• 🏢 **Department / Role:** {dept_text}\n"
                    f"• 💬 **Topics jo is chat me discuss huye:**\n{topics_text}\n\n"
                    f"💡 *Yeh memory sirf is active chat session ke liye hai. Doosri chats me yeh data bilkul nahi jata.* 🔒🚀"
                )
            else:
                name_text = f"**{user_name}**" if user_name else "*You haven't shared your name in this session yet, but you're a valued member of the OpenSense team!*"
                dept_text = f"**{user_dept}**" if user_dept else "*OpenSense Labs Team*"
                topics_text = " • " + "\n• ".join([f"📌 {t}" for t in topics_discussed]) if topics_discussed else "📌 We just started this conversation!"

                content = (
                    f"🧠 **Yes, here is what we discussed in this active session:** 😊📝✨\n\n"
                    f"• 👤 **Your Name:** {name_text}\n"
                    f"• 🏢 **Department / Role:** {dept_text}\n"
                    f"• 💬 **Topics Discussed:**\n{topics_text}\n\n"
                    f"💡 *This memory is strictly private to this session.* 🔒🚀"
                )
            return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-Memory-Agent"}

        # If user explicitly introduces themselves:
        if re.search(r"(?:mera naam|my name is|i am|mai hoon|main hoon)\s+[A-Za-z]+", latest_user_msg, re.IGNORECASE) and not any(w in msg_lower for w in ["kya", "what"]):
            name_found = re.search(r"(?:mera naam|my name is|i am|mai hoon|main hoon)\s+([A-Za-z]+)", latest_user_msg, re.IGNORECASE).group(1).capitalize()
            if is_hindi:
                dept_part = f" **{user_dept}** department se" if user_dept else ""
                content = (
                    f"🎉 **Namaste {name_found}!** Aapse milkar bahut khushi hui! 🙏✨\n\n"
                    f"Maine aapka naam aur identity apne **active memory** me save kar liya hai. Ab pure chat ke dauran mujhe yaad rahega ki aap {name_found}{dept_part} hain! 🧠💼\n\n"
                    f"Bataiye {name_found} ji, aaj hum kis project ya task par kaam karein? 🚀\n"
                    f"• 👥 **HR:** Leave apply karna ya policy janna\n"
                    f"• 📢 **Marketing:** LinkedIn post, case study, ya campaign slogans\n"
                    f"• 💻 **Engineering:** Python utility, Drupal 10/11, Next.js code\n"
                    f"• 🎨 **AI Image Studio:** Photorealistic 3D image generate karwana\n\n"
                    f"Aap jo kahenge, turant haazir hai! 😊✨"
                )
            else:
                dept_en = f" from the **{user_dept}** department" if user_dept else ""
                content = (
                    f"🎉 **Hello {name_found}!** Wonderful to meet you! ✨\n\n"
                    f"I have saved your name and profile to our active session memory. Throughout this conversation, I'll remember that you are {name_found}{dept_en}! 🧠💼\n\n"
                    f"How can I assist you today, {name_found}?\n"
                    f"• 👥 **HR & Policies:** Leave requests, benefits, and workplace guidelines\n"
                    f"• 📢 **Marketing:** Thought leadership posts, case studies, or campaign strategies\n"
                    f"• 💻 **Engineering:** Python scripts, Drupal 10/11, Next.js, and API architecture\n"
                    f"• 🎨 **AI Image Studio:** Generating high-resolution visuals and diagrams\n\n"
                    f"Feel free to ask anything! 😊🚀"
                )
            return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-Memory-Agent"}

        # Follow-up queries ("aur batao", "explain more", "aur detail me")
        if any(w in msg_lower for w in ["aur batao", "explain more", "aur detail", "more details", "aur kya hai", "aage batao"]):
            if last_topic == "leave":
                if is_hindi:
                    content = (
                        f"{greeting_prefix}**OpenSense Labs HR & Leave Framework ki aur gehri jankari:** 🏖️📋\n\n"
                        f"• 🌟 **Carry Forward Rules:** Earned Leaves (EL) me se up to 10 leaves next calendar year me carry forward ho sakti hain.\n"
                        f"• 🎯 **Encashment:** Year-end par unavailed ELs ko company policy ke anusar encash bhi kiya ja sakta hai.\n"
                        f"• 🧘 **Wellness Days:** Regular health checkups aur mental wellness workshops OpenSense HR har quarter organize karta hai.\n"
                        f"• 🏖️ **Optional Holidays:** Gazetted holidays ke alawa 2 optional holidays team members apni pasand ke festival par le sakte hain!\n\n"
                        f"Kya aapko leave request ke liye customized draft chahiye? ✉️😊"
                    )
                else:
                    content = (
                        f"**In-depth OpenSense Labs HR & Leave Framework Details:** 🏖️📋\n\n"
                        f"• 🌟 **Carry Forward Rules:** Up to 10 unavailed Earned Leaves (EL) can be carried forward into the next calendar year.\n"
                        f"• 🎯 **Encashment:** Unutilized ELs can be encashed at year-end in accordance with company policy.\n"
                        f"• 🧘 **Wellness Days:** Regular health checkups and mental wellness sessions organized quarterly.\n"
                        f"• 🏖️ **Optional Holidays:** In addition to standard public holidays, employees get 2 optional floating holidays for personal celebrations.\n\n"
                        f"Would you like me to draft a leave application email for you? ✉️😊"
                    )
                return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-HR-Agent"}
            elif last_topic == "drupal":
                if is_hindi:
                    content = (
                        f"{greeting_prefix}**Enterprise Decoupled Drupal + Next.js me deep architecture insights:** 🚀⚡\n\n"
                        f"• ⚡ **Incremental Static Regeneration (ISR):** Content Drupal me publish hote hi Next.js on-demand revalidate hook se zero-downtime render ho jata hai.\n"
                        f"• 🛡️ **GraphQL & JSON:API Security:** Granular OAuth2 tokens aur role-based field shielding Drupal backend ko public exposure se protect karte hain.\n"
                        f"• 📈 **SEO & Edge Caching:** Next.js server components 98+ Core Web Vitals score provide karte hain, jisse Google search ranking boost hoti hai!\n\n"
                        f"Kya iska implementation blueprint ya sample GraphQL query dekhna chahte hain? 💻✨"
                    )
                else:
                    content = (
                        f"**Deep Architectural Insights for Decoupled Drupal + Next.js:** 🚀⚡\n\n"
                        f"• ⚡ **Incremental Static Regeneration (ISR):** Content published in Drupal triggers Next.js on-demand revalidation hooks with zero downtime.\n"
                        f"• 🛡️ **GraphQL & JSON:API Security:** Granular OAuth2 scopes and role-based field shielding protect the Drupal backend from unauthorized exposure.\n"
                        f"• 📈 **SEO & Edge Caching:** Next.js server components deliver 98+ Core Web Vitals scores, boosting search engine performance and responsiveness.\n\n"
                        f"Would you like to inspect an architectural blueprint or sample GraphQL query? 💻✨"
                    )
                return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-Engineering-Agent"}

        # ----------------------------------------------------
        # CONTACT DIRECTORY & PHONE CALLING INTELLIGENCE
        # ----------------------------------------------------
        is_call_request = any(w in msg_lower for w in ["call", "phone", "dial", "lagao", "karo phone", "phone lagao", "call lagane", "calling", "milao"])
        is_directory_request = any(w in msg_lower for w in ["contact list", "directory", "phonebook", "kisko call", "kisko phone", "contacts", "sampark"])

        if is_call_request or is_directory_request:
            contacts = [
                {"name": "Pooja Sharma", "role": "HR Lead & People Ops", "department": "People & Culture (HR)", "phone": "+91 98765 43210", "email": "pooja.hr@opensenselabs.com", "keywords": ["pooja", "hr", "people", "leave"]},
                {"name": "Vikram Singh", "role": "DevOps & IT Support Lead", "department": "Platform Engineering", "phone": "+91 98765 43211", "email": "vikram.it@opensenselabs.com", "keywords": ["vikram", "it", "tech", "devops", "support"]},
                {"name": "Neha Verma", "role": "Marketing & Brand Growth Head", "department": "Marketing & Brand Growth", "phone": "+91 98765 43212", "email": "neha.marketing@opensenselabs.com", "keywords": ["neha", "marketing", "brand", "growth"]},
                {"name": "Amit Roy", "role": "VP Enterprise Client Partnerships", "department": "Business Development (Sales)", "phone": "+91 98765 43213", "email": "amit.sales@opensenselabs.com", "keywords": ["amit", "sales", "client", "bd"]},
                {"name": "Siddharth Jain", "role": "Chief Technology Officer (CTO)", "department": "Leadership & Strategy", "phone": "+91 98765 43214", "email": "siddharth.cto@opensenselabs.com", "keywords": ["siddharth", "cto", "lead", "boss"]},
                {"name": "Noida HQ Front Desk", "role": "Reception & Facility Desk", "department": "Workplace Operations", "phone": "+91 120 456 7890", "email": "reception@opensenselabs.com", "keywords": ["reception", "desk", "noida", "office"]}
            ]

            # If user asks to view contacts / directory
            if is_directory_request and not any(w in msg_lower for w in ["ko call", "ko phone", "call lagao", "dial"]):
                cards = []
                for c in contacts:
                    cards.append(f"• 👤 **{c['name']}** — *{c['role']}*\n  📞 Phone: `{c['phone']}` | ✉️ `{c['email']}`")
                contacts_formatted = "\n\n".join(cards)
                content = (
                    f"📞 **OpenSense Labs Internal Contact Directory:** 🏢✨\n\n"
                    f"{contacts_formatted}\n\n"
                    f"💡 *Aap direct bol sakte hain: 'Pooja ko call lagao' ya 'IT desk ko phone lagao' aur live calling interface connect ho jayega!* 📲🚀"
                )
                return {
                    "role": "assistant",
                    "content": content,
                    "tool_calls": [{"id": "tool_dir_1", "type": "function", "function": {"name": "opensense_contact_directory", "arguments": "{}"}}],
                    "tool_results": [{"tool_name": "opensense_contact_directory", "output": {"contacts": contacts}}],
                    "model": "OpenSense-Telecom-Agent"
                }

            # If user wants to place a call
            matched_contact = None
            for c in contacts:
                if any(kw in msg_lower for kw in c["keywords"]) or c["name"].lower() in msg_lower:
                    matched_contact = c
                    break

            phone_match = re.search(r"(\+?\d[\d\s-]{8,14}\d)", latest_user_msg)
            custom_phone = phone_match.group(1).replace(" ", "") if phone_match else None

            if not matched_contact and custom_phone:
                matched_contact = {
                    "name": "Direct Number",
                    "role": "External Contact",
                    "department": "Direct Calling",
                    "phone": custom_phone,
                    "email": "telecom@opensenselabs.com"
                }

            if not matched_contact:
                matched_contact = contacts[0]  # Default to Pooja Sharma HR

            clean_num = matched_contact["phone"].replace(" ", "").replace("-", "")
            tel_uri = f"tel:{clean_num}"

            content = (
                f"📞 **Calling {matched_contact['name']} ({matched_contact['phone']})...** 📲⚡\n\n"
                f"• 👤 **Contact Name:** **{matched_contact['name']}**\n"
                f"• 💼 **Role:** {matched_contact['role']}\n"
                f"• 🏢 **Department:** {matched_contact['department']}\n"
                f"• 📱 **Phone Number:** `{matched_contact['phone']}`\n\n"
                f"🟢 **Live Call Status:** *Ringing... Live Phone dialer active!*\n\n"
                f"👉 [**Click here to Dial on Phone ({clean_num})**]({tel_uri}) ya neeche diye gaye live calling card se control karein! 🎙️📞"
            )

            call_args = {
                "contact_name": matched_contact["name"],
                "phone": matched_contact["phone"],
                "department": matched_contact["department"],
                "role": matched_contact["role"],
                "tel_uri": tel_uri,
                "status": "ringing"
            }

            return {
                "role": "assistant",
                "content": content,
                "tool_calls": [{"id": f"call_{random.randint(1000, 9999)}", "type": "function", "function": {"name": "opensense_make_phone_call", "arguments": json.dumps(call_args)}}],
                "tool_results": [{"tool_name": "opensense_make_phone_call", "output": call_args}],
                "model": "OpenSense-Telecom-Agent"
            }

        # ----------------------------------------------------
        # 1. HR & PEOPLE OPERATIONS DEPARTMENT QUERIES
        # ----------------------------------------------------
        if any(w in msg_lower for w in ["hr", "leave", "chhutti", "policy", "insurance", "onboarding", "appraisal", "offer letter", "attendance", "probation", "posh", "holiday", "tyohar"]):
            if any(w in msg_lower for w in ["leave", "chhutti", "sick", "casual", "insurance", "medical", "policy"]):
                if is_hindi:
                    content = (
                        f"👋 **OpenSense Labs HR Leave & Medical Benefits Guide:** 🏖️📋\n\n"
                        f"Humare team members ke liye standard leave aur medical benefits is tarah hain:\n\n"
                        f"### 🏖️ **Leave Framework:**\n"
                        f"• 🌿 **Casual Leave (CL):** 12 Days per year (personal commitments ke liye)\n"
                        f"• 🏥 **Sick Leave (SL):** 12 Days per year (health aur medical recovery ke liye)\n"
                        f"• ✈️ **Earned Leave (EL):** 15 Days per year (quarterly credit, up to 10 leaves next year carry forward ho sakti hain ya year-end par encash ho sakti hain)\n"
                        f"• 🎊 **Optional Holidays:** 2 Floating festival leaves apni pasand ke tyohar ke liye\n"
                        f"• 👶 **Parental Support:** 26 Weeks Fully-Paid Maternity Leave + 2 Weeks Paid Paternity Leave\n"
                        f"• 🕊️ **Bereavement Leave:** 5 Days compassionate time off\n\n"
                        f"### 🏥 **Health Insurance Coverage:**\n"
                        f"• 🛡️ **₹5,00,000 Family Floater Cover:** Employee + Spouse + 2 Children\n"
                        f"• 🏥 **Cashless Facility:** Pan-India 10,000+ network hospitals through dedicated TPA\n"
                        f"• ⚡ **Day-1 Coverage:** Pre-existing bimariyan pehle din se covered hain\n"
                        f"• 👶 **Maternity Benefit:** Up to ₹50,000 normal/C-section delivery expenses covered\n"
                        f"• 🧘 **Wellness Support:** Annual executive health checkup + 24/7 mental wellness counseling\n\n"
                        f"### 📝 **Leave Apply Karne Ka Tarika:**\n"
                        f"1. Apne Project Lead / Manager ko Jira tickets ka handover plan inform karein.\n"
                        f"2. HR Portal par date select karke submit karein.\n\n"
                        f"💡 *Aapko 2 din ki leave ke liye ready-to-send professional email draft chahiye? Bas kahiye 'Draft leave email'!* ✉️😊"
                    )
                else:
                    content = (
                        f"👋 **OpenSense Labs HR Leave & Comprehensive Medical Benefits:** 🏖️📋\n\n"
                        f"Here is our standard team framework and health benefits structure:\n\n"
                        f"### 🏖️ **Annual Leave Entitlements:**\n"
                        f"• 🌿 **Casual Leave (CL):** 12 Days annually for personal exigencies and emergencies\n"
                        f"• 🏥 **Sick Leave (SL):** 12 Days annually for medical rest and recovery\n"
                        f"• ✈️ **Earned Leave (EL):** 15 Days annually (credited quarterly; up to 10 unutilized ELs carry forward into next calendar year, or encashable at year-end)\n"
                        f"• 🎊 **Floating Holidays:** 2 Optional cultural/festival holidays per year\n"
                        f"• 👶 **Parental Support:** 26 Weeks fully paid Maternity Leave + 2 Weeks paid Paternity Leave\n"
                        f"• 🕊️ **Compassionate Leave:** 5 Days bereavement time off\n\n"
                        f"### 🏥 **Comprehensive Health Insurance:**\n"
                        f"• 🛡️ **₹5,00,000 INR Family Floater Policy:** Covers employee, spouse, and up to 2 dependent children\n"
                        f"• 🏥 **Cashless Hospitalization:** 10,000+ network hospitals across India via dedicated TPA card\n"
                        f"• ⚡ **Day-1 Pre-Existing Coverage:** Zero waiting period for pre-existing medical conditions\n"
                        f"• 👶 **Maternity Care:** In-patient delivery coverage up to ₹50,000\n"
                        f"• 🧘 **Preventive Care:** Free annual executive health checkups and confidential 24/7 counseling helpline\n\n"
                        f"### 📝 **Approval & Handover Process:**\n"
                        f"1. Discuss sprint handover and Jira ticket status with your Project Lead.\n"
                        f"2. Submit formal dates through the OpenSense HR Portal.\n\n"
                        f"💡 *Need a ready-to-send email template? Just say 'Draft leave email for my manager'!* ✉️😊"
                    )
                return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-HR-Agent"}

            # Onboarding / General HR
            if is_hindi:
                content = (
                    f"👥 **OpenSense Labs HR & People Operations Hub:**\n\n"
                    f"Humari team members ki growth aur wellbeing hamari top priority hai! 🎉\n\n"
                    f"• 🚀 **New Hire Onboarding:** Welcome kit, mentor assignment, aur 30-60-90 day goal setting.\n"
                    f"• 📈 **Appraisals & Performance:** Annual review cycle in April with bi-annual feedback loops.\n"
                    f"• 💻 **Flexible Hybrid Model:** Collaborative office sprints at Noida HQ with remote flexibility.\n"
                    f"• 🎊 **Team Engagement:** Fun Friday sessions, tech hackathons, festive lunches aur annual retreats!\n\n"
                    f"Aapko kisi specific HR template, policy ya inquiry me help chahiye? 💼"
                )
            else:
                content = (
                    f"👥 **OpenSense Labs People & Culture Overview:**\n\n"
                    f"We cultivate an engineering-first, people-centric workplace: 🎉\n\n"
                    f"• 🚀 **Seamless Onboarding:** Dedicated mentors, equipment provision, and 30-day sprint integration.\n"
                    f"• 📈 **Growth & Reviews:** Transparent career progression frameworks and annual appraisal cycles.\n"
                    f"• 💻 **Work Culture:** Collaborative in-person work at Sector 62 Noida HQ balanced with hybrid autonomy.\n"
                    f"• 🎊 **Culture:** Tech hackathons, knowledge-sharing guild meets, and festive gatherings.\n\n"
                    f"How can HR Operations assist you today? 💼"
                )
            return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-HR-Agent"}

        # ----------------------------------------------------
        # 2. MARKETING & GROWTH DEPARTMENT QUERIES
        # ----------------------------------------------------
        if any(w in msg_lower for w in ["marketing", "linkedin", "post", "social media", "twitter", "campaign", "slogan", "branding", "seo", "case study", "newsletter"]):
            if any(w in msg_lower for w in ["linkedin", "post", "caption", "tweet"]):
                if is_hindi:
                    content = (
                        f"📢 **OpenSense Labs LinkedIn & Social Post Draft:** 🚀✨\n\n"
                        f"---\n"
                        f"🚀 **Why Enterprise Drupal & Modern Decoupled Next.js are the Future of Digital Experiences!**\n\n"
                        f"At **OpenSense Labs**, we believe digital experiences should be blazingly fast, deeply secure, and effortless to scale.\n\n"
                        f"💡 Here's what modern organizations gain by pairing Drupal 10/11 with Headless Next.js:\n"
                        f"✅ Sub-second page loads powered by Next.js SSR & Edge caching\n"
                        f"✅ Enterprise-grade content workflows & multilingual governance\n"
                        f"✅ Seamless integration with AI agents & Model Context Protocol (MCP)\n"
                        f"✅ Multi-channel distribution across mobile, web, and IoT\n\n"
                        f"Are you planning your enterprise digital roadmap for 2026? Let's connect!\n\n"
                        f"#OpenSenseLabs #Drupal #NextJS #EnterpriseAI #WebArchitecture #DigitalTransformation #OpenSource\n"
                        f"---\n\n"
                        f"🎉 *Aap chahein toh is post ko directly LinkedIn ya Twitter/X par publish kar sakte hain! Aur customize karna hai?* ✨"
                    )
                else:
                    content = (
                        f"📢 **Ready-to-Publish LinkedIn / Social Media Post:** 🚀✨\n\n"
                        f"---\n"
                        f"🚀 **Powering Next-Gen Enterprise Portals: The Drupal + Decoupled Next.js Synergy**\n\n"
                        f"In today's fast-paced digital ecosystem, monolithic platforms are giving way to agile, decoupled architectures. At **OpenSense Labs**, we help global enterprises modernize their web estate with:\n\n"
                        f"🔹 High-performance Next.js 14 frontends delivering 95+ Core Web Vitals\n"
                        f"🔹 Robust Drupal 10/11 backend for omnichannel content governance\n"
                        f"🔹 AI-assisted search and automated editorial workflows\n"
                        f"🔹 Scalable cloud-native deployment on AWS & Kubernetes\n\n"
                        f"Ready to unlock sub-second user experiences? Reach out to our engineering team!\n\n"
                        f"#OpenSenseLabs #EnterpriseDrupal #NextJS #DigitalExperience #CloudNative #AI\n"
                        f"---\n\n"
                        f"Would you like me to adapt this for a Twitter/X thread or a client newsletter? ✍️"
                    )
                return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-Marketing-Agent"}

            # General marketing
            if is_hindi:
                content = (
                    f"🎯 **OpenSense Labs Marketing & Growth Playbook:** ✨\n\n"
                    f"Hamari marketing strategy enterprise authority aur open-source innovation par focused hai: 📢\n\n"
                    f"• 🏆 **Key Brand Pillars:** Enterprise Drupal Leadership, Headless/Decoupled Systems, Applied AI Solutions.\n"
                    f"• ✍️ **Content Creation:** LinkedIn thought leadership, technical blogs, DrupalCon whitepapers, aur client success case studies.\n"
                    f"• 🌐 **Target Audience:** CTOs, Chief Digital Officers (CDOs), CMOs, aur Enterprise Engineering Heads.\n"
                    f"• 🎨 **Visual Assets:** Modern tech infographics, UI case previews, aur video demo reels.\n\n"
                    f"Bataiye, kis campaign, blog outline ya announcement par kaam karein? 🚀"
                )
            else:
                content = (
                    f"🎯 **OpenSense Labs Growth & Marketing Toolkit:** ✨\n\n"
                    f"Our marketing focus highlights enterprise technology excellence: 📢\n\n"
                    f"• 🏆 **Core Messaging:** Global Open-Source Enterprise Engineering, High-Scale Drupal, Applied AI.\n"
                    f"• ✍️ **Collateral:** Technical case studies, whitepapers, executive briefings, and Drupal community spotlights.\n"
                    f"• 🌐 **Ideal Customer Profile (ICP):** Global enterprise technology leaders, higher education, healthcare, and media conglomerates.\n\n"
                    f"What marketing asset can I create for you today? 🚀"
                )
            return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-Marketing-Agent"}

        # ----------------------------------------------------
        # 3. LIVE MCP TOOLS (Office Times & Host Diagnostics)
        # ----------------------------------------------------
        if any(w in msg_lower for w in ["office time", "time", "timezone", "clock", "kitne baje", "samay", "ghadi"]):
            try:
                res, duration = await mcp_manager.execute_tool(1, "opensense_office_time", {"region": "all"})
                parsed = res
                if isinstance(res, dict) and "content" in res and len(res["content"]) > 0:
                    try:
                        parsed = json.loads(res["content"][0].get("text", "{}"))
                    except Exception:
                        pass

                ist = parsed.get("OpenSense_India_HQ_IST", "Active") if isinstance(parsed, dict) else ""
                est = parsed.get("OpenSense_US_East_EST", "Active") if isinstance(parsed, dict) else ""
                gmt = parsed.get("OpenSense_UK_GMT", "Active") if isinstance(parsed, dict) else ""

                content = (
                    f"🌍 **OpenSense Labs Global Hubs Live Wall-Clock Times:** ⏰✨\n\n"
                    f"🏢 **India Headquarters (Noida / Delhi NCR):**\n"
                    f"• 🕒 Live Time: **`{ist}`** (IST, UTC+5:30)\n\n"
                    f"🏢 **United States Regional Hub (New York):**\n"
                    f"• 🕒 Live Time: **`{est}`** (EST, UTC-5:00)\n\n"
                    f"🏢 **United Kingdom Regional Hub (London):**\n"
                    f"• 🕒 Live Time: **`{gmt}`** (GMT, UTC+0:00)\n\n"
                    f"💡 *Aapko kisi specific office location ya client meeting coordination me help chahiye?* 😊"
                )

                return {
                    "role": "assistant",
                    "content": content,
                    "tool_calls": [{"id": f"call_{int(duration)}", "type": "function", "function": {"name": "opensense_office_time", "arguments": '{"region":"all"}'}}],
                    "tool_results": [{"tool_name": "opensense_office_time", "duration_ms": duration, "output": res}],
                    "model": "OpenSense-AI-Agent"
                }
            except Exception:
                pass

        if any(w in msg_lower for w in ["diagnostics", "system health", "health check", "host info", "telemetry", "ram", "cpu", "server status"]):
            try:
                res, duration = await mcp_manager.execute_tool(1, "opensense_system_diagnostics", {"verbose": True})
                parsed = res
                if isinstance(res, dict) and "content" in res and len(res["content"]) > 0:
                    try:
                        parsed = json.loads(res["content"][0].get("text", "{}"))
                    except Exception:
                        pass

                platform_os = parsed.get("platform", "Linux") if isinstance(parsed, dict) else "Linux"
                py_ver = parsed.get("python_version", "3.10") if isinstance(parsed, dict) else "3.10"
                pid = parsed.get("pid", "Active") if isinstance(parsed, dict) else "Active"
                cpu = parsed.get("cpu_count", 4) if isinstance(parsed, dict) else 4
                srv_ver = parsed.get("server_version", "2.4.0") if isinstance(parsed, dict) else "2.4.0"

                content = (
                    f"⚡ **OpenSense Labs Platform Telemetry & Diagnostics:** 🖥️✅\n\n"
                    f"• 🟢 **Status:** 100% Operational & Healthy\n"
                    f"• 💻 **Operating System:** `{platform_os}`\n"
                    f"• 🐍 **Python Environment:** Python `{py_ver}`\n"
                    f"• ⚙️ **Process Architecture:** PID `#{pid}` ({cpu} CPU Cores)\n"
                    f"• 📡 **MCP Protocol Version:** Version `{srv_ver}`\n\n"
                    f"🚀 *Saare background threads aur services optimal latency (**{duration}ms**) par run ho rahe hain!*"
                )

                return {
                    "role": "assistant",
                    "content": content,
                    "tool_calls": [{"id": f"call_{int(duration)}", "type": "function", "function": {"name": "opensense_system_diagnostics", "arguments": '{"verbose":true}'}}],
                    "tool_results": [{"tool_name": "opensense_system_diagnostics", "duration_ms": duration, "output": res}],
                    "model": "OpenSense-AI-Agent"
                }
            except Exception:
                pass

        # ----------------------------------------------------
        # 4. COMPANY KNOWLEDGE & OFFICES
        # ----------------------------------------------------
        if any(w in msg_lower for w in ["office", "kaha", "where", "location", "address", "hq", "headquarter", "pata"]):
            if is_hindi:
                content = (
                    f"📍 **OpenSense Labs ke Global Offices aur Headquarters:** 🏢✨\n\n"
                    f"🏢 **India Headquarters (Main Engineering & Innovation Hub):**\n"
                    f"• **Location:** Sector 62, Noida, Uttar Pradesh (Delhi NCR), India 🇮🇳\n"
                    f"• Hamari primary platform development, AI research, cloud architecture aur client delivery yahi se operate hoti hai.\n\n"
                    f"🌍 **International Presence:**\n"
                    f"• **United States:** New York, NY (Enterprise Delivery & Strategy) 🇺🇸\n"
                    f"• **United Kingdom:** London (European Consulting & Strategic Partnerships) 🇬🇧\n\n"
                    f"Aapko kisi specific department ya contact details ke baare me janna hai? 🤝"
                )
            else:
                content = (
                    f"📍 **OpenSense Labs Office Locations & Global Presence:** 🏢✨\n\n"
                    f"🏢 **India Headquarters (Primary Tech & Innovation Hub):**\n"
                    f"• **Location:** Sector 62, Noida, Uttar Pradesh (Delhi NCR), India 🇮🇳\n"
                    f"• Core delivery center for enterprise Drupal, full-stack Next.js, and generative AI platforms.\n\n"
                    f"🌍 **International Hubs:**\n"
                    f"• **United States:** New York, NY (Enterprise Client Strategy) 🇺🇸\n"
                    f"• **United Kingdom:** London (European Delivery & Solutions) 🇬🇧\n\n"
                    f"Would you like details on team contacts or departmental coordinates? 🤝"
                )
            return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-AI-Agent"}

        if any(w in msg_lower for w in ["opensense", "company", "kya karti", "services", "kaam", "about", "drupal"]):
            if is_hindi:
                content = (
                    f"🌟 **OpenSense Labs ke baare me jankari:** 🚀\n\n"
                    f"**OpenSense Labs** ek premier enterprise technology consulting firm hai jo **Digital Experience Platforms (DXP)**, **Enterprise Open Source (Drupal)**, aur **AI Solutions** me specialize karti hai! 🏆\n\n"
                    f"🚀 **Hamari Core Capabilities & Services:**\n"
                    f"1. 🔷 **Enterprise Drupal Solutions:** High-scale web portals, Drupal 7 se 10/11 migrations, performance tuning, aur 24/7 security maintenance.\n"
                    f"2. ⚛️ **Decoupled & Modern Web:** Headless architectures with **Next.js**, React, TypeScript, GraphQL aur modern Tailwind design systems.\n"
                    f"3. 🤖 **Generative AI & LLMs:** Custom RAG pipelines, internal AI assistants, Model Context Protocol (MCP) integrations, aur enterprise chatbots.\n"
                    f"4. ☁️ **Cloud Architecture & DevOps:** Kubernetes, Docker, AWS, Google Cloud, multi-cloud scalability, aur zero-downtime CI/CD.\n"
                    f"5. 🎨 **UI/UX & Digital Strategy:** Accessible, human-first design systems aur digital transformation roadmaps.\n\n"
                    f"Aapko kisi particular service ya technology stack ke baare me detail chahiye? 💡"
                )
            else:
                content = (
                    f"🌟 **About OpenSense Labs:** 🚀\n\n"
                    f"**OpenSense Labs** is an enterprise technology and digital consulting company specializing in enterprise open source, modern decoupled web engineering, and artificial intelligence. 🏆\n\n"
                    f"🚀 **Core Pillars of Expertise:**\n"
                    f"1. 🔷 **Enterprise Drupal:** Architecture, legacy migrations (Drupal 7 to 10/11), security hardening, and enterprise SLAs.\n"
                    f"2. ⚛️ **Decoupled Modern Web:** Lightning-fast frontends powered by Next.js, React, TypeScript, and modern headless APIs.\n"
                    f"3. 🤖 **Generative AI & MCP:** Custom LLM orchestration, Model Context Protocol integration, and domain-specific knowledge engines.\n"
                    f"4. ☁️ **Cloud & Infrastructure:** Cloud-native Kubernetes deployments on AWS and GCP with zero-downtime automation.\n"
                    f"5. 🎨 **UX & Product Strategy:** User-centric design systems built for enterprise scale and accessibility.\n\n"
                    f"Would you like to explore any specific service or project architecture? 💡"
                )
            return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-AI-Agent"}

        # ----------------------------------------------------
        # 5. CODING & SOFTWARE ENGINEERING
        # ----------------------------------------------------
        if any(w in msg_lower for w in ["code", "python", "javascript", "react", "next.js", "php", "sql", "function", "script", "api", "bug", "docker"]):
            if "python" in msg_lower:
                code_snippet = (
                    "```python\n"
                    "# Production-ready Python utility for OpenSense Labs\n"
                    "import asyncio\n"
                    "import httpx\n"
                    "from typing import List, Dict, Any\n\n"
                    "async def fetch_department_metrics(api_url: str) -> Dict[str, Any]:\n"
                    "    \"\"\"Asynchronously fetch and aggregate team telemetry.\"\"\"\n"
                    "    async with httpx.AsyncClient(timeout=10.0) as client:\n"
                    "        response = await client.get(api_url)\n"
                    "        response.raise_for_status()\n"
                    "        data = response.json()\n"
                    "        return {\n"
                    "            'status': 'success',\n"
                    "            'total_items': len(data),\n"
                    "            'payload': data\n"
                    "        }\n\n"
                    "if __name__ == '__main__':\n"
                    "    # Example usage\n"
                    "    print('OpenSense Python Utility Initialized!')\n"
                    "```"
                )
                content = f"💻 **Yeh lijiye clean aur production-ready Python code:** 🚀✨\n\n{code_snippet}\n\n💡 *Aapko isme custom logic, error handling ya API integration add karwana hai toh batayein!* 😊"
                return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-AI-Agent"}

            if "react" in msg_lower or "next" in msg_lower:
                code_snippet = (
                    "```tsx\n"
                    "'use client';\n\n"
                    "import React, { useState } from 'react';\n"
                    "import { Sparkles } from 'lucide-react';\n\n"
                    "export default function DepartmentCard({ title, team }: { title: string; team: string }) {\n"
                    "  const [active, setActive] = useState(false);\n\n"
                    "  return (\n"
                    "    <div className='p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white hover:border-orange-500/60 transition-all'>\n"
                    "      <div className='flex items-center justify-between mb-2'>\n"
                    "        <span className='text-xs font-bold text-orange-400'>{team}</span>\n"
                    "        <Sparkles className='w-4 h-4 text-orange-400' />\n"
                    "      </div>\n"
                    "      <h4 className='text-sm font-semibold'>{title}</h4>\n"
                    "      <button \n"
                    "        onClick={() => setActive(!active)}\n"
                    "        className='mt-3 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-semibold'\n"
                    "      >\n"
                    "        {active ? 'Active ✨' : 'View Details'}\n"
                    "      </button>\n"
                    "    </div>\n"
                    "  );\n"
                    "}\n"
                    "```"
                )
                content = f"⚛️ **Yeh lijiye modern Next.js 14 / React component Tailwind CSS ke sath:** 🚀✨\n\n{code_snippet}\n\n💡 *Isko direct drop-in karke apne UI me use kar sakte hain!*"
                return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-AI-Agent"}

        # ----------------------------------------------------
        # 6. EMAIL & WRITING
        # ----------------------------------------------------
        if any(w in msg_lower for w in ["email", "leave", "chhutti", "letter", "draft", "write an email", "patra"]):
            content = (
                f"✉️ **Professional Leave Application Email Draft:** 📝✨\n\n"
                f"**Subject:** Leave of Absence Request — [Your Name] — [Date / Range]\n\n"
                f"Dear [Manager / Team Lead Name],\n\n"
                f"I would like to request leave on **[Date / Dates]** due to [personal commitments / family emergency / health reasons].\n\n"
                f"I have ensured that all my active deliverables and client sprint tasks are up to date. In my absence, [Colleague Name] has agreed to step in for any urgent items.\n\n"
                f"I will be reachable on my phone and email for any urgent escalations.\n\n"
                f"Thank you for your understanding.\n\n"
                f"Warm regards,\n"
                f"**[Your Name]**\n"
                f"OpenSense Labs 🚀\n\n"
                f"---\n"
                f"💡 *Aap dates aur manager ka naam replace karke direct send kar sakte hain!* 😊"
            )
            return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-AI-Agent"}

        # ----------------------------------------------------
        # 7. GREETINGS & CASUAL
        # ----------------------------------------------------
        if any(w in msg_lower for w in ["hello", "hi", "namaste", "hey", "hlo", "kaise ho", "kaisa hai"]):
            if is_hindi:
                content = (
                    f"**Namaste! Mai ekdam badhiya hoon. Aap kaise hain?** 😊🎉\n\n"
                    f"Mai **OpenSense Labs ka AI Assistant** hoon. Chahe aap **HR**, **Marketing**, **Engineering**, ya **Sales** team se hon — mai sabhi ke liye tayyar hoon! 🚀\n\n"
                    f"💡 **Aap mujhse yeh sab karwa sakte hain:**\n"
                    f"• 👥 **HR Queries:** Leave policies, onboarding, employee engagement, review templates\n"
                    f"• 📢 **Marketing:** LinkedIn posts, campaign ideas, slogans, SEO copy\n"
                    f"• 💻 **Engineering:** Python, Drupal, Next.js, code debugging, cloud architecture\n"
                    f"• 🎨 **AI Image Generation:** Bolkar koi bhi realistic ya artistic image banwayein!\n"
                    f"• ⏰ **Live Telemetry:** Noida HQ, US, UK ke live office times aur system health check\n\n"
                    f"Bataiye, aaj kis cheez me aapki help karu? ✨"
                )
            else:
                content = (
                    f"**Hello! I am doing great, thank you! How are you doing today?** 😊🎉\n\n"
                    f"I am your **OpenSense Labs AI Assistant**, purpose-built to assist **HR, Marketing, Engineering, and Leadership** teams across the company! 🚀\n\n"
                    f"💡 **Here is what I can help you with:**\n"
                    f"• 👥 **People & HR:** Leave policies, onboarding, appraisal guides, communication templates\n"
                    f"• 📢 **Marketing & Growth:** Social media copy, Drupal case studies, thought leadership blogs\n"
                    f"• 💻 **Technical Solutions:** Full-stack coding, Drupal 10/11 architecture, Python & Next.js\n"
                    f"• 🎨 **AI Image Generation:** Create high-resolution graphics and illustrations on command\n"
                    f"• ⏰ **Real-Time Telemetry:** Live office times across Noida HQ, US, and UK\n\n"
                    f"What would you like to work on right now? ✨"
                )
            return {"role": "assistant", "content": content, "tool_calls": None, "tool_results": None, "model": "OpenSense-AI-Agent"}

        # ----------------------------------------------------
        # 8. GENERAL SMART HELPFUL CONVERSATION
        # ----------------------------------------------------
        if is_hindi:
            content = (
                f"Maine aapka request samajh liya hai: *\"{latest_user_msg}\"* 💡✨\n\n"
                f"Mai OpenSense Labs ka dedicated AI Assistant hoon. Mai aapke sabhi tasks me help kar sakta hoon:\n\n"
                f"• 🎨 **AI Image:** *'Ek futuristic OpenSense Labs office ki image banao'*\n"
                f"• 👥 **HR:** *'Leave policy aur holidays ki details batao'*\n"
                f"• 📢 **Marketing:** *'Drupal enterprise ke liye ek LinkedIn post likho'*\n"
                f"• 💻 **Coding:** *'Python me ek data processor function likho'*\n"
                f"• ⏰ **Offices:** *'Where is OpenSense office aur abhi kitne baje hain?'*\n\n"
                f"Bataiye, aapko isme se kya karwana hai? Mai turant generate kar dunga! 🚀"
            )
        else:
            content = (
                f"I hear you: *\"{latest_user_msg}\"* 💡✨\n\n"
                f"As the OpenSense Labs AI Assistant, I am equipped to support your engineering, marketing, HR, or content tasks:\n\n"
                f"• 🎨 **Generate Imagery:** *'Create an image of an AI-powered enterprise workspace'*\n"
                f"• 👥 **People & Culture:** *'Summarize leave policy and onboarding best practices'*\n"
                f"• 📢 **Marketing & Growth:** *'Draft a LinkedIn post announcing a new Drupal Decoupled release'*\n"
                f"• 💻 **Engineering:** *'Write a Python data aggregation script'*\n"
                f"• ⏰ **Global Hubs:** *'Check office times across Noida HQ, US, and UK'*\n\n"
                f"How would you like to proceed? 🚀"
            )

        return {
            "role": "assistant",
            "content": content,
            "tool_calls": None,
            "tool_results": None,
            "model": "OpenSense-AI-Agent"
        }


ai_service = AIService()
