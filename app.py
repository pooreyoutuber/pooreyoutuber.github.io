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
# Render Environment Variables से टोकन प्राप्त करें
# सुनिश्चित करें कि आपने इसे 'HUGGINGFACE_ACCESS_TOKEN' के रूप में सेट किया है।
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
# सभी ओरिजिन्स से CORS सक्षम करें (फ्रंटएंड के लिए आवश्यक)
CORS(app) 


# --- 2. Hugging Face क्लाइंट इनिशियलाइज़ेशन ---
if not HF_TOKEN:
    # यदि टोकन नहीं मिला, तो एप्लिकेशन को क्रैश करें या 500 त्रुटि दें
    # हम 500 त्रुटि देंगे क्योंकि यह Render पर डिप्लॉयमेंट को रोकेगा नहीं
    hf_client = None
    print("FATAL: HUGGINGFACE_ACCESS_TOKEN environment variable not set.")
else:
    try:
        hf_client = InferenceClient(
            provider=WAVESPEED_PROVIDER,
            api_key=HF_TOKEN,
        )
        print("Hugging Face Inference Client Initialized Successfully.")
    except Exception as e:
        print(f"Error initializing Hugging Face client: {e}")
        hf_client = None


# --- 3. फ़्रेम प्रोसेसिंग फ़ंक्शन ---

def process_frame(frame_image_bytes, style_prompt):
    """एक एकल फ़्रेम को Hugging Face मॉडल का उपयोग करके परिवर्तित करता है।
       यह NumPy Array के रूप में परिवर्तित फ़्रेम लौटाता है।
    """
    
    try:
        # 1. API कॉल: input_image bytes में, output_image PIL.Image में
        converted_image = hf_client.image_to_image(
            image=frame_image_bytes,
            prompt=f"Transform this video frame into {style_prompt} anime style, highly detailed, cinematic, masterpiece.",
            model=IMAGE_TO_IMAGE_MODEL,
        )
        
        # 2. PIL इमेज को NumPy Array (moviepy के लिए) में बदलें
        return np.array(converted_image)

    except Exception as e:
        print(f"Error processing frame: {e}. Returning original frame.")
        # त्रुटि होने पर, मूल फ़्रेम को वापस NumPy Array के रूप में लौटाएँ ताकि वीडियो में कोई गैप न हो
        try:
            original_image = Image.open(io.BytesIO(frame_image_bytes))
            return np.array(original_image)
        except:
            return None # यदि मूल फ़्रेम भी लोड नहीं हो सकता


# --- 4. मुख्य कन्वर्शन रूट ---

@app.route('/anime-convert', methods=['POST'])
def anime_convert():
    """वीडियो अपलोड स्वीकार करता है, फ़्रेम-बाय-फ़्रेम प्रोसेसिंग करता है, और डाउनलोड लिंक देता है।"""
    
    if not hf_client:
        return jsonify({"message": "Server configuration error: Conversion service not available."}), 503

    if 'video' not in request.files:
        return jsonify({"message": "No video file part"}), 400

    video_file = request.files['video']
    style = request.form.get('style', 'jujutsu-kaisen') # डिफ़ॉल्ट स्टाइल

    if video_file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    # फ़ाइल सेव करें और फ़ाइल नाम सेट करें
    timestamp = int(time.time())
    input_filename = f"{timestamp}_input.mp4"
    output_filename = f"{timestamp}_anime_{style}.mp4"
    input_path = os.path.join(UPLOAD_FOLDER, input_filename)
    output_path = os.path.join(CONVERTED_FOLDER, output_filename)
    
    video_file.save(input_path)
    
    # स्टाइल प्रॉम्प्ट मैप (Style Prompt Map)
    style_prompt_map = {
        'what-if': 'Marvel What If comic book style',
        'ben-10-classic': 'Ben 10 classic animated series style, bold lines',
        'jujutsu-kaisen': 'Jujutsu Kaisen anime style, dark shadows, high contrast',
    }
    style_prompt = style_prompt_map.get(style, 'classic Japanese anime')

    try:
        # 1. वीडियो लोड करें
        clip = VideoFileClip(input_path)
        
        # 1 FPS: प्रति सेकंड 1 फ़्रेम प्रोसेस करें। यह 0.2 FPS से बेहतर एनिमेशन देगा।
        target_fps = 1 
        
        processed_frames_arrays = []
        
        print(f"Starting conversion for {input_filename} at {target_fps} FPS...")
        
        # 2. फ़्रेम एक्सट्रैक्ट करें, प्रोसेस करें, और NumPy Array के रूप में स्टोर करें
        for frame_array in clip.iter_frames(fps=target_fps, dtype="uint8"):
            
            # NumPy Array को bytes में बदलें (API कॉल के लिए)
            frame_img = Image.fromarray(frame_array)
            frame_byte_arr = io.BytesIO()
            frame_img.save(frame_byte_arr, format='JPEG')
            
            # फ़्रेम को प्रोसेस करें
            converted_frame_array = process_frame(frame_byte_arr.getvalue(), style_prompt)
            
            if converted_frame_array is not None:
                processed_frames_arrays.append(converted_frame_array) 

        clip.close()
        
        # 3. फ़्रेम को वापस वीडियो में जोड़ें
        if not processed_frames_arrays:
             return jsonify({"message": "Video processing resulted in no frames."}), 500

        anime_clip = ImageSequenceClip(list(processed_frames_arrays), fps=target_fps)
        
        # वीडियो फ़ाइल को सेव करें
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
        # downloadUrl को /converted/... फॉर्मेट में लौटाएँ
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
        # क्लीनअप: अपलोड फ़ाइल को हटाएँ
        if os.path.exists(input_path):
            os.remove(input_path)


# --- 5. डाउनलोड रूट ---

@app.route(f'/{CONVERTED_FOLDER}/<filename>', methods=['GET'])
def download_file(filename):
    """कनवर्ट की गई फ़ाइलों को सीधे एक्सेस करने की अनुमति देता है।"""
    full_path = os.path.join(CONVERTED_FOLDER, filename)
    if os.path.exists(full_path):
        # as_attachment=False का अर्थ है कि फ़ाइल को सीधे ब्राउज़र में दिखाया जा सकता है (वीडियो प्लेयर)
        return send_file(full_path, as_attachment=False)
    return jsonify({"message": "File not found"}), 404

# --- 6. रनिंग द ऐप (Render के लिए आवश्यक) ---
if __name__ == '__main__':
    # यह सिर्फ़ लोकल टेस्टिंग के लिए है। Render 'Procfile' का उपयोग करेगा।
    app.run(debug=True, port=os.environ.get('PORT', 5000))
