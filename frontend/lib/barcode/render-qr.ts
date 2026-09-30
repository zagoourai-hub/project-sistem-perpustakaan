import { toSVG } from "bwip-js/browser";

/** QR code as an SVG string (FE-5.2.2). Fixed ink colour (--on-surface): scanners need dark-on-light even in dark mode. */
export const renderQr = (text: string) =>
  toSVG({ bcid: "qrcode", text, scale: 4, paddingwidth: 0, paddingheight: 0, barcolor: "1D1B17" });
