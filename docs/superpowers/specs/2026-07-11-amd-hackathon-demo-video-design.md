# AMD Hackathon Demo Video Edit Design

## Objective

Turn the 14:48 source screen recording into two polished 1:55 submission videos for the AMD Developer Hackathon: ACT II Unicorn Track. Both exports use the same outcome-first visual story so the user can compare narration styles fairly.

## Deliverables

1. A 1:55 version using only the user's original narration.
2. A 1:55 version using a professional stock ElevenLabs narrator.
3. Both versions exported at 1920x1080 in H.264 with AAC audio and a duration below two minutes.

The source recording remains unchanged.

## Editorial Direction

Use an outcome-first, judge-focused structure. Open with the recovered amount, then demonstrate how raw evidence becomes an automatically linked case, how the agent finds unsupported deductions, and how the system creates a recoverable claim.

The edit should feel like a concise product demo rather than a tutorial. Preserve enough interface context for judges to understand each action, but remove waiting, repeated navigation, housekeeping, and low-value examples.

## Story Structure

| Edited time | Story beat | Source material and treatment |
| --- | --- | --- |
| 0:00-0:08 | Result hook | Open on the Case 11 recovery result and emphasize `AUD 1,320 recoverable`. Add a restrained title identifying Claims Recovery and the Unicorn Track. |
| 0:08-0:22 | Problem and product | Use the strongest sentences from the original introduction over the upload interface. Explain that retail suppliers can recover unsupported supermarket deductions. |
| 0:22-0:43 | Evidence ingestion | Show the interconnected evidence pack being uploaded. Remove dead time and accelerate upload or processing waits between 6x and 10x, selecting the slowest speed that still fits the allotted beat. |
| 0:43-1:02 | Automatic case assembly | Show classification and the graph assembling related documents into one case. Use a short callout for automatic evidence linking. |
| 1:02-1:28 | Reconciliation | Show Case 11 reconciliation. Highlight prohibited shrinkage and the promotion deduction above the agreed cap. Keep the recoverable amounts readable. |
| 1:28-1:45 | Claim output | Show the AUD 1,320 claim, supporting evidence, drafted email, and ledger entry. Skip routine claim-status progression. |
| 1:45-1:55 | Technology and close | End on a concise AMD/Fireworks technology card and product name. Reinforce that the system turns evidence into recoverable cash. |

## Picture Edit

- Build one master picture timeline shared by both narration versions.
- Prefer hard cuts and purposeful punch-ins. Avoid decorative transitions.
- Use accelerated screen footage only for waiting or repetitive processing. Keep interactions and important numbers at readable speed.
- Crop the 2848x1600 recording into a 16:9 1920x1080 timeline without obscuring application controls or key values.
- Add minimal callouts for `Auto-linked evidence`, `Unsupported deductions`, and `AUD 1,320 recoverable`.
- Use captions selectively for key narration phrases and figures, not as a full-screen transcript.
- Use no background music so the two narration versions remain directly comparable.

## Original-Narration Version

- Use only words spoken in the source recording.
- Assemble sentences at natural phrase boundaries using the word-level transcript.
- Remove pauses, false starts, repeated explanations, and navigation commentary.
- Limit dialogue speed changes to a natural range. Favor cutting words over aggressive speech acceleration.
- Repair audible artifacts where practical, then apply high-pass filtering, corrective EQ, light de-noising, compression, de-essing if needed, and final limiting.
- Hide unavoidable audio edits under picture changes or short interface-only moments.

## AI-Narration Version

- Write a concise narration script matched to the approved story beats.
- Use a professional stock ElevenLabs narrator; do not clone the user's voice.
- Keep wording direct, credible, and product-focused. Avoid unsupported market statistics or technical claims that are not visible or documented in the project.
- Synchronize the generated narration to the same master picture timeline. Minor timing trims are allowed, but the visual story and total duration should remain comparable to the original-narration version.
- Apply light EQ, compression, and limiting so the generated voice matches the perceived loudness of the original-narration export.

## AMD Positioning

The closing card will state that the system uses Fireworks AI inference on AMD infrastructure, consistent with the project plan. It will not imply that every local processing step runs on AMD hardware.

## Quality Checks

- Duration is at or below 1:55 for both versions.
- Spoken claims match the product behavior shown on screen.
- Important figures remain on screen long enough to read.
- No source audio is audible beneath the AI narration unless intentionally retained as non-speech interface sound.
- Dialogue peaks do not clip and perceived loudness is consistent across cuts.
- Export plays correctly from start to finish, with synchronized audio and video.
- Final resolution is 1920x1080 and codec is H.264 with AAC audio.

## File Naming

- `claims-recovery-amd-demo-original-narration.mp4`
- `claims-recovery-amd-demo-ai-narration.mp4`
