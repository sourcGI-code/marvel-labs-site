// Start a film only when the rest of it can download faster than it plays (owner 10-24: "jittery and not smooth" on a
// first visit: the 9 Mbps arrival film stalled every half second on a 6 Mbps line, the decoder waiting for data).
// Download speed is measured as media seconds buffered per wall second since the film could first decode. The film starts as soon as
//   the browser has the whole remaining stretch, or
//   it downloads at least 10% faster than it plays (after a 15% discount) and one second is buffered, or
//   the buffered lead covers the shortfall: lead >= remaining * (1 - download/playback) + 0.75 s, or
//   the browser has stopped fetching (it judged the buffer enough) with 1.5 s in hand,
// and in any case after maxWait (a very slow line still plays, as before).
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function bufferedEnd(video){
 const t=video.currentTime;
 for(let i=0;i<video.buffered.length;i++)if(t>=video.buffered.start(i)-.05&&t<=video.buffered.end(i)+.05)return video.buffered.end(i);
 return t;
}
export async function waitPlayable(video,{rate=1,until,maxWait=6000,signal}={}){
 const start=performance.now();let first=null;
 const done=(reason,detail)=>{(window.__playthrough||=[]).push({reason,waited:Math.round(performance.now()-start),...detail});return reason;};
 for(;;){
  if(signal?.aborted)throw new DOMException('Playback cancelled','AbortError');
  if(video.error)return done('error');
  const now=performance.now(),duration=Number.isFinite(video.duration)?video.duration:0;
  const end=Math.min(duration||Infinity,Number.isFinite(until)?until:duration||Infinity);
  const buffered=bufferedEnd(video),ahead=buffered-video.currentTime,need=Math.max(0,end-video.currentTime);
  if(video.readyState>=2&&ahead>=need-.05)return done('buffered',{ahead});
  // The speed is measured from the first decodable moment over a window (2 s when the wait allows it), and discounted
  // by 15%: media data arrives in bursts, and a short window read 0.85 media s/s on a line that delivered 0.65.
  if(video.readyState>=2&&!first)first=[now,buffered];
  if(first&&now-first[0]>=Math.min(2000,maxWait*.4)){
   const download=.85*(buffered-first[1])/((now-first[0])/1000);
   if(download>=rate*1.1&&ahead>=Math.min(need,1))return done('fast',{download,ahead});
   if(ahead>=need*Math.max(0,1-download/rate)+.75)return done('lead',{download,ahead,need});
   if(video.networkState===video.NETWORK_IDLE&&ahead>=Math.min(need,1.5))return done('idle',{ahead});
  }
  if(now-start>=maxWait)return done('timeout',{ahead,need});
  await sleep(90);
 }
}
