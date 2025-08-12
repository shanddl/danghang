// 文件路徑: /api/proxy.js

export default async function handler(req, res) {
  // --- START: 安全与配置 ---

  // 您的 LeanCloud App ID 和 App Key
  // 建議: 為了安全，您可以將這些值設定在 Vercel 的環境變數中
  const APP_ID = process.env.LEANCLOUD_APP_ID || '7Vo87apph5SCxcw1KFnR2OFC-MdYXbMMI';
  const APP_KEY = process.env.LEANCLOUD_APP_KEY || '1nYVUVFSZkXdu6yYO3G0V1jz';
  
  // 您的 LeanCloud API 基礎 URL
  const API_BASE_URL = 'https://7vo87app.api.lncldglobal.com';

  // 您的擴充功能 Origin，用於設定 CORS 響應頭
  const allowedOrigin = 'chrome-extension://ldddaemdhadjigcfcingdacbodbnhdlc';

  // --- END: 安全与配置 ---

  // 設定 CORS 響應頭，只允許您的擴充功能訪問此代理
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-LC-Session');

  // 處理瀏覽器的 OPTIONS "預檢"請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    
    // 嘗試解析 JSON，如果失敗則返回文字
    let responseData;
    try {
        responseData = await leancloudResponse.json();
    } catch(e) {
        responseData = await leancloudResponse.text();
    }

    res.status(leancloudResponse.status).json(responseData);

  } catch (error) {
    res.status(500).json({ error: 'Proxy Server Error', details: error.message });
  }
}
