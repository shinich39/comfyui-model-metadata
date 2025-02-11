# comfyui-model-metadata

Print model metadata on note node

## Usage

#### Checkpoint metadata

1. Right click on Load checkpoint node  
2. Click "Print metadata on Note" 
3. A note with metadata is created on the right  

```
URL: https://civitai.com/models/297501?modelVersionId=357959
Model: WildCardX-XL ANIMATION
Version: WildCardX-XL ANIMATION V2
Updated: 2024-03-03

VAE:
sdxl_vae.safetensors

Size:
832x1216, 831x1216

Steps:
30, 32, 35

CFG scale:
5.5, 7

Sampler:
DPM++ 2M Karras, Euler a

Positive prompt:
photorealistic, high detailed, 8k, smile, tinny cute, luminous, in the ocean, bubbles

Negative prompt:
worst quality, low quality, normal quality, lowres, low details
```

#### Lora metadata

1. Right click on Load lora node
2. Click "Print metadata on Note"
3. A note with metadata is created on the right  

```
URL: https://civitai.com/models/550871?modelVersionId=1134711
Model: [BSS] - Styles for Pony
Version: KRKNK v1.0
Updated: 2024-12-06

Positive prompt:
KRKNK
```


## References  

- [civitai-metadata-json](https://github.com/shinich39/civitai-metadata-json)