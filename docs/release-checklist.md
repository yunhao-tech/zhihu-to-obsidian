# Release Checklist

## v1.0.1 Paid Beta Package

Before publishing the first paid beta, verify:

- Load unpacked extension in Chrome.
- Open a Zhihu article page.
- Export with remote image mode.
- Export with local image mode and confirm ZIP contains Markdown plus `attachments/`.
- Open a Zhihu column page.
- Export a range of 1-3 articles.
- Import exported Markdown into Obsidian.
- Confirm YAML frontmatter renders as plain metadata.
- Confirm formulas are readable in Obsidian.
- Confirm image references resolve for local mode.
- Confirm the extension does not request broad host permissions beyond Zhihu and Zhimg.

## Package Command

Run from the repository root:

```bash
zip -r zhihu-obsidian-v1.0.1-beta.zip \
  manifest.json background content icons lib popup README.md \
  -x "*.DS_Store"
```

## Launch Sequence

1. Create a GitHub release with the beta ZIP.
2. Publish the landing page.
3. Add a payment link to README and landing page.
4. Send 30 direct outreach messages.
5. Track every reply in a spreadsheet.
6. Convert at least 10 demo installs.
7. Ask for payment only after confirming the target user has a real archive need.

## Support SLA

For beta users:

- Reply within 24 hours.
- Fix selector/API breakage as the top priority.
- If a page cannot be exported, ask for URL, export mode, screenshot, and console logs.
- Refund within 14 days if the page is accessible to the user and cannot be exported or worked around.
