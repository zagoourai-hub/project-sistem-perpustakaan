import { toSVG } from "bwip-js/browser";

/** Code 128 barcode as an SVG string with the human-readable text underneath (FE-5.2.1). */
export const renderBarcode = (text: string) =>
  toSVG({ bcid: "code128", text, scale: 2, height: 10, includetext: true, textxalign: "center", paddingwidth: 0, paddingheight: 0, barcolor: "1D1B17" });
