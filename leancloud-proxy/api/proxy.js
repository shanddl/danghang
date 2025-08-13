// 文件路徑: /api/proxy.js 

export default async function handler(req, res) {
  // --- START: 安全与配置 ---
  const APP_ID = '7Vo87apph5SCxcw1KFnR2OFC-MdYXbMMI';
  const APP_KEY = '1nYVUVFSZkXdu6yYO3G0V1jz';
  const API_BASE_URL = 'https://7vo87app.api.lncldglobal.com';
  const allowedOrigin = 'chrome-extension://ldddaemdhadjigcfcingdacbodbnhdlc';
  // --- END: 安全与配置 ---

  // --- START: CORS 标头设定 ---
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-LC-Id, X-LC-Key, X-LC-Session');
  // --- END: CORS 标头设定 ---

  // 如果是预检请求 (OPTIONS)，直接回复 204 No Content
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
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
    
    let responseData;
    const contentType = leancloudResponse.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        responseData = await leancloudResponse.json();
    } else {
        responseData = await leancloudResponse.text();
    }

    res.status(leancloudResponse.status).json(responseData);

  } catch (error) {
    res.status(500).json({ error: 'Proxy Server Error', details: error.message });
  }
}
