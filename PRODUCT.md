# Product

## Register

product

## Users

Primary: hobbyists and individual makers using the Sub2API Image Studio to turn a prompt into images via OpenAI-compatible upstreams (browser-direct, relay, or sub2api credit). They are not deep prompt engineers. They want to type, click, and see a result without learning an AI workbench. Many are using a personal subscription quota; speed and clarity matter more than parameter depth.

Secondary, non-trivial: developers who plug in their own upstream `base_url + key` to verify a gateway works, and senior creators who want CFG / seed / negative-prompt levers when they do reach for them. Both groups should be served by the same surface, with depth tucked behind explicit controls instead of crowding the default view.

Context of use: laptop or desktop browser, daytime or evening light, 5 to 20 minute sessions. Often standing up an attempt, judging it, iterating once or twice, then leaving. Not a long-form authoring environment.

## Product Purpose

Make `prompt → image` feel inevitable. The first generate-press should be one to two clicks from cold-start: pick a style, type, generate. The result should be visible inside the same viewport without scrolling. Per-batch knobs (negative prompt, seed, sliders, output format) and per-account knobs (provider mode, base URL, API key) belong in deliberate side trips, not in the front door.

Success looks like: a returning user gets to the first image in under 30 seconds, and never wonders where the image will appear when it is done.

## Brand Personality

Focused. Clean. Reliable. (User wording: 专注 / 干净 / 可靠.)

Voice: declarative, no marketing copy, no exclamation points, no AI-helper warmth. Labels say what the field is and stop. Errors say what failed and what to do next.

Emotion target: the calm of a tool that is the same every morning. Not playful, not magical, not edgy.

## Anti-references

Explicit do-not-look-like list:

- Late-1990s Chinese SaaS / shelf-product visual language: heavy drop shadows on small chrome, tiled gradients, nested menus, rough table grids. Anything that telegraphs "enterprise template, 2008".
- ComfyUI / AUTOMATIC1111 control-panel density: hundreds of parameters tiled flat, every knob exposed at once, the user expected to be the operator. Image Studio is the opposite stance — main flow up front, depth on demand.
- Glassmorphism, animated gradient accents, color palette pickers as decoration, toy-like skeuomorphism. Motion or color used because they exist, not because they say anything.
- Faithful ChatGPT clone. The reference screenshot informed our layout but copying it pixel-for-pixel adds nothing. The product needs a voice of its own.

## Design Principles

1. **Prompt forward, depth on demand.** The default view shows: prompt, style picker, ratio, generate, preview, recent results. Everything else (sliders, seed, output format, provider configuration, appearance) is reachable in one click but hidden until then.
2. **Earned familiarity, not novelty.** A user fluent in Linear, Notion, Raycast, Stripe Dashboard should sit down and trust this. Standard navigation, standard form controls, standard hover and focus. No reinvented scrollbars, no custom selects when a native one fits, no flourish for its own sake.
3. **State you can read across the room.** Generating, ready, last-failed, last-success — color-coded and consistent. The user should know without reading text whether the last action worked.
4. **One screen, no scroll for the main loop.** At 1080p, prompt to result is in one viewport. Scrolling exists for history and for fine settings, never for the main loop.
5. **Truth in the chrome.** What the generate button will do (which provider, which host) is shown next to it. No hidden state. If the request will go to `external-browser`, say so where the user is about to click.

## Accessibility & Inclusion

- WCAG 2.1 AA target. Contrast ratio ≥ 4.5:1 for body text and meaningful UI text, ≥ 3:1 for large text and graphical UI components.
- Keyboard reachable for the full generation loop: tab through prompt → ratio → style → generate; Enter submits when focused on Generate; Escape closes the lightbox / popovers.
- `prefers-reduced-motion` honored — the existing appearance composable has a `motionEnabled` toggle which already handles this; respect that path rather than adding its own animations.
- Color is never the only signal. State pills carry both a label and a color dot, never color alone. Error messages have an icon plus text, never a red border on its own.
- i18n: all visible strings live in `frontend/src/i18n/locales/{zh,en}.ts`. New copy added in both languages or it does not ship.
