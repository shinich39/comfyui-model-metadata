"""
@author: shinich39
@title: comfyui-model-metadata
@nickname: comfyui-model-metadata
@version: 1.0.0
@description: Print model metadata on note node
"""

import os
import json
import traceback
import requests
import folder_paths

from server import PromptServer
from aiohttp import web

WEB_DIRECTORY = "./js"
__DIRNAME = os.path.dirname(os.path.abspath(__file__))
REPO_URL = "https://github.com/shinich39/civitai-metadata-json"
INFO_DATA_URL = "https://raw.githubusercontent.com/shinich39/civitai-metadata-json/refs/heads/main/dist/info.json"
CKPT_DATA_URL = "https://raw.githubusercontent.com/shinich39/civitai-metadata-json/refs/heads/main/dist/checkpoint.json"
LORA_DATA_URL = "https://raw.githubusercontent.com/shinich39/civitai-metadata-json/refs/heads/main/dist/lora.json"
CKPT_DATA_PATH = os.path.join(__DIRNAME, "checkpoint.json")
LORA_DATA_PATH = os.path.join(__DIRNAME, "lora.json")
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
  
def get_info_json():
  try:
    info_res = requests.get(INFO_DATA_URL)
    info_data = json.loads(info_res.text)
    return info_data
  except Exception:
    return None

def get_ckpt_json(info):
  data = { "checkpoints": [] }

  # Read data
  if os.path.exists(CKPT_DATA_PATH) == False:
    with open(CKPT_DATA_PATH, "w") as f:
      f.write(json.dumps(data, indent=2))
      f.close()
  else:
    with open(CKPT_DATA_PATH, "r") as file:
      data = json.load(file)

  # Check updates
  prev_time = None
  if "updatedAt" in data:
    prev_time = data["updatedAt"]

  next_time = None
  if "checkpointUpdatedAt" in info:
    next_time = info["checkpointUpdatedAt"]

  # Download data
  try:
    if prev_time == None or prev_time != next_time:
      print(f"[comfyui-model-metadata] checkpoint.json update found: {prev_time} => {next_time}")
      print(f"[comfyui-model-metadata] Downloading checkpoint.json...")

      # Update
      next_res = requests.get(CKPT_DATA_URL)
      next_data = json.loads(next_res .text)
      
      with open(CKPT_DATA_PATH, "w+") as f:
        f.write(json.dumps(next_data))
        f.close()

      print(f"[comfyui-model-metadata] checkpoint.json has been downloaded")

      data = next_data
    else:
      print(f"[comfyui-model-metadata] checkpoint.json not updated yet")
      pass
  except Exception:
    print(f"Failed to connect to {CKPT_DATA_URL}")

  return data["checkpoints"]

def get_lora_json(info):
  data = { "loras": [] }

  # Read data
  if os.path.exists(LORA_DATA_PATH) == False:
    # print(f"[comfyui-model-metadata] lora_latest.json not found")
    with open(LORA_DATA_PATH, "w") as f:
      f.write(json.dumps(data, indent=2))
      f.close()
  else:
    # print(f"[comfyui-model-metadata] Read previous latest.json ")
    with open(LORA_DATA_PATH, "r") as file:
      data = json.load(file)

  # Check updates
  prev_time = None
  if "updatedAt" in data:
    prev_time = data["updatedAt"]

  next_time = None
  if "loraUpdatedAt" in info:
    next_time = info["loraUpdatedAt"]

  # Download data
  try:
    if prev_time == None or prev_time != next_time:
      print(f"[comfyui-model-metadata] lora.json update found: {prev_time} => {next_time}")
      print(f"[comfyui-model-metadata] Downloading lora.json...")

      # Update
      next_res = requests.get(LORA_DATA_URL)
      next_data = json.loads(next_res .text)

      with open(LORA_DATA_PATH, "w+") as f:
        f.write(json.dumps(next_data))
        f.close()

      print(f"[comfyui-model-metadata] lora.json has been downloaded")

      data = next_data
    else:
      print(f"[comfyui-model-metadata] lora.json not updated yet")
      pass
  except Exception:
    print(f"Failed to connect to {LORA_DATA_URL}")

  return data["loras"]

@PromptServer.instance.routes.get("/shinich39/comfyui-model-metadata/load")
async def load(request):
  try:
    info = get_info_json()

    loras = []
    for path in folder_paths.get_filename_list("loras"):
      file_name, file_extension = os.path.splitext(os.path.basename(path))
      loras.append(file_name)

    checkpoints = []
    for path in folder_paths.get_filename_list("checkpoints"):
      file_name, file_extension = os.path.splitext(os.path.basename(path))
      checkpoints.append(file_name)

    res = {
      "data": {
        "loras": get_lora_json(info),
        "checkpoints": get_ckpt_json(info),
      },
      "models": {
        "loras": loras,
        "checkpoints": checkpoints,
      }
    }

    return web.json_response(res)
  except Exception:
    print(traceback.format_exc())
    return web.Response(status=400)

