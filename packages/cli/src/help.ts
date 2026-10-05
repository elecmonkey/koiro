import { languageList } from './languages';

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
  koiro playlist reorder PLAYLIST SONG...    every song in the playlist, in the new order

  koiro staff list
  koiro staff view NAME [--page N | --all]
  koiro language list
  koiro language view CODE [--page N | --all]

  koiro lyrics from-lrc FILE|-               convert LRC into lyric lines (offline)

SONG / PLAYLIST: a UUID or a site link such as https://<site>/songs/<uuid>.
NAME / CODE may also be a /staff/<name> or /languages/<code> link.
DESCRIPTION: --description TEXT | --description-file FILE|-

Song documents (export / update / create) are the API's SongInput; every field
is required:
  title, description, coverObjectId, staff[{role, names[]}],
  versions[{name, objectId, isDefault, lyricsName}],
  lyrics[{name, isDefault, languages[], lines[{startMs, endMs, spans[]}]}],
  playlistIds[]
spans are {"type": "text", "text"} or {"type": "ruby", "base", "ruby"}.
Documents may use local inputs instead, resolved relative to the document:
  coverFile or coverUrl for coverObjectId, versions[].audioFile for objectId,
  lyrics[].lrcFile for lines.
update replaces the whole song: export first, edit, then update.
languages[] codes: ${languageList}.
Each line is one timed line: texts cannot contain line breaks.

Global: --web-url URL, --json, --help
Site precedence: --web-url > KOIRO_WEB_URL > config set > the site that served
this skill. KOIRO_TOKEN overrides the saved login; keep it out of logs.
KOIRO_CONFIG_DIR overrides the config directory. Run config get to see it.

Output is JSON on stdout (pretty, or compact with --json). Errors are JSON on
stderr. Lists return {items, page, pageSize, total, totalPages}; --all returns
{items, total} with every page.
Exit: 0 success; 1 local failure; 2 arguments; 3 login; 4 permissions;
  5 not found; 6 conflict; 7 network; 8 API/response; 130 cancelled.
login opens the approval page in the default browser and prints its URL first;
--no-browser only prints it. No writes are retried; after exit 7, check first.
`;
