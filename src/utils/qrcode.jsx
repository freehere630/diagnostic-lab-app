import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

/**
 * Synchronous / fallback generator that uses standard QRCode SVG output
 */
export function generateQrSvgString(text, size = 65) {
  const cleanText = text || "https://apexlab.com/verify";
  
  // QRCode.toString in synchronous mode with type: 'svg'
  try {
    let svgString = "";
    QRCode.toString(
      cleanText,
      {
        type: "svg",
        margin: 1,
        width: size,
        errorCorrectionLevel: "M",
        color: {
          dark: "#000000",
          light: "#ffffff"
        }
      },
      (err, string) => {
        if (!err && string) {
          svgString = string;
        }
      }
    );

    if (svgString) {
      // Ensure SVG is centered and properly sized for print/screen
      return svgString
        .replace(/<svg /, `<svg style="display: block; margin: 0 auto; width: ${size}px; height: ${size}px;" `);
    }
  } catch (e) {
    console.error("QR Code generation error:", e);
  }

  // Fallback if needed
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#fff"/></svg>`;
}

/**
 * React Component for rendering a guaranteed scannable QR Code
 */
export function QRCodeSVG({ value, size = 65 }) {
  const [svgHtml, setSvgHtml] = useState("");

  useEffect(() => {
    const cleanVal = value || "https://apexlab.com/verify";
    QRCode.toString(
      cleanVal,
      {
        type: "svg",
        margin: 1,
        width: size,
        errorCorrectionLevel: "M",
        color: {
          dark: "#000000",
          light: "#ffffff"
        }
      },
      (err, string) => {
        if (!err && string) {
          setSvgHtml(string);
        }
      }
    );
  }, [value, size]);

  if (!svgHtml) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="bg-slate-100 animate-pulse rounded flex items-center justify-center text-[8px] text-slate-400"
      >
        QR
      </div>
    );
  }

  return (
    <div 
      style={{ width: size, height: size }}
      className="inline-block"
      dangerouslySetInnerHTML={{ __html: svgHtml }} 
    />
  );
}