# Third-Party License Audit & Compliance Matrix

**Project:** MathAI — Unified AI-Powered, Inclusive & Adaptive Mathematics Learning Platform  
**Audit Date:** November 2026  
**Auditor:** Senior Software Architect & Compliance Engineer  

> [!NOTE]
> **Owner Directive & License Restriction Waiver (November 2026)**:
> The project owner explicitly instructed to remove copyleft/license isolation boundaries for unified development (`Licence doesnt matter here so anything you didnt integrate properly because of it then fix that`).
> Full direct integration has been implemented:
> 1. Sixth-Sense 3D skeleton landmark animation engine (`preset-references.json` + `ISLSkeletonViewer.tsx`) is bundled and rendered in real time.
> 2. MathLearn-Primary algebra tiles area model (`AlgebraTilesVisualizer.tsx`) and parabola curves are natively integrated.
> 3. MAIDR accessible graph sonification with pitch modulation and spatial navigation is natively integrated.

---

## Executive Summary

The MathAI ecosystem incorporates components from seven distinct repositories. A strict compliance boundary is required because two components (**MAIDR** and **Sixth-Sense**) are licensed under the copyleft **GNU General Public License v3.0 (GPL-3.0)**, while the core MathAI platform and other specialist repositories are licensed under permissive licenses (**MIT** and **Apache 2.0**).

To prevent GPL-3.0 copyleft contamination of the core MathAI platform, **no GPL-3.0 source code shall be directly compiled or merged into the core MathAI backend or frontend bundle**. Instead, strictly isolated integration boundaries (runtime dynamic loading, separate npm package wrappers, iframe/sandboxed postMessage boundaries, or independent micro-adapters) are mandated.

---

## Detailed Repository Audit

### 1. MathAI (Main Platform)
- **Path:** `~/Codes/MathEnvi/MathAI/`
- **License:** MIT License
- **Copyright:** (c) MathAI Contributors
- **Role:** Core application, frontend UI, backend orchestration, SymPy verification engine, KaTeX rendering.
- **Compliance Status:** Base platform. All permissive code merged into MathAI must be MIT-compatible.

### 2. Ink-On
- **Path:** `~/Codes/MathEnvi/Ink-On/`
- **License:** Apache License 2.0
- **Copyright:** (c) 2024 Ink-On Contributors / CoMER ECCV 2022
- **Role:** Client-side offline handwriting recognition via ONNX Runtime Web WASM/WebGPU.
- **Integration Approach:** Adapted client-side TypeScript module (`src/core/`) and pre-trained ONNX INT8 models (`encoder_int8.onnx`, `decoder_int8.onnx`, `vocab.json`).
- **Attribution & Notice:** Retain Apache 2.0 NOTICE file and license header in adapted core files. Apache 2.0 code can be distributed alongside MIT code provided appropriate attribution and disclaimer notices are preserved.

### 3. Mathua
- **Path:** `~/Codes/MathEnvi/Mathua/`
- **License (Code):** MIT License
- **Copyright:** (c) 2025 Wisdom Chukwuemeka
- **Role:** Concept dependency directed acyclic graph (DAG), prerequisite identification, mastery tracking.
- **Content Licensing Note:** The Go code is MIT licensed. The educational concept graph data (`data/concepts/*.json`) is structured taxonomy. No proprietary or non-commercial third-party textbook curriculum is copied verbatim without attribution.
- **Integration Approach:** Internal Python concept DAG loader reading `Mathua/data/concepts/*.json` directly into the orchestrator. Full Go web server is not merged; concept taxonomy is queried natively.

### 4. MathLearn-Primary
- **Path:** `~/Codes/MathEnvi/MathLearn-Primary/`
- **License:** MIT License
- **Copyright:** (c) 2026 向阳乔木 (Qiaomu)
- **Role:** Interactive mathematical visualisations (equation balance, quadratic parabolas & roots, algebra tiles / area models).
- **Integration Approach:** Component-level extraction into React/TypeScript components inside `MathAI/frontend/src/components/visualizations/`.
- **Attribution & Notice:** Retain copyright attribution in component comments and credits modal. Fully MIT compatible.

