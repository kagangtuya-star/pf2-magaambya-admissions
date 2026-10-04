// Minimal WebM (Matroska) muxer for one VP9 video track and one Opus audio track.
// The whole file is assembled in memory, so element sizes, the SeekHead and the
// Cues index are known up front; this keeps the output seekable in browsers.

const encoder = new TextEncoder();

function concat(parts) {
  const size = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function idBytes(id) {
  const bytes = [];
  while (id > 0) {
    bytes.unshift(id & 0xff);
    id = Math.floor(id / 256);
  }
  return Uint8Array.from(bytes);
}

// Element sizes are always written as 8-byte vints, which keeps layout maths simple.
function sizeBytes(size) {
  const out = new Uint8Array(8);
  out[0] = 0x01;
  let value = size;
  for (let i = 7; i >= 1; i--) {
    out[i] = value % 256;
    value = Math.floor(value / 256);
  }
  return out;
}

function uint(value, width = 0) {
  const bytes = [];
  let v = value;
  do {
    bytes.unshift(v % 256);
    v = Math.floor(v / 256);
  } while (v > 0);
  while (bytes.length < width) bytes.unshift(0);
  return Uint8Array.from(bytes);
}

function float64(value) {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setFloat64(0, value);
  return out;
}

const text = (value) => encoder.encode(value);

function el(id, payload) {
  const body = Array.isArray(payload) ? concat(payload) : payload;
  return concat([idBytes(id), sizeBytes(body.length), body]);
}

const ID = {
  EBML: 0x1a45dfa3,
  Segment: 0x18538067,
  SeekHead: 0x114d9b74,
  Seek: 0x4dbb,
  SeekID: 0x53ab,
  SeekPosition: 0x53ac,
  Info: 0x1549a966,
  Tracks: 0x1654ae6b,
  Cluster: 0x1f43b675,
  Cues: 0x1c53bb6b,
};

function opusHead(channels, sampleRate, preSkip) {
  const out = new Uint8Array(19);
  out.set(text("OpusHead"));
  const view = new DataView(out.buffer);
  view.setUint8(8, 1);
  view.setUint8(9, channels);
  view.setUint16(10, preSkip, true);
  view.setUint32(12, sampleRate, true);
  view.setInt16(16, 0, true);
  view.setUint8(18, 0);
  return out;
}

/**
 * @param {object} options
 * @param {{width:number,height:number,fps:number}} options.video
 * @param {{sampleRate:number,channels:number,description?:Uint8Array}} options.audio
 * @param {{data:Uint8Array,timestamp:number,key:boolean}[]} videoChunks timestamps in µs
 * @param {{data:Uint8Array,timestamp:number}[]} audioChunks timestamps in µs
 * @param {number} durationMs
 * @param {string} title
 */
export function muxWebM({ video, audio, videoChunks, audioChunks, durationMs, title }) {
  const header = el(ID.EBML, [
    el(0x4286, uint(1)),
    el(0x42f7, uint(1)),
    el(0x42f2, uint(4)),
    el(0x42f3, uint(8)),
    el(0x4282, text("webm")),
    el(0x4287, uint(4)),
    el(0x4285, uint(2)),
  ]);

  const info = el(ID.Info, [
    el(0x2ad7b1, uint(1000000)),
    el(0x4489, float64(durationMs)),
    el(0x7ba9, text(title)),
    el(0x4d80, text("raincourt-promo")),
    el(0x5741, text("raincourt-promo")),
  ]);

  const preSkip = audio.description?.length >= 12
    ? new DataView(audio.description.buffer, audio.description.byteOffset).getUint16(10, true)
    : 312;
  const codecPrivate = audio.description?.length >= 19
    ? audio.description
    : opusHead(audio.channels, audio.sampleRate, preSkip);

  const tracks = el(ID.Tracks, [
    el(0xae, [
      el(0xd7, uint(1)),
      el(0x73c5, uint(1)),
      el(0x83, uint(1)),
      el(0x9c, uint(0)),
      el(0x22b59c, text("und")),
      el(0x86, text("V_VP9")),
      el(0x23e383, uint(Math.round(1e9 / video.fps))),
      el(0xe0, [el(0xb0, uint(video.width)), el(0xba, uint(video.height))]),
    ]),
    el(0xae, [
      el(0xd7, uint(2)),
      el(0x73c5, uint(2)),
      el(0x83, uint(2)),
      el(0x9c, uint(0)),
      el(0x22b59c, text("und")),
      el(0x86, text("A_OPUS")),
      el(0x63a2, codecPrivate),
      el(0x56aa, uint(Math.round((preSkip / 48000) * 1e9))),
      el(0x56bb, uint(80000000)),
      el(0xe1, [el(0xb5, float64(audio.sampleRate)), el(0x9f, uint(audio.channels))]),
    ]),
  ]);

  // Interleave by timestamp and open a new cluster at every video keyframe.
  const blocks = [
    ...videoChunks.map((c) => ({ ...c, track: 1 })),
    ...audioChunks.map((c) => ({ ...c, track: 2, key: true })),
  ].sort((a, b) => a.timestamp - b.timestamp || a.track - b.track);

  const clusters = [];
  let current = null;
  for (const block of blocks) {
    const ms = Math.round(block.timestamp / 1000);
    if (!current || (block.track === 1 && block.key) || ms - current.time > 30000) {
      current = { time: ms, blocks: [], cue: block.track === 1 && block.key };
      clusters.push(current);
    }
    const head = new Uint8Array(4);
    head[0] = 0x80 | block.track;
    new DataView(head.buffer).setInt16(1, ms - current.time);
    head[3] = block.key ? 0x80 : 0;
    current.blocks.push(el(0xa3, [head, block.data]));
  }
  const clusterBytes = clusters.map((c) => el(ID.Cluster, [el(0xe7, uint(c.time)), ...c.blocks]));

  const seekEntry = (id, position) =>
    el(ID.Seek, [el(ID.SeekID, idBytes(id)), el(ID.SeekPosition, uint(position, 8))]);
  const seekHead = (positions) =>
    el(ID.SeekHead, [
      seekEntry(ID.Info, positions.info),
      seekEntry(ID.Tracks, positions.tracks),
      seekEntry(ID.Cues, positions.cues),
    ]);

  const seekLength = seekHead({ info: 0, tracks: 0, cues: 0 }).length;
  const positions = { info: seekLength };
  positions.tracks = positions.info + info.length;
  let offset = positions.tracks + tracks.length;
  const cuePoints = [];
  clusters.forEach((cluster, i) => {
    if (cluster.cue)
      cuePoints.push(
        el(0xbb, [
          el(0xb3, uint(cluster.time)),
          el(0xb7, [el(0xf7, uint(1)), el(0xf1, uint(offset, 8))]),
        ]),
      );
    offset += clusterBytes[i].length;
  });
  positions.cues = offset;
  const cues = el(ID.Cues, cuePoints);

  const segment = el(ID.Segment, [seekHead(positions), info, tracks, ...clusterBytes, cues]);
  return concat([header, segment]);
}
