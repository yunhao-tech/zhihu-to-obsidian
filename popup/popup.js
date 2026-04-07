/**
 * Popup 逻辑 — UI 交互 + 消息调度
 */
(function () {
  'use strict';

  /* ── DOM refs ────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const sections = {
    detect:   $('detect-section'),
    notZhihu: $('not-zhihu'),
    export:   $('export-section'),
    progress: $('progress-section'),
    done:     $('done-section'),
    error:    $('error-section'),
  };

  let currentTabId = null;
  let columnInfo = null;
  let progressTimer = null;

  /* ── 显示指定 section ────────────────────────────── */
  function show(name) {
    Object.values(sections).forEach(s => s.classList.add('hidden'));
    sections[name]?.classList.remove('hidden');
  }

  /* ── 初始化：检测当前页面 ────────────────────────── */
  async function init() {
    show('detect');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return show('notZhihu');
      currentTabId = tab.id;

      // 确保 content script 已注入
      if (!tab.url?.includes('zhihu.com')) return show('notZhihu');

      const resp = await sendToContent({ action: 'detectPage' });
      if (!resp?.ok) return show('notZhihu');
      if (resp.pageType === 'unknown') return show('notZhihu');

      columnInfo = resp.columnInfo;
      const isColumnPage = resp.pageType === 'column';

      // ── 页面信息卡片 ──
      if (isColumnPage) {
        // 专栏页面：显示专栏信息，隐藏文章行
        $('info-title').textContent = columnInfo?.title || resp.articleTitle || '—';
        $('info-title').closest('.info-row').querySelector('.info-label').textContent = '专栏';
        $('column-row').style.display = 'none'; // 避免重复显示
      } else {
        // 文章页面：显示文章+专栏
        $('info-title').textContent = resp.articleTitle || '—';
        if (columnInfo) {
          $('column-row').style.display = '';
          $('info-column').textContent = columnInfo.title || columnInfo.id;
        }
      }

      // ── 导出范围选项 ──
      if (isColumnPage) {
        // 专栏页面：隐藏"仅当前文章"，默认选中"整个专栏"
        $('radio-single').style.display = 'none';
        $('radio-column').style.display = '';
        $('radio-range').style.display = '';
        $('radio-column').querySelector('input').checked = true;
        $('column-count').textContent = columnInfo ? `共 ${columnInfo.count} 篇` : '';
      } else if (columnInfo) {
        // 文章页面 + 有专栏：显示全部三个选项
        $('radio-single').style.display = '';
        $('radio-column').style.display = '';
        $('radio-range').style.display = '';
        $('column-count').textContent = `共 ${columnInfo.count} 篇`;
      } else {
        // 独立文章（无专栏）：只显示单篇
        $('radio-single').style.display = '';
        $('radio-column').style.display = 'none';
        $('radio-range').style.display = 'none';
      }

      show('export');
    } catch (e) {
      console.error('[popup] init error', e);
      show('notZhihu');
    }
  }

  /* ── 发送消息给 content script ────────────────────── */
  function sendToContent(msg) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(currentTabId, msg, resp => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(resp);
      });
    });
  }

  /* ── 发送消息给 service worker ────────────────────── */
  function sendToBackground(msg) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, resp => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(resp);
      });
    });
  }

  /* ── UI 交互 ─────────────────────────────────────── */
  // 自定义范围切换
  document.querySelectorAll('input[name="scope"]').forEach(r => {
    r.addEventListener('change', () => {
      $('range-inputs').classList.toggle('hidden', r.value !== 'range');
    });
  });

  // Tailscale 配置切换
  document.querySelectorAll('input[name="imageMode"]').forEach(r => {
    r.addEventListener('change', () => {
      $('tailscale-config').classList.toggle('hidden', r.value !== 'tailscale');
    });
  });

  // 重置按钮
  $('btn-reset')?.addEventListener('click', init);
  $('btn-retry')?.addEventListener('click', init);

  /* ── 导出按钮 ────────────────────────────────────── */
  $('btn-export')?.addEventListener('click', async () => {
    const scope = document.querySelector('input[name="scope"]:checked').value;
    const imageMode = document.querySelector('input[name="imageMode"]:checked').value;
    const tailscaleBase = $('tailscale-url')?.value?.trim() || '';
    const options = { imageMode, tailscaleBase };

    // 禁用按钮
    $('btn-export').disabled = true;
    show('progress');
    updateProgress(0, 1, '准备中…');

    // 轮询进度
    progressTimer = setInterval(async () => {
      try {
        const p = await sendToBackground({ action: 'getProgress' });
        if (p?.running) updateProgress(p.current, p.total, p.title);
      } catch {}
    }, 500);

    try {
      let result;

      if (scope === 'single') {
        // 单篇导出
        updateProgress(1, 1, '正在转换文章…');
        result = await sendToContent({ action: 'exportSingle', options, columnTitle: columnInfo?.title });
      } else {
        // 批量导出
        const range = scope === 'range' ? {
          start: parseInt($('range-start').value) - 1,
          end: parseInt($('range-end').value) - 1,
        } : null;
        result = await sendToContent({
          action: 'exportColumn',
          columnId: columnInfo?.id,
          columnTitle: columnInfo?.title,
          options,
          range,
        });
      }

      if (!result?.ok) throw new Error(result?.error || '导出失败');

      const files = result.data.files;
      if (!files?.length) throw new Error('没有可导出的文章');

      // 根据文件数选择下载方式
      if (files.length === 1 && imageMode === 'remote') {
        // 单文件直接下载
        updateProgress(1, 1, '正在下载…');
        await sendToBackground({
          action: 'downloadSingle',
          filename: files[0].filename,
          content: files[0].content,
        });
      } else {
        // ZIP 打包下载
        updateProgress(0, 1, '正在打包 ZIP…');
        await sendToBackground({
          action: 'downloadZip',
          files,
          options,
          folderName: result.data.folderName || (columnInfo?.title ? `知乎-${columnInfo.title}` : `知乎-${files[0].filename.replace('.md', '')}`),
        });
      }

      clearInterval(progressTimer);
      $('done-text').textContent = `成功导出 ${files.length} 篇文章！`;
      show('done');
    } catch (e) {
      clearInterval(progressTimer);
      console.error('[popup] export error', e);
      $('error-text').textContent = e.message || '导出失败';
      show('error');
    } finally {
      $('btn-export').disabled = false;
    }
  });

  /* ── 进度更新 ────────────────────────────────────── */
  function updateProgress(current, total, title) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    $('progress-fill').style.width = `${pct}%`;
    $('progress-count').textContent = `${current}/${total}`;
    $('progress-status').textContent = '导出中…';
    $('progress-title').textContent = title || '';
  }

  /* ── 启动 ────────────────────────────────────────── */
  init();
})();
