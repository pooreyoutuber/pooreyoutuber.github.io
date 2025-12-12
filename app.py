import os
import io
import time
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from huggingface_hub import InferenceClient
from moviepy.editor import VideoFileClip, ImageSequenceClip
from PIL import Image

# --- 1. कॉन्फ़िगरेशन और टोकन ---
# Render Environment Variables से टोकन प्राप्त करें।
# NOTE: Production environments should not run in debug mode.
# DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

HF_TOKEN = os.environ.get("HUGGINGFACE_ACCESS_TOKEN")

# Hugging Face मॉडल
IMAGE_TO_IMAGE_MODEL = "autoweeb/Qwen-Image-Edit-2509-Photo-to-Anime"
WAVESPEED_PROVIDER = "wavespeed" 

# फ़ाइल फ़ोल्डर
UPLOAD_FOLDER = 'uploads'
CONVERTED_FOLDER = 'converted'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONVERTED_FOLDER, exist_ok=True)

# 🚀 Flask एप्लिकेशन इंस्टेंस (यह 'app' ऑब्जेक्ट है)
# Gunicorn इसी 'app' ऑब्जेक्ट को ढूंढेगा।
app = Flask(__name__)
CORS(app) 

# --- 2. Hugging Face क्लाइंट इनिशियलाइज़ेशन ---
hf_client = None
if not HF_TOKEN:
    print("FATAL: HUGGINGFACE_ACCESS_TOKEN environment variable not set. Conversion API disabled.")
else:
    try:
        hf_client = InferenceClient(
            provider=WAVESPEED_PROVIDER,
            api_key=HF_TOKEN,
        )
        print("Hugging Face Inference Client Initialized Successfully.")
    except Exception as e:
        print(f"Error initializing Hugging Face client: {e}")


# --- 3. फ़्रेम प्रोसेसिंग फ़ंक्शन ---

def process_frame(frame_image_bytes, style_prompt):
    """एकल फ़्रेम को परिवर्तित करता है और NumPy Array लौटाता है।"""
    
    try:
        # API कॉल
        converted_image = hf_client.image_to_image(
            image=frame_image_bytes,
            prompt=f"Transform this video frame into {style_prompt} anime style, highly detailed, cinematic, masterpiece.",
            model=IMAGE_TO_IMAGE_MODEL,
        )
        
        # PIL इमेज को NumPy Array में बदलें
        return np.array(converted_image)

    except Exception as e:
        # त्रुटि होने पर, मूल फ़्रेम को वापस लौटाएँ
        print(f"Error processing frame: {e}. Returning original frame.")
        try:
            original_image = Image.open(io.BytesIO(frame_image_bytes))
            return np.array(original_image)
        except:
            return None


# --- 4. मुख्य कन्वर्शन रूट (/anime-convert) ---

@app.route('/anime-convert', methods=['POST'])
def anime_convert():
    
    if not hf_client:
        return jsonify({"message": "Server configuration error: Conversion service not available."}), 503

    if 'video' not in request.files:
        return jsonify({"message": "No video file part"}), 400

    video_file = request.files['video']
    # 'style' पैरामीटर को URL फॉर्म डेटा से प्राप्त करें
    style = request.form.get('style', 'jujutsu-kaisen') 

    if video_file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    # फ़ाइल सेव करें और फ़ाइल नाम सेट करें
    timestamp = int(time.time())
    input_filename = f"{timestamp}_input.mp4"
    output_filename = f"{timestamp}_anime_{style}.mp4"
    input_path = os.path.join(UPLOAD_FOLDER, input_filename)
    output_path = os.path.join(CONVERTED_FOLDER, output_filename)
    
    video_file.save(input_path)
    
    style_prompt_map = {
        'what-if': 'Marvel What If comic book style',
        'ben-10-classic': 'Ben 10 classic animated series style, bold lines',
        'jujutsu-kaisen': 'Jujutsu Kaisen anime style, dark shadows, high contrast',
    }
    style_prompt = style_prompt_map.get(style, 'classic Japanese anime')

    try:
        clip = VideoFileClip(input_path)
        
        # 1 FPS: प्रति सेकंड 1 फ़्रेम प्रोसेस करें। यह तेज़ प्रोसेसिंग के लिए है।
        target_fps = 1 
        processed_frames_arrays = []
        
        print(f"Starting conversion for {input_filename} at {target_fps} FPS...")
        
        for frame_array in clip.iter_frames(fps=target_fps, dtype="uint8"):
            
            # NumPy Array को JPEG bytes में बदलें
            frame_img = Image.fromarray(frame_array)
            frame_byte_arr = io.BytesIO()
            frame_img.save(frame_byte_arr, format='JPEG')
            
            converted_frame_array = process_frame(frame_byte_arr.getvalue(), style_prompt)
            
            if converted_frame_array is not None:
                processed_frames_arrays.append(converted_frame_array) 

        clip.close()
        
        # 3. फ़्रेम को वापस वीडियो में जोड़ें
        if not processed_frames_arrays:
            return jsonify({"message": "Video processing resulted in no frames."}), 500

        # original clip FPS का उपयोग करें ताकि वीडियो की अवधि सही रहे
        anime_clip = ImageSequenceClip(list(processed_frames_arrays), fps=clip.fps)
        
        # ⚠️ MoviePy में ऑडियो को सावधानी से हैंडल करें।
        # यहाँ, हम केवल वीडियो को लिखते हैं, ऑडियो को बाद में जोड़ा जा सकता है।
        anime_clip.write_videofile(
            output_path, 
            codec='libx264', 
            audio_codec='aac', 
            temp_audiofile='temp-audio.m4a', 
            remove_temp=True,
            logger=None # डिप्लॉयमेंट के दौरान लॉगिंग को शांत करें
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


# --- 5. डाउनलोड रूट (/converted/<filename>) ---

@app.route(f'/{CONVERTED_FOLDER}/<filename>', methods=['GET'])
def download_file(filename):
    """कनवर्ट की गई फ़ाइलों को सीधे एक्सेस करने की अनुमति देता है।"""
    full_path = os.path.join(CONVERTED_FOLDER, filename)
    if os.path.exists(full_path):
        return send_file(full_path, as_attachment=False)
    return jsonify({"message": "File not found"}), 404

# --- 6. रनिंग द ऐप ---
# यह सिर्फ लोकल डेवलपमेंट के लिए है, Gunicorn प्रोडक्शन में इसका उपयोग नहीं करता है।
# if __name__ == '__main__':
#     app.run(debug=True, port=os.environ.get('PORT', 5000))
