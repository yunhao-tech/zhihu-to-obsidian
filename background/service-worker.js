/**
 * Service Worker — 后台服务
 * 负责：图片下载、ZIP 打包、文件下载、进度中继
 */
importScripts('../lib/jszip.min.js');

/* ── 进度状态 ──────────────────────────────────────── */
let exportState = { running: false, current: 0, total: 0, title: '' };

/* ── 消息处理 ──────────────────────────────────────── */
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.action === 'progress') {
    exportState = { running: true, current: msg.current, total: msg.total, title: msg.title };
    return;
  }

  if (msg.action === 'getProgress') {
    reply(exportState);
    return;
  }

  if (msg.action === 'downloadZip') {
    handleZipDownload(msg.files, msg.options || {}, msg.folderName || '知乎导出')
      .then(r => reply(r))
      .catch(e => reply({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === 'downloadSingle') {
    downloadSingleFile(msg.filename, msg.content)
      .then(r => reply(r))
      .catch(e => reply({ ok: false, error: e.message }));
    return true;
  }
});

/* ── 单文件下载 ────────────────────────────────────── */
async function downloadSingleFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const dataUrl = await blobToDataUrl(blob);
  const id = await chrome.downloads.download({
    url: dataUrl,
    filename: `zhihu-obsidian/${filename}`,
    saveAs: false,
  });
  return { ok: true, downloadId: id };
}

/* ── ZIP 打包下载 ──────────────────────────────────── */
async function handleZipDownload(files, options, folderName) {
  const zip = new JSZip();
  const folder = zip.folder(folderName);

  // 添加 Markdown 文件
  for (const f of files) {
    folder.file(f.filename, f.content);
  }

  // 下载图片（如果需要本地化）
  if (options.imageMode === 'local' || options.imageMode === 'tailscale') {
    // 收集所有图片，保留 articleSlug 信息
    // 用 url 去重，但保留 articleSlug 以确定存放路径
    const uniqueImages = new Map(); // key: url, value: {url, filename, articleSlug}
    for (const f of files) {
      for (const img of (f.images || [])) {
        if (!uniqueImages.has(img.url)) {
          uniqueImages.set(img.url, img);
        }
      }
    }

    let imgIdx = 0;
    const imgTotal = uniqueImages.size;
    for (const [, img] of uniqueImages) {
      imgIdx++;
      try {
        exportState = {
          running: true,
          current: imgIdx,
          total: imgTotal,
          title: `下载图片 ${img.filename}`,
        };

        const imgUrl = img.url.startsWith('//') ? 'https:' + img.url : img.url;
        const resp = await fetch(imgUrl, {
          headers: { Referer: 'https://zhuanlan.zhihu.com/' },
        });
        if (resp.ok) {
          const buf = await resp.arrayBuffer();

          // 无论是 local 还是 tailscale 模式，在 ZIP 中都统一存放到 attachments/ 目录
          folder.folder('attachments').file(img.filename, buf);
        }
      } catch (e) {
        console.warn(`[zhihu-export] 图片下载失败: ${img.url}`, e);
      }
      if (imgIdx < imgTotal) await new Promise(r => setTimeout(r, 200));
    }
  }

  // 生成 ZIP
  exportState = { running: true, current: 0, total: 0, title: '正在打包 ZIP…' };
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const dataUrl = await blobToDataUrl(blob);

  const downloadId = await chrome.downloads.download({
    url: dataUrl,
    filename: `${folderName}.zip`,
    saveAs: true,
  });

  exportState = { running: false, current: 0, total: 0, title: '' };
  return { ok: true, downloadId };
}

/* ── 从 Tailscale URL 提取子目录 ───────────────────── */
// 例如 "http://mac-mini/imgs" → "imgs"
// 例如 "http://100.1.2.3:8080/images/zhihu" → "images/zhihu"
function extractTailscaleSubdir(tailscaleBase) {
  if (!tailscaleBase) return 'imgs';
  try {
    const url = new URL(tailscaleBase);
    const path = url.pathname.replace(/^\/+|\/+$/g, ''); // 去掉首尾斜杠
    return path || 'imgs';
  } catch {
    // 不是合法 URL，直接返回默认值
    return 'imgs';
  }
}

/* ── Blob → DataURL ────────────────────────────────── */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
