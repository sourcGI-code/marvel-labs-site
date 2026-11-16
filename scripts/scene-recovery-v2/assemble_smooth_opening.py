"""Encode every native opening pose once: 840 frames / 60 fps = 14 seconds.

The corrected wheel animation is rendered at every original scene frame.
Desktop reuses the accepted soft background passes; only those backgrounds are
blended between their existing samples. The moving truck/trailer is never
interpolated. The corrected camera path avoids the grille without held frames.

About one in five accepted background samples between frames 190 and 520
carries a stray floor light in the lower right for one to three samples (a flash
of up to six film frames). Each background sample is compared with a temporal
opening of its low-frequency image over two samples either side; brightness
that lasts no more than four samples is removed, but only inside a connected
region covering at least 10% of the frame whose excess reaches 15 levels (the
measured stray light covers 12-20% at 20-34 levels; everything else that the
opening finds is under 8% or under 8 levels). The
approach and close pass are never filtered, moving shadow edges and reflections
beside the vehicles stay exactly as rendered, and corrected samples keep their
own fine detail.
"""
import argparse,functools,hashlib,json,subprocess,time
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

p=argparse.ArgumentParser()
p.add_argument('--kind',choices=['desktop','mobile'],required=True)
p.add_argument('--render',type=Path,required=True)
p.add_argument('--background',type=Path)
p.add_argument('--lighting',type=Path)
p.add_argument('--impact',type=Path)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--width',type=int)
p.add_argument('--start',type=int,default=0)
p.add_argument('--end',type=int,default=840)
p.add_argument('--wait',action='store_true')
p.add_argument('--threads',type=int,default=3)
a=p.parse_args();desktop=a.kind=='desktop';width=a.width or (3840 if desktop else 1440)
size=(width,round(width*2048/4608/2)*2 if desktop else width*2)
level='5.2' if desktop else '5.1'
assert 0<=a.start<a.end<=840
frame_count=a.end-a.start
a.output.parent.mkdir(parents=True,exist_ok=True);pending=a.output.with_suffix('.pending.mp4')
def read(path,mode):
    deadline=time.monotonic()+2400
    while True:
        try:
            with Image.open(path) as image:return image.convert(mode).resize(size,Image.Resampling.LANCZOS)
        except (OSError,ValueError,SyntaxError):
            if not a.wait or time.monotonic()>deadline:raise
            time.sleep(.15)
@functools.lru_cache(maxsize=6)
def background_sample(frame):
    original=read(a.background/f'{frame:05}.background.png','RGB')
    if 732<=frame<784:
        image=read(a.lighting/f'{frame:05}.background.png','RGB')
        if frame>770:
            t=(frame-770)/14;image=Image.blend(image,original,t*t*(3-2*t))
    else:image=original
    return np.asarray(image,dtype=np.float32)
flash_report={}
def small(path):
    image=cv2.imread(str(path),cv2.IMREAD_REDUCED_COLOR_8)
    if image is None:raise OSError(path)
    return cv2.cvtColor(image,cv2.COLOR_BGR2RGB).astype(np.float32)
@functools.lru_cache(maxsize=16)
def soft_sample(frame):
    # The same sample selection as background_sample, at one eighth scale.
    original=small(a.background/f'{frame:05}.background.png')
    if 732<=frame<784:
        image=small(a.lighting/f'{frame:05}.background.png')
        if frame>770:
            t=(frame-770)/14;t=t*t*(3-2*t);image=image*(1-t)+original*t
    else:image=original
    return cv2.GaussianBlur(image,(0,0),1.75)
clamp=lambda value:max(0,min(838,value))
@functools.lru_cache(maxsize=16)
def eroded(centre):
    return functools.reduce(np.minimum,[soft_sample(clamp(centre+2*k)) for k in range(-2,3)])
def opened(frame):
    # Grey-scale opening in time over five samples: removes bright events that
    # last up to four samples and preserves anything longer, including steps.
    return functools.reduce(np.maximum,[eroded(clamp(frame+2*k)) for k in range(-2,3)])
