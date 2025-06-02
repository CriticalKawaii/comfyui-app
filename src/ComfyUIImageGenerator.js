import React, {useState, useRef, useEffect, createElement} from "react";
import {Send, Download, Settings, Zap, Image, Loader2 } from 'lucide-react';

const ComfyUIImageGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [error, setError] = useState('');
    const [comfyUIUrl, setcomfyUIUrl] = useState('http://127.0.0.1:8188');
    const [settings, setSettings] = useState({
        width: 512,
        height: 512,
        steps: 20,
        cfg: 7,
        sampler: 'euler',
        scheduler: 'normal',
        send: -1
    });
    const [showSettings, setShowSettings] = useState(false);
    const wsRef = useRef(null);
    const [clientId, setClientId] = useState('')

    useEffect(()=>{
        setClientId(Math.random().toString(36).substring(2,15));
    },[]);

    const createWorkflow = (prompt, negativePrompt,settings)=>{
        return{
            "3": {
        "inputs": {
          "seed": settings.seed === -1 ? Math.floor(Math.random() * 1000000) : settings.seed,
          "steps": settings.steps,
          "cfg": settings.cfg,
          "sampler_name": settings.sampler,
          "scheduler": settings.scheduler,
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": "v1-5-pruned-emaonly.ckpt"
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "width": settings.width,
          "height": settings.height,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": {
          "text": prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": negativePrompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
        };
    };

    const connectWebSocket = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN){
            return Promise.resolve();
        }

        return new Promise((resolve, reject)=>{
            const ws = new WebSocket(`${comfyUIUrl.replace('http', 'ws')}/ws?clientId=${clientId}`);

            ws.onopen = () =>{ 
                wsRef.current = ws;
                resolve();
            };

            ws.onerror = (error) => {
                reject(new Error('Ошибка подключения к ComfyUI WebSocket'));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if(data.type === 'executed' && data.data.node === '9'){
                    const images = data.data.output.images;
                    if(images && images.length > 0){
                        const imageUrl = `${comfyUIUrl}/view?filename=${images[0].filename}&subfolder=${images[0].subfolder}&type=${images[0].type}`;
                        setGeneratedImage(imageUrl);
                        setIsGenerating(false);
                    }
                }
            };
        });
    };

        const generateImage = async () => {
            if (!prompt.trim()){
                setError('Введите промпт');
                return;
            }

            setIsGenerating(true);
            setError('')
            setGeneratedImage(null)

            try{
                await connectWebSocket();

                const workflow = createWorkflow(prompt, negativePrompt, settings);

                const response = await fetch(`${comfyUIUrl/prompt}`,{
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: workflow,
                        client_id: clientId
                    })
                });
                if (!response.ok){
                    throw new Error(`Ошибка HTTP: ${response.status}`)
                }
                const result = await response.json();

                if(result.error){
                    throw new Error(result.error);
                }
            } catch(err){
                setError(`Ошибка ${err.message}`);
                setIsGenerating(false);
            }
        };

        const downloadImage = () => {
            if (generatedImage){
                const link = document.createElement('a');
                link.href = generatedImage;
                link.download = `comfyui-generated-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link); 
            }
        };
    return(
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white opacity-10 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 4 + 1}px`,
                height: `${Math.random() * 4 + 1}px`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 3 + 2}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-2xl">
              <Zap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            ComfyUI Generator
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Transform your imagination into stunning AI-generated artwork
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Image className="w-6 h-6 mr-2" />
              Create Your Image
            </h2>

            {/* ComfyUI URL */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-purple-200 mb-2">
                ComfyUI URL
              </label>
              <input
                type="text"
                value={comfyUIUrl}
                onChange={(e) => setcomfyUIUrl(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="http://localhost:8188"
              />
            </div>

            {/* Prompt */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none h-24"
                placeholder="Describe your image... (e.g., 'a beautiful sunset over mountains, digital art')"
              />
            </div>

            {/* Negative Prompt */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Negative Prompt
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="What to avoid... (e.g., 'blurry, low quality')"
              />
            </div>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center text-purple-300 hover:text-white transition-colors mb-4"
            >
              <Settings className="w-4 h-4 mr-2" />
              Advanced Settings
            </button>

            {/* Advanced Settings */}
            {showSettings && (
              <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-purple-200 mb-1">Width</label>
                    <input
                      type="number"
                      value={settings.width}
                      onChange={(e) => setSettings({...settings, width: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-purple-200 mb-1">Height</label>
                    <input
                      type="number"
                      value={settings.height}
                      onChange={(e) => setSettings({...settings, height: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-purple-200 mb-1">Steps</label>
                    <input
                      type="number"
                      value={settings.steps}
                      onChange={(e) => setSettings({...settings, steps: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-purple-200 mb-1">CFG Scale</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.cfg}
                      onChange={(e) => setSettings({...settings, cfg: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={generateImage}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Generate Image</span>
                </>
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Result Panel */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Generated Image</h2>
            
            <div className="aspect-square bg-white/5 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center relative overflow-hidden">
              {isGenerating ? (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                  <p className="text-purple-200">Creating your masterpiece...</p>
                </div>
              ) : generatedImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <button
                    onClick={downloadImage}
                    className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-all"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Image className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/50">Your generated image will appear here</p>
                </div>
              )}
            </div>

            {generatedImage && (
              <div className="mt-6 text-center">
                <button
                  onClick={downloadImage}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Image</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="max-w-4xl mx-auto mt-12 bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Getting Started</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-purple-200">
            <div>
              <div className="bg-purple-500/20 rounded-lg p-4 mb-3">
                <span className="text-2xl">🚀</span>
              </div>
              <h4 className="font-semibold text-white mb-2">1. Start ComfyUI</h4>
              <p className="text-sm">Make sure ComfyUI is running on your machine (default: localhost:8188)</p>
            </div>
            <div>
              <div className="bg-purple-500/20 rounded-lg p-4 mb-3">
                <span className="text-2xl">✍️</span>
              </div>
              <h4 className="font-semibold text-white mb-2">2. Write Your Prompt</h4>
              <p className="text-sm">Describe the image you want to create in detail</p>
            </div>
            <div>
              <div className="bg-purple-500/20 rounded-lg p-4 mb-3">
                <span className="text-2xl">🎨</span>
              </div>
              <h4 className="font-semibold text-white mb-2">3. Generate & Download</h4>
              <p className="text-sm">Click generate and download your AI-created artwork</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
};

export default ComfyUIImageGenerator;