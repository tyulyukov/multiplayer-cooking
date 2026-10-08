from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[5]
src=Path(__file__).resolve().parent
dest=root/'apps/mobile/assets/images'
refs=root/'apps/web/public/images'
names=['apron-hook','blank-sign','helper-ladle','notes-clip','kitchen-timer','unplugged-kettle']
for name in names:
    im=Image.open(src/f'{name}.png').convert('RGBA')
    assert im.size==(768,768)
    im.save(dest/f'{name}.webp','WEBP',quality=85,method=6)
    exported=Image.open(dest/f'{name}.webp').convert('RGBA')
    alpha=exported.getchannel('A')
    assert alpha.getextrema()==(0,255)
    assert all(alpha.getpixel(p)==0 for p in [(0,0),(767,0),(0,767),(767,767)])
    print(f'{name}: {(dest/f"{name}.webp").stat().st_size/1024:.1f} KiB; {im.size}; alpha {alpha.getextrema()}')
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',14)
sheet=Image.new('RGB',(672,660),'#f3eee4')
draw=ImageDraw.Draw(sheet)
items=[('ingredients-basket',refs),('oven-mitts',refs),('recipe-box',refs)]+[(n,dest) for n in names]
for i,(name,folder) in enumerate(items):
    x=(i%3)*224; y=(i//3)*220
    im=Image.open(folder/f'{name}.webp').convert('RGBA').resize((112,112),Image.Resampling.LANCZOS)
    sheet.paste(im,(x+56,y+38),im)
    draw.text((x+112,y+172),name,fill='#16191d',font=font,anchor='mm')
    draw.text((x+112,y+193),'112px · reference' if i<3 else '112px · new',fill='#536366',font=font,anchor='mm')
sheet.save(src/'contact-sheet.png')
pairs=Image.new('RGB',(6*240,324),'#f3eee4')
draw=ImageDraw.Draw(pairs)
for i,name in enumerate(names):
    for j,(n,folder) in enumerate([('ingredients-basket',refs),(name,dest)]):
        im=Image.open(folder/f'{n}.webp').convert('RGBA').resize((112,112),Image.Resampling.LANCZOS)
        pairs.paste(im,(i*240+8+j*112,36),im)
    draw.text((i*240+120,174),name,fill='#16191d',font=font,anchor='mm')
    size={'helper-ladle':80,'blank-sign':96,'notes-clip':96,'kitchen-timer':96}.get(name,112)
    im=Image.open(dest/f'{name}.webp').convert('RGBA').resize((size,size),Image.Resampling.LANCZOS)
    pairs.paste(im,(i*240+(240-size)//2,192),im)
pairs.save(src/'family-size-review.png')
