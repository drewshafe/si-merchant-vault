# Merchant Vault

ShipInsure's in-house deal rooms. Lives in the Rep Hub as the **Merchant Vault** tab.

Each merchant gets one link with their deck, checkout designs, both teams, Next Steps buttons and a shared action plan. Merchants can check off steps, add steps and add their own team. Reps see visits, deck pages read, clicks, plan changes and questions.

| File | What it is |
|---|---|
| `index.html` | Rep studio: vault list, inline editor (autosaves), Copy merchant link, Activity panel |
| `v.html` | Merchant view: `v.html?id=<vault>&k=<edit key>` |
| `vault-core.js` | Shared renderer, PDF viewer (PDF.js), modals, Supabase data layer |
| `vault.css` | Room layout, built from the "MERCHANT VAULT – 1" mock |
| `vault-schema.sql` | Supabase tables, RPCs and storage bucket. Run it once in the SQL editor |

## Backend

Uses the same Supabase project and rep login as the calculators (`shipinsure-calculators`, loaded through `si-roi-calculator/sb.js`).

- **`vaults`**: one row per room. All signed-in reps can read and edit every vault; only the owner can delete.
- **`vault_events`**: visits, views, pages, clicks, plan changes and questions.
- Merchants never query the tables. They go through three functions: `vault_get` (needs the exact id), `vault_merchant_save` (needs the edit key in the link) and `vault_track`.
- **`vault-files`** storage bucket: decks, mockups and photos. Public read, rep upload, 50 MB per file.

Until the schema has been run, or when a rep isn't signed in, vaults save as local drafts in that browser.
