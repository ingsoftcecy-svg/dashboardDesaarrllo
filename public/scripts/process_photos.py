import os
from PIL import Image, ImageDraw, ImageFilter
from rembg import remove
import glob
import random

input_dir = "public/fotos"
output_dir = "public/fotos_procesadas"

os.makedirs(output_dir, exist_ok=True)

def generate_gradient_bg(size=(512, 512)):
    bg = Image.new('RGB', size, (2, 32, 56)) # #022038 edge color
    draw = ImageDraw.Draw(bg)
    
    # Create radial gradient
    center_color = (1, 39, 63) # #01273F
    edge_color = (2, 32, 56)   # #022038
    cx, cy = size[0] // 2, size[1] // 2
    max_radius = (cx**2 + cy**2)**0.5

    for y in range(size[1]):
        for x in range(size[0]):
            distance = ((x - cx)**2 + (y - cy)**2)**0.5
            ratio = min(distance / max_radius, 1.0)
            
            # Interpolate color
            r = int(center_color[0] + (edge_color[0] - center_color[0]) * ratio)
            g = int(center_color[1] + (edge_color[1] - center_color[1]) * ratio)
            b = int(center_color[2] + (edge_color[2] - center_color[2]) * ratio)
            
            # Add subtle noise for texture
            noise = random.randint(-2, 2)
            
            bg.putpixel((x, y), (max(0, min(255, r + noise)), 
                                 max(0, min(255, g + noise)), 
                                 max(0, min(255, b + noise))))
                                 
    # Blur slightly to smooth the gradient/noise
    bg = bg.filter(ImageFilter.GaussianBlur(radius=1))
    return bg

# Find all WhatsApp images
images = glob.glob(os.path.join(input_dir, "WhatsApp*"))
images = [img for img in images if not img.endswith('.webp')]

print(f"Found {len(images)} images to process.")

target_size = (512, 512)

for img_path in images:
    filename = os.path.basename(img_path)
    print(f"Processing: {filename}...")
    try:
        # Open image
        input_image = Image.open(img_path)
        
        # Remove background
        subject = remove(input_image)
        
        # Crop subject to 1:1, centered
        # Get bounding box of the non-transparent pixels
        bbox = subject.getbbox()
        if bbox:
            subject = subject.crop(bbox)
        
        # Make subject fit into target size, keeping aspect ratio
        subject.thumbnail(target_size, Image.Resampling.LANCZOS)
        
        # Generate gradient background
        bg = generate_gradient_bg(target_size)
        
        # Paste subject onto background (centered)
        offset_x = (target_size[0] - subject.width) // 2
        
        # Optional: push the subject down slightly so it sits at the bottom if it's a portrait bust, 
        # but centered vertically is usually fine.
        offset_y = (target_size[1] - subject.height) // 2
        # Let's align to bottom if it's a typical portrait with shoulders cut off:
        offset_y = target_size[1] - subject.height
        
        # Wait, if we align to bottom, there might be empty space at the top.
        # Let's just center it.
        offset_y = (target_size[1] - subject.height) // 2
        
        bg.paste(subject, (offset_x, offset_y), subject)
        
        # Save as webp
        output_name = os.path.splitext(filename)[0] + ".webp"
        output_path = os.path.join(output_dir, output_name)
        
        bg.save(output_path, "WEBP", quality=90)
        print(f"Saved: {output_name}")
    except Exception as e:
        print(f"Failed processing {filename}: {e}")
