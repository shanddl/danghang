// 檔案路徑: /api/proxy.js (最終修正版)

export default async function handler(req, res) {
  // --- START: 安全与配置 ---
  // 您的 LeanCloud App ID 和 App Key
  const APP_ID = process.env.LEANCLOUD_APP_ID || '7Vo87apph5SCxcw1KFnR2OFC-MdYXbMMI';
  const APP_KEY = process.env.LEANCLOUD_APP_KEY || '1nYVUVFSZkXdu6yYO3G0V1jz';
  
  // 您的 LeanCloud API 基础 URL
  const API_BASE_URL = 'https://7vo87app.api.lncldglobal.com';

  // 您的扩展程序 Origin，用于设置 CORS 响应头
  // 注意：这里的 ID 必须和您的 manifest.json 中的 ID 一致
  const allowedOrigin = 'chrome-extension://ldddaemdhadjigcfcingdacbodbnhdlc';
  // --- END: 安全与配置 ---

  // --- START: CORS 标头设定 (更强健的版本) ---
  // 无论是什么请求，都先设定好 CORS 标头
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-LC-Id, X-LC-Key, X-LC-Session');
  // --- END: CORS 标头设定 ---

  // 如果是预检请求 (OPTIONS)，直接回复 204 No Content，表示允许，然后结束
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // --- 後續的程式碼處理 POST 請求 ---
  try {
    const { targetPath, method, body, sessionToken } = req.body;

    if (!targetPath || !method) {
      return res.status(400).json({ error: 'Missing targetPath or method in request body' });
    }

    const leancloudUrl = `${API_BASE_URL}${targetPath}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-LC-Id': APP_ID,
      'X-LC-Key': APP_KEY,
    };

    if (sessionToken) {
      headers['X-LC-Session'] = sessionToken;
    }

    const fetchOptions = {
      method: method,
      headers: headers,
    };

    if (body && Object.keys(body).length > 0) {
      fetchOptions.body = JSON.stringify(body);
    }

    const leancloudResponse = await fetch(leancloudUrl, fetchOptions);
    
    let responseData;
    const contentType = leancloudResponse.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        responseData = await leancloudResponse.json();
    } else {
        responseData = await leancloudResponse.text();
    }

    // 將 LeanCloud 的狀態碼和回應資料返回給擴充功能
    res.status(leancloudResponse.status).json(responseData);

  } catch (error) {
    res.status(500).json({ error: 'Proxy Server Error', details: error.message });
  }
}
