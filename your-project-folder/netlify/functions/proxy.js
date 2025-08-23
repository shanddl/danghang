// 引入 node-fetch 模組，用於在伺服器端發送網路請求
const fetch = require('node-fetch');

// Netlify 函數的主要處理常式
exports.handler = async function(event, context) {
  let targetUrl;

  // --- 步驟 1: 嘗試從查詢參數中獲取 URL (原始方法) ---
  if (event.queryStringParameters && event.queryStringParameters.url) {
    targetUrl = event.queryStringParameters.url;
  }

  // --- 步驟 2: 如果查詢參數中沒有，則從請求路徑中解析 URL (強化方法) ---
  if (!targetUrl && event.path) {
    const path = event.path;
    if (path.startsWith('/api/')) {
      targetUrl = path.substring(5);
    }
  }

  // --- 步驟 3: 驗證目標 URL 是否存在 ---
  if (!targetUrl) {
    console.error('[Proxy Error] 錯誤：無法從請求中解析出目標 URL。');
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: '請求的 URL 參數為空或格式錯誤' }),
    };
  }

  // --- ★★★ 關鍵修正 ★★★ ---
  // 將可能被編碼的 URL 解碼，還原成標準的網址格式
  try {
    targetUrl = decodeURIComponent(targetUrl);
  } catch (e) {
    console.error('[Proxy Error] URL 解碼失敗:', e);
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: '無效的 URL 編碼' }),
    };
  }
  
  // 記錄最終解析出的 URL，方便偵錯
  console.log(`[Proxy Log] 收到請求，解碼後的目標 URL: ${targetUrl}`);

  try {
    // --- 步驟 4: 在伺服器端發起請求 ---
    console.log(`[Proxy Log] 正在嘗試抓取: ${targetUrl}`);
    const response = await fetch(targetUrl);

    // --- 步驟 5: 檢查遠端伺服器的回應狀態 ---
    if (!response.ok) {
      console.error(`[Proxy Error] 遠端伺服器回應錯誤。狀態碼: ${response.status}, 狀態文字: ${response.statusText}`);
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `抓取失敗，遠端伺服器回應: ${response.status} ${response.statusText}` }),
      };
    }

    // --- 步驟 6: 成功獲取並回傳資料 ---
    const data = await response.text();
    console.log(`[Proxy Log] 成功抓取 ${targetUrl}，準備將資料回傳給前端。`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type'),
        'Access-Control-Allow-Origin': '*',
      },
      body: data,
    };
  } catch (error) {
    // --- 步驟 7: 處理網路請求本身的錯誤 ---
    console.error('[Proxy Error] 抓取過程中發生嚴重錯誤:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `代理伺服器內部錯誤: ${error.message}` }),
    };
  }
};
