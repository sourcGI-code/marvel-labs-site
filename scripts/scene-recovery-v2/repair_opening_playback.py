"""Repair opening playback while retaining the accepted 10-second timeline.

The 1–2 second camera impact uses native frames (the camera-intersection frame
126 is replaced by 128). Optical flow invents doubled truck geometry here.
Desktop frames 732–782 come from render_intro.py's physical light fade; all other
shots, the camera timing, and the previously repaired stationary decal survive.
"""
import argparse, hashlib, json, shutil, subprocess
from pathlib import Path
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('--source-root',type=Path,required=True)
parser.add_argument('--lighting',type=Path,required=True)
parser.add_argument('--work',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--kind',choices=['desktop','mobile'],required=True)
args=parser.parse_args();kind=args.kind
args.work.mkdir(parents=True,exist_ok=True)
source=args.source_root/f'intro-{kind}'/'mono'
target=args.output/f'{kind}-web.mp4'
original=args.work/f'{kind}-original.mp4'
if not original.exists():shutil.copyfile(target,original)
def sequence(name,paths):
    folder=args.work/name;folder.mkdir(exist_ok=True)
    for i,p in enumerate(paths):
        assert p.is_file(),p
        link=folder/f'{i:05}.png'
        if not link.exists():link.symlink_to(p.resolve())
    return str(folder/'%05d.png')
frames=[round(frame*84/60/2)*2 for frame in range(60,120)]
approach=sequence(f'{kind}-approach',[source/f'{(128 if n==126 else n):05}.png' for n in frames])
command=['ffmpeg','-y','-v','warning','-threads','4','-filter_complex_threads','4','-i',str(original),'-framerate','60','-i',approach]
filters=['[0:v]split=2[head][body]',
         '[head]trim=end_frame=60,setpts=PTS-STARTPTS[before]',
         '[1:v]trim=end_frame=60,setpts=PTS-STARTPTS,format=yuv420p[approach]']
if kind=='desktop':
    # Match the accepted settled background at the end of the physical fade.
    # This also removes the residual change when zero-power lamps are hidden.
    settled=args.work/'settled-lighting';settled.mkdir(exist_ok=True)
    for n in range(772,784,2):
        t=(n-770)/14;weight=t*t*(3-2*t)
        Image.blend(Image.open(args.lighting/f'{n:05}.png').convert('RGB'),
                    Image.open(source/f'{n:05}.png').convert('RGB'),weight).save(settled/f'{n:05}.png',compress_level=1)
    tail=sequence('desktop-lighting-smooth',[(settled/f'{n:05}.png' if 770<n<784 else (args.lighting/f'{n:05}.png') if 732<=n<784 else source/f'{n:05}.png') for n in range(728,840,2)])
    command+=['-framerate','42','-i',tail]
    filters+=['[body]trim=start_frame=120:end_frame=520,setpts=PTS-STARTPTS[middle]',
      '[2:v]tpad=stop_mode=clone:stop_duration=0.3,minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:me=epzs:search_param=16:vsbmc=1:scd=fdiff:scd_threshold=5,trim=end_frame=80,setpts=PTS-STARTPTS,format=yuv420p[tail]',
      '[before][approach][middle][tail]concat=n=4:v=1:a=0,format=yuv420p[out]']
else:
    filters+=['[body]trim=start_frame=120:end_frame=600,setpts=PTS-STARTPTS[after]',
      '[before][approach][after]concat=n=3:v=1:a=0,format=yuv420p[out]']
pending=args.work/f'{kind}-clean.mp4'
rate='10000k' if kind=='desktop' else '5000k'
command+=['-filter_complex',';'.join(filters),'-map','[out]','-frames:v','600','-r','60','-an','-c:v','libx264','-threads','4','-preset','medium','-crf','18','-maxrate',rate,'-bufsize',str(int(rate[:-1])*2)+'k','-pix_fmt','yuv420p','-g','60','-keyint_min','60','-sc_threshold','0','-video_track_timescale','60000','-movflags','+faststart',str(pending)]
with (args.work/f'{kind}-encode.log').open('w') as log:subprocess.run(command,stdout=log,stderr=log,check=True)
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,duration,nb_frames,r_frame_rate,bit_rate','-of','json',str(pending)]))['streams'][0]
assert (info['width'],info['height'],int(info['nb_frames']))==((3840,1706,600) if kind=='desktop' else (1080,2160,600)),info
info.update(bytes=pending.stat().st_size,sha256=hashlib.sha256(pending.read_bytes()).hexdigest())
shutil.copyfile(pending,target)
(args.work/f'{kind}-audit.json').write_text(json.dumps(info,indent=2)+'\n')
print(json.dumps(info),flush=True)
