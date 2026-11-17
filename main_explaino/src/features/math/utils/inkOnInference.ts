import * as ort from 'onnxruntime-web';

// Configure ONNX runtime for WebAssembly execution
try {
  ort.env.wasm.numThreads = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
  ort.env.wasm.simd = true;
} catch (e) {
  console.warn('WASM SIMD configuration warning:', e);
}

export interface Vocab {
  word2idx: Record<string, number>;
  idx2word: Record<string, string>;
  special_tokens: { pad: number; sos: number; eos: number };
  vocab_size: number;
}

let cachedVocab: Vocab | null = null;
let encoderSession: ort.InferenceSession | null = null;
let decoderSession: ort.InferenceSession | null = null;
let isInitializing = false;

// Syntactic LaTeX repair functions
export function repairLatex(tokens: string[]): string {
  let result = [...tokens];
  result = balanceBraces(result);
  return result.join(' ').replace(/\s+([_\^])/g, '$1').replace(/([_\^])\s+/g, '$1');
}

function balanceBraces(tokens: string[]): string[] {
  const result: string[] = [];
  let depth = 0;
  for (const t of tokens) {
    if (t === '{') {
      depth++;
      result.push(t);
    } else if (t === '}') {
      if (depth > 0) {
        depth--;
        result.push(t);
      }
    } else {
      result.push(t);
    }
  }
  while (depth > 0) {
    result.push('}');
    depth--;
  }
  return result;
}

export async function loadVocab(url = '/models/ink-on/comer/vocab.json'): Promise<Vocab> {
  if (cachedVocab) return cachedVocab;
  const res = await fetch(url);
  cachedVocab = await res.json();
  return cachedVocab!;
}

export async function initInkOnEngine(): Promise<boolean> {
  if (encoderSession && decoderSession) return true;
  if (isInitializing) return false;

  try {
    isInitializing = true;
    const [, encRes, decRes] = await Promise.all([
      loadVocab(),
      fetch('/models/ink-on/comer/encoder_int8.onnx'),
      fetch('/models/ink-on/comer/decoder_int8.onnx')
    ]);

    const [encBuf, decBuf] = await Promise.all([
      encRes.arrayBuffer(),
      decRes.arrayBuffer()
    ]);

    const sessionOpts: ort.InferenceSession.SessionOptions = {
      executionProviders: ['wasm']
    };

    [encoderSession, decoderSession] = await Promise.all([
      ort.InferenceSession.create(encBuf, sessionOpts),
      ort.InferenceSession.create(decBuf, sessionOpts)
    ]);

    isInitializing = false;
    return true;
  } catch (err) {
    console.warn('Ink-On ONNX session initialization failed:', err);
    isInitializing = false;
    return false;
  }
}

export async function recognizeHandwritingInkOn(
  canvas: HTMLCanvasElement,
  maxSteps = 40
): Promise<{ latex: string; totalMs: number; provider: 'ink-on-onnx' | 'cloud-vision' }> {
  const startTime = performance.now();

  try {
    const isReady = await initInkOnEngine();
    if (!isReady || !encoderSession || !decoderSession || !cachedVocab) {
      throw new Error('Local ONNX engine unavailable, falling back');
    }

    const { sos, eos, pad } = cachedVocab.special_tokens;

    // Preprocess canvas image to 256 x W tensor
    const W = Math.min(1024, Math.max(128, Math.round(canvas.width / 64) * 64));
    const H = 256;

    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, W, H);

    // Draw original canvas centered
    const scale = Math.min((W - 32) / canvas.width, (H - 32) / canvas.height);
    const dw = canvas.width * scale;
    const dh = canvas.height * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    offCtx.drawImage(canvas, dx, dy, dw, dh);

    const imgData = offCtx.getImageData(0, 0, W, H).data;
    const floatData = new Float32Array(H * W);
    for (let i = 0; i < H * W; i++) {
      const r = imgData[i * 4];
      const g = imgData[i * 4 + 1];
      const b = imgData[i * 4 + 2];
      // Grayscale normalized to [0, 1] (0 = ink, 1 = background)
      const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
      floatData[i] = 1.0 - gray;
    }

    // Encoder run
    const imgTensor = new ort.Tensor('float32', floatData, [1, 1, H, W]);
    const maskTensor = new ort.Tensor('bool', new Uint8Array(H * W).fill(0), [1, H, W]);

    const encOutput = await encoderSession.run({
      img: imgTensor,
      mask: maskTensor
    });
    imgTensor.dispose();
    maskTensor.dispose();

    const encFeatures = encOutput['out'] || encOutput['features'] || Object.values(encOutput)[0];
    const encMask = encOutput['mask'] || Object.values(encOutput)[1];

    // Autoregressive greedy decoding
    const decodedIds: number[] = [sos];
    for (let step = 0; step < maxSteps; step++) {
      const inputIds = new ort.Tensor('int64', BigInt64Array.from(decodedIds.map(BigInt)), [1, decodedIds.length]);
      const decOutput = await decoderSession.run({
        encoder_features: encFeatures,
        encoder_mask: encMask,
        input_ids: inputIds
      });
      inputIds.dispose();

      const logits = decOutput['logits'].data as Float32Array;
      const vocabSize = cachedVocab.vocab_size;
      const lastOffset = (decodedIds.length - 1) * vocabSize;

      // Argmax
      let bestId = 0;
      let maxLogit = -Infinity;
      for (let v = 0; v < vocabSize; v++) {
        if (v === sos || v === pad) continue;
        const l = logits[lastOffset + v];
        if (l > maxLogit) {
          maxLogit = l;
          bestId = v;
        }
      }

      if (bestId === eos) break;
      decodedIds.push(bestId);
    }

    const tokenWords: string[] = [];
    for (const id of decodedIds) {
      if (id === sos || id === eos || id === pad) continue;
      const word = cachedVocab.idx2word[String(id)];
      if (word) tokenWords.push(word);
    }

    const repairedLatex = repairLatex(tokenWords);
    const totalMs = Math.round(performance.now() - startTime);

    return {
      latex: repairedLatex,
      totalMs,
      provider: 'ink-on-onnx'
    };
  } catch (err) {
    console.warn('Ink-On browser recognition error, falling back to Vision LLM:', err);
    // Fallback to server OCR
    const imageB64 = canvas.toDataURL('image/png');
    const res = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_b64: imageB64 })
    });
    const data = await res.json();
    return {
      latex: data.recognized_text || '',
      totalMs: Math.round(performance.now() - startTime),
      provider: 'cloud-vision'
    };
  }
}
