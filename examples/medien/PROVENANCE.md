# Where the sound comes from

`airhorn.mp3` is the horn that `tour.typ` and `unterrichten.typ` put on the key
`a`, with `room: (sounds: (a: "medien/airhorn.mp3"))`. The package ships no
sound of its own; the example decks bring theirs, and this one is **nobody's
recording**. No sample, no sound library and no existing recording went into
it, so there is nothing to license and nobody to credit.

## What the file is

Synthesised on **18 September 2026** with FFmpeg 9.0.1 from arithmetic alone:

- three sawtooth tones at 311.13, 369.99 and 493.88 Hz -- D♯4, F♯4 and B4, a
  B major chord -- at the weights 0.34, 0.30 and 0.24;
- one pitch curve shared by all three: it starts six percent flat and rises
  into tune with a time constant of 50 ms, the way a horn is blown in, and
  carries a vibrato of ±0.4 percent at 5.5 Hz;
- a little white noise, at 0.02, for the air;
- band-limited to 150--4200 Hz, faded in over 15 ms and out over the last
  250 ms, normalised with `loudnorm` to −16 LUFS, and encoded mono at
  44.1 kHz with LAME at 96 kbit/s.

## The command

Run in this folder. With `-fflags +bitexact` the file carries no encoder
version, and two runs with FFmpeg 9.0.1 wrote the same bytes; another FFmpeg or
LAME may write different bytes for the same sound.

```sh
ffmpeg -f lavfi -i "aevalsrc='st(0,t-0.003*(1-exp(-t/0.05))+0.00012*sin(2*PI*5.5*t));0.34*(2*mod(311.13*ld(0),1)-1)+0.30*(2*mod(369.99*ld(0),1)-1)+0.24*(2*mod(493.88*ld(0),1)-1)+0.02*(2*random(0)-1)':s=44100:d=1.3" \
  -af "highpass=f=150,lowpass=f=4200,afade=t=in:d=0.015,afade=t=out:st=1.05:d=0.25,loudnorm=I=-16:TP=-1.5:LRA=7" \
  -ac 1 -ar 44100 -c:a libmp3lame -b:a 96k -map_metadata -1 \
  -fflags +bitexact -flags:a +bitexact airhorn.mp3
```

`ld(0)` is the shared time: `t` bent by the rise at the start and by the
vibrato, so the three tones move together like one horn. A sawtooth is
`2*mod(f*t,1)-1`; its overtones above the filter are what the low-pass takes
off.

## Measured on the shipped file

| | |
|---|---|
| Length | 1.300000 s (`ffprobe`) |
| Size | 16 320 bytes |
| Loudness | −16.4 LUFS integrated, true peak −3.3 dBFS (`ebur128`) |
| Format | MP3, mono, 44.1 kHz, 96 kbit/s |
| SHA-256 | `d79409ae269888647d2bdf2ebe7b407fbb8cbb06180d528efe49a9d9d54dc1af` |

MP3 rather than WAV for the size: the same 1.3 s as 16-bit PCM would be 114 660
bytes before the header, seven times as much, and the runtime loads every
sound of a deck with the page (`preload="auto"`) so that a keypress plays at
once.

## Where it has to lie

Beside the HTML, in a folder `medien/`, as the deck names it. Typst embeds an
image into the HTML but not a sound: the runtime writes the path into an
`<audio>` element and the browser resolves it relative to the page. The site
build copies this whole folder next to the built decks. `examples/` is not part
of the package (`typst.toml` excludes it), so the package itself still ships no
sound.