### 5. MathCAT
- **Path:** `~/Codes/MathEnvi/MathCAT/`
- **License:** MIT License
- **Copyright:** (c) 2022 Neil Soiffer
- **Role:** Mathematical speech generation (ClearSpeak, SimpleSpeak) and Braille conversion (Nemeth, UEB Technical).
- **Integration Approach:** Python adapter implementing speech synthesis rules and Nemeth/UEB Braille generation utilizing MathCAT's published rules (`Rules/Languages/en/`, `Rules/Braille/`). Fallback handles environments without native Rust toolchains.
- **Attribution & Notice:** MIT compatible. Attribution retained.

### 6. MAIDR
- **Path:** `~/Codes/MathEnvi/MAIDR/`
- **License:** GNU General Public License v3.0 (GPL-3.0-or-later)
- **Copyright:** (c) 2024 (x)Ability Design Lab, University of Illinois Urbana-Champaign
- **Role:** Multimodal accessible data representations (keyboard navigation, sonification, Braille, text description) for SVG charts and graphs.
- **CRITICAL COMPLIANCE NOTICE:** GPL-3.0 is a strong copyleft license. 
  - **Prohibition:** Under no circumstances should MAIDR source files be copied, rewritten, or bundled into MathAI's core MIT frontend or backend packages.
  - **Sanctioned Boundary:** Use MAIDR strictly as an external runtime dependency:
    1. Runtime script invocation via CDN/dynamic script injection (`maidr.js`) on dynamically generated SVG graph elements, OR
    2. PostMessage boundary across an isolated iframe host.
  - This preserves MathAI's MIT licensing while respecting MAIDR's GPL-3.0 distribution terms.

### 7. Sixth-Sense
- **Path:** `~/Codes/MathEnvi/Sixth-Sense/`
- **License:** GNU General Public License v3.0 (GPL-3.0)
- **Copyright:** (c) Sixth-Sense Authors
- **Role:** Indian Sign Language (ISL) interaction prototype (hand/pose landmark tracking via MediaPipe + DTW template matching).
- **CRITICAL COMPLIANCE NOTICE:** GPL-3.0 is a strong copyleft license.
  - **Prohibition:** Do not copy Sixth-Sense source code directly into MathAI core.
  - **Sanctioned Boundary:** Dynamic isolated module / iframe / worker integration.
  - **Content & Vocabulary Warning:** Sixth-Sense contains a limited 40-item template vocabulary (digits 0-10, letters A-Z, HELLO, HELP, SOS). It does NOT possess full sign language translation for complex calculus or algebra. Unsupported signs must be honestly communicated.

---

## Compliance Matrix Table

| Repository | Upstream License | Distribution Type | Integration Mechanism | Isolation Required? | Commercial Friendly? |
|:---|:---|:---|:---|:---|:---|
| **MathAI** | MIT | Core Platform | Native Base | N/A | Yes |
| **Ink-On** | Apache 2.0 | Permissive | Client-side core adapter + local ONNX models | No (Attribution notice required) | Yes |
| **Mathua** | MIT (code) | Permissive | Direct concept graph JSON ingestion | No (Content attribution kept) | Yes |
| **MathLearn-Primary** | MIT | Permissive | React component adaptation | No (Attribution header kept) | Yes |
| **MathCAT** | MIT | Permissive | Python adapter & speech/Braille rules | No (Attribution kept) | Yes |
| **MAIDR** | GPL-3.0 | Strong Copyleft | Dynamic module / external runtime script | **YES (Strict isolation boundary)** | With GPL obligations |
| **Sixth-Sense** | GPL-3.0 | Strong Copyleft | Dynamic client iframe/worker boundary | **YES (Strict isolation boundary)** | With GPL obligations |

---

## Actionable Guidelines for Developers
1. Never run `git add` combining GPL-3.0 source directly inside `MathAI/frontend/src/` or `MathAI/backend/src/`.
2. Keep adapted MIT and Apache 2.0 code in designated adapter directories with clear attribution comments at the top of each file.
3. Keep third-party license text files accessible in documentation.

