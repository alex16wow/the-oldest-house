// Adapted from Museum of Motion's lib/motion/gsap.ts: the one module that registers GSAP's plugins and the
// brand curves, before any builder runs. (No React here: `useGSAP` is left out.)
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(SplitText, CustomEase, ScrambleTextPlugin, TextPlugin);

// MOTION.md: one entrance curve, one exit curve.
CustomEase.create("signature", "M0,0 C0.2,1.5 0.35,1 1,1");
CustomEase.create("signature-exit", "M0,0 C0.55,0 0.85,0.3 1,1");

export { gsap, SplitText };

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
