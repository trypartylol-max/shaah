# Social People/Groups toggle

Based on OG main 12fb367d2ace80b5b2385b5d44ce383d0ca75c70. Retains the active Aurora application and stylesheet; mirrors the narrow UI change into canonical source.

+ Persona is followed immediately by Groups. Groups displays existing group management and changes the button label to People. Search/filter DOM stays mounted; no account, scoring, historical or backend writes are added.

Validation: 159 regression checks passed; the separate http409 test file could not load its missing @supabase/postgrest-js dependency. Offline browser checks on actual Aurora script passed at 390/879/880/1440px: switch both ways, search DOM/value preserved, no horizontal overflow, unchanged fixture history/configuration and zero writes. Physical-device iOS not tested.
