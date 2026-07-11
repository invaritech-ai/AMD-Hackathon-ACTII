# AMD Hackathon ACT II README Design

## Goal

Create a concise, judge-facing README for the Invaritech Claims Recovery Agent monorepo and publish the existing `main` branch to `invaritech-ai/AMD-Hackathon-ACTII`.

## Audience

The primary audience is hackathon judges and technical reviewers. A developer should also be able to understand the repository and start the application without reading internal planning documents.

## Content

The README will contain:

1. A direct description of the claims-recovery problem and the product.
2. The core workflow and capabilities demonstrated by the application.
3. A compact architecture overview grounded in the current codebase.
4. Prerequisites, environment setup, and commands for running the Docker backend and Vite frontend.
5. The monorepo layout and principal technology choices.
6. Testing and demo-data instructions that do not expose secrets or local machine paths.

## Style

- Use the project name “AMD Hackathon ACT II” and product name “Invaritech Claims Recovery Agent.”
- Prefer short paragraphs, scannable sections, and concrete commands.
- Avoid unverified performance claims, obsolete architecture notes, local absolute paths, and internal work logs.
- Keep the document useful without turning it into an exhaustive developer manual.

## Publishing Scope

- Preserve the existing Git history and `main` branch.
- Add the README and this approved design note.
- Do not stage `.claude/`, `output/`, or `backend/CHATROOM.md`.
- Set `origin` to `https://github.com/invaritech-ai/AMD-Hackathon-ACTII.git` and push `main` directly, as requested.

## Validation

- Verify every documented command against the repository manifests and Compose configuration.
- Run appropriate existing checks before pushing.
- Inspect the staged diff to ensure no local artifacts or secrets are included.
