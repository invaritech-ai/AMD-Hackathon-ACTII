# AMD Hackathon Demo Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce two polished 1:55 H.264 demo videos from the supplied 14:48 screen recording, one using edited source narration and one using a stock ElevenLabs narrator.

**Architecture:** Build a shared outcome-first picture master from timestamped source ranges, then create separate narration mixes. Use FFmpeg for deterministic assembly and verification; use DaVinci Resolve for visual/audio inspection and any fast corrective adjustment that is materially easier in the GUI.

**Tech Stack:** FFmpeg/ffprobe, Whisper transcript JSON, ElevenLabs web app, DaVinci Resolve

## Global Constraints

- Do not modify `/Users/avi/Desktop/Screen Recording 2026-07-11 at 11.13.35 PM.mov`.
- Both exports must be no longer than 1:55.
- Export at 1920x1080 using H.264 video and AAC audio.
- Do not use background music.
- Use only the source speaker's words in the original-narration version.
- Use a stock ElevenLabs narrator and do not clone the user's voice.
- State only that Fireworks AI inference runs on AMD infrastructure; do not imply every local step runs on AMD hardware.

---

### Task 1: Prepare Edit Assets

**Files:**
- Copy: `/tmp/Screen Recording 2026-07-11 at 11.13.35 PM.json`
- Create: `output/video/source-transcript.json`
- Create: `output/video/ai-narration-script.txt`

**Interfaces:**
- Consumes: source MOV and Whisper word-level transcript.
- Produces: stable transcript and final narration text used by later tasks.

- [ ] **Step 1: Create the output directory and preserve the transcript**

Run:

```bash
mkdir -p output/video
cp '/tmp/Screen Recording 2026-07-11 at 11.13.35 PM.json' output/video/source-transcript.json
```

Expected: `output/video/source-transcript.json` exists and contains `segments` and word timestamps.

- [ ] **Step 2: Write the AI narration script**

Create `output/video/ai-narration-script.txt` with this narration:

```text
Australian food suppliers lose money when supermarket deductions are unsupported, exceed agreed caps, or breach the Food and Grocery Code. Claims Recovery turns a folder of messy evidence into recoverable cash.

Here, a supplier uploads the purchase order, invoice, proof of delivery, remittance advice, and promotion agreement. The ingestion agents classify every document, extract identifiers and amounts, and automatically assemble related evidence into a single case graph.

With the evidence connected, one click reconciles the retailer's deductions against delivery records, commercial agreements, and the Code. In this case, the system finds two recoverable exceptions. A shrinkage deduction is prohibited after delivery, and a promotion deduction exceeds the agreed cap by nine hundred Australian dollars.

The result is a claim for one thousand three hundred and twenty Australian dollars, with the supporting evidence and a ready-to-send finance email. The claim is added to a ledger for tracking through submission and recovery.

Claims Recovery uses Fireworks AI inference on AMD infrastructure to turn fragmented documents into an auditable recovery workflow—from evidence to cash in under two minutes.
```

Expected: the script contains about 190-220 words and fits within 1:45-1:55 at a clear presentation pace.

### Task 2: Build the Shared Picture Master

**Files:**
- Create: `output/video/picture-master.mp4`

**Interfaces:**
- Consumes: source MOV.
- Produces: silent 1920x1080 picture master used by both narration mixes.

- [ ] **Step 1: Assemble the outcome-first source ranges**

Use these visual beats, retimed to the indicated edited durations:

```text
12:50-13:02 -> 8 seconds   result hook
00:34-01:01 -> 14 seconds product and upload interface
06:01-06:31 -> 21 seconds interconnected evidence upload
06:53-07:24 -> 19 seconds automatic graph assembly
11:51-12:40 -> 26 seconds reconciliation exceptions
12:46-13:19 -> 17 seconds claim, evidence, and ledger
13:08 frame   -> 10 seconds AMD/Fireworks closing card background
```

Scale each source range to 1920x1080 with preserved aspect ratio and crop to fill. Concatenate the normalized 60 fps segments and remove source audio.

Expected: `picture-master.mp4` is exactly 115 seconds, silent, 1920x1080, and visually follows the approved beat order.

- [ ] **Step 2: Add restrained callouts**

