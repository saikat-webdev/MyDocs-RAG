import json
from typing import AsyncGenerator, Dict, Any, List
import httpx
from app.core.config import settings
from app.core.logging import logger

class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_MODEL

    async def check_health(self) -> Dict[str, Any]:
        """Check if Ollama service is reachable."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    # Also match without tag e.g. qwen2.5:3b or qwen2.5:3b-latest
                    model_found = any(
                        m == self.model or m.startswith(f"{self.model}:") or self.model.startswith(m.split(":")[0])
                        for m in models
                    )
                    return {
                        "available": True,
                        "model": self.model,
                        "model_present": model_found,
                        "installed_models": models
                    }
                return {
                    "available": False,
                    "model": self.model,
                    "error": f"Ollama returned status code {res.status_code}"
                }
        except Exception as e:
            logger.warning(f"Ollama health check failed: {e}")
            return {
                "available": False,
                "model": self.model,
                "error": "Ollama is not running or unreachable"
            }

    async def generate_stream(
        self,
        prompt: str,
        system: str = "",
        options: Dict[str, Any] = None
    ) -> AsyncGenerator[str, None]:
        """Stream generation response from Ollama."""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system,
            "stream": True,
            "options": options or {
                "temperature": 0.1,  # Low temperature for factual RAG responses
                "top_p": 0.9,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        error_detail = await response.aread()
                        logger.error(f"Ollama API error ({response.status_code}): {error_detail.decode('utf-8', errors='ignore')}")
                        yield f"Error from Ollama ({response.status_code}): Unable to complete request."
                        return

                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            data = json.loads(line)
                            token = data.get("response", "")
                            if token:
                                yield token
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            logger.error("Connection to Ollama failed. Is Ollama running on localhost:11434?")
            yield "Error: Could not connect to local Ollama. Please ensure Ollama is running (`ollama serve`)."
        except Exception as e:
            logger.error(f"Streaming error from Ollama: {e}", exc_info=True)
            yield f"Error during generation: {str(e)}"

ollama_service = OllamaService()
