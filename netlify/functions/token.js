exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { identity } = JSON.parse(event.body || "{}");

    if (!identity) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Identity is required" }),
      };
    }

    const response = await fetch('https://dev-api.afix.app/api/v1/twilio/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identity }),
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch token", details: error.message }),
    };
  }
};
