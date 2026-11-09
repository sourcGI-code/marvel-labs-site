"""Repair the stationary final intro pose without rerendering unrelated films."""
from pathlib import Path
import json, shutil, subprocess, hashlib
import numpy as np
from PIL import Image, ImageChops, ImageStat

W=Path('/scratch/marvel-scene-recovery-20261109')
OUT=W/'decal-repair';OUT.mkdir(exist_ok=True)
SOURCE=W/'intro-desktop/mono'
# Two independently rendered end poses differ by at most one display level;
# the camera and trailer have already settled before the defective frames.
a=Image.open(W/'decal-fix-test/mono/00800.actor.png').convert('RGBA')
b=Image.open(W/'decal-fix-test/mono/00838.actor.png').convert('RGBA')
delta=ImageChops.difference(a,b)
assert max(v[1] for v in delta.getextrema())<=1
actor=np.asarray(b,dtype=np.float32);alpha=actor[:,:,3:]/255
backup=OUT/'original-frames';backup.mkdir(exist_ok=True)
for f in range(784,840,2):
    target=SOURCE/f'{f:05}.png'
    if not (backup/target.name).exists():shutil.copyfile(target,backup/target.name)
    background=np.asarray(Image.open(SOURCE/f'{f:05}.background.png').convert('RGB'),dtype=np.float32)
    background+=np.array([8.2,11.3,12.4])*(1-background/255)**2
    pixels=np.clip(actor[:,:,:3]*alpha+background*(1-alpha),0,255).astype('uint8')
    Image.fromarray(pixels).save(target,compress_level=1)
seq=OUT/'tail-input';seq.mkdir(exist_ok=True)
for n,f in enumerate(range(756,840,2)):
    p=seq/f'{n:05}.png'
    if not p.exists():p.symlink_to(SOURCE/f'{f:05}.png')
original=OUT/'desktop-before-decal-fix.mp4'
if not original.exists():shutil.copyfile(W/'release-assets/opening/desktop.mp4',original)
filters='[0:v]trim=end_frame=540,setpts=PTS-STARTPTS[before];[1:v]tpad=stop_mode=clone:stop_duration=0.3,minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:me=epzs:search_param=16:vsbmc=1:scd=fdiff:scd_threshold=5,trim=end_frame=60,setpts=PTS-STARTPTS[tail];[before][tail]concat=n=2:v=1:a=0,format=yuv420p[out]'
command=['ffmpeg','-y','-v','warning','-threads','4','-filter_complex_threads','4','-i',str(original),'-framerate','42','-i',str(seq/'%05d.png'),'-filter_complex',filters,'-map','[out]','-frames:v','600','-r','60','-an','-c:v','libx264','-threads','8','-preset','medium','-crf','16','-maxrate','22000k','-bufsize','44000k','-pix_fmt','yuv420p','-g','60','-keyint_min','60','-sc_threshold','0','-video_track_timescale','60000','-movflags','+faststart',str(OUT/'desktop.mp4')]
with (OUT/'encode.log').open('w') as log:subprocess.run(command,stdout=log,stderr=log,check=True)
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,duration,nb_frames,r_frame_rate','-of','json',str(OUT/'desktop.mp4')]))['streams'][0]
assert (info['width'],info['height'],int(info['nb_frames']))==(3840,1706,600),info
info.update(bytes=(OUT/'desktop.mp4').stat().st_size,sha256=hashlib.sha256((OUT/'desktop.mp4').read_bytes()).hexdigest())
report={'affectedNativeFrames':[784,838],'repairedNativeFrames':28,'stationaryPoseDifference':ImageStat.Stat(delta).mean,'media':info}
(OUT/'repair-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report),flush=True)
