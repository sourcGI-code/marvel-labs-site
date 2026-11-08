// Choose a complete, matching timeline at an appropriate encoded quality.
// The browser uses byte ranges; never download an entire film into a Blob.
export function selectVideoFile(source, kind, connection) {
  const slow = ['slow-2g', '2g', '3g'].includes(connection?.effectiveType)
    || (Number.isFinite(connection?.downlink) && connection.downlink < 2);
  return slow && source.liteVideoFile ? source.liteVideoFile : source.videoFile || `${kind}.mp4`;
}

export function isStillOnly(reducedMotion, connection) {
  return reducedMotion || connection?.saveData === true;
}
