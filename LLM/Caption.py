from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration

IMG_PTH = "image.jpg"  # Pass image path from Node.js

def init_blip():
    # Load model and processor (can move to cache init later)
    processor = BlipProcessor.from_pretrained(
        "Salesforce/blip-image-captioning-base",
        use_fast=False  # Or True, depending on what you want
    )
    model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

    return processor, model

def caption_image(processor, model, image_path):
    # Load image
    image = Image.open(image_path).convert("RGB")
    inputs = processor(image, return_tensors="pt")
    output = model.generate(**inputs)

    # Decode and print caption
    caption = processor.decode(output[0], skip_special_tokens=True)
    return caption

if __name__ == "__main__":
    processor, model = init_blip()
    print(caption_image(processor, model, IMG_PTH))