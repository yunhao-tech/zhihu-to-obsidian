# Zhihu to Obsidian: $1k MRR Plan

## Goal

Reach $1,000 monthly recurring revenue from a focused creator tool built around high-fidelity Chinese content archiving.

The practical target is one of:

- 53 users at $19/month
- 21 users at $49/month
- 10 users at $99/month for a service-assisted tier

The first revenue target should be $1,000 in paid preorders or service revenue before building a hosted backend.

## Positioning

Zhihu to Obsidian is not a generic web clipper.

It is a Chinese knowledge-base archiving tool for people who need faithful exports from Zhihu into durable Markdown:

- researchers saving technical columns
- creators building a local reference vault
- students archiving paid or long-form study material they can access in their own logged-in browser
- AI builders preparing clean Chinese Markdown for RAG, NotebookLM, Obsidian, or local search

## Market Reality

Generic clipping is crowded. Obsidian has an official free Web Clipper, Readwise Reader sells a full read-it-later product, and newer tools such as Markforge focus on multi-site Markdown export.

The wedge is Chinese platform fidelity:

- Zhihu has platform-specific DOM, image, formula, card, and column structures.
- Generic clippers often lose formulas, images, metadata, or column organization.
- Chinese users often need local-first workflows, NAS/Tailscale image storage, and private Markdown archives.

## Product Tiers

### Free

Purpose: distribution and trust.

- Export current Zhihu article
- Remote image mode
- Basic Markdown and YAML frontmatter
- GitHub release install

### Pro: $19/month or $99/year

Purpose: first scalable revenue.

- Batch column export
- Local image ZIP export
- Tailscale/NAS image path mode
- Custom range export
- Export templates for Obsidian, NotebookLM, and RAG
- Update compatibility for Zhihu page changes

### Concierge: $99 one-time per archive

Purpose: fastest path to first $1,000.

- User sends a target column or account-owned archive
- We help them export and structure the vault
- Includes one remote session or async support
- Good for creators, researchers, and course collectors who want the result, not the tool setup

## First Offer

Launch with this concrete offer:

> I built a Chrome extension that exports Zhihu articles and columns into clean Obsidian Markdown, including LaTeX formulas, images, YAML metadata, and Tailscale/NAS-friendly image paths. I am opening 10 paid beta seats. $99/year for Pro, or $99 one-time if you want me to help archive one column end-to-end.

Do not lead with "Chrome extension". Lead with the outcome:

> Turn Zhihu columns into a private, durable Obsidian vault.

## Revenue Path

### Phase 1: 10 paid beta users

Timeline: 7-14 days.

Target:

- 10 users paying $99/year = $990 upfront

Work:

- Package current extension
- Add landing page
- Add install guide
- Add feedback form
- Add manual license gate only if needed
- Do direct outreach to Zhihu, Obsidian, PKM, RAG, and AI workflow communities

### Phase 2: 50 Pro users

Timeline: 30-60 days.

Target:

- 50 users paying $19/month = $950 MRR

Work:

- Chrome Web Store submission
- Gumroad/Lemon Squeezy/Polar checkout
- Pro feature gating
- Issue tracker and changelog
- Support docs
- 3-5 high-intent templates

### Phase 3: Expand Chinese Platform Suite

Timeline: after first paid users.

Possible additions:

- WeChat article export
- Xiaohongshu note export
- Bilibili transcript + comments export
- Douban note/book/movie page export
- AI conversation export to Obsidian

Only expand after paid users validate Zhihu export.

## Acquisition

Best channels:

- Obsidian Chinese community
- 即刻 / 小红书 / 知乎 posts about PKM and Obsidian
- GitHub README and releases
- V2EX / 少数派 / Telegram PKM groups
- direct outreach to people writing about Obsidian, RAG, local-first notes, and Zhihu archiving

## Direct Outreach Message

```text
你好，我在做一个很窄的工具：把知乎文章/专栏高保真导出成 Obsidian Markdown。

它重点处理普通 Web Clipper 容易丢的东西：LaTeX 公式、知乎图片、引用卡片、YAML 元数据、专栏批量导出，以及本地/NAS/Tailscale 图片路径。

我现在开放 10 个付费 beta 名额，$99/年。你如果有一个想长期保存的知乎专栏，我也可以用 $99 帮你做一次完整归档。

想问下你有没有这种需求？如果有，我可以发你演示和安装包。
```

## Launch Post

```text
我做了一个知乎到 Obsidian 的导出工具。

不是通用 Web Clipper，而是专门处理知乎文章/专栏：

- LaTeX 公式尽量还原成 Obsidian 可读格式
- 图片可以打包到本地 attachments
- 支持整篇专栏批量导出
- 自动生成 YAML frontmatter
- 支持 Tailscale/NAS 图片路径，适合多端 Obsidian

我想找 10 个重度 Obsidian / PKM 用户做付费 beta。

价格：$99/年，或者 $99 帮你把一个知乎专栏完整归档好。

如果你有很多知乎内容想长期保存成自己的 Markdown 知识库，可以私信我。
```

## Success Metrics

Do not optimize stars first. Optimize paid signal.

- 20 qualified conversations
- 10 demo installs
- 3 paid beta users
- 10 paid beta users
- 50 Pro users

## Immediate Work Queue

1. Add product landing page.
2. Add beta pricing and install guide to README.
3. Add release checklist.
4. Create a short demo script.
5. Package v1.0.1 zip.
6. Open payment link.
7. Send 30 direct outreach messages.
8. Record feedback from every install failure.
9. Fix the top 3 conversion/export bugs.
10. Submit to Chrome Web Store after paid beta proves demand.
