# black.store69 storefront design

Design Read: an Indonesian digital-products storefront for gamers and everyday prepaid/bill customers, using a bold editorial catalog language. ENERGY 3 / RHYTHM 3 / MOTION 2 for Home's owner-requested moving background; transaction pages retain MOTION 1.

Antislop mode: During, selected by the owner on 28 September 2026. Apply the antislop core and antislop-ui throughout implementation and review.

## Reference and direction

- Reference: [MECHA, Awwwards nominee](https://www.awwwards.com/sites/mecha), found in the owner's [nominees list](https://www.awwwards.com/websites/nominees/). Its strong editorial hierarchy, section dividers, and clear separation of index/content inform the catalog structure. Its robotics content, branding, serif font, loader, and animations are not copied.
- The existing black.store69 identity supplies the dark neutral base and lime accent; preserve its wordmark and actual navigation destinations.
- This storefront has real products and payment flows. Use existing game artwork and official operator assets, real API prices and availability. Do not add fictional trust counters or online claims.

## One-line purposes

- Palette: neutral charcoal keeps continuity with the established gaming store; off-white supports reading and lime marks purchase/selected-state actions.
- Summary marks: existing game initials use one neutral surface so their small text has consistent contrast across all game colors.
- Type: Barlow Condensed gives gaming catalog headings an assertive, compact voice; DM Sans keeps prices, navigation, and transaction fields easy to read.
- Font delivery: serve WOFF2 files from the site's own origin, with OFL licenses, because production CSP permits only same-origin fonts; preload the hero weight without changing CSP.
- Layout: game artwork comes first because the owner prioritizes games; operator rows and utility service lists suit practical selection and break up the page rhythm.
- Spacing: generous breaks between product families distinguish browsing tasks; tight row spacing keeps repeated operator/service choices scannable.
- Cards: image-led game tiles use real artwork for recognition; pulse/data choices are logo rows because an operator has no need for a decorative hero card.
- Images: reuse the site's actual Mobile Legends/game assets and official operator marks so each visual identifies a product sold here.
- Icons: bolt and droplet depict electricity/water services; remove ornamental diamond icons from nominal selection and redundant genre pills.
- Arrows: use them for links entering a product or opening an external contact channel, not form submit buttons; the wordmark's existing arrow remains its approved identity.
- Numbers: ordinal section indexes help scan the four product families; product counts and prices derive from live catalog data, not promotional statistics.
- Theme: fixed dark theme preserves the owner's established black.store69 gaming identity; logo images retain a white surface so dark operator marks stay visible.
- Motion: the owner requested a moving 3D-like background on 29 September; Home has a slow perspective arena and sparse lime particles, with an explicit pause/resume control, static reduced-motion mode, lower mobile frame rate, and hidden-tab suspension. Transaction routes retain quiet hover feedback.
- Background geometry: a low-contrast perspective arena links the existing game-led identity to the owner's reference at https://www.ferdianzh.my.id/; stronger lines stay near the sides and opaque product surfaces retain readability.
- Radius: 3px image/logo corners and 4px fields/panels keep the storefront crisp; no pills or soft floating cards.
- Gradient: none in the redesigned storefront/contact sections; game art is shown directly with captions on a solid surface. The arena is projected geometry, not a stock CSS background grid.
- Shadow: only the fixed cookie notice has elevation to distinguish it from page content.
- Contact: show actual available channels, keep runtime WhatsApp configuration, remove unverified ONLINE badges.
- Workflow: replace the generic three-step promotional strip with the specific destination-check warning customers need before purchasing.

## Scope and safeguards

Redesign home, shared header/footer/type/surface system, contact page, and customer order-selection presentation. Preserve request handlers, catalog SKU mapping, pricing rules, payment webhooks, provider settings, database, and first-top-up eligibility/grouping. Visual verification must not create a paid order or send a message.

`app/design-system.css` is the cohesive visual layer after existing route layouts in `globals.css`. New storefront selectors are namespaced `front-*`; transaction layout classes retain their existing behavior.
