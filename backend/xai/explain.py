import os
import json
import urllib.request
import urllib.error
from typing import Optional, List


def explain_risk(features, rules_triggered):
    explanations = []
    # rank top 3 contributing features
    return explanations


def _debug_log(message: str) -> None:
    if os.getenv("LLM_DEBUG", "").strip() == "1":
        print(f"[LLM_DEBUG] {message}")


def _post_json(url: str, payload: dict, api_key: str, timeout_seconds: float) -> Optional[dict]:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as exc:
        try:
            err_body = exc.read().decode("utf-8")
        except Exception:
            err_body = "<unreadable>"
        _debug_log(f"HTTPError {exc.code} at {url}: {err_body}")
        try:
            err_json = json.loads(err_body)
            err_text = str(err_json.get("error") or err_body)
        except Exception:
            err_text = err_body
        return {"error": err_text, "_http_status": exc.code}
    except urllib.error.URLError as exc:
        _debug_log(f"URLError at {url}: {exc}")
        if isinstance(getattr(exc, "reason", None), TimeoutError):
            raise TimeoutError("LLM request timed out") from exc
        return None
    except TimeoutError as exc:
        raise TimeoutError("LLM request timed out") from exc
    except Exception as exc:
        _debug_log(f"Unexpected error at {url}: {exc}")
        return None


def _generate_with_ollama(prompt: str, timeout_seconds: float) -> Optional[str]:
    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").strip().rstrip("/")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1:8b").strip()
    ollama_url = f"{ollama_base}/api/generate"

    def _try_generate(model_name: str) -> Optional[str]:
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False,
        }
        data = _post_json(ollama_url, payload, api_key="", timeout_seconds=timeout_seconds)
        if not data:
            return None

        if data.get("error"):
            _debug_log(f"Ollama error for model '{model_name}': {data.get('error')}")
            return None

        response = data.get("response")
        if not response:
            return None
        return str(response).strip()

    def _list_models() -> List[str]:
        tags_url = f"{ollama_base}/api/tags"
        try:
            with urllib.request.urlopen(tags_url, timeout=timeout_seconds) as resp:
                body = resp.read().decode("utf-8")
                data = json.loads(body)
                models = data.get("models") or []
                return [str(m.get("name")).strip() for m in models if m.get("name")]
        except Exception as exc:
            _debug_log(f"Unable to list Ollama models from {tags_url}: {exc}")
            return []

    _debug_log(f"Trying Ollama at {ollama_base} with model '{ollama_model}'")
    result = _try_generate(ollama_model)
    if result:
        return result

    fallback_enabled = os.getenv("OLLAMA_FALLBACK_TO_FIRST_TAG", "1").strip().lower() not in {"0", "false", "no"}
    if not fallback_enabled:
        return None

    installed_models = _list_models()
    if not installed_models:
        return None
    if ollama_model in installed_models:
        return None

    fallback_model = installed_models[0]
    _debug_log(
        f"Configured model '{ollama_model}' not found in local Ollama tags; retrying with '{fallback_model}'"
    )
    return _try_generate(fallback_model)


def generate_llm_explanation(prompt: str, timeout_seconds: float = 6.0) -> Optional[str]:
    """
    Generate an LLM explanation from a prompt.

    LLM configuration:
    - OLLAMA first (local, no key):
      - OLLAMA_BASE_URL: optional (default: http://127.0.0.1:11434)
      - OLLAMA_MODEL: optional (default: llama3.1:8b)
      - LLM_USE_OLLAMA: optional (default: 1)
    - OpenAI-compatible fallback:
    - LLM_API_KEY: required
    - LLM_MODEL: optional (default: gpt-4o-mini)
    - LLM_API_BASE: optional (default: https://api.openai.com/v1)
    """
    use_ollama = os.getenv("LLM_USE_OLLAMA", "1").strip().lower() not in {"0", "false", "no"}

    if use_ollama:
        ollama_result = _generate_with_ollama(prompt, timeout_seconds=timeout_seconds)
        if ollama_result:
            return ollama_result

    api_key = os.getenv("LLM_API_KEY", "").strip()
    model = os.getenv("LLM_MODEL", "gpt-4o-mini").strip()
    api_base = os.getenv("LLM_API_BASE", "https://api.openai.com/v1").strip().rstrip("/")

    if not api_key:
        return None

    # 1) Try Responses API (newer OpenAI-compatible path).
    responses_url = f"{api_base}/responses"
    responses_payload = {
        "model": model,
        "input": [
            {"role": "system", "content": "You are a concise financial risk assistant."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_output_tokens": 280,
    }
    responses_data = _post_json(responses_url, responses_payload, api_key, timeout_seconds)
    if responses_data:
        text = responses_data.get("output_text")
        if isinstance(text, str) and text.strip():
            return text.strip()

    # 2) Fallback to Chat Completions API.
    chat_url = f"{api_base}/chat/completions"
    chat_payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a concise financial risk assistant."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 280,
    }
    chat_data = _post_json(chat_url, chat_payload, api_key, timeout_seconds)
    if not chat_data:
        return None

    choices = chat_data.get("choices") or []
    if not choices:
        return None
    message = choices[0].get("message") or {}
    content = message.get("content")
    if not content:
        return None
    return str(content).strip()
