// This is our Netlify serverless function that acts as a proxy.
// It takes a URL, fetches it on the server-side, and returns the result.
// This bypasses browser CORS and mixed-content restrictions.
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Get the target URL from the query string parameters.
  const targetUrl = event.queryStringParameters.url;

  // If no URL is provided, return an error.
  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Target URL is required' }),
    };
  }

  try {
    // Use the node-fetch library to request the target URL.
    const response = await fetch(targetUrl);
    // Get the response data as text, as it could be JSON, XML, etc.
    const data = await response.text();

    // Return the fetched data to the frontend.
    return {
      statusCode: 200,
      headers: {
        // Pass through the original content type.
        'Content-Type': response.headers.get('Content-Type'),
        // Allow cross-origin requests.
        'Access-Control-Allow-Origin': '*', 
      },
      body: data,
    };
  } catch (error) {
    // If anything goes wrong, return a server error.
    console.error('Proxy fetch error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to fetch: ${error.message}` }),
    };
  }
};
