// 文件路径: /api/proxy.js
// 纠错与优化后的完整版本

/**
 * 这是一个安全的代理服务器，用于在浏览器扩展和 LeanCloud 后端之间进行通信。
 * 主要职责：
 * 1. 隐藏敏感的 LeanCloud App ID 和 App Key，防止在客户端泄露。
 * 2. 处理跨域资源共享 (CORS) 问题，允许指定的 Chrome 扩展进行访问。
 * 3. 将扩展程序的请求安全地转发到 LeanCloud API。
 */
export default async function handler(req, res) {
  // --- START: 安全与配置 ---

  const APP_ID = process.env.LEANCLOUD_APP_ID;
  const APP_KEY = process.env.LEANCLOUD_APP_KEY;

  // [安全优化] 生产环境校验：确保环境变量已设置。
  // 如果未设置，服务将立即失败并返回错误，而不是使用可能已泄露的硬编码密钥。
  if (!APP_ID || !APP_KEY) {
    // 在服务器端日志中记录严重错误，便于运维排查。
    console.error("CRITICAL SECURITY ALERT: LEANCLOUD_APP_ID or LEANCLOUD_APP_KEY is not set in the environment!");
    // 向客户端返回一个通用的配置错误，不暴露内部细节。
    return res.status(500).json({ error: 'Proxy configuration error. Server keys are missing.' });
  }

  // LeanCloud 的 API 服务地址
  const API_BASE_URL = 'https://7vo87app.api.lncldglobal.com';
  
  // [安全优化] 严格限定允许访问此代理的来源为您的扩展程序。
  const allowedOrigin = 'chrome-extension://ldddaemdhadjigcfcingdacbodbnhdlc';

  // --- END: 安全与配置 ---


  // --- START: CORS 与预检请求处理 ---

  // 设置CORS响应头，这是实现跨域访问的核心。
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); // 此代理的入口点只接受 POST 和 OPTIONS 方法。
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-LC-Session'); // 允许的自定义请求头。
  res.setHeader('Access-Control-Max-Age', '86400'); // 允许浏览器缓存预检请求结果24小时，减少不必要的OPTIONS请求。

  // 当浏览器发送带有自定义头（如 X-LC-Session）的 POST 请求前，会先发送一个 OPTIONS "预检"请求。
  // 我们需要正确响应它，告诉浏览器这个跨域请求是安全的。
  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // 使用 204 No Content 响应预检请求是标准实践。
  }

  // --- END: CORS 与预检请求处理 ---


  // --- START: 代理逻辑 ---

  // [健壮性优化] 严格要求代理的入口请求必须是 POST，因为所有参数都通过 req.body 传递。
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS'); // 提示客户端允许的方法
    return res.status(405).json({ error: 'Method Not Allowed. This proxy only accepts POST requests.' });
  }

  try {
    // 1. 从扩展程序发来的请求体中解析出所需参数
    let { targetPath, method, body, sessionToken } = req.body;

    // 2. [健壮性优化] 验证关键参数是否存在
    if (!targetPath || !method) {
      return res.status(400).json({ error: 'Bad Request: Missing "targetPath" or "method" in request body.' });
    }

    // [健壮性优化] 规范化路径，确保它总是以 `/` 开头，避免URL拼接错误。
    if (!targetPath.startsWith('/')) {
      targetPath = '/' + targetPath;
    }

    // 3. 构造要转发到 LeanCloud 的请求
    const leancloudUrl = `${API_BASE_URL}${targetPath}`;

    const headers = {
      'Content-Type': 'application/json',
      'X-LC-Id': APP_ID,
      'X-LC-Key': APP_KEY,
    };

    // 如果扩展程序提供了 sessionToken (用户登录凭证)，则将其加入请求头。
    if (sessionToken) {
      headers['X-LC-Session'] = sessionToken;
    }

    const fetchOptions = {
      method: method, // 使用从请求体中指定的 method (GET, POST, PUT, etc.)
      headers: headers,
    };

    // 只有当请求方法需要且实际有 body 时，才在 fetch 选项中添加它。
    if (body && Object.keys(body).length > 0) {
      fetchOptions.body = JSON.stringify(body);
    }

    // 4. 执行转发请求
    const leancloudResponse = await fetch(leancloudUrl, fetchOptions);

    // 5. [健壮性优化] 智能处理 LeanCloud 的响应
    const contentType = leancloudResponse.headers.get('content-type');
    
    // 如果 LeanCloud 返回的是 JSON 数据，则解析并转发。
    if (contentType && contentType.includes('application/json')) {
      const responseData = await leancloudResponse.json();
      res.status(leancloudResponse.status).json(responseData);
    } else {
      // 如果 LeanCloud 返回的不是 JSON (例如 HTML 错误页)，则将原始文本内容转发。
      // 这可以防止代理服务器自身因解析错误而崩溃，并能将有用的错误信息返回给扩展程序进行调试。
      const responseText = await leancloudResponse.text();
      res.status(leancloudResponse.status).send(responseText);
    }

  } catch (error) {
    // 捕获代理服务器自身的内部错误 (如网络问题、代码逻辑错误等)
    console.error('Proxy Internal Server Error:', error); // 在服务器日志中记录完整错误
    res.status(500).json({ error: 'Proxy Internal Server Error', details: error.message });
  }
}
