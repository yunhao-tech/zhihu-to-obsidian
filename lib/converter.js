/**
 * ZhihuMarkdownConverter — 知乎 HTML → Obsidian Markdown 转换器
 * 支持：标题、段落、加粗/斜体、链接、图片、代码块、LaTeX 公式、
 *       引用块、列表、表格、知乎引用卡片、分割线等
 */
class ZhihuMarkdownConverter {
  constructor(options = {}) {
    this.imageMode = options.imageMode || 'local';
    this.tailscaleBase = options.tailscaleBase || '';
    this.articleSlug = options.articleSlug || 'article';
    this.folderName = options.folderName || '知乎导出';
    this.collectedImages = [];
  }

  convert(element) {
    if (!element) return '';
    return this.cleanup(this.processNode(element));
  }

  /* ── Node dispatcher ─────────────────────────────── */
  processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const handler = {
      h1: () => this.heading(node, 1),
      h2: () => this.heading(node, 2),
      h3: () => this.heading(node, 3),
      h4: () => this.heading(node, 4),
      h5: () => this.heading(node, 5),
      h6: () => this.heading(node, 6),
      p: () => this.paragraph(node),
      br: () => '\n',
      hr: () => '\n---\n\n',
      strong: () => this.wrap(node, '**'),
      b: () => this.wrap(node, '**'),
      em: () => this.wrap(node, '*'),
      i: () => this.wrap(node, '*'),
      del: () => this.wrap(node, '~~'),
      s: () => this.wrap(node, '~~'),
      u: () => `<u>${this.children(node)}</u>`,
      sup: () => `<sup>${this.children(node)}</sup>`,
      sub: () => `<sub>${this.children(node)}</sub>`,
      a: () => this.link(node),
      img: () => this.image(node),
      figure: () => this.figure(node),
      blockquote: () => this.blockquote(node),
      ul: () => this.list(node, false, 0),
      ol: () => this.list(node, true, 0),
      pre: () => this.codeBlock(node),
      code: () => this.inlineCode(node),
      table: () => this.table(node),
      span: () => this.span(node),
      div: () => this.div(node),
    }[tag];
    return handler ? handler() : this.children(node);
  }

  children(node) {
    let out = '';
    for (const c of node.childNodes) out += this.processNode(c);
    return out;
  }

  /* ── Block elements ──────────────────────────────── */
  heading(node, level) {
    const txt = this.children(node).trim();
    return txt ? `\n${'#'.repeat(level)} ${txt}\n\n` : '';
  }

  paragraph(node) {
    const txt = this.children(node).trim();
    return txt ? `${txt}\n\n` : '';
  }

  blockquote(node) {
    const lines = this.children(node).trim().split('\n');
    return '\n' + lines.map(l => `> ${l}`).join('\n') + '\n\n';
  }

  /* ── Inline elements ─────────────────────────────── */
  wrap(node, marker) {
    const c = this.children(node);
    return c.trim() ? `${marker}${c}${marker}` : '';
  }

  link(node) {
    if (node.classList.contains('LinkCard') || node.classList.contains('LinkCard-link')) {
      return this.linkCard(node);
    }
    const href = this.cleanUrl(node.getAttribute('href') || '');
    const text = this.children(node).trim();
    if (!href) return text;
    return `[${text || href}](${href})`;
  }

  linkCard(node) {
    const href = this.cleanUrl(node.getAttribute('href') || '');
    const title =
      node.querySelector('.LinkCard-title')?.textContent?.trim() ||
      node.getAttribute('data-text') || href;
    return `\n> 📎 [${title}](${href})\n\n`;
  }

  /* ── Images ──────────────────────────────────────── */
  image(node) {
    const src =
      node.getAttribute('data-original') ||
      node.getAttribute('data-actualsrc') ||
      node.getAttribute('src') || '';
    if (!src || src.startsWith('data:')) return '';
    const alt = node.getAttribute('alt') || '';
    return `![${alt}](${this.imgUrl(src)})`;
  }

  figure(node) {
    const img = node.querySelector('img');
    if (!img) return this.children(node);
    const src =
      img.getAttribute('data-original') ||
      img.getAttribute('data-actualsrc') ||
      img.getAttribute('src') || '';
    if (!src || src.startsWith('data:')) return '';
    const cap = node.querySelector('figcaption')?.textContent?.trim() || '';
    const alt = cap || img.getAttribute('alt') || '';
    let md = `![${alt}](${this.imgUrl(src)})`;
    if (cap) md += `\n*${cap}*`;
    return `\n${md}\n\n`;
  }

  imgUrl(url) {
    if (url.startsWith('//')) url = 'https:' + url;
    let filename;
    try { filename = new URL(url).pathname.split('/').pop(); }
    catch { filename = 'image.jpg'; }
    this.collectedImages.push({ url, filename, articleSlug: this.articleSlug });

    if (this.imageMode === 'local') return `attachments/${filename}`;
    if (this.imageMode === 'tailscale') {
      const base = this.tailscaleBase.replace(/\/+$/, '');
      const encodedFolder = encodeURIComponent(this.folderName);
      return `${base}/${encodedFolder}/attachments/${filename}`;
    }
    return url; // remote
  }

  /* ── Code ────────────────────────────────────────── */
  codeBlock(node) {
    const code = node.querySelector('code');
    const text = (code || node).textContent.trim();
    let lang = '';
    if (code) {
      const cls = [...code.classList].find(c => /^(language-|lang-)/.test(c));
      if (cls) lang = cls.replace(/^(language-|lang-)/, '');
    }
    return `\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
  }

  inlineCode(node) {
    if (node.parentElement?.tagName.toLowerCase() === 'pre') return node.textContent;
    return `\`${node.textContent}\``;
  }

  /* ── Tables ──────────────────────────────────────── */
  table(node) {
    const rows = node.querySelectorAll('tr');
    if (!rows.length) return '';
    let out = '\n';
    let first = true;
    for (const row of rows) {
      const cells = [...row.querySelectorAll('th, td')].map(
        c => this.children(c).trim().replace(/\|/g, '\\|').replace(/\n/g, ' ')
      );
      out += `| ${cells.join(' | ')} |\n`;
      if (first) { out += `| ${cells.map(() => '---').join(' | ')} |\n`; first = false; }
    }
    return out + '\n';
  }

  /* ── Lists ───────────────────────────────────────── */
  list(node, ordered, depth) {
    const items = node.querySelectorAll(':scope > li');
    let out = depth === 0 ? '\n' : '';
    let idx = 1;
    for (const li of items) {
      const indent = '  '.repeat(depth);
      const bullet = ordered ? `${idx++}.` : '-';
      const { text, nested } = this.liContent(li, depth);
      out += `${indent}${bullet} ${text}\n${nested}`;
    }
    if (depth === 0) out += '\n';
    return out;
  }

  liContent(li, depth) {
    let text = '', nested = '';
    for (const c of li.childNodes) {
      if (c.nodeType === Node.ELEMENT_NODE) {
        const t = c.tagName.toLowerCase();
        if (t === 'ul') { nested += this.list(c, false, depth + 1); continue; }
        if (t === 'ol') { nested += this.list(c, true, depth + 1); continue; }
      }
      text += this.processNode(c);
    }
    return { text: text.trim(), nested };
  }

  /* ── Span / Div special handling ─────────────────── */
  span(node) {
    if (node.classList.contains('ztext-math')) return this.math(node);
    return this.children(node);
  }

  div(node) {
    if (node.classList.contains('highlight')) {
      const pre = node.querySelector('pre');
      if (pre) return this.codeBlock(pre);
    }
    if (node.classList.contains('LinkCard')) return this.linkCard(node);
    return this.children(node);
  }

  /* ── LaTeX / Math ────────────────────────────────── */
  math(node) {
    let tex = node.getAttribute('data-tex');
    if (!tex) {
      const ann = node.querySelector('annotation[encoding="application/x-tex"]');
      if (ann) tex = ann.textContent;
    }
    if (!tex) {
      const s = node.querySelector('script[type="math/tex"]');
      if (s) tex = s.textContent;
    }
    if (!tex) return this.children(node);
    tex = tex.trim();
    const isBlock =
      node.getAttribute('data-tex-display') === 'true' ||
      node.classList.contains('ztext-math--display') ||
      (node.parentElement?.tagName.toLowerCase() === 'p' &&
        node.parentElement.childNodes.length === 1);
    return isBlock ? `\n$$\n${tex}\n$$\n` : `$${tex}$`;
  }

  /* ── Utilities ───────────────────────────────────── */
  cleanUrl(url) {
    if (!url) return '';
    try {
      if (url.includes('link.zhihu.com/?target=')) {
        const t = new URL(url).searchParams.get('target');
        if (t) return decodeURIComponent(t);
      }
    } catch {}
    return url;
  }

  cleanup(md) {
    return md
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n*$/, '\n')
      .replace(/^\n+/, '');
  }
}

if (typeof window !== 'undefined') window.ZhihuMarkdownConverter = ZhihuMarkdownConverter;
