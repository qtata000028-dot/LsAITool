<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your MiniMax app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a3c25e12-bfc6-41a0-ba01-00a0996b4f0b

## Team Collaboration

Team workflow and branch rules are documented in [CONTRIBUTING.md](./CONTRIBUTING.md).

GitHub collaboration files are available in:

- `.github/CODEOWNERS`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/`
- `.github/workflows/ci.yml`

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `MINIMAX_API_KEY` in [.env.local](.env.local) to your MiniMax API key
3. Run the app:
   `npm run dev`

## MiniMax Integration

- The frontend now calls `/api/ai/survey-plan`.
- API keys stay on the server side in `.env.local`.
- The default model is `MiniMax-M2.1`. You can override it with `MINIMAX_MODEL`.
