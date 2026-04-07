/**
 * Content Script — 运行在知乎页面内
 * 负责：页面检测、文章解析、批量导出协调
 */
(function () {
  'use strict';

  /* ── 页面类型检测 ────────────────────────────────── */
  function detectPageType() {
    const url = location.href;
    if (/zhuanlan\.zhihu\.com\/p\/\d+/.test(url)) return 'article';
    if (/zhihu\.com\/column\//.test(url) || /zhuanlan\.zhihu\.com\/[a-zA-Z][\w-]*\/?$/.test(url))
      return 'column';
    if (/zhihu\.com\/question\/\d+\/answer\/\d+/.test(url)) return 'answer';
    return 'unknown';
  }

  /* ── 文章元数据提取 ──────────────────────────────── */
  function extractMeta() {
    const title =
      document.querySelector('.Post-Title')?.textContent?.trim() ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.title.replace(/ - 知乎$/, '');
    const author =
      document.querySelector('.AuthorInfo-name a')?.textContent?.trim() ||
      document.querySelector('.UserLink-link')?.textContent?.trim() || '';
    const dateEl = document.querySelector('.ContentItem-time') ||
                   document.querySelector('.Post-time');
    let created = '', updated = '';
    if (dateEl) {
      const t = dateEl.textContent;
      const pm = t.match(/发布于\s*([\d-]+)/);
      const em = t.match(/编辑于\s*([\d-]+)/);
      if (pm) created = pm[1];
      if (em) updated = em[1];
      if (!created && !updated) {
        const dm = t.match(/(\d{4}-\d{2}-\d{2})/);
        if (dm) created = dm[1];
      }
    }
    const tags = [...document.querySelectorAll('.Tag-content a, .TopicLink')]
      .map(e => e.textContent.trim()).filter(Boolean);
    const column =
      document.querySelector('.ColumnPageHeader-Title')?.textContent?.trim() ||
      document.querySelector('.Post-Header .css-1gomreu')?.textContent?.trim() || '';
    return { title, author, created, updated, tags, column, url: location.href };
  }

  /* ── Frontmatter 生成 ────────────────────────────── */
  function frontmatter(m) {
    const esc = s => `"${(s || '').replace(/"/g, '\\"')}"`;
    let fm = '---\n';
    fm += `title: ${esc(m.title)}\n`;
    if (m.author) fm += `author: ${esc(m.author)}\n`;
    fm += `source: ${esc(m.url)}\n`;
    if (m.created) fm += `created: ${m.created}\n`;
    if (m.updated) fm += `updated: ${m.updated}\n`;
    if (m.column) fm += `column: ${esc(m.column)}\n`;
    fm += 'tags:\n  - 知乎\n';
    m.tags.forEach(t => { fm += `  - ${t}\n`; });
    fm += '---\n\n';
    return fm;
  }

  /* ── 文件名清理 ──────────────────────────────────── */
  function safeName(s) {
    return (s || 'untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  /* ── 单篇导出（当前页面 DOM） ────────────────────── */
  function exportCurrentArticle(options, columnTitle) {
    const container =
      document.querySelector('.Post-RichText') ||
      document.querySelector('.RichText.ztext.Post-RichText') ||
      document.querySelector('.RichContent-inner .RichText');
    if (!container) throw new Error('找不到文章内容');
    const meta = extractMeta();
    const folderName = `知乎-${safeName(columnTitle || meta.column || meta.title)}`;
    const conv = new ZhihuMarkdownConverter({
      imageMode: options.imageMode || 'local',
      tailscaleBase: options.tailscaleBase || '',
      articleSlug: safeName(meta.title),
      folderName: folderName,
    });
    const md = conv.convert(container);
    return {
      files: [{ filename: `${safeName(meta.title)}.md`, content: frontmatter(meta) + md, images: conv.collectedImages }],
      meta,
      folderName,
    };
  }

  /* ── 专栏 ID 探测 ────────────────────────────────── */
  function findColumnId() {
    // 从 URL
    let m = location.href.match(/\/column\/([\w-]+)/);
    if (m) return m[1];
    m = location.href.match(/zhuanlan\.zhihu\.com\/([\w-]+)\/?$/);
    if (m && m[1] !== 'p') return m[1];
    // 从页面链接
    const link = document.querySelector('a[href*="/column/"]');
    if (link) { m = link.href.match(/\/column\/([\w-]+)/); if (m) return m[1]; }
    return null;
  }

  /* ── 专栏文章列表（API） ─────────────────────────── */
  async function fetchColumnArticles(columnId) {
    const articles = [];
    let offset = 0;
    const PAGE_SIZE = 20;
    console.log(`[zhihu-export] 开始获取专栏 ${columnId} 的文章列表...`);

    while (true) {
      let resp, data;
      // 主 API
      try {
        resp = await fetch(
          `https://www.zhihu.com/api/v4/columns/${columnId}/items?limit=${PAGE_SIZE}&offset=${offset}`
        );
      } catch (e) {
        console.warn('[zhihu-export] 主 API 请求失败，尝试备用 API', e);
      }

      if (resp && resp.ok) {
        data = await resp.json();
      } else {
        // 备用 API
        try {
          resp = await fetch(
            `https://zhuanlan.zhihu.com/api/columns/${columnId}/articles?limit=${PAGE_SIZE}&offset=${offset}`
          );
          if (resp.ok) data = await resp.json();
        } catch (e) {
          console.warn('[zhihu-export] 备用 API 也失败', e);
        }
      }

      if (!data) {
        console.warn(`[zhihu-export] 无法获取文章列表，已获取 ${articles.length} 篇`);
        break;
      }

      // 兼容不同 API 返回格式
      const items = data.data || data.results || (Array.isArray(data) ? data : []);
      if (items.length === 0) {
        console.log(`[zhihu-export] 本页无文章，终止分页，共 ${articles.length} 篇`);
        break;
      }
      articles.push(...items);
      console.log(`[zhihu-export] 已获取 ${articles.length} 篇 (offset=${offset})`);

      // 判断是否还有更多
      const isEnd = data.paging?.is_end ?? (items.length < PAGE_SIZE);
      if (isEnd) {
        console.log(`[zhihu-export] 分页结束，共 ${articles.length} 篇`);
        break;
      }

      offset += PAGE_SIZE;
      await sleep(500);
    }

    console.log(`[zhihu-export] 专栏 ${columnId} 共获取 ${articles.length} 篇文章`);
    return articles;
  }

  /* ── 批量导出 ────────────────────────────────────── */
  async function exportBatch(columnId, columnTitle, options, range) {
    let articles = await fetchColumnArticles(columnId);
    if (range) articles = articles.slice(range.start, range.end + 1);
    const total = articles.length;
    const files = [];

    const folderName = `知乎-${safeName(columnTitle || articles[0]?.column?.title || articles[0]?.title || '导出')}`;

    for (let i = 0; i < total; i++) {
      let art = articles[i];
      // 进度上报
      chrome.runtime.sendMessage({ action: 'progress', current: i + 1, total, title: art.title });

      try {
        // 获取完整内容
        if (!art.content) {
          const r = await fetch(`https://www.zhihu.com/api/v4/articles/${art.id}`);
          if (r.ok) art = await r.json();
        }
        if (!art.content) continue;

        const doc = new DOMParser().parseFromString(art.content, 'text/html');
        const conv = new ZhihuMarkdownConverter({
          imageMode: options.imageMode || 'local',
          tailscaleBase: options.tailscaleBase || '',
          articleSlug: safeName(art.title),
          folderName: folderName,
        });
        const md = conv.convert(doc.body);
        const meta = {
          title: art.title || '',
          author: art.author?.name || '',
          url: art.url || `https://zhuanlan.zhihu.com/p/${art.id}`,
          created: art.created ? new Date(art.created * 1000).toISOString().slice(0, 10) : '',
          updated: art.updated ? new Date(art.updated * 1000).toISOString().slice(0, 10) : '',
          column: art.column?.title || '',
          tags: (art.topics || []).map(t => t.name),
        };
        files.push({
          filename: `${safeName(meta.title)}.md`,
          content: frontmatter(meta) + md,
          images: conv.collectedImages,
        });
      } catch (e) {
        console.error(`[zhihu-export] 导出失败: ${art.title}`, e);
      }

      if (i < total - 1) await sleep(1200);
    }
    return { files, folderName };
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ── 消息监听 ────────────────────────────────────── */
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    (async () => {
      try {
        if (msg.action === 'detectPage') {
          const pageType = detectPageType();
          let columnInfo = null;
          const cid = findColumnId();
          if (cid) {
            try {
              const r = await fetch(`https://www.zhihu.com/api/v4/columns/${cid}`);
              if (r.ok) {
                const d = await r.json();
                let count = d.articles_count || d.items_count || d.count || 0;

                // 如果 API 没返回文章数，尝试从文章列表分页信息获取
                if (!count) {
                  try {
                    const lr = await fetch(
                      `https://www.zhihu.com/api/v4/columns/${cid}/items?limit=1&offset=0`
                    );
                    if (lr.ok) {
                      const ld = await lr.json();
                      count = ld.paging?.totals || 0;
                      // 如果 totals 也没有，用 is_end + 数据量估算
                      if (!count && ld.data?.length) {
                        // 获取更多来估算
                        const lr2 = await fetch(
                          `https://www.zhihu.com/api/v4/columns/${cid}/items?limit=20&offset=0`
                        );
                        if (lr2.ok) {
                          const ld2 = await lr2.json();
                          const items = ld2.data || [];
                          const isEnd = ld2.paging?.is_end;
                          count = isEnd ? items.length : items.length + '+';
                        }
                      }
                    }
                  } catch {}
                }

                // 最后尝试从页面 DOM 获取（专栏页面可能显示文章数）
                if (!count) {
                  const countEl = document.querySelector('.ColumnPageHeader-Counts, .css-1kol5yr');
                  if (countEl) {
                    const cm = countEl.textContent.match(/(\d+)\s*篇/);
                    if (cm) count = parseInt(cm[1]);
                  }
                }

                columnInfo = { id: cid, title: d.title, count: count || 0 };
              }
            } catch {}
          }

          // 根据页面类型获取合适的标题
          let articleTitle;
          if (pageType === 'column') {
            // 专栏页面：展示专栏名称
            articleTitle = columnInfo?.title ||
              document.querySelector('.ColumnPageHeader-Title')?.textContent?.trim() ||
              document.querySelector('.css-zyehvu')?.textContent?.trim() ||
              document.title.replace(/ - 知乎$/, '');
          } else {
            // 文章页面
            articleTitle = document.querySelector('.Post-Title')?.textContent?.trim() ||
              document.querySelector('h1')?.textContent?.trim() ||
              document.title.replace(/ - 知乎$/, '');
          }

          return reply({ ok: true, pageType, columnInfo, articleTitle });
        }

        if (msg.action === 'exportSingle') {
          const data = exportCurrentArticle(msg.options || {}, msg.columnTitle);
          return reply({ ok: true, data });
        }

        if (msg.action === 'exportColumn') {
          const cid = msg.columnId || findColumnId();
          if (!cid) return reply({ ok: false, error: '无法找到专栏 ID' });
          const data = await exportBatch(cid, msg.columnTitle, msg.options || {}, msg.range);
          return reply({ ok: true, data });
        }

        reply({ ok: false, error: '未知操作' });
      } catch (e) {
        reply({ ok: false, error: e.message });
      }
    })();
    return true; // async
  });
})();
