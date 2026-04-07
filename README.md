# 知乎 ➔ Obsidian 导出工具

一个 Chrome 浏览器插件，用于将知乎文章及专栏转换为 Obsidian 兼容的 Markdown 格式。该插件在当前浏览器登录态下直接解析 DOM 与调用 API，重点解决了知乎特有的一些排版元素（如公式、卡片、图片）在常规 Markdown 转换中容易格式丢失的问题。

---

## 核心功能

- **LaTeX 公式还原**：
  直接提取知乎 DOM 内通过 `MathJax/KaTeX` 渲染的公式源码（提取 `<annotation>` 或 `data-tex` 属性），并还原为 Obsidian 标准的 `$行内公式$` 与 `$$块级公式$$`。
- **专栏批量导出**：
  在文章页或专栏页均可一键触发。支持直接拉取并转换当前专栏下的所有文章，最终打包合成带有附件的 ZIP 文件下载。
- **YAML Frontmatter 支持**：
  自动提取标题、作者、发布与修改时间、源链接与标签，并使用标准 YAML 格式附加到 `.md` 文件头部，以便于结合 Obsidian 的 Dataview 进行管理。
- **富文本元素转换**：
  基于 AST 解析映射处理了标题层级、粗斜体、引用块。针对知乎的文章互引卡片，将其统一降级渲染为结构清晰的 `> 📎 [标题](链接)` 引用块；代码块则根据其 HTML class 提取并保留原始高亮语言标识。

---

## 图片处理模式 (Image Modes)

插件由于采用了纯静态 Markdown 文本与图片的剥离结构，在此支持三种图片链路存储模式，用户可在导出前在 UI 面板进行选择：

1. **下载到本地 (Local)**：
   默认模式。批量下载 Markdown 文件时，连同原网页通过 `data-original` 提取到的高清大图，一起打包进 ZIP 压缩包的 `attachments/` 子目录下。Markdown 中采用基于相对文件路径的方式引用图片（如 `![img](attachments/v2-xxx.jpg)`）。
2. **保留远程链接 (Remote)**：
   Markdown 文件中直接保留原始的 `zhimg.com` 链接，不进行实际下载。
3. **Tailscale 私用云模式 (Tailscale)**：
   适用于拥有独立长亮存储设备（如旁路由、Mac Mini、NAS）并使用 [Tailscale](https://tailscale.com/) 异地内网组网管理 Vault 分离知识库的用户。
   - **机制**：在此模式下，导出的ZIP包含两个独立文件夹：
     - `专栏名称/`：仅包含Markdown文件，图片链接为Tailscale局域网绝对路径，可直接拖入Obsidian使用
     - `tailscale-assets/`：包含完整路径的图片资源，直接上传到Tailscale服务根目录即可
   - **自动中文编码**：中文专栏名称会自动进行URL编码，确保链接有效性
   - **示例工作流**：
     1. 在插件输入框填写你的Tailscale服务基础URL，例如 `http://mac-mini:8080`
     2. 导出的Markdown中图片链接格式为：
        `![img](http://mac-mini:8080/%E7%9F%A5%E4%B9%8E-%E6%9F%90%E4%B8%93%E6%A0%8F/attachments/v2-xxx.jpg)`
     3. 使用方式：
        - 将`知乎-某专栏`文件夹直接拖入Obsidian库
        - 将`tailscale-assets`文件夹内的`知乎-某专栏`文件夹上传到Mac Mini的Tailscale服务根目录
     4. 无需任何额外配置，即可实现**多端移动设备（手机/平板中的Obsidian）轻量化秒开查阅，同时免建公有图床**。

---

## 目录结构说明

### 普通模式（Local/Remote）
导出的整个 ZIP 会以 `知乎-文章标题`（单篇）或 `知乎-专栏标题`（批量）命名。解压后的常见组织方式如下：

```text
知乎-计算机底层原理/
├── attachments/
│   ├── v2-aaa111.jpg
│   └── v2-bbb222.png
├── 进程与线程的区别.md
└── 深入理解虚拟内存.md
```

### Tailscale 模式
Tailscale模式下导出的ZIP包含两个独立顶层文件夹，分别用于Obsidian导入和服务器部署：

```text
知乎-计算机底层原理.zip
├── 知乎-计算机底层原理/          # 直接拖入Obsidian库
│   ├── 进程与线程的区别.md
│   └── 深入理解虚拟内存.md
└── tailscale-assets/            # 将里面的内容上传到Tailscale服务根目录
    └── 知乎-计算机底层原理/
        └── attachments/
            ├── v2-aaa111.jpg
            └── v2-bbb222.png
```

## 安装与使用

### 安装

本项目采用本地加载的方式免费自由使用，无需等待商店审核：

1. 前往 [**Releases 页面**](https://github.com/yunhao-tech/zhihu-to-obsidian/releases) 下载最新的 `zhihu-obsidian-vX.X.X.zip` 打包文件。（首发版本链接：[**v1.0.0**](https://github.com/yunhao-tech/zhihu-to-obsidian/releases/tag/v1.0.0)）
2. 将下载好的 ZIP 压缩包解压为你本地电脑上的一个常规目录（请将其放在一个不会被轻易清理的安全路径下）。
3. 打开 Chrome，地址栏敲入 `chrome://extensions/` 回车进入扩展程序管理页，并在右上角开启 **「开发者模式」** 开关。
4. 点击顶部栏出现的 **「加载已解压的扩展程序」**，然后精准指向并选择你刚才解压出来的文件夹。
<img width="1687" height="293" alt="image" src="https://github.com/user-attachments/assets/4a454144-c61b-4978-ad6d-bd0646bef880" />


5. 加载完成后，建议点击浏览器右上方的拼图图标将该插件执行 **「固定 (Pin)」**，以便常驻调用。

### 导出
1. 在网页端登录并打开期望导出的 **知乎文章页** / **专栏页**。
2. 点击通过浏览器顶部激活本插件的紫色图标，在操作面板选择**导出范围**（当前文章/整篇专栏）与**图床分配模式**。
3. 点击 **[开始导出]** 等待队列轮询完成即可触发本机下载。
