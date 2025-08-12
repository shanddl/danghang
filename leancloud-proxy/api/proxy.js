// 文件路径: /api/proxy.js

export default async function handler(req, res) {
  // --- START: 安全与配置 ---

  // 您的 LeanCloud App ID 和 App Key (请从环境中获取，更安全)
  const APP_ID = process.env.LEANCLOUD_APP_ID || '7Vo87apph5SCxcw1KFnR2OFC-MdYXbMMI';
  const APP_KEY = process.env.LEANCLOUD_APP_KEY || '1nYVUVFSZkXdu6yYO3G0V1jz';

  // 您的 LeanCloud API 基础 URL
  const API_BASE_URL = 'https://7vo87app.api.lncldglobal.com';

  // 您的扩展程序 Origin，用于设置 CORS 响应头，确保安全
  const allowedOrigin = 'chrome-extension://ldddaemdhadjigcfcingdacbodbnhdlc';

  // --- END: 安全与配置 ---

  // 设置CORS响应头，允许您的扩展程序访问此代理
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-LC-Session');

  // 浏览器在发送复杂请求前会先发送一个 OPTIONS "预检"请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 从扩展程序发来的请求中解析出目标路径和请求数据
    const { targetPath, method, body, sessionToken } = req.body;

    if (!targetPath || !method) {
      return res.status(400).json({ error: 'Missing targetPath or method in request body' });
    }

    // 构造要转发到 LeanCloud 的请求
    const leancloudUrl = `${API_BASE_URL}${targetPath}`;

    const headers = {
      'Content-Type': 'application/json',
      'X-LC-Id': APP_ID,
      'X-LC-Key': APP_KEY,
    };

    // 如果有 sessionToken，也一并转发
    if (sessionToken) {
      headers['X-LC-Session'] = sessionToken;
    }

    const fetchOptions = {
      method: method,
      headers: headers,
    };

    // 只有在有请求体时才添加 body
    if (body && Object.keys(body).length > 0) {
      fetchOptions.body = JSON.stringify(body);
    }

    // 转发请求到 LeanCloud
    const leancloudResponse = await fetch(leancloudUrl, fetchOptions);

    // 获取 LeanCloud 的响应数据
    const responseData = await leancloudResponse.json();

    // 将 LeanCloud 的状态码和响应数据返回给扩展程序
    res.status(leancloudResponse.status).json(responseData);

  } catch (error) {
    res.status(500).json({ error: 'Proxy Server Error', details: error.message });
  }
}