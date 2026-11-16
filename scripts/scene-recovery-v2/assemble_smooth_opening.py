"""Encode every native opening pose once: 840 frames / 60 fps = 14 seconds.

The corrected wheel animation is rendered at every original scene frame.
Desktop reuses the accepted soft background passes; only those backgrounds are
blended between their existing samples. The moving truck/trailer is never
interpolated. The two camera-intersection frames retain the clean impact cut.
"""
import argparse,functools,hashlib,json,subprocess,time
from pathlib import Path
import numpy as np
from PIL import Image

p=argparse.ArgumentParser()
p.add_argument('--kind',choices=['desktop','mobile'],required=True)
p.add_argument('--render',type=Path,required=True)
p.add_argument('--background',type=Path)
p.add_argument('--lighting',type=Path)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--wait',action='store_true')
a=p.parse_args();desktop=a.kind=='desktop';size=(1920,854) if desktop else (768,1536)
a.output.parent.mkdir(parents=True,exist_ok=True);pending=a.output.with_suffix('.pending.mp4')
def read(path,mode):
    deadline=time.monotonic()+2400
    while True:
        try:
            with Image.open(path) as image:return image.convert(mode).resize(size,Image.Resampling.LANCZOS)
        except (OSError,ValueError,SyntaxError):
            if not a.wait or time.monotonic()>deadline:raise
            time.sleep(.15)
@functools.lru_cache(maxsize=4)
def background(frame):
    original=read(a.background/f'{frame:05}.background.png','RGB')
    if 732<=frame<784:
        image=read(a.lighting/f'{frame:05}.background.png','RGB')
        if frame>770:
            t=(frame-770)/14;image=Image.blend(image,original,t*t*(3-2*t))
    else:image=original
    pixels=np.asarray(image,dtype=np.float32)
    return pixels+np.array([8.2,11.3,12.4],dtype=np.float32)*(1-pixels/255)**2
command=['ffmpeg','-y','-v','warning','-threads','3','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{size[0]}x{size[1]}','-framerate','60','-i','pipe:0','-frames:v','840','-an','-c:v','libx264','-threads','3','-preset','medium','-crf','18','-maxrate','5500k' if desktop else '3500k','-bufsize','11000k' if desktop else '7000k','-pix_fmt','yuv420p','-profile:v','high','-level:v','4.2','-g','30','-keyint_min','30','-sc_threshold','0','-video_track_timescale','60000','-movflags','+faststart',str(pending)]
with a.output.with_suffix('.encode.log').open('w') as log:
    encoder=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=log)
    try:
        for frame in range(840):
            source=128 if frame in (126,127) else frame
            if desktop:
                actor=np.asarray(read(a.render/f'{source:05}.actor.png','RGBA'),dtype=np.float32)
                left=min(838,source//2*2);right=min(838,left+2)
                floor=(background(left)+background(right))*.5 if source%2 and right!=left else background(left)
                alpha=actor[:,:,3:]/255
                pixels=np.clip(actor[:,:,:3]*alpha+floor*(1-alpha),0,255).astype(np.uint8)
            else:pixels=np.asarray(read(a.render/f'{source:05}.png','RGB'))
            encoder.stdin.write(pixels.tobytes())
            if frame%60==59:print(a.kind,'encoded',frame+1,'/ 840',flush=True)
    finally:encoder.stdin.close()
    if encoder.wait()!=0:raise RuntimeError('Opening encode failed; inspect '+str(a.output.with_suffix('.encode.log')))
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,duration,nb_frames,r_frame_rate,bit_rate,level','-of','json',str(pending)]))['streams'][0]
assert (info['width'],info['height'],int(info['nb_frames']),float(info['duration']),info['r_frame_rate'])==(*size,840,14.,'60/1'),info
info.update(bytes=pending.stat().st_size,sha256=hashlib.sha256(pending.read_bytes()).hexdigest(),sourceFrameRate=84,outputFrameRate=60,interpolatedActorFrames=0)
pending.replace(a.output);a.output.with_suffix('.audit.json').write_text(json.dumps(info,indent=2)+'\n');print(json.dumps(info),flush=True)
