# Turning on online scores and cloud saves

The game works offline. Online scores and cloud saves switch on once it knows your Supabase project.

1. Make a free account at https://supabase.com and create a new project (any name, pick a region near you).
2. In the project, open **SQL Editor**, paste everything from `setup.sql`, and press **Run**.
3. Open **Project Settings > API** and copy the **Project URL** and the **anon public** key.
4. Put them in `src/content/online.json`:

   ```json
   { "url": "https://YOUR-PROJECT.supabase.co", "key": "YOUR-ANON-KEY" }
   ```

   The anon key is meant to be public. The tables are locked and the game can only call the four functions in `setup.sql`.
5. Commit and push. The next deploy has online scores and cloud saves.

What players get:
- **SCORES** on the menu shows the top 10 online (all-time and today's daily challenge).
- **Settings > CLOUD SAVE** shows a save code. Backups happen after every run. Typing the code on another device brings the progress over.
