import React, { useState } from 'react';
import { CameraProfile, LutFormat } from '../types';
import { suggestConversionParams } from '../services/geminiService';
import { Language } from '../App';

interface LutConverterProps {
  lang: Language;
}

const LutConverter: React.FC<LutConverterProps> = ({ lang }) => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceProfile, setSourceProfile] = useState<CameraProfile>(CameraProfile.SONY_SLOG3);
  const [targetProfile, setTargetProfile] = useState<CameraProfile>(CameraProfile.REC709);
  const [targetFormat, setTargetFormat] = useState<LutFormat>(LutFormat.CUBE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [conversionNote, setConversionNote] = useState<string>("");

  const t = {
    zh: {
      title: "通用 LUT 转换器",
      subtitle: "解决相机品牌色彩科学不兼容问题，支持 S-Log, C-Log, LogC 等主流格式互转。",
      uploadLabel: "上传原始 LUT (.cube, .3dl)",
      dropText: "点击或拖拽上传 LUT 文件",
      sourceSpace: "源色彩空间",
      targetSpace: "目标色彩空间",
      outputFormat: "输出格式",
      convertBtn: "开始转换",
      processing: "处理中...",
      aiAnalysis: "AI 转换分析",
      successTitle: "转换成功!",
      failTitle: "转换失败，请重试",
      fileLabel: "文件",
      convertLabel: "转换",
      formatLabel: "格式",
      noteLabel: "AI 备注"
    },
    en: {
      title: "Universal LUT Converter",
      subtitle: "Resolve camera color science incompatibility. Convert between S-Log, C-Log, LogC, etc.",
      uploadLabel: "Upload LUT (.cube, .3dl)",
      dropText: "Click or drag to upload LUT",
      sourceSpace: "Source Color Space",
      targetSpace: "Target Color Space",
      outputFormat: "Output Format",
      convertBtn: "Start Conversion",
      processing: "Processing...",
      aiAnalysis: "AI Analysis",
      successTitle: "Conversion Successful!",
      failTitle: "Conversion Failed. Please try again.",
      fileLabel: "File",
      convertLabel: "Convert",
      formatLabel: "Format",
      noteLabel: "AI Note"
    }
  };

  const text = t[lang];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setConversionNote("");
      setProgress(0);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);

    try {
      // 1. Get AI insight on transformation
      const insight = await suggestConversionParams(sourceProfile, targetProfile);
      setConversionNote(insight);
      setProgress(40);

      // 2. Simulate heavy processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProgress(80);

      // 3. Simulate completion
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(100);

      // 4. Mock Download
      alert(`${text.successTitle} \n\n${text.fileLabel}: ${file.name}\n${text.convertLabel}: ${sourceProfile} -> ${targetProfile}\n${text.formatLabel}: .${targetFormat}\n\n${text.noteLabel}: ${insight}`);
      
    } catch (error) {
      console.error(error);
      alert(text.failTitle);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">{text.title}</h2>
        <p className="text-gray-400">{text.subtitle}</p>
      </div>

      <div className="bg-cinema-800 rounded-2xl p-8 border border-cinema-700 shadow-2xl">
        {/* File Upload */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">{text.uploadLabel}</label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-cinema-700 border-dashed rounded-lg cursor-pointer bg-cinema-900/50 hover:bg-cinema-700/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                </svg>
                <p className="text-sm text-gray-400">
                  {file ? <span className="text-indigo-400 font-semibold">{file.name}</span> : <span>{text.dropText}</span>}
                </p>
              </div>
              <input type="file" className="hidden" accept=".cube,.3dl,.vlt" onChange={handleFileChange} />
            </label>
          </div>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{text.sourceSpace}</label>
            <select 
              value={sourceProfile}
              onChange={(e) => setSourceProfile(e.target.value as CameraProfile)}
              className="w-full bg-cinema-900 border border-cinema-700 text-white rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {Object.values(CameraProfile).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{text.targetSpace}</label>
            <select 
              value={targetProfile}
              onChange={(e) => setTargetProfile(e.target.value as CameraProfile)}
              className="w-full bg-cinema-900 border border-cinema-700 text-white rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {Object.values(CameraProfile).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{text.outputFormat}</label>
            <select 
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value as LutFormat)}
              className="w-full bg-cinema-900 border border-cinema-700 text-white rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {Object.values(LutFormat).map(f => <option key={f} value={f}>.{f}</option>)}
            </select>
          </div>
        </div>

        {/* Action Button & Progress */}
        <div className="space-y-4">
          <button
            onClick={handleConvert}
            disabled={!file || isProcessing}
            className={`w-full py-3.5 rounded-lg text-white font-bold text-lg transition-all ${
              !file || isProcessing 
                ? 'bg-gray-700 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
            }`}
          >
            {isProcessing ? text.processing : text.convertBtn}
          </button>

          {isProcessing && (
            <div className="w-full bg-cinema-900 rounded-full h-2.5">
              <div 
                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          {conversionNote && !isProcessing && (
             <div className="p-4 bg-cinema-900/50 border border-indigo-500/30 rounded-lg">
                <p className="text-xs text-indigo-300 uppercase font-bold mb-1">{text.aiAnalysis}</p>
                <p className="text-sm text-gray-300">{conversionNote}</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LutConverter;