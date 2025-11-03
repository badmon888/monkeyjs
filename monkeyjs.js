// ==UserScript==
// @name         采集资源展示脚本
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  将符合链接规则的网站转换成展示视频卡片的形式
// @author       zdf
// @match        *://*/provide/vod/*
// @match        *://*/api.php/provide/vod*
// @match        *://*/*/provide/vod*
// @match        https://api.yzzy-api.com/*
// @match        *://*.baidu.com/cj
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  let mainContainer = null;

  // -------------------------- 网址保存功能 --------------------------
  function getSavedUrls() {
    return GM_getValue("savedUrls", []);
  }
  function saveUrl(url, title) {
    const urls = getSavedUrls();
    if (!urls.some((item) => item.url === url)) {
      urls.push({
        url,
        title: title || url,
        time: new Date().toLocaleString(),
      });
      GM_setValue("savedUrls", urls);
      return true;
    }
    return false;
  }
  function deleteUrl(url) {
    const urls = getSavedUrls().filter((item) => item.url !== url);
    GM_setValue("savedUrls", urls);
    renderUrlList();
  }

  // -------------------------- 工具面板 --------------------------
  function createPanel() {
    mainContainer = document.createElement("div");
    mainContainer.className = "tool-panel";

    const title = document.createElement("h3");
    title.textContent = "工具面板";

    const btnArea = document.createElement("div");
    btnArea.className = "btn-area";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "保存当前网址";
    saveBtn.className = "save-btn";
    saveBtn.addEventListener("click", () => {
      const currentUrl = window.location.href;
      const websiteName = prompt("请输入网站名称：", "");
      if (websiteName === null) return; // 用户取消

      // 如果未输入网站名称，则使用当前URL
      const finalTitle =
        websiteName.trim() !== "" ? websiteName.trim() : currentUrl;
      const saved = saveUrl(currentUrl, finalTitle);

      alert(saved ? "保存成功！" : "该网址已保存过");
      renderUrlList();
    });

    const listBtn = document.createElement("button");
    listBtn.textContent = "显示网址列表";
    listBtn.className = "list-btn";
    listBtn.addEventListener("click", () => {
      const listBox = document.getElementById("urlListBox");
      listBox.style.display =
        listBox.style.display === "block" ? "none" : "block";
      listBtn.textContent =
        listBox.style.display === "block" ? "隐藏网址列表" : "显示网址列表";
      renderUrlList();
    });

    const listBox = document.createElement("div");
    listBox.id = "urlListBox";

    btnArea.appendChild(saveBtn);
    btnArea.appendChild(listBtn);
    mainContainer.appendChild(title);
    mainContainer.appendChild(btnArea);
    mainContainer.appendChild(listBox);
    document.body.appendChild(mainContainer);

    // 添加点击面板外关闭面板的功能
    document.addEventListener("click", (event) => {
      if (mainContainer && mainContainer.style.display === "block") {
        // 检查点击目标是否在面板内部
        if (!mainContainer.contains(event.target)) {
          mainContainer.style.display = "none";
        }
      }
    });
  }

  function renderUrlList() {
    const listBox = document.getElementById("urlListBox");
    if (!listBox) return;

    const urls = getSavedUrls();
    if (urls.length === 0) {
      listBox.innerHTML =
        '<p style="color:#666; margin:10px; font-size:14px;">暂无保存的网址</p>';
      return;
    }

    listBox.innerHTML = "";
    urls.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "url-item";
      itemDiv.title = "点击选择操作";

      const urlText = document.createElement("span");
      urlText.textContent =
        item.title.length > 25 ? item.title.slice(0, 25) + "..." : item.title;
      urlText.className = "url-text";

      const editBtn = document.createElement("button");
      editBtn.textContent = "改";
      editBtn.className = "edit-btn";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const newTitle = prompt("请输入新的网站标题：", item.title);
        if (newTitle !== null) {
          const newUrl = prompt("请输入新的网站URL：", item.url);
          if (newUrl !== null && newUrl.trim() !== "") {
            const urls = getSavedUrls();
            const index = urls.findIndex((u) => u.url === item.url);
            if (index !== -1) {
              // 检查新URL是否已存在（排除当前项本身）
              const urlExists = urls.some(
                (u, i) => u.url === newUrl.trim() && i !== index
              );
              if (urlExists) {
                alert("该URL已存在！");
                return;
              }

              urls[index].url = newUrl.trim();
              if (newTitle.trim() !== "") {
                urls[index].title = newTitle.trim();
              }
              urls[index].time = new Date().toLocaleString(); // 更新修改时间
              GM_setValue("savedUrls", urls);
              alert("修改成功！");
              renderUrlList();
            }
          }
        }
      });

      const delBtn = document.createElement("button");
      delBtn.textContent = "删";
      delBtn.className = "del-btn";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`确定删除「${item.title}」吗？`)) deleteUrl(item.url);
      });

      itemDiv.addEventListener("click", () => {
        // 保存要显示的标题到油猴变量中
        GM_setValue("lastClickedSiteTitle", item.title);
        // 跳转到网址
        window.location.href = item.url;
      });

      itemDiv.appendChild(urlText);
      itemDiv.appendChild(editBtn);
      itemDiv.appendChild(delBtn);
      listBox.appendChild(itemDiv);
    });
  }

  GM_registerMenuCommand("📌 打开工具面板", () => {
    if (!mainContainer) createPanel();
    mainContainer.style.display =
      mainContainer.style.display === "block" ? "none" : "block";
  });

  GM_registerMenuCommand("🙆 导出网址列表", () => {
    const urls = getSavedUrls();
    if (urls.length === 0) {
      alert("暂无保存的网站可供导出");
      return;
    }

    const jsonStr = JSON.stringify(urls, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `切片网保存_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });
  GM_registerMenuCommand("🙋 导入网址列表", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedUrls = JSON.parse(event.target.result);
          if (!Array.isArray(importedUrls)) {
            throw new Error("文件格式错误，应包含网址数组");
          }

          const currentUrls = getSavedUrls();
          const currentUrlSet = new Set(currentUrls.map((item) => item.url));
          let importedCount = 0;

          importedUrls.forEach((urlItem) => {
            if (urlItem.url && !currentUrlSet.has(urlItem.url)) {
              currentUrls.push({
                url: urlItem.url,
                title: urlItem.title || urlItem.url,
                time: new Date().toLocaleString(), // 使用当前时间
              });
              currentUrlSet.add(urlItem.url);
              importedCount++;
            }
          });

          if (importedCount > 0) {
            GM_setValue("savedUrls", currentUrls);
            alert(`成功导入 ${importedCount} 个网站！`);
            renderUrlList();
          }
        } catch (error) {
          alert(`导入失败：${error.message}`);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  });

  GM_registerMenuCommand("🌐 从网络地址导入", () => {
    const url = prompt("请输入包含网址列表的JSON文件的网络地址：");
    if (!url) return;
    
    // 显示加载提示
    //alert("开始从网络获取数据，请稍候...");

    // 使用GM_xmlhttpRequest替代fetch以处理跨域请求
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      headers: {
        "Accept": "application/json"
      },
      onload: function(response) {
        try {
          // 检查HTTP状态码
          if (response.status < 200 || response.status >= 300) {
            throw new Error(`网络请求失败：HTTP ${response.status} ${response.statusText}`);
          }
          
          // 尝试解析JSON数据
          let importedUrls;
          try {
            importedUrls = JSON.parse(response.responseText);
          } catch (jsonError) {
            throw new Error("JSON解析失败：返回的内容不是有效的JSON格式");
          }
          
          // 验证数据格式
          if (!Array.isArray(importedUrls)) {
            throw new Error("文件格式错误：应包含网址数组");
          }

          // 处理数据导入逻辑
          const currentUrls = getSavedUrls();
          const currentUrlSet = new Set(currentUrls.map((item) => item.url));
          let importedCount = 0;

          importedUrls.forEach((urlItem) => {
            if (urlItem.url && !currentUrlSet.has(urlItem.url)) {
              currentUrls.push({
                url: urlItem.url,
                title: urlItem.title || urlItem.url,
                time: new Date().toLocaleString(),
              });
              currentUrlSet.add(urlItem.url);
              importedCount++;
            }
          });

          // 根据导入结果显示不同的提示
          if (importedCount > 0) {
            GM_setValue("savedUrls", currentUrls);
            alert(`成功从网络导入 ${importedCount} 个网站！`);
            renderUrlList();
          } else {
            alert("没有导入新的网站（所有网站已存在）");
          }
        } catch (error) {
          alert(`导入失败：${error.message}`);
        }
      },
      onerror: function(error) {
        // 处理网络错误
        let errorMessage = "网络请求失败";
        if (error.status) {
          errorMessage += `: 状态码 ${error.status}`;
        }
        if (error.statusText) {
          errorMessage += `, ${error.statusText}`;
        }
        alert(`导入失败：${errorMessage}。请检查URL是否正确以及网络连接。`);
      },
      ontimeout: function() {
        alert("导入失败：请求超时，请检查网络连接或URL是否有效。");
      }
    });
  });

  // -------------------------- 初始化 --------------------------
  function addstyle(){ // 修复函数名前多余空格
      const styleReset = document.createElement("style");
      styleReset.textContent = `
/* === 全局样式重置 === */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* === 基础样式 === */
body, html {
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #f8f9fa;
}

a {
    text-decoration: none;
    transition: all 0.3s ease;
}

/* === 核心布局 === */
#newFrame {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f8f9fa;
    background-image: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

#header {
    width: 100%;
    background: white;
    color: #333;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1000;
    transition: all 0.3s ease;
}

/* === 导航组件 === */
.nav-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    flex-wrap: wrap;
    gap: 20px;
}

.nav-item {
    color: #4a5568;
    text-decoration: none;
    padding: 10px 20px;
    border-radius: 6px;
    background-color: transparent;
    display: inline-block;
    font-size: 16px;
    font-weight: 500;
    transition: all 0.2s ease;
    border: none;
    position: relative;
    cursor: pointer;
    font-family: inherit;
}

.nav-item:hover {
    background-color: #f7fafc;
    color: #3182ce;
    transform: translateY(-1px);
}

/* === 按钮样式 === */
.action-buttons {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
}

/* === URL管理 === */
.url-info {
    font-size: 12px;
    color: #666;
    margin-top: 5px;
    word-break: break-all;
}

/* === 头部区域 === */
.header-top, .header-bottom {
    width: 100%;
    min-height: 80px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 40px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 999;
    transition: all 0.3s ease;
}

.header-title {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
    color: #2d3748;
    letter-spacing: -0.5px;
}

/* === 搜索组件 === */
.search-container {
    display: flex;
    align-items: center;
}

#searchInput {
    width: 320px;
    padding: 12px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px 0 0 8px;
    font-size: 16px;
    outline: none;
    background-color: #ffffff;
    color: #333;
    transition: all 0.2s ease;
}

