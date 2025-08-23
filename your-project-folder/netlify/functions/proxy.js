// 引入 node-fetch 模組，用於在伺服器端發送網路請求
const fetch = require('node-fetch');

// Netlify 函數的主要處理常式
exports.handler = async function(event, context) {
  // 從請求的查詢參數中獲取名為 'url' 的目標網址
  const targetUrl = event.queryStringParameters.url;

  // --- 步驟 1: 記錄傳入的請求 ---
  // 這會幫助我們在 Netlify 日誌中確認函數是否被正確觸發，以及目標 URL 是否被正確傳遞
  console.log(`[Proxy Log] 收到請求，目標 URL: ${targetUrl}`);

  // --- 步驟 2: 驗證目標 URL 是否存在 ---
  // 如果前端沒有提供 targetUrl，就返回一個 400 錯誤
  if (!targetUrl) {
    console.error('[Proxy Error] 錯誤：請求中未提供目標 URL。');
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*', // 允許跨域請求
      },
      body: JSON.stringify({ error: '請求的 URL 參數為空' }),
    };
  }

  try {
    // --- 步驟 3: 在伺服器端發起請求 ---
    // 使用 node-fetch 去請求目標 URL
    console.log(`[Proxy Log] 正在嘗試抓取: ${targetUrl}`);
    const response = await fetch(targetUrl);

    // --- 步驟 4: 檢查遠端伺服器的回應狀態 ---
    // 如果遠端伺服器回應的不是成功狀態 (例如 404 Not Found 或 500 Server Error)
    if (!response.ok) {
      console.error(`[Proxy Error] 遠端伺服器回應錯誤。狀態碼: ${response.status}, 狀態文字: ${response.statusText}`);
      // 將遠端伺服器的錯誤狀態碼和訊息直接回傳給前端
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: `抓取失敗，遠端伺服器回應: ${response.status} ${response.statusText}` }),
      };
    }

    // --- 步驟 5: 成功獲取並回傳資料 ---
    // 獲取回應的內容
    const data = await response.text();
    console.log(`[Proxy Log] 成功抓取 ${targetUrl}，準備將資料回傳給前端。`);

    // 將獲取到的資料和原始的 Content-Type 一併回傳給前端
    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type'),
        'Access-Control-Allow-Origin': '*',
      },
      body: data,
    };
  } catch (error) {
    // --- 步驟 6: 處理網路請求本身的錯誤 ---
    // 例如 DNS 查詢失敗、網路連線被拒絕等
    console.error('[Proxy Error] 抓取過程中發生嚴重錯誤:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: `代理伺服器內部錯誤: ${error.message}` }),
    };
  }
};
