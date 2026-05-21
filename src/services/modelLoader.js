import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import path from 'path';

function convertInboundNodes(inboundNodes) {
  if (!Array.isArray(inboundNodes)) return inboundNodes;
  
  const newInboundNodes = [];
  for (const node of inboundNodes) {
    if (node && typeof node === 'object' && node.args) {
      const nodeConnections = [];
      const args = node.args || [];
      for (const arg of args) {
        if (Array.isArray(arg)) {
          for (const subArg of arg) {
            if (subArg && subArg.config && subArg.config.keras_history) {
              const hist = subArg.config.keras_history;
              nodeConnections.push([hist[0], hist[1], hist[2], {}]);
            }
          }
        } else if (arg && arg.config && arg.config.keras_history) {
          const hist = arg.config.keras_history;
          nodeConnections.push([hist[0], hist[1], hist[2], {}]);
        }
      }
      newInboundNodes.push(nodeConnections);
    } else {
      newInboundNodes.push(node);
    }
  }
  return newInboundNodes;
}

function sanitizeTopology(topology) {
  if (!topology || typeof topology !== 'object') return topology;
  
  for (const key in topology) {
    if (topology.hasOwnProperty(key)) {
      const val = topology[key];
      if (typeof val === 'object' && val !== null) {
        if (val.class_name === 'L2' && val.config) {
          val.class_name = 'L1L2';
          val.config.l1 = 0.0;
          if (val.config.l2 === undefined) {
            val.config.l2 = 0.01;
          }
        }
        if (val.class_name === 'L1' && val.config) {
          val.class_name = 'L1L2';
          val.config.l2 = 0.0;
          if (val.config.l1 === undefined) {
            val.config.l1 = 0.01;
          }
        }
        if (val.class_name === 'InputLayer' && val.config) {
          if (val.config.batch_shape) {
            val.config.batch_input_shape = val.config.batch_shape;
          }
          if (val.config.name === 'ngram_vector') {
            val.config.batch_input_shape = [null, 22454];
          }
        }
        if (val.inbound_nodes) {
          val.inbound_nodes = convertInboundNodes(val.inbound_nodes);
        }
        sanitizeTopology(val);
      }
    }
  }
  return topology;
}

export function nodeFileSystemLoader(modelJsonPath, prefixToRemove) {
  return {
    load: async () => {
      const modelJsonContent = fs.readFileSync(modelJsonPath, 'utf8');
      const modelJson = JSON.parse(modelJsonContent);
      
      if (modelJson.modelTopology) {
        modelJson.modelTopology = sanitizeTopology(modelJson.modelTopology);
        
        // Wrap input_layers and output_layers if they are 1D arrays
        if (modelJson.modelTopology.model_config && modelJson.modelTopology.model_config.config) {
          const cfg = modelJson.modelTopology.model_config.config;
          if (cfg.input_layers && (cfg.input_layers.length > 0 && !Array.isArray(cfg.input_layers[0]))) {
            cfg.input_layers = [cfg.input_layers];
          }
          if (cfg.output_layers && (cfg.output_layers.length > 0 && !Array.isArray(cfg.output_layers[0]))) {
            cfg.output_layers = [cfg.output_layers];
          }
        }
      }
      
      // Strip prefix from weight names
      let weightSpecs = [];
      if (modelJson.weightsManifest && modelJson.weightsManifest.length > 0) {
        weightSpecs = modelJson.weightsManifest[0].weights;
        if (prefixToRemove) {
          for (const spec of weightSpecs) {
            if (spec.name.startsWith(prefixToRemove)) {
              spec.name = spec.name.substring(prefixToRemove.length);
            }
          }
        }
      }
      
      const dir = path.dirname(modelJsonPath);
      
      let weightData = null;
      if (modelJson.weightsManifest && modelJson.weightsManifest.length > 0) {
        const weightBuffers = [];
        for (const manifest of modelJson.weightsManifest) {
          for (const shardPath of manifest.paths) {
            const fullShardPath = path.join(dir, shardPath);
            const buffer = fs.readFileSync(fullShardPath);
            weightBuffers.push(buffer);
          }
        }
        const combinedBuffer = Buffer.concat(weightBuffers);
        weightData = combinedBuffer.buffer.slice(combinedBuffer.byteOffset, combinedBuffer.byteOffset + combinedBuffer.byteLength);
      }
      
      return {
        modelTopology: modelJson.modelTopology,
        weightSpecs: weightSpecs,
        weightData: weightData
      };
    }
  };
}

export async function loadModel(modelJsonPath, prefixToRemove) {
  const loader = nodeFileSystemLoader(modelJsonPath, prefixToRemove);
  return await tf.loadLayersModel(loader);
}
