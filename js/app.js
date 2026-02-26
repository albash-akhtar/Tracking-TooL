async function fetchData(url) {
    const corsProxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://proxy.cors.sh/${url}`,
        url
    ];
    
    for (const proxyUrl of corsProxies) {
        try {
            console.log('Trying:', proxyUrl.substring(0, 50) + '...');
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const text = await response.text();
                if (text && text.length > 100 && !text.includes('<!DOCTYPE') && !text.includes('<html')) {
                    console.log('Success with proxy');
                    return text;
                }
            }
        } catch (e) {
            console.log('Proxy failed:', e.message);
        }
    }
    throw new Error('All proxies failed');
}