Add these title-safe overlays:

```text
0:00-0:08   CLAIMS RECOVERY · AUD 1,320 RECOVERABLE
0:43-1:02   AUTO-LINKED EVIDENCE
1:02-1:28   UNSUPPORTED DEDUCTIONS FOUND
1:28-1:45   CLAIM READY · AUD 1,320
1:45-1:55   FIREWORKS AI INFERENCE ON AMD INFRASTRUCTURE
```

Expected: overlays are legible at 1920x1080 and do not obscure the app's primary numbers or controls.

### Task 3: Create the Original-Narration Mix

**Files:**
- Create: `output/video/original-narration.wav`
- Create: `output/video/claims-recovery-amd-demo-original-narration.mp4`

**Interfaces:**
- Consumes: source MOV and `picture-master.mp4`.
- Produces: final original-narration comparison export.

- [ ] **Step 1: Assemble source narration**

Concatenate audio from these source ranges in order:

```text
00:03-00:16
00:19-00:32
00:38-00:54
06:08-06:18
07:12-07:24
11:51-12:17
12:26-12:40
12:50-13:02
```

Apply a tempo adjustment between 1.02x and 1.05x so the final closing card has at least two seconds of clean tail.

Expected: the narration is under 113 seconds and contains no words absent from the source.

- [ ] **Step 2: Clean and master the dialogue**

Apply a high-pass filter near 80 Hz, light broadband denoising, corrective EQ, gentle compression, and a true-peak-safe limiter. Use short crossfades at every sentence edit.

Expected: no clipped peaks, obvious edit clicks, or large loudness jumps.

- [ ] **Step 3: Mux with the picture master**

Mux the cleaned WAV with `picture-master.mp4`, padding the final audio tail with silence and stopping at 115 seconds.

Expected: `claims-recovery-amd-demo-original-narration.mp4` is synchronized, 1920x1080 H.264/AAC, and no longer than 1:55.

### Task 4: Create the ElevenLabs Narration Mix

**Files:**
- Create: `output/video/elevenlabs-narration.mp3`
- Create: `output/video/claims-recovery-amd-demo-ai-narration.mp4`

**Interfaces:**
- Consumes: `ai-narration-script.txt` and `picture-master.mp4`.
- Produces: final AI-narration comparison export.

- [ ] **Step 1: Generate stock narration**

In ElevenLabs, select a professional, neutral English stock voice. Generate the exact script from `output/video/ai-narration-script.txt` without voice cloning and download it as `output/video/elevenlabs-narration.mp3`.

Expected: narration duration is between 100 and 113 seconds with no missing paragraphs or mispronounced currency amounts.

- [ ] **Step 2: Fit and master the narration**

If needed, apply a tempo change no greater than 1.08x. Apply light EQ, compression, and limiting to match the original-narration export's perceived level.

Expected: the voice remains natural and ends before the 115-second picture master.

- [ ] **Step 3: Mux with the picture master**

Mux the mastered stock narration with `picture-master.mp4`, pad the tail with silence, and stop at 115 seconds.

Expected: `claims-recovery-amd-demo-ai-narration.mp4` is synchronized, 1920x1080 H.264/AAC, and no longer than 1:55.

### Task 5: Verify Both Deliverables

**Files:**
- Verify: `output/video/claims-recovery-amd-demo-original-narration.mp4`
- Verify: `output/video/claims-recovery-amd-demo-ai-narration.mp4`

**Interfaces:**
- Consumes: both final exports.
- Produces: verified submission-ready videos.

- [ ] **Step 1: Verify technical properties**

Run `ffprobe` on both files and confirm duration is at most 115 seconds, resolution is 1920x1080, video codec is H.264, and audio codec is AAC.

- [ ] **Step 2: Run automated media checks**

Use FFmpeg's `blackdetect`, `silencedetect`, and `ebur128` filters. Confirm there is no unintended long black section, no mid-video narration dropout, and no clipping.

- [ ] **Step 3: Inspect playback**

Open the final exports in DaVinci Resolve and inspect the hook, each major cut, callout readability, audio transitions, synchronization, and closing frame.

Expected: both exports play from start to finish without visible corruption, missed words, distracting artifacts, or unreadable key figures.