#searchInput:focus {
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

#searchButton {
    padding: 12px 24px;
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 0 8px 8px 0;
    font-size: 16px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
}

#searchButton:hover {
    background: #3182ce;
    transform: translateY(-1px);
}

#mainContainer {
    flex: 1;
    padding: 30px;
    background-color: white;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
    margin: 20px;
    border-radius: 12px;
    overflow-y: auto;
    transition: all 0.3s ease;
    min-height: 400px;
}

/* === 工具面板 === */
.tool-panel {
    position: fixed;
    right: 20px;
    top: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 160px;
    z-index: 9999;
    display: none;
    font-family: sans-serif;
}

.tool-panel h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
}

.btn-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
}

/* === 功能按钮 === */
.save-btn,
.list-btn {
    padding: 8px;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.save-btn {
    background: #4CAF50;
}

.save-btn:hover {
    background: #45a049;
}

.list-btn {
    background: #2196F3;
}

.list-btn:hover {
    background: #0b7dda;
}

/* === URL列表 === */
#urlListBox {
    max-height: 300px;
    overflow-y: auto;
    display: none;
    padding: 5px 0;
}

.url-item {
    padding: 8px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    cursor: pointer;
}

.url-item:hover {
    background-color: #f5f5f5;
}

.url-text {
    color: #2196F3;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.edit-btn,
.del-btn {
    padding: 2px 6px;
    color: white;
    border: none;
    border-radius: 2px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
}

.edit-btn {
    background: #ff9800;
    margin-right: 4px;
}

.edit-btn:hover {
    background: #e68900;
}

.del-btn {
    background: #f44336;
}

.del-btn:hover {
    background: #da190b;
}

/* === 加载指示器 === */
#loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #666;
}

