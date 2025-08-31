import React, { useEffect, useMemo, useRef, useState } from "react";

interface EmailPreviewProps {
  html: string;
  height?: number; // default height with scroll; auto-resize will adjust
  className?: string;
}

// Isolated, safe email HTML preview using an iframe with srcDoc
// - No scripts allowed (prevents execution and postMessage noise)
// - Same-origin enabled to allow auto-resize
export const EmailPreview: React.FC<EmailPreviewProps> = ({ html, height = 640, className }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [frameHeight, setFrameHeight] = useState(height);

  const srcDoc = useMemo(() => {
    const hasHtmlTag = /<html[\s\S]*?>/i.test(html);

    const injectedHead = `
      <meta charset=\"utf-8\" />
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
      <base target=\"_blank\" />
      <style>
        :root { color-scheme: light dark; }
        html, body { margin: 0; padding: 0; }
        body { background: #f6f7f9; color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, sans-serif; }
        img { max-width: 100%; height: auto; }
        .preview-container { max-width: 720px; margin: 0 auto; background: #fff; box-shadow: 0 10px 30px -10px rgba(0,0,0,.15); border-radius: 8px; overflow: hidden; }
      </style>
    `;

    if (hasHtmlTag) {
      // If it's a full HTML document, inject base/style into <head>
      if (/<head>/i.test(html)) {
        return html.replace(/<head>/i, `<head>${injectedHead}`);
      }
      // If no head present, add one
      return html.replace(/<html(.*?)>/i, `<html$1><head>${injectedHead}</head>`);
    }

    // Otherwise, wrap the provided HTML body into a minimal document
    return `<!DOCTYPE html><html><head>${injectedHead}</head><body><div class=\"preview-container\">${html}</div></body></html>`;
  }, [html]);

  // Auto-resize the iframe to fit content
  const adjustHeight = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      const newHeight = Math.min(1200, Math.max(height, doc.documentElement.scrollHeight || doc.body.scrollHeight || height));
      setFrameHeight(newHeight);
    } catch {
      // Cross-origin guard (should not happen with srcDoc + allow-same-origin)
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [srcDoc]);

  return (
    <iframe
      ref={iframeRef}
      title="Email preview"
      sandbox="allow-same-origin"
      style={{ width: "100%", border: 0, borderRadius: 8, background: "transparent", height: frameHeight }}
      className={className}
      srcDoc={srcDoc}
      onLoad={adjustHeight}
    />
  );
};

export default EmailPreview;
