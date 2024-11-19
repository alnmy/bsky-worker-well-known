export function jsonResponse(obj, status = 200, ) {
    const responseHeaders = new Headers({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Bluesky-Worker": version,
      });
    const response = new Response(
        JSON.stringify(obj),
        {
            status: status,
            headers: responseHeaders,
        }
    );
    return response;
}

export function log({ isError = false, data = {} } = {}) {
    if (isError) console.error(JSON.stringify(data));
    else console.log(JSON.stringify(data));
}