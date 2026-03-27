import {
  buildResearchRecordWordPageHtml,
  RESEARCH_RECORD_WORD_PAGE_CSS,
} from './research-record-word-template-shared';

type ResearchExportDraft = Parameters<typeof buildResearchRecordWordPageHtml>[0];

function enhanceWordTableBorders(html: string) {
  return html
    .replace(
      /<table\b/g,
      '<table border="1" cellspacing="0" cellpadding="0"',
    )
    .replace(
      /<(th|td)(\b[^>]*)>/g,
      '<$1$2 style="border:1px solid #000;mso-border-alt:solid windowtext .75pt;">',
    );
}

export function buildResearchRecordWordDocumentHtml(draft: ResearchExportDraft) {
  const pageHtml = enhanceWordTableBorders(buildResearchRecordWordPageHtml(draft));
  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>${draft.departmentName?.trim() || '调研记录'}</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
          }

          body {
            font-family: "FangSong", "STFangsong", "SimSun", "Songti SC", serif;
          }

          ${RESEARCH_RECORD_WORD_PAGE_CSS}

          .research-word-page {
            margin: 0 auto;
            box-shadow: none;
          }
        </style>
      </head>
      <body>
        ${pageHtml}
      </body>
    </html>
  `;
}
