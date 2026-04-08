from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict, deque
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import httpx
import json
import re
import os
import asyncio
import psutil

app = FastAPI(title="AI Factory")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA = "http://localhost:11434"

# Minimum free RAM (bytes) required before running a node.
# If available RAM drops below this, execution is aborted.
RAM_ABORT_THRESHOLD_GB = 1.5
SWAP_WARN_THRESHOLD_GB = 0.5  # warn if swap usage exceeds this


# ── Model RAM estimator ──────────────────────────────────────────────────────

# Known overrides (model substring → approx GB needed at Q4)
_KNOWN_RAM: Dict[str, float] = {
    "tinyllama": 0.8,
    "phi3:mini": 2.3,
    "phi3": 2.3,
    "phi4": 9.0,
    "gemma:2b": 1.6,
    "gemma2:2b": 1.6,
    "gemma2:9b": 5.5,
    "gemma2:27b": 16.0,
    "gemma4:4b": 2.5,
    "gemma4:12b": 7.5,
    "gemma4:27b": 17.0,
    "llama3.2:1b": 1.3,
    "llama3.2:3b": 2.0,
    "llama3.1:8b": 4.7,
    "llama3.1:70b": 42.0,
    "llama3:8b": 4.7,
    "llama3:70b": 42.0,
    "mistral:7b": 4.1,
    "mistral": 4.1,
    "mixtral:8x7b": 26.0,
    "qwen2.5:0.5b": 0.7,
    "qwen2.5:1.5b": 1.2,
    "qwen2.5:3b": 2.0,
    "qwen2.5:7b": 4.4,
    "qwen2.5:14b": 8.5,
    "qwen2.5:32b": 19.0,
    "qwen2.5:72b": 43.0,
    "deepseek-r1:1.5b": 1.2,
    "deepseek-r1:7b": 4.4,
    "deepseek-r1:8b": 4.7,
    "deepseek-r1:14b": 8.5,
    "deepseek-r1:32b": 19.0,
    "deepseek-r1:70b": 42.0,
    "codegemma:7b": 4.2,
    "codellama:7b": 4.1,
    "codellama:13b": 7.8,
    "nomic-embed-text": 0.3,
}

# Approximate RAM per billion parameters (Q4 quantized, with overhead)
_RAM_PER_B = {
    (0, 3): 0.65,
    (3, 10): 0.60,
    (10, 40): 0.62,
    (40, 9999): 0.60,
}


def estimate_model_ram_gb(model_name: str) -> float:
    name = model_name.lower().strip()

    # Exact / prefix match in known table
    for key, val in _KNOWN_RAM.items():
        if name == key or name.startswith(key + ":") or name == key.split(":")[0]:
            return val

    # Parse parameter count from name (e.g. "7b", "13b", "0.5b")
    match = re.search(r"(\d+(?:\.\d+)?)b", name)
    if match:
        params = float(match.group(1))
        for (lo, hi), ratio in _RAM_PER_B.items():
            if lo <= params < hi:
                return round(params * ratio + 0.3, 1)  # +0.3 GB base overhead

    return 2.0  # conservative unknown default


def suggest_smaller_models(available_gb: float, all_models: List[str]) -> List[str]:
    """Return models from the installed list that fit within available RAM."""
    return [m for m in all_models if estimate_model_ram_gb(m) <= available_gb * 0.85]


# ── System stats ─────────────────────────────────────────────────────────────

def get_system_stats() -> dict:
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    cpu = psutil.cpu_percent(interval=None)
    return {
        "ram_total_gb": round(mem.total / 1024 ** 3, 1),
        "ram_used_gb": round(mem.used / 1024 ** 3, 1),
        "ram_available_gb": round(mem.available / 1024 ** 3, 1),
        "ram_percent": round(mem.percent, 1),
        "cpu_percent": round(cpu, 1),
        "swap_total_gb": round(swap.total / 1024 ** 3, 1),
        "swap_used_gb": round(swap.used / 1024 ** 3, 1),
        "swap_percent": round(swap.percent, 1),
    }


# ── API endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health(ollama_url: str = OLLAMA):
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            await c.get(f"{ollama_url}/api/tags")
        return {"ollama": True}
    except Exception:
        return {"ollama": False}


