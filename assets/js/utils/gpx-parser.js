/**
 * 安全 GPX 解析器 - 防禦 XXE 攻擊
 * 
 * 安全開發守則：
 *   [x] 驗證檔案上傳
 *   [x] 預設不信任使用者輸入
 *   [x] 儲存位置：非公開目錄（前端沙箱）
 */
class GPXParser {
  constructor() {
    this.sandbox = this._createSandbox();
    this.pendingResolvers = {};
  }

  /**
   * 創建安全沙箱
   * @private
   */
  _createSandbox() {
    const sandbox = document.createElement('iframe');
    sandbox.style.display = 'none';
    sandbox.sandbox = 'allow-scripts';
    sandbox.srcdoc = `
      <!DOCTYPE html>
      <html>
      <body>
        <script>
          // 沙箱內解析邏輯
          window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'PARSE_GPX') {
              try {
                // 步驟 1：移除所有 XXE 相關聲明
                let content = event.data.content
                  .replace(/<!ENTITY\\s+.*?>/g, '')
                  .replace(/SYSTEM\\s+"[^"]*"/g, 'SYSTEM "safe://dummy"');
                
                // 步驟 2：安全解析 XML
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(content, "text/xml");
                
                // 步驟 3：提取安全數據（僅允許 trkpt）
                const trkpts = Array.from(xmlDoc.getElementsByTagName('trkpt'));
                const data = trkpts.map(pt => ({
                  lat: parseFloat(pt.getAttribute('lat')) || 0,
                  lon: parseFloat(pt.getAttribute('lon')) || 0,
                  ele: parseFloat(pt.getElementsByTagName('ele')[0]?.textContent) || 0
                }));
                
                // 步驟 4：安全傳回主頁面
                window.parent.postMessage({ 
                  type: 'GPX_PARSED', 
                  id: event.data.id,
                  data 
                }, window.location.origin);
                
              } catch (e) {
                window.parent.postMessage({ 
                  type: 'GPX_ERROR', 
                  id: event.data.id,
                  error: 'INVALID_GPX'
                }, window.location.origin);
              }
            }
          });
        <\/script>
      </body>
      </html>
    `;
    document.body.appendChild(sandbox);
    return sandbox;
  }

  /**
   * 解析 GPX 文件
   * @param {File} file - GPX 文件
   * @returns {Promise<Object>} 解析結果
   */
  async parse(file) {
    // 安全開發守則：【驗證副檔名】
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      throw new Error('INVALID_FILE_EXTENSION');
    }
    
    // 安全開發守則：【驗證檔案大小】
    if (file.size > 5 * 1024 * 1024) { // 5MB
      throw new Error('FILE_TOO_LARGE');
    }
    
    // 讀取文件內容
    const reader = new FileReader();
    const contentPromise = new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('FILE_READ_ERROR'));
    });
    
    reader.readAsText(file);
    const content = await contentPromise;
    
    // 生成唯一 ID 用於請求跟蹤
    const requestId = 'req_' + Math.random().toString(36).substr(2, 9);
    
    // 創建解析請求
    return new Promise((resolve, reject) => {
      this.pendingResolvers[requestId] = { resolve, reject };
      
      this.sandbox.contentWindow.postMessage({
        type: 'PARSE_GPX',
        id: requestId,
        content
      }, window.location.origin);
    });
  }

  /**
   * 初始化消息監聽
   */
  init() {
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GPX_PARSED') {
        const resolver = this.pendingResolvers[event.data.id];
        if (resolver) {
          resolver.resolve(event.data.data);
          delete this.pendingResolvers[event.data.id];
        }
      } 
      else if (event.data.type === 'GPX_ERROR') {
        const resolver = this.pendingResolvers[event.data.id];
        if (resolver) {
          resolver.reject(new Error(event.data.error));
          delete this.pendingResolvers[event.data.id];
        }
      }
    });
  }
}

// 全局實例（安全初始化）
window.gpxParser = new GPXParser();
window.gpxParser.init();