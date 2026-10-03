export const help = `koiro — a personal music library, for people and agents

Usage:
  koiro login [--no-browser]
  koiro logout
  koiro auth status
  koiro config get
  koiro config set --web-url URL

  koiro song list [--page N | --all]
  koiro song random
  koiro song search QUERY [--page N | --all]
  koiro song view SONG
  koiro song export SONG                     editable JSON (admin)
  koiro song update SONG --file FILE|-       replace the song with a document (admin)
  koiro song create --file FILE|-            upload files and create a song (upload)
  koiro song delete SONG                     (admin)
  koiro song download SONG --out FILE [--version NAME] [--force]   (download)

  koiro playlist list [--page N | --all]
  koiro playlist view PLAYLIST [--page N | --all]
  koiro playlist create --name NAME (--cover-file FILE | --cover-url URL) [DESCRIPTION]
  koiro playlist edit PLAYLIST [--name NAME] [--cover-file FILE | --cover-url URL] [DESCRIPTION]
  koiro playlist delete PLAYLIST
  koiro playlist add PLAYLIST SONG...        append, skipping songs already in it
  koiro playlist remove PLAYLIST SONG
  koiro playlist reorder PLAYLIST SONG...    full new order

  koiro staff list [--include-singles]
  koiro staff view NAME [--page N | --all]
  koiro language list
  koiro language view CODE [--page N | --all]

  koiro lyrics from-lrc FILE|-               convert LRC into editable lines (offline)

SONG / PLAYLIST: a UUID or a site link such as https://<site>/songs/<uuid>.
NAME / CODE may also be a /staff/<name> or /languages/<code> link.
DESCRIPTION: --description TEXT | --description-file FILE|-

Song documents (export / update / create) use the API's field names:
  title, description, coverObjectId, staff[{role, name[]}],
  versions[{name, objectId, isDefault, lyricsKey}],
  lyrics[{key, isDefault, languages[], lines[{startMs, endMs?, text, rubyByIndex?}]}],
  playlistIds[]
and additionally accept local inputs, resolved relative to the document:
  coverFile or coverUrl instead of coverObjectId,
  versions[].audioFile instead of objectId, lyrics[].lrcFile instead of lines.
update replaces the whole song: export first, edit, then update.
In lines, text splits tokens with "/" and rubyByIndex maps a token index
("0", "1", ...) to its reading; e.g. text "君/の声" with {"0": "きみ"}.

Global: --web-url URL, --json, --help
Site precedence: --web-url > KOIRO_WEB_URL > config set > the site that served
this skill. KOIRO_TOKEN overrides the saved login; keep it out of logs.
KOIRO_CONFIG_DIR overrides the config directory. Run config get to see it.

Output is JSON on stdout (pretty, or compact with --json). Errors are JSON on
stderr. Lists return {items, page, totalPages, total}; --all returns every page.
Exit: 0 success; 1 local failure; 2 arguments; 3 login; 4 permissions;
  5 not found; 6 conflict; 7 network; 8 API/response; 130 cancelled.
login opens the approval page in the default browser and prints its URL first;
--no-browser only prints it. No writes are retried; after exit 7, check first.
`;
