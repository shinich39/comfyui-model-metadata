"use strict";

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_TYPE = "ModelMetadata";
const MIN_LABEL_LENGTH = 0;
const META_KEYS = {
  "vae":       `${"VAE".padEnd(MIN_LABEL_LENGTH, " ")}:`,
  "size":      `${"Size".padEnd(MIN_LABEL_LENGTH, " ")}:`,
  "seed":      `${"Seed".padEnd(MIN_LABEL_LENGTH, " ")}:`,
  "steps":     `${"Steps".padEnd(MIN_LABEL_LENGTH, " ")}:`,
  "cfg":       `${"CFG scale".padEnd(MIN_LABEL_LENGTH, " ")}:`,
  "sampler":   `${"Sampler".padEnd(MIN_LABEL_LENGTH, " ")}:`,
  "scheduler": `${"Scheduler".padEnd(MIN_LABEL_LENGTH, " ")}:`,
  "strength":  `${"Denoising strength".padEnd(MIN_LABEL_LENGTH, " ")}:`,
  "denoise":   `${"Denoising strength".padEnd(MIN_LABEL_LENGTH, " ")}:`,
  "pp":        `${"Positive prompt".padEnd(MIN_LABEL_LENGTH, " ")}:`,
  "np":        `${"Negative prompt".padEnd(MIN_LABEL_LENGTH, " ")}:`,
};

const PRIORITY = [
  "vae",
  "size",
  "seed",
  "steps",
  "cfg",
  "sampler",
  "scheduler",
  "strength",
  "pp",
  "np",
];

const CKPT_TYPES = [
  "CheckpointLoaderSimple",
  "Load Checkpoint",
  "CheckpointLoader|pysssss",
  "Checkpoint Loader", // WAS
  "CheckpointLoaderSimpleShared //Inspire",
];

const LORA_TYPES = [
  "LoraLoader",
  "LoraLoaderModelOnly",
  "LoraLoader|pysssss",
  "Load Lora", // WAS
  "Lora Loader", // WAS
  "LoraLoaderBlockWeight //Inspire",
];

let loras = [];
let checkpoints = [];

async function load() {
  const response = await api.fetchApi(`/shinich39/comfyui-model-metadata/load`, {
    method: "GET",
    headers: { "Content-Type": "application/json", },
  });

  if (response.status !== 200) {
    throw new Error(response.statusText);
  }

  const d = await response.json();

  return d;
}

function findData(models, filename) {
  if (typeof filename == "object" && typeof filename.content == "string") {
    filename = filename.content;
  }
  if (!models || typeof filename != "string") {
    return {};
  }

  filename = filename.split(".").slice(0, filename.split(".").length - 1).join(".");

  for (const m of models) {
    for (const v of m.versions) {
      if (v.files.indexOf(filename) > -1) {
        return {
          model: m,
          version: v,
        }
      }
    }
  }

  return {};
}

function createContent(model, version) {
  let str = "";
  str += `URL: https://civitai.com/models/${model.id}?modelVersionId=${version.id}\n`;
  str += `Model: ${model.name}\n`;
  str += `Version: ${version.name}\n`;
  str += `Updated: ${new Date(version.updatedAt).toISOString().substring(0, 10)}\n\n`;

  const entries = Object.entries(version.meta);
  entries.sort((a, b) => {
    return PRIORITY.indexOf(a[0]) - PRIORITY.indexOf(b[0]);
  });
  for (const [key, values] of entries) {
    if (META_KEYS[key] && values.length > 0) {
      str += META_KEYS[key] + "\n" + values.join(", ") + "\n\n";
    }
  }
  return str.trim();
}

function createNote(str, x, y) {
  let newNode = LiteGraph.createNode("Note");
  newNode.pos = [x, y];
  newNode.size = [512, 384];
  newNode.widgets[0].value = str;
  app.canvas.graph.add(newNode, false);
  app.canvas.selectNode(newNode);
  return newNode;
}

function openURL(url) {
  window.open(url, '_blank').focus();
}

app.registerExtension({
	name: `shinich39.${NODE_TYPE}`,
  setup() {
    load().then(({ data, models }) => {
      // console.log(data);
      // console.log(models);

      checkpoints = data?.checkpoints || [];      
      if (data?.checkpoints && models?.checkpoints) {
        checkpoints = checkpoints.filter((c) => {
          let isExists = false;
          for (const v of c.versions) {
            for (const f of v.files) {
              if (models.checkpoints.indexOf(f) > -1) {
                isExists = true;
              }

              if (isExists) {
                break;
              }
            }
            if (isExists) {
              break;
            }
          }
          return isExists;
        });
      }

      loras = data?.loras || [];
      if (data?.loras && models?.loras) {
        loras = loras.filter((c) => {
          let isExists = false;
          for (const v of c.versions) {
            for (const f of v.files) {
              if (models.loras.indexOf(f) > -1) {
                isExists = true;
              }

              if (isExists) {
                break;
              }
            }
            if (isExists) {
              break;
            }
          }
          return isExists;
        });
      }
    });
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
		const isCkpt = CKPT_TYPES.indexOf(nodeType.comfyClass) > -1;
		const isLora = LORA_TYPES.indexOf(nodeType.comfyClass) > -1;
    if (isCkpt) {
      const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
      nodeType.prototype.getExtraMenuOptions = function (_, options) {
        const r = origGetExtraMenuOptions ? origGetExtraMenuOptions.apply(this, arguments) : undefined;

        try {
          const ckptWidget = this.widgets.find((w) => w.name == "ckpt_name");
          if (!ckptWidget) {
            return r;
          }
  
          const ckptName = ckptWidget.value;
          const { model, version } = findData(checkpoints, ckptName);

          let optionIndex = options.findIndex((o) => o?.content === "Properties");
          if (optionIndex > -1) {
            let newOptions = [
              {
                content: "Print metadata on Note",
                disabled: !(model && version),
                callback: () => {
                  createNote(createContent(model, version), this.pos[0] + this.size[0] + 16, this.pos[1]);
                }
              }, {
                content: "Open civitai in a new tab",
                disabled: !(model && version),
                callback: () => {
                  openURL(`https://civitai.com/models/${model.id}?modelVersionId=${version.id}`);
                }
              },
            ];
            
            options.splice(
              optionIndex,
              0,
              ...newOptions
            );
          }
        } catch(err) {
          console.error(err);
        }

        return r;
      } 
    } else if (isLora) {
      const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
      nodeType.prototype.getExtraMenuOptions = function (_, options) {
        const r = origGetExtraMenuOptions ? origGetExtraMenuOptions.apply(this, arguments) : undefined;

        try {
          const loraWidget = this.widgets.find((w) => w.name == "lora_name");
          if (!loraWidget) {
            return r;
          }
  
          const loraName = loraWidget.value;
          const { model, version } = findData(loras, loraName);

          let optionIndex = options.findIndex((o) => o?.content === "Properties");
          if (optionIndex > -1) {
            let newOptions = [
              {
                content: "Print metadata on Note",
                disabled: !(model && version),
                callback: () => {
                  createNote(createContent(model, version), this.pos[0] + this.size[0] + 16, this.pos[1]);
                }
              }, {
                content: "Open civitai in a new tab",
                disabled: !(model && version),
                callback: () => {
                  openURL(`https://civitai.com/models/${model.id}?modelVersionId=${version.id}`);
                }
              },
            ];
            
            options.splice(
              optionIndex,
              0,
              ...newOptions
            );
          }
        } catch(err) {
          console.error(err);
        }

        return r;
      }
    }
	},
});