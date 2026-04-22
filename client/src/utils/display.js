export const formatINR = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

function hashString(input) {
  const s = String(input ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function buildSvgDataUri(title) {
  const text = String(title ?? 'Product').slice(0, 40);
  const h = hashString(text);
  const hue1 = h % 360;
  const hue2 = (hue1 + 35) % 360;
  const bg1 = `hsl(${hue1} 85% 55%)`;
  const bg2 = `hsl(${hue2} 85% 45%)`;
  const fg = '#ffffff';

  // Self-contained placeholder (no external network required).
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bg1}"/>
        <stop offset="1" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="600" height="450" rx="24" fill="url(#g)"/>
    <rect x="26" y="26" width="548" height="398" rx="18" fill="rgba(255,255,255,0.16)"/>
    <text x="300" y="235" text-anchor="middle" font-size="34" font-family="Arial, Helvetica, sans-serif" fill="${fg}" font-weight="700">
      ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </text>
    <text x="300" y="290" text-anchor="middle" font-size="18" font-family="Arial, Helvetica, sans-serif" fill="rgba(255,255,255,0.92)">
      Dynamic Pricing Catalog
    </text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

export const getProductImage = (item) => {
  // Always generate a deterministic placeholder from the product title.
  // This avoids random images and also works even if external image URLs are blocked.
  const title = item?.name || item?.product_name || item?.id || item?.sku || 'product';
  return buildSvgDataUri(title);
};

