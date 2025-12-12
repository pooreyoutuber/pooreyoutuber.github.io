import os
import io
import time
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
# Hugging Face क्लाइंट के लिए सही लाइब्रेरी
from huggingface_hub import InferenceClient 
from moviepy.editor import VideoFileClip, ImageSequenceClip
from PIL import Image

# --- 1. कॉन्फ़िगरेशन और टोकन ---
# Render Environment Variables से टोकन प्राप्त करें
# पिछले चैट के अनुसार 'HUGGINGFACE_ACCESS_TOKEN' का उपयोग करें
HF_TOKEN = os.environ.get("HUGGINGFACE_ACCESS_TOKEN")

# मॉडल और एंडपॉइंट
IMAGE_TO_IMAGE_MODEL = "autoweeb/Qwen-Image-Edit-2509-Photo-to-Anime"
WAVESPEED_PROVIDER = "wavespeed" 

# फ़ाइल पथ
UPLOAD_FOLDER = 'uploads'
CONVERTED_FOLDER = 'converted'

# सुनिश्चित करें कि फ़ोल्डर मौजूद हैं
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONVERTED_FOLDER, exist_ok=True)


app = Flask(__name__)
CORS(app) 


# --- 2. Hugging Face क्लाइंट इनिशियलाइज़ेशन ---
if not HF_TOKEN:
    # यदि टोकन नहीं मिला, तो त्रुटि संदेश के साथ बाहर निकलें
    raise ValueError("HUGGINGFACE_ACCESS_TOKEN environment variable not set. Please set it in Render.")

try:
    hf_client = InferenceClient(
        provider=WAVESPEED_PROVIDER,
        api_key=HF_TOKEN, # सही कुंजी का उपयोग
    )
    print("Hugging Face Inference Client Initialized Successfully.")
except Exception as e:
    print(f"Error initializing Hugging Face client: {e}")
    hf_client = None


# --- 3. फ़्रेम प्रोसेसिंग फ़ंक्शन ---

def process_frame(frame_image_bytes, style_prompt):
    """एक एकल फ़्रेम को Hugging Face मॉडल का उपयोग करके परिवर्तित करता है।"""
    
    try:
        # API कॉल
        # output is a PIL.Image object
        converted_image = hf_client.image_to_image(
            image=frame_image_bytes,
            prompt=f"Transform this video frame into {style_prompt} anime style, highly detailed, cinematic, masterpiece.",
            model=IMAGE_TO_IMAGE_MODEL,
        )
        
        # PIL इमेज को वापस NumPy Array (moviepy के लिए) में बदलें
        return np.array(converted_image)

    except Exception as e:
        print(f"Error processing frame: {e}. Returning original frame.")
        # त्रुटि होने पर, मूल फ़्रेम को NumPy Array के रूप में वापस करें (यदि संभव हो)
        # चूँकि हमने यहाँ केवल bytes को स्वीकार किया है, हमें इसे पहले इमेज में खोलना होगा।
        try:
            original_image = Image.open(io.BytesIO(frame_image_bytes))
            return np.array(original_image)
        except:
            # अंतिम उपाय: यदि कुछ भी काम नहीं करता है, तो None लौटाएँ
            return None


# --- 4. मुख्य रूट ---

@app.route('/anime-convert', methods=['POST'])
def anime_convert():
    
    if not hf_client:
        return jsonify({"message": "Server error: Conversion service not available."}), 503

    # फ़ाइल और स्टाइल हैंडलिंग... (previous code)
    if 'video' not in request.files:
        return jsonify({"message": "No video file part"}), 400

    video_file = request.files['video']
    style = request.form.get('style', 'jujutsu-kaisen') 

    if video_file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    # फ़ाइल सेव करें
    timestamp = int(time.time())
    input_filename = f"{timestamp}_input.mp4"
    output_filename = f"{timestamp}_anime_{style}.mp4"
    input_path = os.path.join(UPLOAD_FOLDER, input_filename)
    output_path = os.path.join(CONVERTED_FOLDER, output_filename)
    
    video_file.save(input_path)
    
    # स्टाइल प्रॉम्प्ट मैप
    style_prompt_map = {
        'what-if': 'Marvel What If comic book style',
        'ben-10-classic': 'Ben 10 classic animated series style, bold lines',
        'jujutsu-kaisen': 'Jujutsu Kaisen anime style, dark shadows, high contrast',
    }
    style_prompt = style_prompt_map.get(style, 'classic Japanese anime')

    try:
        clip = VideoFileClip(input_path)
        
        # 🛑 महत्वपूर्ण: प्रोसेसिंग को प्रबंधित करने के लिए 1 FPS सेट करें। 
        # यह हर सेकंड एक फ्रेम को प्रोसेस करेगा। 30 सेकंड के वीडियो के लिए 30 API कॉल।
        target_fps = 1 
        
        processed_frames_arrays = []
        
        print(f"Starting conversion for {input_filename} at {target_fps} FPS...")
        
        # clip.iter_frames का उपयोग करें, जो NumPy Arrays उत्पन्न करता है
        for frame_array in clip.iter_frames(fps=target_fps, dtype="uint8"):
            
            # 1. NumPy Array को PIL Image और फिर Bytes में बदलें
            frame_img = Image.fromarray(frame_array)
            frame_byte_arr = io.BytesIO()
            frame_img.save(frame_byte_arr, format='JPEG')
            
            # 2. Hugging Face API को कॉल करें
            converted_frame_array = process_frame(frame_byte_arr.getvalue(), style_prompt)
            
            if converted_frame_array is not None:
                processed_frames_arrays.append(converted_frame_array) 

        clip.close()
        
        # 3. फ़्रेम को वापस वीडियो में जोड़ें
        if not processed_frames_arrays:
             return jsonify({"message": "Video processing resulted in no frames."}), 500

        # ImageSequenceClip को NumPy Arrays की लिस्ट चाहिए
        anime_clip = ImageSequenceClip(list(processed_frames_arrays), fps=target_fps)
        anime_clip.write_videofile(
            output_path, 
            codec='libx264', 
            audio_codec='aac', 
            temp_audiofile='temp-audio.m4a', 
            remove_temp=True,
            logger=None
        )
        
        anime_clip.close()

        # 4. सफल प्रतिक्रिया
        download_url = f"/{CONVERTED_FOLDER}/{output_filename}"
        
        return jsonify({
            "message": "Conversion complete!", 
            "downloadUrl": download_url, 
            "styleUsed": style
        }), 200

    except Exception as e:
        print(f"A critical error occurred: {e}")
        return jsonify({"message": f"Conversion failed: {str(e)}"}), 500
    finally:
        # क्लीनअप
        if os.path.exists(input_path):
            os.remove(input_path)


# --- 5. डाउनलोड रूट ---

@app.route(f'/{CONVERTED_FOLDER}/<filename>', methods=['GET'])
def download_file(filename):
    """कनवर्ट की गई फ़ाइलों को सीधे एक्सेस करने की अनुमति देता है।"""
    full_path = os.path.join(CONVERTED_FOLDER, filename)
    if os.path.exists(full_path):
        return send_file(full_path, as_attachment=False)
    return jsonify({"message": "File not found"}), 404

# --- 6. रनिंग द ऐप ---
if __name__ == '__main__':
    app.run(debug=True, port=os.environ.get('PORT', 5000))

# Render Deployment के लिए:
# Procfile: web: gunicorn app:app