.custom-spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-top: 4px solid #667eea;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* === 视频网格 === */
.video-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
    padding: 20px;
}

/* === 视频卡片 === */
.video-card {
    background-color: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    cursor: pointer;
    break-inside: avoid;
}

.video-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.video-link {
    display: block;
    text-decoration: none;
    color: inherit;
}
            .img-container {
                position: relative;
                padding-top: 140%;
                overflow: hidden;
            }
            .video-img {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: contain;
                background-color: #f5f5f5;
            }
            .title-container {
                padding: 12px 15px;
                background-color: white;
            }
            .video-title {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            /* 信息显示样式 */
            .info-span {
                font-size: 13px;
                color: #666;
                margin-top: 5px;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            /* 空内容提示样式 */
            .empty-div {
                text-align: center;
                padding: 80px 20px;
                color: #666;
                background-color: #f8f9fa;
                border-radius: 12px;
                margin: 20px;
            }
            .empty-div h3 {
                margin-bottom: 15px;
                color: #333;
                font-size: 22px;
            }
            .empty-div p {
                line-height: 1.6;
                max-width: 500px;
                margin: 0 auto;
            }
            /* 错误信息样式 */
            .error-div {
                text-align: center;
                padding: 60px 20px;
                color: #ff4757;
            }
            .error-div h3 {
                margin-bottom: 10px;
            }
            /* 分页样式 */
            .pagination-container {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background-color: white;
                padding: 20px;
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 100;
                gap: 10px;
            }
            .pagination-btn {
                padding: 8px 12px;
                background-color: #fff;
                color: #333;
                border: 1px solid #ddd;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }
            .pagination-btn:hover {
                background-color: #f5f5f5;
            }
            .pagination-btn.active {
                background-color: #667eea;
                color: #fff;
                border: none;
            }
            .pagination-btn:disabled {
                background-color: #ccc;
                cursor: not-allowed;
            }
            .pagination-ellipsis {
                margin: 0 5px;
                color: #666;
            }
            .page-info {
                margin-left: 20px;
                color: #666;
                font-size: 14px;
            }
            /* 特殊分页按钮样式 */
            .pagination-btn.prev-next {
                padding: 8px 16px;
                color: white;
                border: none;
            }
            .pagination-btn.prev-next:not(:disabled) {
                background-color: #667eea;
            }
            
            /* 前一页/后一页按钮通用样式 */
            .page-navigation-btn {
                padding: 8px 16px;
                background-color: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }
            
            .page-navigation-btn:disabled {
                background-color: #ccc;
                cursor: not-allowed;
            }
            
            /* 视频按钮模态框样式 */
            #video-buttons-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 2000;
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: auto;
            }
            
            /* 视频模态框标题容器样式 */
            .modal-title-container {
                background-color: #2196F3;
                color: white;
                padding: 20px;
                font-size: 18px;
                font-weight: bold;
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            /* 视频模态框按钮容器样式 */
            .modal-buttons-container {
                padding: 20px;
                max-height: 400px;
                overflow-y: auto;
                background: radial-gradient(black, #2083cd99);
            }
            
            /* 单个按钮容器样式 */
            .video-button-container {
                margin-bottom: 10px;
                padding: 10px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                background-color: #f9f9f9;
            }
            
            /* 链接标题样式 */
            .video-link-title {
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
            }
            
            /* 视频模态框按钮基础样式 */
            .video-action-button {
                padding: 8px 12px;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                text-decoration: none;
                transition: background-color 0.3s;
                display: inline-block;
            }
            
            /* 原始播放按钮 */
            .original-button {
                background-color: #4CAF50;
            }
            
            .original-button:hover {
                background-color: #45a049;
            }
            
            /* 外部播放按钮 */
            .external-player-button {
                background-color: #2196F3;
            }
            
            .external-player-button:hover {
                background-color: #0b7dda;
            }
            
            /* 复制按钮 */
            .copy-button {
                padding: 8px 12px;
                background-color: #FF9800;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            
            .copy-button:hover {
                background-color: #e68900;
            }
            


            /* === 响应式设计 === */
            @media (max-width: 768px) {
                .pagination-container {
                    padding: 10px 15px;
                    gap: 5px;
                }
                .pagination-container button {
                    padding: 6px 12px !important;
                    font-size: 12px !important;
                }
                .pagination-container span:last-child {
                    margin-top: 5px;
                    margin-left: 0 !important;
                    width: 100%;
                    text-align: center;
                }
            }
            @media (max-width: 480px) {
                .pagination-container {
                    padding: 8px 10px;
                }
                .pagination-container button {
                    min-width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            }
        `;
      document.head.appendChild(styleReset);
  }
  // 只在浏览器环境中执行初始化
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    window.addEventListener("load", () => {
      var url = window.location.href.split("?")[0];
      //添加新的样式
      addstyle()
      document.body.innerHTML = "";
      // 设置全局样式重置

      const newFrame = document.createElement("div");
      newFrame.id = "newFrame";

      const header = document.createElement("div");
      header.id = "header";
      const headertp = document.createElement("div");
      headertp.id = "headertp";
      headertp.className = "headertp";
      const headerTitle = document.createElement("h1");
      // 检查油猴变量中是否有保存的标题，如果有就使用它，否则使用默认标题
      const savedTitle = GM_getValue("lastClickedSiteTitle");
      headerTitle.textContent = savedTitle || "采集之王";
      // 清除已使用的标题，避免影响下次页面加载
      if (savedTitle) {
        GM_deleteValue("lastClickedSiteTitle");
      }
      headerTitle.className = "header-title";
      const searchContainer = document.createElement("div");
      searchContainer.className = "search-container";

      const searchInput = document.createElement("input");
      searchInput.id = "searchInput";
      searchInput.placeholder = "搜索...";

      const searchButton = document.createElement("button");
      searchButton.id = "searchButton";
      searchButton.textContent = "搜索";
      searchContainer.style.zIndex = "1";
      searchButton.onclick = function () {
        const searchTerm = searchInput.value;
        if (typeof search === "function") {
          search(searchTerm);
        }
      };

      searchContainer.appendChild(searchInput);
      searchContainer.appendChild(searchButton);

      headertp.appendChild(headerTitle);
      headertp.appendChild(searchContainer);
      

      const headerbt = document.createElement("div");
      headerbt.id = "headerbt";
      headertp.className = "headerbt";

      header.appendChild(headertp);
      header.appendChild(headerbt);
      const mainContainer = document.createElement("div");
      mainContainer.id = "mainContainer";

      // 组装所有元素
      newFrame.appendChild(header);
      newFrame.appendChild(mainContainer);
      document.body.appendChild(newFrame);

      function loadVideoList(categoryId = "", page = 1) {
        // 跳转到页面顶部
        window.scrollTo(0, 0);

        // 显示加载状态
        mainContainer.innerHTML = "";

        // 移除旧的分页栏
        const oldPagination = mainContainer.parentNode.querySelector(
          ".pagination-container"
        );
        if (oldPagination) {
          oldPagination.remove();
        }

        const loadingIndicator = document.createElement("div");
        loadingIndicator.id = "loading-indicator";
        loadingIndicator.innerHTML = `
                <div class="custom-spinner"></div>
                <p>正在加载视频列表...</p>
            `;
        mainContainer.appendChild(loadingIndicator);

        // 构建请求URL，添加分页参数
        let requestUrl = url + "?ac=videolist&t=" + (categoryId || "");
        requestUrl += "&pg=" + page; // 假设API使用pg参数表示页码

        // 发送请求获取视频数据
        fetch(requestUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error("网络响应错误: " + response.status);
            }
            return response.json();
          })
          .then((jsonData) => {
            // 清空加载指示器
            mainContainer.innerHTML = "";

            // 如果有视频列表
            if (jsonData.list && jsonData.list.length > 0) {
              // 设置内容区域为网格布局
              mainContainer.classList.add("video-grid");

              jsonData.list.forEach((video, index) => {
                if (video.vod_name && video.vod_id && video.vod_play_url) {
                  // 创建视频卡片容器
                  const videoCard = document.createElement("div");
                  videoCard.className = "video-card";

                  // 创建链接元素
                  const link = document.createElement("a");
                  link.href = url + "?ac=detail&ids=" + video.vod_id;
                  link.target = "_blank";
                  link.className = "video-link";

                  // 统一的视频点击处理函数
                  function handleVideoClick(e) {
                    // 显示视频链接按钮列表
                    showVideoButtons(video.vod_name, video.vod_play_url);

                    // 阻止事件传播
                    e.stopPropagation();
                  }

                  // 为卡片添加点击事件，显示按钮列表
                  videoCard.addEventListener("click", function (e) {
                    // 如果点击的是链接，让链接的点击事件处理
                    if (e.target.closest("a") === link) {
                      return;
                    }

                    handleVideoClick(e);
                  });

                  // 为链接添加点击事件（带阻止默认行为）
                  link.addEventListener("click", function (e) {
                    handleVideoClick(e);
                    // 阻止默认跳转行为
                    e.preventDefault();
                  });

                  // 创建图片容器，添加封面效果
                  const imgContainer = document.createElement("div");
                  imgContainer.className = "img-container";

                  const img = document.createElement("img");
                  img.src =
                    video.vod_pic ||
                    "https://via.placeholder.com/200x280?text=暂无封面";
                  img.alt = video.vod_name;
                  img.className = "video-img";

                  // 移除图片悬停效果，避免图片移动

                  // 创建标题区域
                  const titleContainer = document.createElement("div");
                  titleContainer.className = "title-container";

                  const titleSpan = document.createElement("h3");
                  titleSpan.textContent = video.vod_name;
                  titleSpan.className = "video-title";

                  // 添加视频信息（如果有）
                  if (video.vod_actor || video.vod_director) {
                    const infoSpan = document.createElement("div");
                    const actors = video.vod_actor ? video.vod_actor : "";
                    const directors = video.vod_director
                      ? video.vod_director
                      : "";
                    infoSpan.textContent =
                      actors && directors
                        ? `${actors} / ${directors}`
                        : actors || directors;
                    infoSpan.className = "info-span";
                    titleContainer.appendChild(infoSpan);
                  }

                  // 组装元素
                  imgContainer.appendChild(img);
                  titleContainer.appendChild(titleSpan);
                  link.appendChild(imgContainer);
                  link.appendChild(titleContainer);
                  videoCard.appendChild(link);
                  mainContainer.appendChild(videoCard);
                }
              });

              // 添加分页栏
              addPagination(jsonData, categoryId);
            } else {
              // 显示无数据信息
              const emptyDiv = document.createElement("div");
              emptyDiv.className = "empty-div";
              emptyDiv.innerHTML = `
                            <div style="font-size:64px; margin-bottom:25px; opacity:0.7;">📺</div>
                            <h3>暂无视频内容</h3>
                            <p>当前分类下没有可显示的视频列表，请尝试选择其他分类查看</p>
                        `;
              mainContainer.appendChild(emptyDiv);
            }
          })
          .catch((error) => {
            // 确保mainContainer存在且没有被移除
            if (mainContainer) {
              mainContainer.innerHTML = "";
              const errorDiv = document.createElement("div");
              errorDiv.className = "error-div";
              errorDiv.innerHTML = `
                            <div style="font-size:48px; margin-bottom:20px;">❌</div>
                            <h3>加载失败</h3>
                            <p>${error.message}</p>
                        `;
              mainContainer.appendChild(errorDiv);
            }
          });
      }

      // 添加分页栏函数
      function addPagination(jsonData, categoryId) {
        // 获取当前页和总页数
        const currentPage = parseInt(jsonData.page || 1);
        const totalPages = parseInt(jsonData.pagecount || 1);

        // 添加省略号函数
        function createEllipsis() {
          const ellipsis = document.createElement("span");
          ellipsis.textContent = "...";
          ellipsis.style.cssText = "margin:0 5px; color:#666;";
          return ellipsis;
        }

        // 如果只有一页，不需要显示分页
        if (totalPages <= 1) return;

        // 创建分页容器
        const paginationContainer = document.createElement("div");
        paginationContainer.className = "pagination-container";
        // 样式已移至styleReset中

        // 添加响应式样式
        // 响应式样式已合并到styleReset中

        // 给mainContainer添加底部内边距，防止内容被固定的分页栏遮挡
        mainContainer.style.paddingBottom = "100px";

        // 上一页按钮
        const prevButton = document.createElement("button");
        prevButton.textContent = "上一页";
        prevButton.className = "page-navigation-btn";
        prevButton.disabled = currentPage <= 1;
        prevButton.addEventListener("click", function () {
          if (currentPage > 1) {
            loadVideoList(categoryId, currentPage - 1);
          }
        });
        paginationContainer.appendChild(prevButton);

        // 页码按钮
        // 计算显示的页码范围
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        // 调整起始页码，确保显示5个页码
        if (endPage - startPage < 4) {
          startPage = Math.max(1, endPage - 4);
        }

        // 第一页
        if (startPage > 1) {
          addPageButton(1, currentPage, categoryId, paginationContainer);
          if (startPage > 2) {
            const ellipsis = createEllipsis();
            paginationContainer.appendChild(ellipsis);
          }
        }

        // 中间的页码
        for (let i = startPage; i <= endPage; i++) {
          addPageButton(i, currentPage, categoryId, paginationContainer);
        }

        // 最后一页
        if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
            const ellipsis = createEllipsis();
            paginationContainer.appendChild(ellipsis);
          }
          addPageButton(
            totalPages,
            currentPage,
            categoryId,
            paginationContainer
          );
        }

        // 下一页按钮
        const nextButton = document.createElement("button");
        nextButton.textContent = "下一页";
        nextButton.className = "page-navigation-btn";
        nextButton.disabled = currentPage >= totalPages;
        nextButton.addEventListener("click", function () {
          if (currentPage < totalPages) {
            loadVideoList(categoryId, currentPage + 1);
          }
        });
        paginationContainer.appendChild(nextButton);

        // 显示页码信息
        const pageInfo = document.createElement("span");
        pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
        pageInfo.style.cssText = `
                margin-left:20px;
                color:#666;
                font-size:14px;
            `;
        paginationContainer.appendChild(pageInfo);

        // 添加到mainContainer后面
        mainContainer.parentNode.appendChild(paginationContainer);
      }

      // 优化视频播放功能

      // 显示视频链接按钮列表的函数
      function showVideoButtons(title, playUrl) {
        // 解析视频信息字符串
        // 格式: 集名1$播放地址1#集名2$播放地址2...
        const links = [];
        let defaultTitle = title || "视频链接列表";

        if (playUrl && typeof playUrl === "string") {
          const episodeParts = playUrl.split("#");

          episodeParts.forEach((part) => {
            const [name, url] = part.split("$");
            if (name && url) {
              const linkName = name.trim();
              const linkUrl = url.trim();
              links.push({
                name: linkName,
                url: linkUrl,
              });
            } else if (url) {
              // 只有URL没有名称的情况
              links.push({
                name: `播放链接 ${links.length + 1}`,
                url: url.trim(),
              });
            }
          });
        }

        // 如果没有有效的视频信息，尝试简单处理
        if (links.length === 0 && playUrl) {
          // 假设整个字符串就是播放地址
          links.push({
            name: "播放链接",
            url: playUrl.trim(),
          });
        }

        // 如果playUrl是一个有效的URL（直接链接而非格式字符串）
        if (
          links.length === 0 &&
          playUrl &&
          (playUrl.startsWith("http://") || playUrl.startsWith("https://"))
        ) {
          links.push({
            name: "直接播放链接",
            url: playUrl.trim(),
          });
        }

        // 检查是否已存在按钮列表，如果存在则移除
        const existingButtons = document.getElementById("video-buttons-modal");
        if (existingButtons) {
          existingButtons.remove();
        }

        // 创建遮罩层
        const overlay = document.createElement("div");
        overlay.id = "video-buttons-modal";

        // 创建内容容器
        const contentContainer = document.createElement("div");
        contentContainer.className = "video-buttons-container";

        // 创建关闭按钮
        const closeButton = document.createElement("button");
        closeButton.textContent = "×";
        closeButton.className = "close-button";
        closeButton.onclick = function () {
          // 清理事件监听器
          document.removeEventListener("keydown", handleEscKey);

          // 移除模态框
          overlay.remove();
        };

        // 创建标题
        const titleContainer = document.createElement("div");
        titleContainer.className = "modal-title-container";
        titleContainer.textContent = defaultTitle;

        // 创建按钮列表容器
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "modal-buttons-container";

        // 生成链接按钮
        links.forEach((link, index) => {
          const buttonContainer = document.createElement("div");
          buttonContainer.className = "video-button-container";

          // 链接名称标题
          const linkTitle = document.createElement("div");
          linkTitle.textContent = link.name || `链接 ${index + 1}`;
          linkTitle.className = "video-link-title";
          buttonContainer.appendChild(linkTitle);

          // 按钮组容器
          const actionButtons = document.createElement("div");
          // 使用CSS类替代内联样式
          actionButtons.className = "action-buttons";

          // 原始链接按钮
          const originalButton = document.createElement("a");
          originalButton.textContent = "原始播放";
          originalButton.href = link.url;
          originalButton.target = "_blank";
          originalButton.className = "video-action-button original-button";

          // 外部播放器按钮
          const externalPlayerButton = document.createElement("a");
          externalPlayerButton.textContent = "外部播放";
          externalPlayerButton.href = `https://hd.iapijy.com/play/?url=${encodeURIComponent(
            link.url
          )}`;
          externalPlayerButton.target = "_blank";
          externalPlayerButton.className =
            "video-action-button external-player-button";

          // 复制按钮
          const copyButton = document.createElement("button");
          copyButton.textContent = "复制";
          copyButton.className = "copy-button";

          copyButton.onclick = function (e) {
            e.preventDefault();
            navigator.clipboard
              .writeText(link.url)
              .then(() => {
                const originalText = this.textContent;
                this.textContent = "已复制!";
                this.style.backgroundColor = "#4CAF50";
                setTimeout(() => {
                  this.textContent = originalText;
                  this.style.backgroundColor = "#FF9800";
                }, 2000);
              })
              .catch((err) => {
                alert("复制失败，请手动复制");
              });
          };

          // 显示URL的简短信息
          const urlInfo = document.createElement("div");
          urlInfo.textContent = `链接: ${
            link.url.length > 60 ? link.url.substring(0, 60) + "..." : link.url
          }`;
          // 使用CSS类替代内联样式
          urlInfo.className = "url-info";

          // 添加所有按钮到按钮组
          actionButtons.appendChild(originalButton);
          actionButtons.appendChild(externalPlayerButton);
          actionButtons.appendChild(copyButton);

          // 添加到容器
          buttonContainer.appendChild(actionButtons);
          buttonContainer.appendChild(urlInfo);
          buttonsContainer.appendChild(buttonContainer);
        });

        // 如果没有链接，显示提示信息
        if (links.length === 0) {
          const noLinksMessage = document.createElement("div");
          noLinksMessage.textContent = "没有找到有效的视频链接";
          noLinksMessage.style.cssText = `
                    text-align: center;
                    color: #666;
                    font-size: 16px;
                    padding: 40px;
                `;
          buttonsContainer.appendChild(noLinksMessage);
        }

        // 组装模态框
        contentContainer.appendChild(closeButton);
        contentContainer.appendChild(titleContainer);
        contentContainer.appendChild(buttonsContainer);
        overlay.appendChild(contentContainer);
        document.body.appendChild(overlay);

        // 点击遮罩层关闭模态框
        overlay.addEventListener("click", function (e) {
          if (e.target === overlay) {
            closeButton.click();
          }
        });

        // 按ESC键关闭模态框
        document.addEventListener("keydown", handleEscKey);

        function handleEscKey(e) {
          if (e.key === "Escape") {
            closeButton.click();
          }
        }
      }

      // 添加页码按钮的辅助函数
      // 搜索函数
      function search(keyword, page = 1) {
        // 跳转到页面顶部
        window.scrollTo(0, 0);

        // 显示加载状态
        mainContainer.innerHTML = "";

        // 移除旧的分页栏
        const oldPagination = mainContainer.parentNode.querySelector(
          ".pagination-container"
        );
        if (oldPagination) {
          oldPagination.remove();
        }

        const loadingIndicator = document.createElement("div");
        loadingIndicator.id = "loading-indicator";
        loadingIndicator.style.cssText = `
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                padding:60px 20px;
                color:#666;
            `;
        loadingIndicator.innerHTML = `
                <div class="loading-spinner" style="
                    border:4px solid rgba(0,0,0,0.1);
                    border-top:4px solid #667eea;
                    border-radius:50%;
                    width:40px;
                    height:40px;
                    animation: spin 1s linear infinite;
                    margin-bottom:20px;
                "></div>
                <p>正在搜索视频列表...</p>
            `;
        mainContainer.appendChild(loadingIndicator);

        // 构建请求URL，获取当前网址?前的部分，加上搜索参数
        const baseUrl = url.split("?")[0];
        let requestUrl =
          baseUrl + "?ac=videolist&wd=" + encodeURIComponent(keyword);
        requestUrl += "&pg=" + page; // 假设API使用pg参数表示页码

        // 发送请求获取视频数据
        fetch(requestUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error("网络响应错误: " + response.status);
            }
            return response.json();
          })
          .then((jsonData) => {
            // 清空加载指示器
            mainContainer.innerHTML = "";

            // 如果有视频列表
            if (jsonData.list && jsonData.list.length > 0) {
              // 设置内容区域为网格布局并添加底部内边距
              mainContainer.style.cssText = `
                            flex: 1;
                            padding: 30px;
                            background-color: white;
                            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
                            margin: 20px;
                            border-radius: 12px;
                            overflow-y: auto;
                            transition: all 0.3s ease;
                            min-height: 400px;
                            padding-bottom: 100px; /* 为底部分页栏留出空间 */
                            display:grid;
                            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                            gap:20px;
                            padding:20px;
                        `;

              jsonData.list.forEach((video, index) => {
                if (video.vod_name && video.vod_id && video.vod_play_url) {
                  // 创建视频卡片容器
                  const videoCard = document.createElement("div");
                  videoCard.style.cssText = `
                                    background-color:white;
                                    border-radius:10px;
                                    overflow:hidden;
                                    box-shadow:0 4px 15px rgba(0,0,0,0.1);
                                    transition: all 0.3s ease;
                                    cursor:pointer;
                                    break-inside:avoid;
                                `;

                  // 添加卡片悬停效果
                  videoCard.addEventListener("mouseover", function () {
                    this.style.transform = "translateY(-5px)";
                    this.style.boxShadow = "0 8px 25px rgba(0,0,0,0.2)";
                  });

                  videoCard.addEventListener("mouseout", function () {
                    this.style.transform = "translateY(0)";
                    this.style.boxShadow = "0 4px 15px rgba(0,0,0,0.1)";
                  });

                  // 为卡片添加点击事件，显示按钮列表
                  videoCard.addEventListener("click", function (e) {
                    // 如果点击的是链接，让链接的点击事件处理
                    if (e.target.closest("a") === link) {
                      return;
                    }

                    // 显示视频链接按钮列表
                    showVideoButtons(video.vod_name, video.vod_play_url);

                    // 阻止事件冒泡
                    e.stopPropagation();
                  });

                  const link = document.createElement("a");
                  link.href = baseUrl + "?ac=detail&ids=" + video.vod_id;
                  link.target = "_blank";
                  link.style.cssText =
                    "display:block; text-decoration:none; color:inherit;";

                  // 为链接添加点击事件，显示按钮列表
                  link.addEventListener("click", function (e) {
                    // 显示视频链接按钮列表
                    showVideoButtons(video.vod_name, video.vod_play_url);

                    // 阻止默认跳转行为
                    e.preventDefault();
                    e.stopPropagation();
                  });

                  // 创建图片容器，添加封面效果
                  const imgContainer = document.createElement("div");
                  imgContainer.className = "img-container";

                  const img = document.createElement("img");
                  img.src =
                    video.vod_pic ||
                    "https://via.placeholder.com/200x280?text=暂无封面";
                  img.alt = video.vod_name;
                  img.className = "video-img";

                  // 创建标题区域
                  const titleContainer = document.createElement("div");
                  titleContainer.className = "title-container";

                  const titleSpan = document.createElement("h3");
                  titleSpan.textContent = video.vod_name;
                  titleSpan.className = "video-title";

                  // 添加视频信息（如果有）
                  if (video.vod_actor || video.vod_director) {
                    const infoSpan = document.createElement("div");
                    let infoText = "";
                    if (video.vod_actor) infoText = video.vod_actor;
                    if (video.vod_director)
                      infoText += infoText
                        ? " / " + video.vod_director
                        : video.vod_director;
                    infoSpan.textContent = infoText;
                    infoSpan.className = "info-span";
                    titleContainer.appendChild(infoSpan);
                  }

                  // 组装元素
                  imgContainer.appendChild(img);
                  titleContainer.appendChild(titleSpan);
                  link.appendChild(imgContainer);
                  link.appendChild(titleContainer);
                  videoCard.appendChild(link);
                  mainContainer.appendChild(videoCard);
                }
              });

              // 添加分页栏，使用与loadVideoList相同的分页逻辑
              // 创建分页容器
              const paginationContainer = document.createElement("div");
              paginationContainer.className = "pagination-container";

              // 计算总页数
              let totalPages = 1;
              let currentPage = parseInt(page) || 1;

              // 尝试从不同的可能字段获取总页数信息
              if (jsonData.page && jsonData.page.count) {
                totalPages = jsonData.page.count;
              } else if (jsonData.pagecount) {
                totalPages = jsonData.pagecount;
              } else if (jsonData.total) {
                // 如果只有总数，假设每页20条计算
                totalPages = Math.ceil(jsonData.total / 20);
              }

              // 上一页按钮
              const prevButton = document.createElement("button");
              prevButton.textContent = "上一页";
              prevButton.className = `pagination-btn prev-next`;
              prevButton.disabled = currentPage <= 1;
              prevButton.addEventListener("click", function () {
                if (currentPage > 1) {
                  search(keyword, currentPage - 1);
                }
              });
              paginationContainer.appendChild(prevButton);

              // 页码按钮
              // 计算显示的页码范围
              let startPage = Math.max(1, currentPage - 2);
              let endPage = Math.min(totalPages, startPage + 4);

              // 调整起始页码，确保显示5个页码
              if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
              }

              // 第一页
              if (startPage > 1) {
                const firstPageButton = document.createElement("button");
                firstPageButton.textContent = "1";
                firstPageButton.className = "pagination-btn";
                firstPageButton.addEventListener("click", function () {
                  search(keyword, 1);
                });
                paginationContainer.appendChild(firstPageButton);
                if (startPage > 2) {
                  const ellipsis1 = document.createElement("span");
                  ellipsis1.textContent = "...";
                  ellipsis1.className = "pagination-ellipsis";
                  paginationContainer.appendChild(ellipsis1);
                }
              }

              // 中间页码
              for (let i = startPage; i <= endPage; i++) {
                const pageButton = document.createElement("button");
                pageButton.textContent = i;
                pageButton.className = `pagination-btn ${
                  i === currentPage ? "active" : ""
                }`;
                pageButton.addEventListener("click", function () {
                  if (i !== currentPage) {
                    search(keyword, i);
                  }
                });
                paginationContainer.appendChild(pageButton);
              }

              // 最后一页
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  const ellipsis2 = document.createElement("span");
                  ellipsis2.textContent = "...";
                  ellipsis2.className = "pagination-ellipsis";
                  paginationContainer.appendChild(ellipsis2);
                }
                const lastPageButton = document.createElement("button");
                lastPageButton.textContent = totalPages;
                lastPageButton.className = "pagination-btn";
                lastPageButton.addEventListener("click", function () {
                  search(keyword, totalPages);
                });
                paginationContainer.appendChild(lastPageButton);
              }

              // 下一页按钮
              const nextButton = document.createElement("button");
              nextButton.textContent = "下一页";
              nextButton.className = `pagination-btn prev-next`;
              nextButton.disabled = currentPage >= totalPages;
              nextButton.addEventListener("click", function () {
                if (currentPage < totalPages) {
                  search(keyword, currentPage + 1);
                }
              });
              paginationContainer.appendChild(nextButton);

              // 显示页码信息
              const pageInfo = document.createElement("span");
              pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
              pageInfo.className = "page-info";
              paginationContainer.appendChild(pageInfo);

              // 添加到mainContainer后面
              mainContainer.parentNode.appendChild(paginationContainer);
            } else {
              // 显示无数据信息
              const emptyDiv = document.createElement("div");
              emptyDiv.className = "empty-div";
              emptyDiv.innerHTML = `
                            <div style="font-size:64px; margin-bottom:25px; opacity:0.7;">🔍</div>
                            <h3>未找到相关内容</h3>
                            <p>没有找到与"${keyword}"相关的视频，请尝试其他关键词</p>
                        `;
              mainContainer.appendChild(emptyDiv);
            }
          })
          .catch((error) => {
            // 确保mainContainer存在且没有被移除
            if (mainContainer) {
              mainContainer.innerHTML = "";
              const errorDiv = document.createElement("div");
              errorDiv.className = "error-div";
              errorDiv.innerHTML = `
                                <div style="font-size:48px; margin-bottom:20px;">❌</div>
                                <h3>搜索失败</h3>
                                <p>${error.message}</p>
                            `;
              mainContainer.appendChild(errorDiv);
            }
          });
      }

      function addPageButton(pageNum, currentPage, categoryId, container) {
        const pageButton = document.createElement("button");
        pageButton.textContent = pageNum;
        pageButton.style.cssText = `
                padding:8px 12px;
                background-color:${
                  pageNum === currentPage ? "#667eea" : "#fff"
                };
                color:${pageNum === currentPage ? "#fff" : "#333"};
                border:${pageNum === currentPage ? "none" : "1px solid #ddd"};
                border-radius:6px;
                cursor:pointer;
                font-size:14px;
                transition:all 0.3s ease;
            `;

        pageButton.addEventListener("mouseover", function () {
          if (pageNum !== currentPage) {
            this.style.backgroundColor = "#f0f0f0";
          }
        });

        pageButton.addEventListener("mouseout", function () {
          if (pageNum !== currentPage) {
            this.style.backgroundColor = "#fff";
          }
        });

        pageButton.addEventListener("click", function () {
          if (pageNum !== currentPage) {
            loadVideoList(categoryId, pageNum);
          }
        });

        container.appendChild(pageButton);
      }

      //使用fetch取url源码,并进行json解析
      try {
        fetch(url)
          .then((response) => {
            if (!response.ok) {
              throw new Error("网络响应错误: " + response.status);
            }
            return response.json();
          })
          .then((jsonData) => {
            // 检查jsonData.class是否存在且为数组
            if (!jsonData) {
              alert("网页返回的json数据为空！");
              return;
            }
            if (jsonData.class && Array.isArray(jsonData.class)) {
              // 直接使用已经创建的header变量，而不是通过getElementById获取
              headerbt.innerHTML = "";
              headerbt.className = "headerbt";

              // 创建导航容器
              const navContainer = document.createElement("div");
              // 使用CSS类替代内联样式
              navContainer.className = "nav-container";

              // 导航容器已添加

              // 检查是否有分类项
              if (jsonData.class.length === 0) {
                const emptyText = document.createElement("span");
                emptyText.textContent = "暂无分类数据";
                headerbt.appendChild(emptyText);
              } else {
                // 创建导航链接容器
                const navLinks = document.createElement("div");
                navLinks.style.cssText =
                  "display:flex; gap:10px; flex-wrap: wrap; align-items:center;";

                jsonData.class.forEach((item, index) => {
                  if (item.type_name !== undefined) {
                    const navItem = document.createElement("a");
                    navItem.textContent = item.type_name;
                    navItem.href = "#"; // 阻止默认跳转
                    // 使用CSS类替代内联样式
                    navItem.className = "nav-item";

                    // 添加点击事件处理函数
                    navItem.addEventListener("click", function (e) {
                      e.preventDefault(); // 阻止默认跳转
                      // 尝试获取分类ID，检查多个可能的字段名
                      const categoryId =
                        item.class ||
                        item.type_id ||
                        item.id ||
                        item.category_id ||
                        "";

                      loadVideoList(categoryId); // 调用加载视频列表函数
                    });

                    navLinks.appendChild(navItem);
                  }
                });

                navContainer.appendChild(navLinks);
              }

              // 添加导航容器到header
              headerbt.innerHTML = "";
              headerbt.appendChild(navContainer);
            } else {
              // 添加错误信息到header
              headerbt.innerHTML = "";
              const errorText = document.createElement("span");
              errorText.textContent = "加载分类失败";
              headerbt.appendChild(errorText);
            }

            // 初始加载时自动加载默认视频列表
            setTimeout(loadVideoList, 100); // 优化写法，保持功能不变
          })
          .catch((error) => {
            // 在header中显示错误信息
            headerbt.innerHTML = "";
            const errorText = document.createElement("span");
            errorText.textContent = "数据加载失败: " + error.message;
            headerbt.appendChild(errorText);
          });
      } catch (error) {
        // 在header中显示异常信息
        headerbt.innerHTML = "";
        const errorText = document.createElement("span");
        errorText.textContent = "请求异常: " + error.message;
        headerbt.appendChild(errorText);
      }
    });
  }
})();