@functools.lru_cache(maxsize=4)
def background(frame):
    pixels=background_sample(frame)
    if 190<=frame<=830:
        excess=soft_sample(frame)-opened(frame)
        level=excess.mean(axis=2);mask=np.clip((level-1)/3,0,1)
        count,labels,stats,_=cv2.connectedComponentsWithStats((mask>.05).astype(np.uint8),8)
        stray=[i for i in range(1,count) if stats[i,cv2.CC_STAT_AREA]>=.10*mask.size and level[labels==i].max()>=15]
        if stray:
            mask=mask*np.isin(labels,stray)
            flash_report[frame]=round(float(mask.mean()),4)
            pixels=pixels-cv2.resize(mask[:,:,None]*excess,(pixels.shape[1],pixels.shape[0]),interpolation=cv2.INTER_CUBIC)
    return pixels+np.array([8.2,11.3,12.4],dtype=np.float32)*(1-pixels/255)**2
command=['ffmpeg','-y','-v','warning','-threads',str(a.threads),'-f','rawvideo','-pixel_format','rgb24','-video_size',f'{size[0]}x{size[1]}','-framerate','60','-i','pipe:0','-frames:v',str(frame_count),'-an','-c:v','libx264','-threads',str(a.threads),'-preset','slow','-crf','18','-maxrate','16000k' if desktop else '8000k','-bufsize','32000k' if desktop else '16000k','-pix_fmt','yuv420p','-profile:v','high','-level:v',level,'-g','30','-keyint_min','30','-sc_threshold','0','-video_track_timescale','60000','-movflags','+faststart',str(pending)]
with a.output.with_suffix('.encode.log').open('w') as log:
    encoder=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=log)
    try:
        for frame in range(a.start,a.end):
            source=frame
            if a.impact and 118<=frame<134:
                if desktop:
                    actor=np.asarray(read(a.impact/f'{frame:05}.actor.png','RGBA'),dtype=np.float32)
                    floor=np.asarray(read(a.impact/f'{frame:05}.background.png','RGB'),dtype=np.float32)
                    floor=floor+np.array([8.2,11.3,12.4],dtype=np.float32)*(1-floor/255)**2
                    alpha=actor[:,:,3:]/255
                    pixels=np.clip(actor[:,:,:3]*alpha+floor*(1-alpha),0,255).astype(np.uint8)
                else:pixels=np.asarray(read(a.impact/f'{frame:05}.png','RGB'))
            elif desktop:
                actor=np.asarray(read(a.render/f'{source:05}.actor.png','RGBA'),dtype=np.float32)
                left=min(838,source//2*2);right=min(838,left+2)
                floor=(background(left)+background(right))*.5 if source%2 and right!=left else background(left)
                alpha=actor[:,:,3:]/255
                pixels=np.clip(actor[:,:,:3]*alpha+floor*(1-alpha),0,255).astype(np.uint8)
            else:pixels=np.asarray(read(a.render/f'{source:05}.png','RGB'))
            encoder.stdin.write(pixels.tobytes())
            if frame%60==59:print(a.kind,'encoded',frame-a.start+1,'/',frame_count,flush=True)
    finally:encoder.stdin.close()
    if encoder.wait()!=0:raise RuntimeError('Opening encode failed; inspect '+str(a.output.with_suffix('.encode.log')))
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,duration,nb_frames,r_frame_rate,bit_rate,level','-of','json',str(pending)]))['streams'][0]
assert (info['width'],info['height'],int(info['nb_frames']),round(float(info['duration'])*60),info['r_frame_rate'])==(*size,frame_count,frame_count,'60/1'),info
info.update(bytes=pending.stat().st_size,sha256=hashlib.sha256(pending.read_bytes()).hexdigest(),sourceFrameRate=84,outputFrameRate=60,interpolatedActorFrames=0,sourceStartFrame=a.start)
if desktop:info.update(backgroundFlashSamplesCorrected=sorted(flash_report))
pending.replace(a.output);a.output.with_suffix('.audit.json').write_text(json.dumps(info,indent=2)+'\n');print(json.dumps(info),flush=True)
