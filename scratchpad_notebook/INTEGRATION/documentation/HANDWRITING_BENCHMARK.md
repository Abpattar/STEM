# Handwriting Recognition Comparative Benchmark & Provider Evaluation

**Platform:** MathAI Unified Platform  
**Evaluated Providers:** Ink-On (Client-Side CoMER INT8 ONNX) vs. Vision LLM OCR (Groq / Qwen Vision)  
**Date:** November 2026  

---

## 1. Provider Architectural Characteristics

| Dimension | Ink-On (Candidate Provider) | Vision LLM OCR (MathAI Existing) |
|:---|:---|:---|
| **Execution Environment** | Client-side (Browser ONNX Runtime Web WASM/WebGPU) | Server-side / Cloud API (FastAPI + Groq Vision) |
| **Model Architecture** | CoMER INT8 Quantized Encoder (3.4MB) + Decoder (4.0MB) | Vision-Language Foundation Model (`qwen/qwen3.8-27b`) |
| **Total Model Footprint**| **7.2 MB** total (cached in IndexedDB) | Hosted in Cloud / Zero client footprint |
| **Network Latency** | **0 ms** (100% offline, runs on device) | 250 ms – 1,200 ms network round-trip |
| **Inference Time** | ~290 ms on CPU | ~800 ms – 1,500 ms per query |
| **API Costs / Limits** | **$0.00 / Zero API calls / No rate limits** | Bounded by API tokens / Subject to HTTP 429 limits |
| **Mathematical Vocabulary**| 113 math tokens (digits, variables, operations, fractions, radicals) | Universal multimodal vocabulary |
| **Natural Language Support**| **None** (cannot read English words) | **Full** (reads word problems, instructions, mixed text) |
| **Multi-line / Systems** | Moderate (best on single/double aligned expressions) | High (naturally segments equations and instructions) |

---

## 2. CROHME 2014 & Representative Benchmark Findings

### Ink-On Test Results (CROHME 2014 Dataset - 986 Samples)
- **Exact Match (ExpRate):** 36.41%
- **Within 1 Token Edit:** 53.25%
- **Within 2 Token Edits:** 65.82%
- **Vocabulary Coverage:** 87.3% (12.7% of complex CROHME samples had tokens outside 113-token vocab)
- **Average Speed:** 0.29s per sample on modern CPU.

### Synthetic MathAI Sample Comparison

| Problem Sample | Ink-On Result | Vision LLM Result | Preferred Provider | Reason |
|:---|:---|:---|:---|:---|
| $x^2 + 5x + 6 = 0$ | $x^2 + 5x + 6 = 0$ (Instant, local) | $x^2 + 5x + 6 = 0$ (Accurate) | **Ink-On** | Zero latency, zero cost, instant response. |
| $3x - 7 = 11$ | $3x - 7 = 11$ (Instant) | $3x - 7 = 11$ (Accurate) | **Ink-On** | Instant local parsing. |
| $\frac{x+1}{2} = 3$ | $\frac{x+1}{2} = 3$ (Instant) | $\frac{x+1}{2} = 3$ (Accurate) | **Ink-On** | Standard fraction representation handled. |
| "A rectangle has width x and length 2x+1. Find perimeter if..." | **Fails / Garbage** (no word support) | Correctly extracts equations | **Vision LLM** | Requires natural language OCR and NLP semantic extraction. |
| $x^2 + y = 30$, find $x$ if $y = 5$ | Reads math parts, misses "find x" | Correctly parses instruction | **Vision LLM** | Natural language instruction separation. |

---

## 3. Integration Decision & Fallback Strategy

1. **Dual-Engine Coexistence:** Neither provider is discarded.
2. **First-line Client-Side Provider (Ink-On):** For direct mathematical drawing on canvas, Ink-On runs locally in-browser without sending canvas images across the network, saving token quota and eliminating HTTP 429 errors.
3. **Automatic Fallback to Server Vision OCR:** If Ink-On confidence is below threshold, if the canvas drawing contains natural language words, or if the student types a word problem, the system routes seamlessly to the Vision LLM endpoint.
4. **SymPy Verification Gateway:** Irrespective of which recognition engine produced the candidate LaTeX, the expression must pass AST validation and SymPy parsing before reaching the solver. Unverified guesses are strictly rejected.

