# Desktop Core headers — 2026-10-29

WORK uses an 84px visible triangle on desktop and mobile. Desktop triangle center equals the whole card center; the cash row retains reserved center space.

Production/WOD title, steps/duration and points share one desktop header row. Header allowance grows by 12px and button minimum height grows by 12px (44 to 56px). Title 22px on wide desktop; responsive title/metadata sizing and decorative-icon suppression below 1200px preserve complete text at 880px, including Matrix. Mobile retains its two-line header and 44px controls. Only markup adds a name span; handlers, timers, scoring and dated history unchanged.

Five targeted browser tests pass: new header/centering checks across five skins and eight widths; existing compact-card test covers every selectable skin, widths and credit states plus LIGHT/DONE/START/resume/persistence; WORK geometry, essential amounts and exact visible sizes also pass. No production activity controls clicked. Physical iPhone/Safari not tested.
