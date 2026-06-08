# Sound Assets

Place the following MP3 sound effect files in this directory:

| File          | Triggered by                        |
|---------------|-------------------------------------|
| `cast.mp3`    | Player casts the fishing rod        |
| `splash.mp3`  | Hook hits the water surface         |
| `bite.mp3`    | A fish bites the hook               |
| `catch.mp3`   | Player successfully reels in a fish |

## Notes

- These files are **not** included in the repository because they must be provided separately.
- The game degrades gracefully when any or all files are absent — `Audio_Manager` will log
  a `console.warn` per missing file and silently skip playback for that sound.
- Any standard browser-supported audio format works (MP3 recommended for broad compatibility).
- Suggested free sources: [freesound.org](https://freesound.org), [zapsplat.com](https://zapsplat.com).
