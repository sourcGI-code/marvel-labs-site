// Choose a complete, matching timeline at an appropriate encoded quality.
// The browser uses byte ranges; never download an entire film into a Blob.
export function selectVideoFile(source, kind, connection, pageURL = globalThis.location?.href, env = globalThis) {
  const host = pageURL ? new URL(source.mediaBase || source.base || '.', pageURL).hostname : '';
  const localMedia = ['localhost', '127.0.0.1', '[::1]'].includes(host);
  // Internet downlink estimates do not measure the speed of a local preview server.
  const limitedDownlink = !localMedia && Number.isFinite(connection?.downlink) && connection.downlink < 2;
  const slow = ['slow-2g', '2g', '3g'].includes(connection?.effectiveType) || limitedDownlink;
  if (slow && source.liteVideoFile) return source.liteVideoFile;
  if (kind === 'desktop' && source.video4kFile && wants4k(source, env)) return source.video4kFile;
  return source.videoFile || `${kind}.mp4`;
}

// Owner 11-24: "make sure all the videos and renders are going for 4k". The 3840x2160 film is AV1 (the only way a 4K
// film fits GitHub Pages' 100 MB file limit); it goes to screens with at least 2560 device pixels across whose browser
// says it plays that AV1 profile. Everyone else keeps the same film at 1920x1080 in H.264, frame for frame identical.
export function wants4k(source, env = globalThis) {
  const pixels = (env.screen?.width || 0) * (env.devicePixelRatio || 1);
  if (pixels < 2560) return false;
  const probe = env.document?.createElement?.('video');
  return !!probe && probe.canPlayType(`video/mp4; codecs="${source.video4kCodec || 'av01.0.12M.08'}"`) === 'probably';
}

export function isStillOnly(reducedMotion, connection) {
  return reducedMotion || connection?.saveData === true;
}