@app.get("/api/models")
async def get_models(ollama_url: str = OLLAMA):
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(f"{ollama_url}/api/tags")
            data = r.json()
            models = [m["name"] for m in data.get("models", [])]
            # Attach RAM estimates
            return {
                "models": models,
                "ram_estimates": {m: estimate_model_ram_gb(m) for m in models},
            }
    except Exception as e:
        return {"models": [], "ram_estimates": {}, "error": str(e)}


@app.get("/api/system")
async def system_stats():
    stats = get_system_stats()
    # Attach per-node risk assessment if caller wants
    stats["abort_threshold_gb"] = RAM_ABORT_THRESHOLD_GB
    stats["swap_warn_threshold_gb"] = SWAP_WARN_THRESHOLD_GB
    return stats


@app.get("/api/model-ram")
async def model_ram(model: str):
    ram = estimate_model_ram_gb(model)
    stats = get_system_stats()
    safe = stats["ram_available_gb"] >= ram + 1.0
    return {
        "model": model,
        "estimated_ram_gb": ram,
        "available_ram_gb": stats["ram_available_gb"],
        "safe_to_run": safe,
    }


@app.get("/api/models/detail")
async def models_detail():
    """Return installed models with size info from Ollama."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(f"{OLLAMA}/api/tags")
            data = r.json()
            models = data.get("models", [])
            return {
                "models": [
                    {
                        "name": m["name"],
                        "size_gb": round(m.get("size", 0) / 1024 ** 3, 2),
                        "modified_at": m.get("modified_at", ""),
                        "estimated_ram_gb": estimate_model_ram_gb(m["name"]),
                    }
                    for m in models
                ]
            }
    except Exception as e:
        return {"models": [], "error": str(e)}


@app.delete("/api/models/{model_name:path}")
async def delete_model(model_name: str):
    try:
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.request("DELETE", f"{OLLAMA}/api/delete", json={"name": model_name})
            if r.status_code in (200, 204):
                return {"success": True}
            return {"success": False, "error": r.text}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.websocket("/ws/pull")
async def ws_pull(ws: WebSocket):
    """Stream model pull progress from Ollama."""
    await ws.accept()
    try:
        data = await ws.receive_json()
        model = data.get("model", "").strip()
        if not model:
            await ws.send_json({"type": "error", "message": "모델 이름이 없습니다."})
            return

        await ws.send_json({"type": "start", "model": model})

        async with httpx.AsyncClient(timeout=3600.0) as c:
            async with c.stream(
                "POST", f"{OLLAMA}/api/pull", json={"name": model, "stream": True}
            ) as r:
                async for line in r.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        status = chunk.get("status", "")
                        total = chunk.get("total", 0)
                        completed = chunk.get("completed", 0)
                        pct = round(completed / total * 100, 1) if total else 0

                        await ws.send_json({
                            "type": "progress",
                            "status": status,
                            "total": total,
                            "completed": completed,
                            "percent": pct,
                        })

                        if status == "success":
                            await ws.send_json({"type": "done", "model": model})
                            return
                    except Exception:
                        pass

        await ws.send_json({"type": "done", "model": model})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


# ── Workflow engine ───────────────────────────────────────────────────────────

class NodeData(BaseModel):
    id: str
    name: str
    node_type: str = "agent"
    role: str = ""
    model: str = ""
    return_type: str = "text"


class UtilityNodeData(BaseModel):
    id: str
    name: str
    node_type: str = "utility"
    kind: str = ""
    config: Dict[str, Any] = {}


class EdgeData(BaseModel):
    source: str
    target: str


class Workflow(BaseModel):
    nodes: List[NodeData]
    utility_nodes: List[UtilityNodeData] = []
    edges: List[EdgeData]
    initial_input: str
    ollama_url: str = OLLAMA


def topo_sort(node_ids: List[str], edges: List[EdgeData]) -> List[str]:
    graph: Dict[str, List[str]] = defaultdict(list)
    in_deg = {n: 0 for n in node_ids}
    for e in edges:
        if e.source in in_deg and e.target in in_deg:
            graph[e.source].append(e.target)
            in_deg[e.target] += 1
    q = deque([n for n in node_ids if in_deg[n] == 0])
    order = []
    while q:
        n = q.popleft()
        order.append(n)
        for m in graph[n]:
            in_deg[m] -= 1
            if in_deg[m] == 0:
                q.append(m)
    return order


def check_memory(node: NodeData) -> Optional[dict]:
    """
    Returns a warning dict if memory is unsafe, None if OK.
    Checks both absolute free RAM and swap activity.
    """
    stats = get_system_stats()
    available = stats["ram_available_gb"]
    swap_used = stats["swap_used_gb"]
    model_need = estimate_model_ram_gb(node.model)
    issues = []

    if available < RAM_ABORT_THRESHOLD_GB:
        issues.append(
            f"가용 RAM {available:.1f}GB — 최소 {RAM_ABORT_THRESHOLD_GB}GB 필요"
        )

    if available < model_need + 0.5:
        issues.append(
            f"모델 '{node.model}'은 약 {model_need:.1f}GB가 필요하지만 "
            f"{available:.1f}GB만 남아있음"
        )

    if swap_used > SWAP_WARN_THRESHOLD_GB:
        issues.append(
            f"스왑 {swap_used:.1f}GB 사용 중 — 이미 물리 RAM 부족 상태"
        )

    if issues:
        return {
            "type": "memory_abort",
            "node_id": node.id,
            "node_name": node.name,
            "model": node.model,
            "available_gb": available,
            "model_need_gb": model_need,
            "swap_used_gb": swap_used,
            "issues": issues,
            "stats": stats,
        }
    return None


# ── Utility node executors ────────────────────────────────────────────────────

async def run_tts(ws: WebSocket, node: UtilityNodeData, text: str) -> str:
    cfg = node.config
    provider = cfg.get("provider", "macOS TTS")
    output_path = cfg.get("output_path", "./output/audio.mp3")
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    await ws.send_json({"type": "token", "node_id": node.id, "token": f"[TTS] {provider}로 음성 생성 중...\n"})

    if provider == "macOS TTS":
        import shutil
        if not shutil.which("say"):
            raise ValueError("macOS TTS(say 명령)를 찾을 수 없습니다. macOS에서만 사용 가능합니다.")
        aiff_path = output_path.rsplit(".", 1)[0] + ".aiff"
        proc = await asyncio.create_subprocess_exec(
            "say", "-o", aiff_path, "--", text,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        await proc.wait()
        # Try converting to mp3 via ffmpeg
        if output_path.endswith(".mp3") and os.path.exists(aiff_path):
            conv = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y", "-i", aiff_path, output_path,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            await conv.wait()
            if os.path.exists(aiff_path):
                os.remove(aiff_path)
        result_path = output_path if os.path.exists(output_path) else aiff_path
        result = f"음성 파일 생성 완료: {result_path}"

    elif provider == "ElevenLabs":
        api_key = cfg.get("api_key", "")
        voice_id = cfg.get("voice_id", "pNInz6obpgDQGcFmaJgB")
        if not api_key:
            raise ValueError("ElevenLabs API 키가 설정되지 않았습니다.")
        async with httpx.AsyncClient(timeout=60.0) as c:
            r = await c.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={"xi-api-key": api_key, "Content-Type": "application/json"},
                json={"text": text, "model_id": "eleven_multilingual_v2"},
            )
            if r.status_code != 200:
                raise ValueError(f"ElevenLabs 오류 {r.status_code}: {r.text[:200]}")
            with open(output_path, "wb") as f:
                f.write(r.content)
        result = f"음성 파일 생성 완료: {output_path}"

    elif provider == "OpenAI TTS":
        api_key = cfg.get("api_key", "")
        if not api_key:
            raise ValueError("OpenAI API 키가 설정되지 않았습니다.")
        async with httpx.AsyncClient(timeout=60.0) as c:
            r = await c.post(
                "https://api.openai.com/v1/audio/speech",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "tts-1", "input": text, "voice": "alloy"},
            )
            if r.status_code != 200:
                raise ValueError(f"OpenAI TTS 오류 {r.status_code}: {r.text[:200]}")
            with open(output_path, "wb") as f:
                f.write(r.content)
        result = f"음성 파일 생성 완료: {output_path}"
    else:
        result = f"[TTS] 지원하지 않는 서비스: {provider}"

    await ws.send_json({"type": "token", "node_id": node.id, "token": result})
    return result


async def run_image_gen(ws: WebSocket, node: UtilityNodeData, prompts_text: str) -> str:
    cfg = node.config
    provider = cfg.get("provider", "Stable Diffusion")
    api_url  = cfg.get("api_url",  "http://localhost:7860")
    api_key  = cfg.get("api_key",  "")
    count    = int(cfg.get("count", 5))
    output_dir = cfg.get("output_dir", "./output/images/")
    os.makedirs(output_dir, exist_ok=True)

    prompts = [l.strip().lstrip("0123456789.-) ") for l in prompts_text.splitlines() if l.strip()]
    prompts = [p for p in prompts if p][:count]
    if not prompts:
        raise ValueError("이미지 프롬프트가 없습니다.")

    generated = []
    for i, prompt in enumerate(prompts):
        await ws.send_json({"type": "token", "node_id": node.id,
                            "token": f"이미지 {i+1}/{len(prompts)} 생성 중...\n"})

        if provider == "Stable Diffusion":
            try:
                async with httpx.AsyncClient(timeout=120.0) as c:
                    r = await c.post(f"{api_url}/sdapi/v1/txt2img", json={
                        "prompt": prompt, "steps": 20,
                        "width": 576, "height": 1024,
                    })
                    if r.status_code != 200:
                        raise ValueError(f"SD API 오류 {r.status_code}: {r.text[:200]}")
                    import base64
                    img_b64 = r.json()["images"][0]
                    img_path = os.path.join(output_dir, f"image_{i+1:03d}.png")
                    with open(img_path, "wb") as f:
                        f.write(base64.b64decode(img_b64))
                    generated.append(img_path)
            except httpx.ConnectError:
                raise ValueError(
                    f"Stable Diffusion에 연결할 수 없습니다 ({api_url})\n\n"
                    "해결 방법:\n"
                    "1. AUTOMATIC1111 webui를 --api 플래그로 실행하세요:\n"
                    "   ./webui.sh --api\n"
                    "2. 또는 ConfigPanel에서 서비스를 DALL-E 3으로 변경하고 OpenAI API 키를 입력하세요."
                )

        elif provider == "ComfyUI":
            try:
                import uuid, base64 as b64
                prompt_id = str(uuid.uuid4())[:8]
                workflow = {
                    "3": {"inputs": {"seed": 42, "steps": 20, "cfg": 7,
                                     "sampler_name": "euler", "scheduler": "normal",
                                     "denoise": 1, "model": ["4", 0],
                                     "positive": ["6", 0], "negative": ["7", 0],
                                     "latent_image": ["5", 0]}, "class_type": "KSampler"},
                    "4": {"inputs": {"ckpt_name": "v1-5-pruned-emaonly.ckpt"}, "class_type": "CheckpointLoaderSimple"},
                    "5": {"inputs": {"width": 576, "height": 1024, "batch_size": 1}, "class_type": "EmptyLatentImage"},
                    "6": {"inputs": {"text": prompt, "clip": ["4", 1]}, "class_type": "CLIPTextEncode"},
                    "7": {"inputs": {"text": "blurry, ugly, low quality", "clip": ["4", 1]}, "class_type": "CLIPTextEncode"},
                    "8": {"inputs": {"samples": ["3", 0], "vae": ["4", 2]}, "class_type": "VAEDecode"},
                    "9": {"inputs": {"filename_prefix": f"ai_factory_{i+1:03d}", "images": ["8", 0]}, "class_type": "SaveImage"},
                }
                async with httpx.AsyncClient(timeout=120.0) as c:
                    r = await c.post(f"{api_url}/prompt", json={"prompt": workflow})
                    if r.status_code != 200:
                        raise ValueError(f"ComfyUI 오류: {r.text[:200]}")
                    pid = r.json().get("prompt_id")
                    # Poll for completion
                    for _ in range(60):
                        await asyncio.sleep(2)
                        hr = await c.get(f"{api_url}/history/{pid}")
                        hist = hr.json()
                        if pid in hist:
                            imgs = hist[pid]["outputs"]["9"]["images"]
                            fn = imgs[0]["filename"]
                            ir = await c.get(f"{api_url}/view", params={"filename": fn})
                            img_path = os.path.join(output_dir, f"image_{i+1:03d}.png")
                            with open(img_path, "wb") as f:
                                f.write(ir.content)
                            generated.append(img_path)
                            break
            except httpx.ConnectError:
                raise ValueError(
                    f"ComfyUI에 연결할 수 없습니다 ({api_url})\n"
                    "실행: python main.py --port 7860"
                )

        elif provider == "DALL-E 3":
            if not api_key:
                raise ValueError("DALL-E 3 사용 시 OpenAI API 키가 필요합니다.")
            async with httpx.AsyncClient(timeout=120.0) as c:
                r = await c.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"model": "dall-e-3", "prompt": prompt,
                          "size": "1024x1792", "n": 1},
                )
                if r.status_code != 200:
                    raise ValueError(f"DALL-E 오류: {r.text[:200]}")
                import urllib.request
                img_url = r.json()["data"][0]["url"]
                img_path = os.path.join(output_dir, f"image_{i+1:03d}.png")
                urllib.request.urlretrieve(img_url, img_path)
                generated.append(img_path)
        else:
            generated.append(f"[stub] {output_dir}image_{i+1:03d}.png")

    summary = f"이미지 {len(generated)}개 생성 완료:\n" + "\n".join(generated)
    await ws.send_json({"type": "token", "node_id": node.id, "token": summary})
    return summary


async def run_file_save(ws: WebSocket, node: UtilityNodeData, content: str) -> str:
    cfg = node.config
    output_path = cfg.get("output_path", "./output/file.txt")
    encoding    = cfg.get("encoding", "utf-8")
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    with open(output_path, "w", encoding=encoding) as f:
        f.write(content)

    result = f"파일 저장 완료: {output_path} ({len(content)} 바이트)"
    await ws.send_json({"type": "token", "node_id": node.id, "token": result})
    return result


async def run_video_compose(ws: WebSocket, node: UtilityNodeData, inp: str) -> str:
    import glob as glob_module
    cfg = node.config
    images_dir    = cfg.get("images_dir",    "./output/images/")
    audio_path    = cfg.get("audio_path",    "./output/audio.mp3")
    subtitle_path = cfg.get("subtitle_path", "./output/subtitles.srt")
    bgm_path      = cfg.get("bgm_path",      "")
    output_path   = cfg.get("output_path",   "./output/video.mp4")
    resolution    = cfg.get("resolution",    "1080x1920")
    fps           = int(cfg.get("fps",       30))
    img_duration  = int(cfg.get("img_duration", 3))

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    w, h = resolution.split("x")

    images = sorted(
        glob_module.glob(os.path.join(images_dir, "*.png")) +
        glob_module.glob(os.path.join(images_dir, "*.jpg")) +
        glob_module.glob(os.path.join(images_dir, "*.jpeg"))
    )
    if not images:
        raise ValueError(f"이미지를 찾을 수 없습니다: {images_dir}")

    await ws.send_json({"type": "token", "node_id": node.id,
                        "token": f"ffmpeg로 영상 조합 중... ({len(images)}개 이미지)\n"})

    concat_path = "./output/_concat.txt"
    with open(concat_path, "w") as f:
        for img in images:
            f.write(f"file '{os.path.abspath(img)}'\n")
            f.write(f"duration {img_duration}\n")

    vf = f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2"
    if os.path.exists(subtitle_path):
        abs_sub = os.path.abspath(subtitle_path).replace("\\", "/").replace(":", "\\:")
        vf += f",subtitles='{abs_sub}'"

    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_path]
    if os.path.exists(audio_path):
        cmd += ["-i", audio_path]
        if bgm_path and os.path.exists(bgm_path):
            cmd += ["-i", bgm_path,
                    "-filter_complex", "[1:a][2:a]amix=inputs=2:duration=first[a]",
                    "-map", "0:v", "-map", "[a]"]
        else:
            cmd += ["-map", "0:v", "-map", "1:a"]
    cmd += ["-vf", vf, "-r", str(fps), "-shortest",
            "-c:v", "libx264", "-c:a", "aac", output_path]

    import shutil
    if not shutil.which("ffmpeg"):
        raise ValueError(
            "ffmpeg를 찾을 수 없습니다.\n"
            "설치: brew install ffmpeg  (macOS)\n"
            "또는: sudo apt install ffmpeg  (Linux)"
        )
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise ValueError(f"ffmpeg 오류:\n{stderr.decode()[-500:]}")

    if os.path.exists(concat_path):
        os.remove(concat_path)

    result = f"영상 생성 완료: {output_path}"
    await ws.send_json({"type": "token", "node_id": node.id, "token": result})
    return result


async def run_youtube_upload(ws: WebSocket, node: UtilityNodeData, metadata_text: str) -> str:
    cfg = node.config
    video_path       = cfg.get("video_path",       "./output/video.mp4")
    credentials_path = cfg.get("credentials_path", "./credentials.json")
    privacy          = cfg.get("privacy",          "private")
    category         = cfg.get("category",         "22")

    if not os.path.exists(video_path):
        raise ValueError(f"영상 파일을 찾을 수 없습니다: {video_path}")
    if not os.path.exists(credentials_path):
        raise ValueError(
            f"인증 파일이 없습니다: {credentials_path}\n"
            "OAuth2 credentials.json을 해당 경로에 준비하세요.\n"
            "참고: https://developers.google.com/youtube/v3/guides/uploading_a_video"
        )

    # Parse title / description / tags from AI output
    title = "AI Factory — YouTube Shorts"
    description = metadata_text
    tags = []
    for line in metadata_text.splitlines():
        if line.startswith("제목:") or line.lower().startswith("title:"):
            title = line.split(":", 1)[1].strip()
        elif line.startswith("태그:") or line.lower().startswith("tags:"):
            tags = [t.strip().lstrip("#") for t in line.split(":", 1)[1].split(",")]

    await ws.send_json({"type": "token", "node_id": node.id,
                        "token": f"YouTube 업로드 중...\n제목: {title}\n"})

    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
    except ImportError:
        raise ValueError(
            "google-api-python-client 패키지가 필요합니다:\n"
            "pip install google-api-python-client google-auth-oauthlib"
        )

    with open(credentials_path) as f:
        creds_data = json.load(f)

    creds = Credentials(
        token=creds_data.get("token"),
        refresh_token=creds_data.get("refresh_token"),
        client_id=creds_data.get("client_id"),
        client_secret=creds_data.get("client_secret"),
        token_uri="https://oauth2.googleapis.com/token",
    )
    youtube = build("youtube", "v3", credentials=creds)
    body = {
        "snippet": {"title": title, "description": description,
                    "tags": tags, "categoryId": category},
        "status": {"privacyStatus": privacy},
    }
    media = MediaFileUpload(video_path, mimetype="video/mp4", resumable=True)

    loop = asyncio.get_event_loop()
    def do_upload():
        req = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
        resp = None
        while resp is None:
            _, resp = req.next_chunk()
        return resp

    response = await loop.run_in_executor(None, do_upload)
    video_id = response.get("id", "")
    url = f"https://youtu.be/{video_id}"
    result = f"업로드 완료!\n{url}"
    await ws.send_json({"type": "token", "node_id": node.id, "token": result})
    return result


async def execute_utility_node(ws: WebSocket, node: UtilityNodeData, inp: str) -> str:
    kind = node.kind
    if kind == "tts":
        return await run_tts(ws, node, inp)
    elif kind == "image_gen":
        return await run_image_gen(ws, node, inp)
    elif kind == "file_save":
        return await run_file_save(ws, node, inp)
    elif kind == "video_compose":
        return await run_video_compose(ws, node, inp)
    elif kind == "youtube_upload":
        return await run_youtube_upload(ws, node, inp)
    else:
        result = f"[알 수 없는 유틸리티 종류: {kind}]"
        await ws.send_json({"type": "token", "node_id": node.id, "token": result})
        return result


async def stream_node(ws: WebSocket, node: NodeData, user_msg: str, ollama_url: str = OLLAMA) -> str:
    system = f"You are {node.name}. Your role: {node.role}"
    if node.return_type == "json":
        system += "\nRespond ONLY with valid JSON, no other text."
    elif node.return_type == "bullet":
        system += "\nRespond with a concise bullet-point list only."
    elif node.return_type == "korean":
        system += "\n반드시 한국어로만 답변하세요."
    elif node.return_type == "tasklist":
        system += (
            "\n반드시 작업 목록(체크리스트) 형식으로만 응답하세요. "
            "각 항목은 새 줄에 '- ' 또는 '1. ' 형식으로 시작해야 합니다. "
            "예시:\n- 첫 번째 작업\n- 두 번째 작업\n- 세 번째 작업\n"
            "설명이나 서론 없이 목록만 출력하세요."
        )

    payload = {
        "model": node.model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        "stream": True,
    }

    full = ""
    async with httpx.AsyncClient(timeout=300.0) as c:
        async with c.stream("POST", f"{ollama_url}/api/chat", json=payload) as r:
            async for line in r.aiter_lines():
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        full += token
                        await ws.send_json(
                            {"type": "token", "node_id": node.id, "token": token}
                        )
                except Exception:
                    pass
    return full


@app.websocket("/ws/run")
async def ws_run(ws: WebSocket):
    await ws.accept()
    try:
        raw = await ws.receive_json()
        wf = Workflow(**raw)

        # Build unified node maps
        agent_map:   Dict[str, NodeData]        = {n.id: n for n in wf.nodes}
        utility_map: Dict[str, UtilityNodeData] = {n.id: n for n in wf.utility_nodes}
        all_node_ids = list(agent_map.keys()) + list(utility_map.keys())

        # Predecessors across all node types
        predecessors: Dict[str, List[str]] = defaultdict(list)
        all_ids_set = set(all_node_ids)
        for e in wf.edges:
            if e.source in all_ids_set and e.target in all_ids_set:
                predecessors[e.target].append(e.source)

        order = topo_sort(all_node_ids, wf.edges)
        outputs: Dict[str, str] = {}

        # Name lookup for predecessor labels
        def node_name(nid: str) -> str:
            if nid in agent_map:   return agent_map[nid].name
            if nid in utility_map: return utility_map[nid].name
            return nid

        # Send initial system snapshot
        await ws.send_json({"type": "system_stats", **get_system_stats()})

        for node_id in order:
            preds = predecessors[node_id]
            is_agent   = node_id in agent_map
            is_utility = node_id in utility_map

            # ── Memory safety check (AI nodes only) ─────────────────────
            if is_agent:
                mem_issue = check_memory(agent_map[node_id])
                if mem_issue:
                    await ws.send_json(mem_issue)
                    return

            # ── Build input string ───────────────────────────────────────
            if not preds:
                inp = wf.initial_input
            elif len(preds) == 1:
                prev = outputs.get(preds[0], '')
                inp = (
                    f"[원래 요청사항]\n{wf.initial_input}\n\n"
                    f"[{node_name(preds[0])}의 결과]\n{prev}"
                )
            else:
                parts = [
                    f"[{node_name(p)}의 결과]\n{outputs.get(p, '')}"
                    for p in preds
                ]
                inp = (
                    f"[원래 요청사항]\n{wf.initial_input}\n\n"
                    + "\n\n---\n\n".join(parts)
                )

            # Send node_start
            await ws.send_json({
                "type": "node_start",
                "node_id": node_id,
                **get_system_stats(),
            })

            try:
                if is_agent:
                    out = await stream_node(ws, agent_map[node_id], inp, wf.ollama_url)
                elif is_utility:
                    # For utility nodes, pass only the direct predecessor output (not wrapped)
                    if len(preds) == 1:
                        direct_inp = outputs.get(preds[0], wf.initial_input)
                    elif preds:
                        direct_inp = "\n\n".join(outputs.get(p, '') for p in preds)
                    else:
                        direct_inp = wf.initial_input
                    out = await execute_utility_node(ws, utility_map[node_id], direct_inp)
                else:
                    out = ""

                outputs[node_id] = out
                post_stats = get_system_stats()
                await ws.send_json({
                    "type": "node_done",
                    "node_id": node_id,
                    "output": out,
                    **post_stats,
                })

                if post_stats["swap_used_gb"] > SWAP_WARN_THRESHOLD_GB:
                    await ws.send_json({
                        "type": "swap_warning",
                        "node_id": node_id,
                        "swap_used_gb": post_stats["swap_used_gb"],
                        "available_gb": post_stats["ram_available_gb"],
                    })

            except Exception as e:
                await ws.send_json(
                    {"type": "node_error", "node_id": node_id, "error": str(e)}
                )
                return

        # Final output = last executed node's output (prefer last agent node)
        last_agent = next((nid for nid in reversed(order) if nid in agent_map), None)
        final = outputs.get(last_agent or (order[-1] if order else ""), "")
        await ws.send_json({
            "type": "done",
            "final": final,
            "outputs": outputs,
            **get_system_stats(),
        })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
