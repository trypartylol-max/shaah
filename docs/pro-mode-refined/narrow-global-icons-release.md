# Narrow sidebar and global navigation icons

User-approved release, 2026-11-02. Pro Mode desktop sidebar is 176px instead of 208px; navigation, Settings and Reset share a fixed left icon/text alignment. Vertical positions and Day Note behavior remain intact. The recovered 32px belongs to the main content.

Navigation icon shapes are application-wide: circle-dot Today, clock Log, people Social, columns Stats, history arrow History, gear Settings and rotate-back Reset Day. Inline SVGs use currentColor and require no new network/library dependencies. Other skins retain their navigation layout.

Validation: 19 relevant browser checks passed across Pro geometry, mobile, six skins, strict event/style CSP, wide-display adaptation and confirmed/canceled Reset. Final six Pro tests rerun after correcting the icon alignment to a shared x position. Existing performance improvements and starter changes are preserved from main 988c318.
