import React, { useState, useRef, useEffect } from 'react';
import { generateGradingParams, getStyleSuggestions } from '../services/geminiService';
import { generateCubeFile, generateHaldClut, downloadLut, calculateColorGrade } from '../services/lutGenerator';
import { ColorAnalysis, GradingHistoryItem, LutFormat } from '../types';
import { Language } from '../App';

type GradingMode = 'prompt' | 'reference';
type PreviewMode = 'source' | 'chart' | 'custom';

interface ImageToLutProps {
  lang: Language;
}

const ImageToLut: React.FC<ImageToLutProps> = ({ lang }) => {
  // --- State ---
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [mode, setMode] = useState<GradingMode>('prompt');
  
  // AI Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  
  // History & Results
  const [history, setHistory] = useState<GradingHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const [lutName, setLutName] = useState("Custom_Look");
  const [exportFormat, setExportFormat] = useState<LutFormat>(LutFormat.CUBE);

  // Preview State
  const [previewMode, setPreviewMode] = useState<PreviewMode>('source');
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  
  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Comparison Slider State (0 to 100)
  const [sliderPosition, setSliderPosition] = useState(50);
  const isDragging = useRef(false);

  // Computed: Get the currently active params from history
  const activeParams = history.find(h => h.id === activeHistoryId)?.params || null;

  // Localization
  const t = {
    zh: {
      panelTitle: "AI 智能调色台",
      panelSubtitle: "基于源素材进行差异化色彩分析与匹配",
      step1: "导入素材 & AI 分析",
      uploadPlaceholder: "点击上传 LOG/普通视频截图",
      changeSource: "更换素材",
      analyzing: "正在分析光影与色彩...",
      aiSuggest: "AI 智能风格推荐",
      step2: "选择调色目标",
      modePrompt: "文本/建议",
      modeRef: "参考图模仿",
      promptPlaceholder: "输入提示词，或点击上方 AI 建议...",
      uploadRef: "+ 上传参考风格图",
      refHint: "AI 将计算 Source 与 Reference 的色彩差异，生成转换 LUT。",
      generateBtn: "生成 LUT",
      generating: "AI 正在计算色彩模型...",
      verifyTitle: "验证预览 (Verify)",
      viewSource: "源素材",
      viewChart: "标准色卡",
      uploadTest: "上传测试图",
      viewCustom: "自定义图",
      exportTitle: "导出 LUT",
      download: "下载",
      previewArea: "预览工作区",
      previewHint: "请先在左侧导入素材",
      before: "原图",
      after: "调色后",
      fail: "生成失败，请重试",
      alertRef: "请上传参考图片",
      alertPrompt: "请输入提示词",
      contrast: "对比度",
      saturation: "饱和度",
      temp: "色温",
      tint: "色调",
      historyTitle: "调色历史 (版本)",
      noHistory: "暂无调色记录",
      exportCube: ".cube (通用格式)",
      exportPng: ".png (HaldCLUT)",
      fileName: "文件名",
      reRoll: "再来一次"
    },
    en: {
      panelTitle: "AI Color Grading Console",
      panelSubtitle: "Differential color analysis and matching based on source footage",
      step1: "Import Source & AI Analysis",
      uploadPlaceholder: "Upload LOG/Video Frame",
      changeSource: "Change Source",
      analyzing: "Analyzing lighting & color...",
      aiSuggest: "AI Style Suggestions",
      step2: "Select Grading Target",
      modePrompt: "Text/Suggestions",
      modeRef: "Reference Match",
      promptPlaceholder: "Enter prompt or click AI suggestions above...",
      uploadRef: "+ Upload Reference Image",
      refHint: "AI will calculate the color difference between Source and Reference to generate the LUT.",
      generateBtn: "Generate LUT",
      generating: "Calculating color model...",
      verifyTitle: "Verification Preview",
      viewSource: "Source",
      viewChart: "Color Chart",
      uploadTest: "Upload Test Image",
      viewCustom: "Custom Image",
      exportTitle: "Export LUT",
      download: "Download",
      previewArea: "Preview Workspace",
      previewHint: "Please import source material on the left first",
      before: "Before",
      after: "After",
      fail: "Generation failed, please try again",
      alertRef: "Please upload a reference image",
      alertPrompt: "Please enter a prompt",
      contrast: "Contrast",
      saturation: "Sat",
      temp: "Temp",
      tint: "Tint",
      historyTitle: "Grading History (Versions)",
      noHistory: "No grading history yet",
      exportCube: ".cube (Universal)",
      exportPng: ".png (HaldCLUT)",
      fileName: "File Name",
      reRoll: "Re-roll"
    }
  };

  const text = t[lang];

  // Effect: Auto-fill LUT name when active version changes
  useEffect(() => {
    const activeItem = history.find(h => h.id === activeHistoryId);
    if (activeItem) {
        setLutName(activeItem.name);
    }
  }, [activeHistoryId, history]);

  // Determine which image to show on the canvas
  const activePreviewImage = (() => {
    if (previewMode === 'chart' && chartImage) return chartImage;
    if (previewMode === 'custom' && customImage) return customImage;
    return sourceImage;
  })();

  // --- Handlers ---

  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setHistory([]); // Reset history on new source
        setActiveHistoryId(null);
        setSuggestions([]); 
        setPreviewMode('source'); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeSource = async () => {
    if (!sourceImage) return;
    setIsAnalyzing(true);
    try {
        const styles = await getStyleSuggestions(sourceImage, lang);
        setSuggestions(styles);
        setMode('prompt'); 
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCustomPreviewUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
        setPreviewMode('custom');
      };
      reader.readAsDataURL(file);
    }
  }

  const handleLoadSample = () => {
     if (chartImage) {
         setPreviewMode('chart');
         return;
     }

     const canvas = document.createElement('canvas');
     canvas.width = 800;
     canvas.height = 600;
     const ctx = canvas.getContext('2d');
     if(ctx) {
        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0,0,800,600);

        // 1. Grayscale Ramp (Top)
        const grad = ctx.createLinearGradient(50, 50, 750, 50);
        grad.addColorStop(0, 'black');
        grad.addColorStop(0.5, '#808080');
        grad.addColorStop(1, 'white');
        ctx.fillStyle = grad;
        ctx.fillRect(50, 50, 700, 150);

        // Label
        ctx.fillStyle = '#999';
        ctx.font = '12px sans-serif';
        ctx.fillText('Luminance Ramp (Check for banding/clipping)', 50, 40);

        // 2. Color Bars (Middle)
        const colors = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF'];
        const barWidth = 700 / colors.length;
        colors.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.fillRect(50 + (i * barWidth), 250, barWidth, 150);
        });
        ctx.fillStyle = '#999';
        ctx.fillText('Standard Saturation', 50, 240);

        // 3. Skin Tones (Bottom)
        const skinTones = ['#5d4037', '#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#ffdbac'];
        const skinWidth = 700 / skinTones.length;
        skinTones.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.fillRect(50 + (i * skinWidth), 450, skinWidth, 100);
        });
        ctx.fillStyle = '#999';
        ctx.fillText('Skin Tone Reference', 50, 440);
        
        const dataUrl = canvas.toDataURL();
        setChartImage(dataUrl);
        setPreviewMode('chart');
     }
  }

  // Generate Auto Name from Prompt or Defaults
  const generateAutoName = (mode: GradingMode, promptText: string): string => {
    let base = "CineGrade";
    if (mode === 'prompt' && promptText) {
        // Remove special chars, replace spaces with underscores
        base = promptText.trim().replace(/[^\w\s\u4e00-\u9fa5]/gi, '').replace(/\s+/g, '_');
        // Limit length
        if (base.length > 20) base = base.substring(0, 20);
    } else if (mode === 'reference') {
        base = "Ref_Match";
    }
    // Add unique suffix based on existing history length
    const version = history.length + 1;
    return `${base}_v${version}`;
  };

  const handleGenerate = async () => {
    if (!sourceImage) return;
    if (mode === 'reference' && !referenceImage) {
        alert(text.alertRef);
        return;
    }
    if (mode === 'prompt' && !prompt.trim()) {
        alert(text.alertPrompt);
        return;
    }

    setIsProcessing(true);
    try {
      const result = await generateGradingParams({
        sourceImage,
        referenceImage: mode === 'reference' ? (referenceImage || undefined) : undefined,
        prompt: mode === 'prompt' ? prompt : undefined
      }, lang);

      const newItemId = crypto.randomUUID();
      const autoName = generateAutoName(mode, prompt);

      const newItem: GradingHistoryItem = {
          id: newItemId,
          timestamp: Date.now(),
          params: result,
          promptUsed: mode === 'prompt' ? prompt : 'Reference Match',
          name: autoName
      };

      setHistory(prev => [newItem, ...prev]);
      setActiveHistoryId(newItemId);

    } catch (err) {
      alert(text.fail);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!activeParams) return;
    
    // Ensure filename ends with correct extension
    let filename = lutName;
    if (exportFormat === LutFormat.CUBE && !filename.endsWith('.cube')) filename += '.cube';
    if (exportFormat === LutFormat.PNG && !filename.endsWith('.png')) filename += '.png';

    if (exportFormat === LutFormat.CUBE) {
        const content = generateCubeFile(activeParams, lutName);
        downloadLut(content, filename);
    } else if (exportFormat === LutFormat.PNG) {
        const dataUrl = generateHaldClut(activeParams);
        downloadLut(dataUrl, filename);
    }
  };

  // --- Rendering the Canvas (Real-time Grade Application) ---
  useEffect(() => {
    if (!activePreviewImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = activePreviewImage;
    img.onload = () => {
      const maxRes = 2048;
      let renderWidth = img.width;
      let renderHeight = img.height;

      if (renderWidth > maxRes) {
          const ratio = maxRes / img.width;
          renderWidth = maxRes;
          renderHeight = img.height * ratio;
      }
      
      canvas.width = renderWidth;
      canvas.height = renderHeight;

      ctx.drawImage(img, 0, 0, renderWidth, renderHeight);

      if (activeParams) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;

            const [outR, outG, outB] = calculateColorGrade(r, g, b, activeParams);

            data[i] = outR * 255;
            data[i + 1] = outG * 255;
            data[i + 2] = outB * 255;
        }
        ctx.putImageData(imageData, 0, 0);
      }
    };
  }, [activePreviewImage, activeParams]);

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
      setSliderPosition((x / rect.width) * 100);
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 lg:px-8 h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-6">
      
      {/* LEFT PANEL: Controls (35%) */}
      <div className="w-full lg:w-[35%] bg-cinema-800 rounded-xl border border-cinema-700 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-6">
          
          <div>
            <h2 className="text-xl font-bold text-white mb-1">{text.panelTitle}</h2>
            <p className="text-xs text-gray-400">{text.panelSubtitle}</p>
          </div>

          {/* Step 1: Source */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs font-bold text-white">1</span>
                <label className="text-sm font-medium text-gray-200">{text.step1}</label>
            </div>
            
            {!sourceImage ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-cinema-700 border-dashed rounded-lg cursor-pointer hover:bg-cinema-700/30 transition-colors">
                    <div className="text-center">
                        <svg className="w-8 h-8 mx-auto text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-xs text-gray-400">{text.uploadPlaceholder}</span>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleSourceUpload} />
                </label>
            ) : (
                <div className="space-y-3">
                    <div className="relative group">
                        <img src={sourceImage} alt="Source" className="w-full h-32 object-cover rounded-lg border border-cinema-700 opacity-60" />
                        <button onClick={() => {setSourceImage(null); setHistory([]); setActiveHistoryId(null); setCustomImage(null); setPreviewMode('source');}} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-white">
                            {text.changeSource}
                        </button>
                    </div>
                    
                    {suggestions.length === 0 && (
                        <button 
                            onClick={handleAnalyzeSource}
                            disabled={isAnalyzing}
                            className={`w-full py-2 text-xs font-medium rounded border border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2 ${isAnalyzing ? 'opacity-50' : ''}`}
                        >
                            {isAnalyzing ? text.analyzing : text.aiSuggest}
                        </button>
                    )}

                    {suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((s, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => { setPrompt(s); setMode('prompt'); }}
                                    className="px-2 py-1 text-[10px] bg-cinema-700 hover:bg-indigo-600 text-gray-200 hover:text-white rounded-full transition-colors border border-cinema-600"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* Step 2: Mode Selection */}
          <div className={`space-y-4 transition-opacity duration-300 ${!sourceImage ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs font-bold text-white">2</span>
                <label className="text-sm font-medium text-gray-200">{text.step2}</label>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-cinema-900 rounded-lg">
                <button 
                    onClick={() => setMode('prompt')}
                    className={`py-2 text-sm font-medium rounded-md transition-all ${mode === 'prompt' ? 'bg-cinema-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    {text.modePrompt}
                </button>
                <button 
                    onClick={() => setMode('reference')}
                    className={`py-2 text-sm font-medium rounded-md transition-all ${mode === 'reference' ? 'bg-cinema-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    {text.modeRef}
                </button>
            </div>

            {mode === 'prompt' ? (
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={text.promptPlaceholder}
                    className="w-full h-20 bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none placeholder-gray-600"
                />
            ) : (
                <div className="space-y-2">
                     {!referenceImage ? (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-cinema-700 border-dashed rounded-lg cursor-pointer hover:bg-cinema-700/30 transition-colors">
                            <span className="text-xs text-gray-400">{text.uploadRef}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleReferenceUpload} />
                        </label>
                    ) : (
                        <div className="relative group">
                            <img src={referenceImage} alt="Ref" className="w-full h-24 object-cover rounded-lg border border-cinema-700" />
                            <button onClick={() => setReferenceImage(null)} className="absolute top-1 right-1 bg-black/50 rounded-full p-1 hover:bg-red-500/80 transition-colors">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}
                </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isProcessing || !sourceImage}
            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all ${
                isProcessing || !sourceImage
                ? 'bg-cinema-700 cursor-not-allowed text-gray-400'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-[1.02]'
            }`}
          >
            {isProcessing ? text.generating : (history.length > 0 ? text.reRoll : text.generateBtn)}
          </button>

          {/* Step 3: History & Results */}
          {history.length > 0 && (
              <div className="space-y-4 animate-fade-in border-t border-cinema-700 pt-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{text.historyTitle}</h3>
                  
                  {/* Version List */}
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {history.map((item, idx) => (
                          <button
                              key={item.id}
                              onClick={() => setActiveHistoryId(item.id)}
                              className={`flex-shrink-0 px-3 py-2 rounded-lg text-left border transition-all w-24 relative ${
                                  activeHistoryId === item.id 
                                  ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500' 
                                  : 'bg-cinema-900 border-cinema-700 hover:bg-cinema-700'
                              }`}
                          >
                              <div className="text-[10px] font-bold text-white truncate mb-1">{item.name}</div>
                              <div className="text-[9px] text-gray-400 truncate">V{history.length - idx}</div>
                              {activeHistoryId === item.id && <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full -mt-1 -mr-1"></div>}
                          </button>
                      ))}
                  </div>

                  {/* Active Result Details */}
                  {activeParams && (
                    <div className="bg-cinema-900/50 rounded-lg p-4 border border-cinema-700 space-y-4">
                        <div className="space-y-2">
                            <p className="text-xs text-gray-300 italic leading-relaxed">"{activeParams.description}"</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                                <div>{text.contrast}: <span className="text-white">{activeParams.contrast > 0 ? '+' : ''}{activeParams.contrast.toFixed(2)}</span></div>
                                <div>{text.saturation}: <span className="text-white">{activeParams.saturation.toFixed(2)}x</span></div>
                                <div>{text.temp}: <span className="text-white">{activeParams.temperature > 0 ? '+' : ''}{activeParams.temperature.toFixed(2)}</span></div>
                                <div>{text.tint}: <span className="text-white">{activeParams.tint > 0 ? '+' : ''}{activeParams.tint.toFixed(2)}</span></div>
                            </div>
                        </div>

                        {/* Verification */}
                        <div className="pt-3 border-t border-cinema-700">
                            <label className="block text-[10px] font-bold text-indigo-400 mb-2 uppercase tracking-wider">{text.verifyTitle}</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setPreviewMode('source')} className={`text-xs py-1.5 rounded ${previewMode === 'source' ? 'bg-indigo-600 text-white' : 'bg-cinema-800 text-gray-400 hover:text-white'}`}>{text.viewSource}</button>
                                <button onClick={handleLoadSample} className={`text-xs py-1.5 rounded ${previewMode === 'chart' ? 'bg-indigo-600 text-white' : 'bg-cinema-800 text-gray-400 hover:text-white'}`}>{text.viewChart}</button>
                                {!customImage ? (
                                    <label className="text-xs py-1.5 rounded bg-cinema-800 text-gray-400 hover:text-white cursor-pointer flex items-center justify-center border border-cinema-700 border-dashed">{text.uploadTest}<input type="file" className="hidden" accept="image/*" onChange={handleCustomPreviewUpload} /></label>
                                ) : (
                                    <button onClick={() => setPreviewMode('custom')} className={`text-xs py-1.5 rounded ${previewMode === 'custom' ? 'bg-indigo-600 text-white' : 'bg-cinema-800 text-gray-400 hover:text-white'}`}>{text.viewCustom}</button>
                                )}
                            </div>
                        </div>

                        {/* Export */}
                        <div className="pt-3 border-t border-cinema-700">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs text-gray-500">{text.exportTitle}</label>
                                <select 
                                    value={exportFormat}
                                    onChange={(e) => setExportFormat(e.target.value as LutFormat)}
                                    className="bg-cinema-900 border border-cinema-700 text-[10px] text-gray-300 rounded px-1 py-0.5 outline-none"
                                >
                                    <option value={LutFormat.CUBE}>{text.exportCube}</option>
                                    <option value={LutFormat.PNG}>{text.exportPng}</option>
                                </select>
                            </div>
                            <div className="flex gap-2 items-center">
                                <label className="text-xs text-gray-500 whitespace-nowrap">{text.fileName}:</label>
                                <input 
                                    value={lutName}
                                    onChange={(e) => setLutName(e.target.value)}
                                    className="bg-cinema-950 border border-cinema-700 rounded px-2 py-1 text-xs text-white flex-1 outline-none focus:border-indigo-500 min-w-0"
                                />
                                <button 
                                    onClick={handleDownload}
                                    className="bg-white text-cinema-900 text-xs font-bold px-3 py-1 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
                                >
                                    {text.download}
                                </button>
                            </div>
                        </div>
                    </div>
                  )}
              </div>
          )}

        </div>
      </div>

      {/* RIGHT PANEL: Preview Workspace (65%) */}
      <div 
        ref={containerRef}
        className="flex-1 bg-black rounded-xl border border-cinema-700 relative overflow-hidden flex items-center justify-center select-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {!activePreviewImage ? (
            <div className="text-center text-gray-600">
                <p className="text-lg font-medium">{text.previewArea}</p>
                <p className="text-sm">{text.previewHint}</p>
            </div>
        ) : (
            <>
                <img 
                    src={activePreviewImage} 
                    alt="Original" 
                    className="absolute inset-0 m-auto w-auto h-auto max-w-full max-h-full object-contain pointer-events-none" 
                />

                {activeParams && (
                    <div 
                        className="absolute w-full h-full flex items-center justify-center pointer-events-none"
                        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                    >
                        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                    </div>
                )}

                {activeParams && (
                    <div 
                        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 hover:shadow-[0_0_10px_rgba(255,255,255,0.5)] active:bg-indigo-500 transition-colors"
                        style={{ left: `${sliderPosition}%` }}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleMouseDown}
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-cinema-900">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)" />
                            </svg>
                        </div>
                    </div>
                )}

                {activeParams && (
                    <>
                        <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">{text.before}</div>
                        <div className="absolute top-4 right-4 bg-indigo-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">{text.after}</div>
                    </>
                )}
            </>
        )}
      </div>

    </div>
  );
};

export default ImageToLut;