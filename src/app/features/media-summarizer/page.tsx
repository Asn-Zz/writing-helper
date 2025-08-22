'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Script from 'next/script';
import {
  FaPlusCircle, FaPlayCircle, FaPauseCircle, FaMicrophone, 
  FaBook, FaTrash, FaChevronRight, FaChevronDown, FaCamera, FaCloudUploadAlt
} from 'react-icons/fa';
import FeatureLayout from '@/app/components/FeatureLayout';
import { useApiSettings } from '@/app/components/ApiSettingsContext';
import { getIsAuthed } from '@/app/lib/auth';
import { generate } from '@/app/lib/api';
import SegmentsManager from './components/SegmentsManager';
import { Segment, Subtitle, AiSummary } from './types';
import { extractAudioFromVideo, parseSubtitleContent } from './utils';
import './style.css';

// Helper function to format time
const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return "0:00";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function AudioEditorPage() {
  // --- Refs for instances and DOM elements ---
  const wavesurferInstance = useRef<any>(null);
  const audioContext = useRef<any>(null);
  const audioBuffer = useRef<any>(null);
  const currentAudioFile = useRef<any>(null);
  const waveformRef = useRef<any>(null);
  const timelineRef = useRef<any>(null);
  const audioInputRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentVideoFile = useRef<File | null>(null);

  // --- State Management ---
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('处理中，请稍候...');
  const [fileInfo, setFileInfo] = useState("未选择文件");
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [batchRenameText, setBatchRenameText] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [originalFileName, setOriginalFileName] = useState("");
  const [showJsonView, setShowJsonView] = useState(false);
  const [showSegmentsManager, setShowSegmentsManager] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  // --- AI Feature State ---
  const { apiConfig } = useApiSettings();
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);
  const [aiSummaryJson, setAiSummaryJson] = useState<AiSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [fullTranscript, setFullTranscript] = useState('');

  // --- Computed-like values ---
  const formattedCurrentTime = useMemo(() => formatTime(currentTime), [currentTime]);
  const formattedTotalTime = useMemo(() => formatTime(totalTime), [totalTime]);
  const hasRegions = useMemo(() => {
    return wavesurferInstance.current && Object.keys(wavesurferInstance.current.regions.list).length > 0;
  }, [segments]); // Re-evaluate when segments change, as they reflect regions

  // --- Loading and Utility Functions ---
  const showLoading = (message = "处理中，请稍候...") => {
    setLoadingMessage(message);
    setIsLoading(true);
  };
  const hideLoading = () => setIsLoading(false);

  // --- Core WaveSurfer and Audio Logic ---
  const updateSegmentsList = useCallback(() => {
    if (!wavesurferInstance.current) {
      setSegments([]);
      return;
    }
    const totalTime = wavesurferInstance.current.getDuration();
    if (!totalTime) {
      setSegments([]);
      return;
    }

    const wsRegions = Object.values(wavesurferInstance.current.regions.list) as any[];
    wsRegions.sort((a, b) => a.start - b.start);

    const newSegments: Segment[] = [];
    let lastEnd = 0;
    let segmentIndex = 0;

    if (wsRegions.length === 0 || wsRegions[0].start > 0.01) {
      const end = wsRegions.length > 0 ? wsRegions[0].start : totalTime;
      if (end - lastEnd >= 0.05) {
        segmentIndex++;
        const segmentId = `segment-${segmentIndex}`;
        const existing = segments.find(s => s.start.toFixed(3) === lastEnd.toFixed(3) && s.end.toFixed(3) === end.toFixed(3));
        newSegments.push({
          id: segmentId,
          name: existing?.name || `片段 ${segmentIndex}`,
          start: lastEnd,
          end: end,
          duration: end - lastEnd,
          regionId: null
        });
        lastEnd = end;
      }
    } else if (wsRegions.length > 0) {
      lastEnd = wsRegions[0].start;
    }

    for (let i = 0; i < wsRegions.length; i++) {
      const region = wsRegions[i];
      const start = lastEnd;
      const end = (i + 1 < wsRegions.length) ? wsRegions[i + 1].start : totalTime;

      if (end - start >= 0.05) {
        segmentIndex++;
        const segmentId = `segment-${segmentIndex}`;
        const existing = segments.find(s => s.start.toFixed(3) === start.toFixed(3) && s.end.toFixed(3) === end.toFixed(3));
        newSegments.push({
          id: segmentId,
          name: existing?.name || `片段 ${segmentIndex}`,
          start: start,
          end: end,
          duration: end - start,
          regionId: region.id
        });
      }
      lastEnd = end;
      if (i + 1 < wsRegions.length) {
        lastEnd = wsRegions[i + 1].start;
      }
    }
    const uniqueIds = new Set();
    newSegments.forEach((seg, idx) => {
      let finalId = seg.id;
      let suffix = 0;
      while (uniqueIds.has(finalId)) {
        suffix++;
        finalId = `segment-${idx + 1}-${suffix}`;
      }
      uniqueIds.add(finalId);
      seg.id = finalId;
    });
    setSegments(newSegments);
  }, [segments]); // segments dependency is for preserving names

  const initWaveSurfer = useCallback(() => {
    if (!scriptsLoaded || !waveformRef.current || !timelineRef.current) return;

    if (wavesurferInstance.current) {
      wavesurferInstance.current.destroy();
    }

    wavesurferInstance.current = window.WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4A90E2',
      progressColor: '#2574c4',
      cursorColor: '#FF5500',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      height: 128,
      responsive: true,
      normalize: true,
      plugins: [
        window.WaveSurfer.regions.create({ dragSelection: false }),
        window.WaveSurfer.timeline.create({
          container: timelineRef.current,
          primaryFontColor: '#3D3D3D',
          secondaryFontColor: '#7D7D7D',
          primaryColor: '#CCCCCC',
          secondaryColor: '#DDDDDD'
        })
      ]
    });

    // --- Event Listeners ---
    wavesurferInstance.current.on('ready', async () => {
      setTotalTime(wavesurferInstance.current.getDuration());
      setIsAudioLoaded(true);
      setIsPlaying(false);
      setCurrentTime(0);
      clearAllMarkers(false);

      try {
        if (!audioBuffer.current && currentAudioFile.current) {
          const arrayBuffer = await currentAudioFile.current.arrayBuffer();
          audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
          audioBuffer.current = await audioContext.current.decodeAudioData(arrayBuffer);
        }
        updateSegmentsList();
        hideLoading();
      } catch (error) {
        console.error("Error decoding audio data:", error);
        hideLoading();
        resetState();
      }
    });
    wavesurferInstance.current.on('audioprocess', (time : number) => {
      setCurrentTime(time);
      
      // 同步视频播放进度
      if (isVideoMode && videoRef.current) {
        videoRef.current.currentTime = time;
      }
    });
    wavesurferInstance.current.on('seek', (progress : number) => {
      if (wavesurferInstance.current) {
        const time = progress * wavesurferInstance.current.getDuration();
        setCurrentTime(time);
        
        // 同步视频播放进度
        if (isVideoMode && videoRef.current) {
          videoRef.current.currentTime = time;
        }
      }
    });
    wavesurferInstance.current.on('play', () => {
      setIsPlaying(true);
      
      // 同步播放视频
      if (isVideoMode && videoRef.current) {
        videoRef.current.play().catch(e => console.error("Video play error:", e));
      }
    });
    wavesurferInstance.current.on('pause', () => {
      setIsPlaying(false);
      
      // 暂停视频
      if (isVideoMode && videoRef.current) {
        videoRef.current.pause();
      }
    });
    wavesurferInstance.current.on('finish', () => {
      setIsPlaying(false);
      wavesurferInstance.current.seekTo(0);
      setCurrentTime(0);
      
      // 重置视频播放
      if (isVideoMode && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.pause();
      }
    });
    wavesurferInstance.current.on('region-created', updateSegmentsList);
    wavesurferInstance.current.on('region-updated', updateSegmentsList);
    wavesurferInstance.current.on('region-removed', updateSegmentsList);
    wavesurferInstance.current.on('click', (progress : number, event : any) => {
      if (event.target.closest('.wavesurfer-region, .region-handle')) return;
      if (wavesurferInstance.current && wavesurferInstance.current.getDuration() > 0 && !wavesurferInstance.current.isPlaying()) {
        addMarkerAtPosition(progress * wavesurferInstance.current.getDuration());
      }
    });
  }, [scriptsLoaded, updateSegmentsList]);

  const processFile = useCallback(async (file: File) => {
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isAudio && !isVideo) {
      alert('请选择有效的音频或视频文件');
      return;
    }
    
    resetStateBeforeLoad();
    currentAudioFile.current = file;
    currentVideoFile.current = isVideo ? file : null;
    setFileInfo(`已选择: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    setOriginalFileName(file.name.replace(/\.[^/.]+$/, ""));
    setIsVideoMode(isVideo);

    showLoading(isVideo ? '正在提取音频...' : '正在加载音频文件...');
    setIsAudioLoaded(false);

    if (!wavesurferInstance.current) {
      initWaveSurfer();
    }

    try {
      let audioFile = file;
      if (isVideo) {
        // 对于视频文件，需要提取音频
        audioFile = await extractAudioFromVideo(file);
      }
      
      const fileURL = URL.createObjectURL(audioFile);
      const arrayBuffer = await audioFile.arrayBuffer();
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer.current = await audioContext.current.decodeAudioData(arrayBuffer.slice(0));
      wavesurferInstance.current.load(fileURL);
      
      // 如果是视频文件，设置视频源
      if (isVideo && videoRef.current) {
        videoRef.current.src = URL.createObjectURL(file);
      }
    } catch (error) {
      console.error("Error processing media file:", error);
      hideLoading();
      resetState();
    }
  }, [initWaveSurfer]);

  const handleFileUpload = (event: any) => {
    const file = event.target.files[0];
    if (file) processFile(file);
  };
  const handleDragOver = (event : any) => { event.preventDefault(); setIsDraggingOver(true); };
  const handleDragLeave = (event : any) => { event.preventDefault(); setIsDraggingOver(false); };
  const handleDrop = (event : any) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files[0];
    if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      processFile(file);
      if (audioInputRef.current) audioInputRef.current.value = '';
    } else {
      alert('请拖放有效的音频或视频文件');
    }
  };

  const resetStateBeforeLoad = () => {
    if (wavesurferInstance.current) wavesurferInstance.current.stop();
    setIsPlaying(false);
    setIsAudioLoaded(false);
    audioBuffer.current = null;
    currentAudioFile.current = null;
    currentVideoFile.current = null;
    setSegments([]);
    setCurrentTime(0);
    setTotalTime(0);
    setBatchRenameText("");
    setSubtitles([]);
    setAiSummaryJson(null);
    setFullTranscript('');
    setIsVideoMode(false);
  };

  const resetState = () => {
    resetStateBeforeLoad();
    setFileInfo("未选择文件");
    setOriginalFileName("");
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (wavesurferInstance.current) wavesurferInstance.current.empty();
    
    // 清理视频源
    if (videoRef.current) {
      videoRef.current.src = "";
    }
  };

  // --- Control Functions ---
  const playPause = () => {
    if (wavesurferInstance.current && isAudioLoaded) {
      wavesurferInstance.current.playPause();
      
      // 如果是视频模式，同步控制视频播放
      if (isVideoMode && videoRef.current) {
        if (wavesurferInstance.current.isPlaying()) {
          videoRef.current.play().catch(e => console.error("Video play error:", e));
        } else {
          videoRef.current.pause();
        }
      }
    }
  };
  const zoomIn = () => { if (wavesurferInstance.current) wavesurferInstance.current.zoom(wavesurferInstance.current.params.minPxPerSec * 1.2); };
  const zoomOut = () => { if (wavesurferInstance.current) wavesurferInstance.current.zoom(Math.max(wavesurferInstance.current.params.minPxPerSec / 1.2, 20)); };

  const addMarkerAtPosition = (position: number) => {
    if (!wavesurferInstance.current || position < 0 || position > totalTime) return;
    const existingRegions = Object.values(wavesurferInstance.current.regions.list) as any;
    if (existingRegions.some((r : any) => Math.abs(r.start - position) < 0.05)) return;
    wavesurferInstance.current.addRegion({
      id: 'marker-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      start: position, end: position, color: 'rgba(255, 0, 0, 0.5)', drag: true, resize: false
    });
  };
  const addMarkerAtCurrentTime = () => { if (wavesurferInstance.current && isAudioLoaded) addMarkerAtPosition(wavesurferInstance.current.getCurrentTime()); };
  const clearAllMarkers = (confirmUser = true) => {
    if (!wavesurferInstance.current) return;
    if (confirmUser && !confirm("确定要清除所有分割点吗？")) return;
    wavesurferInstance.current.clearRegions();
    updateSegmentsList();
  };

  const autoSplitAudio = async (silenceThreshold: number, minSilenceDuration: number) => {
    if (!audioBuffer.current) {
      alert('音频数据尚未准备好，请稍后再试');
      return;
    }
    if (hasRegions && !confirm("将清除现有分割点并自动检测，是否继续？")) {
      return;
    }

    clearAllMarkers(false);
    showLoading('正在分析音频特征...');

    try {
      await new Promise(resolve => setTimeout(resolve, 50));

      const thresholdLinear = Math.pow(10, silenceThreshold / 20);
      const sampleRate = audioBuffer.current.sampleRate;
      const minSilenceSamples = Math.floor(minSilenceDuration * sampleRate);
      const channelData = audioBuffer.current.getChannelData(0);
      const bufferLength = channelData.length;
      let inSilence = false;
      let silenceStartSample = 0;
      const splitPoints = [];
      const analysisBlockSize = Math.floor(sampleRate * 0.05);
      let blockMaxAmplitude = 0;

      for (let i = 0; i < bufferLength; i++) {
        blockMaxAmplitude = Math.max(blockMaxAmplitude, Math.abs(channelData[i]));
        if ((i + 1) % analysisBlockSize === 0 || i === bufferLength - 1) {
          const isBlockSilent = blockMaxAmplitude < thresholdLinear;
          const currentBlockStartSample = Math.max(0, i - analysisBlockSize + 1);
          if (isBlockSilent) {
            if (!inSilence) {
              inSilence = true;
              silenceStartSample = currentBlockStartSample;
            }
          } else {
            if (inSilence) {
              const silenceEndSample = currentBlockStartSample;
              const silenceDurationSamples = silenceEndSample - silenceStartSample;
              if (silenceDurationSamples >= minSilenceSamples) {
                const splitSample = silenceStartSample + Math.floor(silenceDurationSamples / 2);
                splitPoints.push(splitSample / sampleRate);
              }
            }
            inSilence = false;
          }
          blockMaxAmplitude = 0;
        }
      }

      splitPoints.forEach(time => addMarkerAtPosition(time));
      setLoadingMessage(`自动检测完成，添加了 ${splitPoints.length} 个分割点`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error('自动分割时出错:', error);
    } finally {
      hideLoading();
    }
  };

  const generateSubtitles = async () => {
    if (!currentAudioFile.current) {
      alert('请先上传音频或视频文件');
      return;
    }

    setIsLoadingSubtitles(true);
    setSubtitles([]);
    setFullTranscript('');
    showLoading('正在生成字幕...');

    try {
      const audioBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(currentAudioFile.current);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      const prompt = `You're a professional audio transcription expert. I'll provide a Base64-encoded audio file. Analyze it carefully and transcribe it into text, marking the start and end time of each sentence. The JSON array MUST include the following keys: "start": Start time (seconds/number), "end": End time (seconds/number), "text": audio text. The audio is approximately ${totalTime} seconds long. Ensure: 1. Timestamps accurately reflect sentence positions. 2. Segments cover the entire audio (0 to end). 3. No overlapping between adjacent segments. 4. Text matches the audio content. 5. Simplified Chinese priority. Ensure the output is ONLY a valid JSON object, starting with { and ending with }. Do not include any explanatory text before or after the JSON.`;
      const messages = [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: audioBase64 } }] }];

      const data = await generate({
        ...apiConfig,
        messages,
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
      const resultText = data.content || data.error || '';
      const parsedResult = JSON.parse(resultText);      
      if (Array.isArray(parsedResult)) {
        setSubtitles(parsedResult.map(seg => ({ ...seg, text: seg.text.trim() })));
        setFullTranscript(resultText);
      } else {
        throw new Error('API返回的JSON格式不符合预期。');
      }
    } catch (error) {
      console.error('生成字幕时出错:', error);
      setSubtitles([]);
      setFullTranscript('');
    } finally {
      setIsLoadingSubtitles(false);
      hideLoading();
    }
  };

  const generateAiSummary = async () => {
    if (fullTranscript.trim() === '') {
      alert('请先生成字幕，AI 摘要将基于字幕内容。');
      return;
    }

    setIsLoadingSummary(true);
    setAiSummaryJson(null);
    showLoading('正在生成 AI 摘要...');

    const prompt = `You are an expert podcast producer. Given the following transcript & language, generate a JSON summary in a podcast format. The JSON object MUST include the following keys: "podcastTitle", "episodeTitle", "overallSummary", "chapters" (array of objects with "start", "end", "title"), "keyTakeaways" (array of strings), "tags" (array of strings). Ensure the output is ONLY a valid JSON object. Transcript: """${fullTranscript}"""`;

    try {
      const messages = [{ "role": "user", "content": prompt }];
      const response = await generate({
        ...apiConfig,
        messages,
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
      const summaryText = response.content || response.error || '';
      const cleanedJson = JSON.parse(summaryText);
      setAiSummaryJson(cleanedJson);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummaryJson(null);
    } finally {
      setIsLoadingSummary(false);
      hideLoading();
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (wavesurferInstance.current) {
        wavesurferInstance.current.destroy();
      }
      if (audioContext.current && audioContext.current.state !== 'closed') {
        audioContext.current.close();
      }
    };
  }, []);

  const copySubtitles = async () => {
    const text = subtitles.map(sub => sub.text).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('字幕已复制到剪贴板');
    } catch (err) {
      console.error('无法复制字幕: ', err);
      alert('复制字幕时出错');
    }
  };

  const splitBySubtitles = () => {
    if (!subtitles || subtitles.length === 0) {
      alert("没有可用的字幕数据，请先生成字幕");
      return;
    }
    if (hasRegions && !confirm("将清除现有分割点并按字幕创建新分割点，是否继续？")) {
      return;
    }
    setShowSegmentsManager(true)
    wavesurferInstance.current.clearRegions();
    subtitles.forEach(subtitle => addMarkerAtPosition(subtitle.start));
    if (subtitles.length > 0) {
      const lastSubtitle = subtitles[subtitles.length - 1];
      if (lastSubtitle.end < totalTime) {
        addMarkerAtPosition(lastSubtitle.end);
      }
    }
    updateSegmentsList();
  };

  const copySummaryToClipboard = () => {
    if (aiSummaryJson) {
      navigator.clipboard.writeText(JSON.stringify(aiSummaryJson, null, 2))
        .then(() => alert('AI 摘要 (JSON) 已复制到剪贴板!'))
        .catch(err => alert('复制失败: ' + err));
    }
  };

  const splitByChapters = () => {
    if (!aiSummaryJson || !aiSummaryJson.chapters || aiSummaryJson.chapters.length === 0) {
      alert("没有可用的章节数据，请先生成AI摘要");
      return;
    }
    if (hasRegions && !confirm("将清除现有分割点并按章节创建新分割点，是否继续？")) {
      return;
    }
    setShowSegmentsManager(true)
    wavesurferInstance.current.clearRegions();
    aiSummaryJson.chapters.forEach(chapter => addMarkerAtPosition(chapter.start));
    if (aiSummaryJson.chapters.length > 0) {
      const lastChapter = aiSummaryJson.chapters[aiSummaryJson.chapters.length - 1];
      if (lastChapter.end < totalTime) {
        addMarkerAtPosition(lastChapter.end);
      }
    }
    updateSegmentsList();
  };

  const seekToSubtitle = (time: number) => {
    if (wavesurferInstance) {
      wavesurferInstance.current.seekTo(time / totalTime);
      wavesurferInstance.current.play();
    }
  };

  // --- Subtitle State ---
  const subtitleInputRef = useRef<any>(null);
  const [subtitleFileInfo, setSubtitleFileInfo] = useState("未选择字幕文件");
  
  const [parseUrl, setParseUrl] = useState("");
  const handleParse = async () => {
    if (!getIsAuthed()) { return alert('请先登录'); }
    setIsLoading(true);
    showLoading('正在解析音频...');
    
    const response = await fetch(parseUrl);
    try {
      const blob = await response.blob();
      const fileName = parseUrl.split('/').pop() || 'audio.mp3';
      const file = new File([blob], fileName, { type: blob.type });
      
      processFile(file);
    } catch (error) {
      console.error('解析音频时出错:', error);
    } finally {
      setIsLoading(false);
      hideLoading();
    }
  };

  // --- Subtitle Handling Functions ---
  const handleSubtitleUpload = (event: any) => {
    const file = event.target.files[0];
    if (file) processSubtitleFile(file);
  };

  const processSubtitleFile = (file: File) => {
    if (!file.name.endsWith('.srt') && !file.name.endsWith('.vtt')) {
      alert('请选择有效的字幕文件 (.srt 或 .vtt)');
      return;
    }
    
    setSubtitleFileInfo(`已选择: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        try {
          const parsedSubtitles = parseSubtitleContent(content, file.name.endsWith('.vtt'));
          setSubtitles(parsedSubtitles);
        } catch (error) {
          console.error('解析字幕文件时出错:', error);
          alert('字幕文件解析失败，请确保文件格式正确');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && wavesurferInstance.current && !wavesurferInstance.current.isPlaying()) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      wavesurferInstance.current.seekTo(time / totalTime);
    }
  };

  const handleVideoPlay = () => {
    if (wavesurferInstance.current && !wavesurferInstance.current.isPlaying()) {
      wavesurferInstance.current.play();
    }
  };

  const handleVideoPause = () => {
    if (wavesurferInstance.current && wavesurferInstance.current.isPlaying()) {
      wavesurferInstance.current.pause();
    }
  };

  // 视频截图功能
  const captureScreenshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setScreenshotUrl(url);
            
            // 自动下载截图
            const a = document.createElement('a');
            a.href = url;
            a.download = `${originalFileName || 'screenshot'}-${formatTime(currentTime)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 清理URL对象
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        }, 'image/png');
      }
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('timeupdate', handleVideoTimeUpdate);
      video.addEventListener('play', handleVideoPlay);
      video.addEventListener('pause', handleVideoPause);
      
      return () => {
        video.removeEventListener('timeupdate', handleVideoTimeUpdate);
        video.removeEventListener('play', handleVideoPlay);
        video.removeEventListener('pause', handleVideoPause);
      };
    }
  }, [totalTime]);

  return (
    <>
      <FeatureLayout
        title="媒体摘要工具"
        subtitle="支持视音频文件，快速生成摘要、提取关键信息和剪切"
      >
        {isLoading && (
          <div id="loading-overlay">
            <div className="text-center">
              <div className="loader mx-auto mb-4"></div>
              <p className="text-white text-lg">{loadingMessage}</p>
            </div>
          </div>
        )}

        <div className="container mx-auto">
          {/* 1. Upload */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center justify-between">
              1. 上传文件 
              <a href='https://greenvideo.cc/' target='_blank' className='text-sm text-blue-500 hover:underline'>在线解析</a>
            </h2>
            <div className="flex flex-col items-center gap-3">
              <label className="w-full cursor-pointer">
                <div
                  className={`w-full p-5 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 hover:bg-blue-50 transition-colors ${isDraggingOver ? 'bg-blue-100 border-blue-400' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <FaCloudUploadAlt className="text-5xl text-gray-400 mx-auto" />
                  <p className="my-2">支持主流视音频格式，如mp3、mp4等</p>
                  {fileInfo && <p className="text-sm text-gray-500">{fileInfo}</p>}
                  <input type="file" id="audio-input" accept="audio/*,video/*" className="hidden" onChange={handleFileUpload} ref={audioInputRef} />
                </div>
              </label>

              <div className='w-full flex flex-col md:flex-row gap-4 mb-4'>
                <input type="text" className='flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500' value={parseUrl} onChange={(e) => setParseUrl(e.target.value)} placeholder="请输入视音频URL" />
                <button className='py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-80' onClick={handleParse} disabled={isLoading || !parseUrl}>
                  {isLoading ? '解析中...' : '立即解析'}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Waveform & Subtitles */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
              2. 音频波形与字幕
              <span className="text-sm text-gray-500 cursor-pointer" onClick={() => isAudioLoaded && subtitleInputRef.current?.click()}>
                {subtitleInputRef.current?.value ? subtitleFileInfo : '上传字幕文件'}
              </span>
              <input 
                type="file" 
                accept=".srt,.vtt" 
                onChange={handleSubtitleUpload} 
                ref={subtitleInputRef} 
                className='hidden'
              />
            </h2>

            {isAudioLoaded && (
              <div className="mb-4">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <button onClick={addMarkerAtCurrentTime} className="w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center" disabled={!isAudioLoaded}>
                      <FaPlusCircle className="h-5 w-5 mr-1" />
                      在当前位置添加分割点
                    </button>
                  </div>
                  <div className="flex-1">
                    <button onClick={() => clearAllMarkers(true)} className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center" disabled={!isAudioLoaded || !hasRegions}>
                      <FaTrash className="h-5 w-5 mr-1" />
                      清除所有分割点
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isVideoMode && (
              <div className="mb-4 relative">
                <video 
                  ref={videoRef}
                  className="w-full max-h-64 rounded-lg border border-gray-300"
                  controls
                  muted
                />

                <div className="absolute top-3 right-3">
                  <button 
                    onClick={captureScreenshot}
                    className="bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all cursor-pointer"
                    title="截图"
                  >
                    <FaCamera className="h-5 w-5 text-blue-500" />
                  </button>
                </div>
              </div>
            )}

            <div id="waveform" ref={waveformRef} className="w-full h-32 bg-gray-100 mb-2 rounded"></div>
            <div id="timeline" ref={timelineRef} className="w-full h-6 bg-gray-50 rounded mb-4"></div>

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-4">
                <button onClick={playPause} className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center" disabled={!isAudioLoaded}>
                  {isPlaying ? <FaPauseCircle className="h-5 w-5 mr-1" /> : <FaPlayCircle className="h-5 w-5 mr-1" />}
                  {isPlaying ? '暂停' : '播放'}
                </button>
                <button onClick={zoomIn} className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition duration-200" disabled={!isAudioLoaded}>放大</button>
                <button onClick={zoomOut} className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition duration-200" disabled={!isAudioLoaded}>缩小</button>
              </div>
              <div>
                <span className="text-gray-600">{formattedCurrentTime}</span>&nbsp;/&nbsp;
                <span className="text-gray-600">{formattedTotalTime}</span>
              </div>
            </div>

            {isAudioLoaded && (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={generateSubtitles} className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isAudioLoaded || isLoadingSubtitles || !apiConfig.apiUrl || !apiConfig.apiKey}>
                  <FaMicrophone className="h-5 w-5 mr-1" />
                  {isLoadingSubtitles ? '字幕生成中...' : '生成字幕'}
                </button>
                <button onClick={generateAiSummary} className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={subtitles.length === 0 || isLoadingSummary || !apiConfig.apiUrl || !apiConfig.apiKey}>
                  <FaBook className="h-5 w-5 mr-1" />
                  {isLoadingSummary ? '摘要生成中...' : '摘要信息'}
                </button>
              </div>
            )}
            {isAudioLoaded && (!apiConfig.apiUrl || !apiConfig.apiKey) && (
              <p className="text-xs text-red-500 text-center mt-1">请先在上方设置 API URL 和 Key 以启用此功能。</p>
            )}
            {/* Subtitle Display Area */}
            {subtitles.length > 0 && (
              <div className="mt-4 mb-4 p-3 bg-gray-50 rounded-md max-h-60 overflow-y-auto border border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-semibold text-gray-700 mb-2">字幕信息 (点击跳转)</h3>
                  <div>
                    <span className="text-sm cursor-pointer mr-2" onClick={copySubtitles}>复制</span>
                    <span className="text-sm text-yellow-500 cursor-pointer" onClick={splitBySubtitles}>自动分割</span>
                  </div>
                </div>
                {subtitles.map((sub, index) => (
                  <div key={index}
                    className={`subtitle-item ${sub.start <= currentTime && sub.end > currentTime ? 'active' : ''}`}
                    onClick={() => seekToSubtitle(sub.start)}>
                    <span className="font-mono text-sm text-blue-600">[{formatTime(sub.start)} - {formatTime(sub.end)}]</span>
                    <span className="ml-2 text-gray-800">{sub.text}</span>
                  </div>
                ))}
              </div>
            )}
      
            {/* AI Summary Section */}
            {aiSummaryJson && (
              <div className="mt-4 mb-4">
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="text-md font-semibold text-gray-700 mb-2">摘要结果</h3>
                  {aiSummaryJson.podcastTitle ? (
                    <div className="mb-4">
                      <div className="mb-3 bg-white p-3 rounded-md border border-gray-200">
                        <h4 className="text-lg font-bold text-purple-700">{aiSummaryJson.podcastTitle}</h4>
                        <h5 className="text-md font-semibold text-gray-800 mt-1">{aiSummaryJson.episodeTitle}</h5>
                        <p className="text-sm text-gray-600 mt-2">{aiSummaryJson.overallSummary}</p>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-md font-semibold text-gray-700 mb-2">章节信息:</h3>
                          <span className="text-sm text-yellow-500 cursor-pointer" onClick={splitByChapters}>自动分割</span>
                        </div>
                        {aiSummaryJson.chapters?.map((chapter, index) => (
                          <div key={index} className="flex mb-2 bg-white p-2 rounded border border-gray-200">
                            <span className="font-mono text-sm text-blue-600">[{formatTime(chapter.start)} - {formatTime(chapter.end)}]</span>
                            <span className="ml-2 text-sm font-medium">{chapter.title}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-700 mb-2">关键要点:</h4>
                        <ul className="list-disc pl-5">
                          {aiSummaryJson.keyTakeaways?.map((point, index) => <li key={index} className="text-sm mb-1">{point}</li>)}
                        </ul>
                      </div>
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-700 mb-2">标签:</h4>
                        <div className="flex flex-wrap gap-2">
                          {aiSummaryJson.tags?.map((tag, index) => <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">#{tag}</span>)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-red-500">{aiSummaryJson.error || "摘要格式无效"}</p>
                  )}
                  <div className="mt-3">
                    <button onClick={() => setShowJsonView(!showJsonView)} className="text-sm text-blue-600 hover:text-blue-800 mb-2 flex items-center">
                      {showJsonView ? <FaChevronDown className="h-4 w-4 mr-1" /> : <FaChevronRight className="h-4 w-4 mr-1" />}
                      {showJsonView ? '隐藏JSON格式' : '显示JSON格式'}
                    </button>
                    {showJsonView && <pre className="text-sm whitespace-pre-wrap break-all overflow-x-auto max-h-96 bg-gray-100 p-2 rounded">{JSON.stringify(aiSummaryJson, null, 2)}</pre>}
                    <button onClick={copySummaryToClipboard} className="mt-3 py-1 px-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md transition duration-200">复制 JSON</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isAudioLoaded && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex items-center justify-between cursor-pointer" onClick={() => setShowSegmentsManager(!showSegmentsManager)}>
              <h2 className="text-xl font-semibold">剪切 & 导出</h2>
              <span>{ showSegmentsManager ? '隐藏' : '显示' }</span>
            </div>
          )}

          {/* 4. Segments List & AI Summary */}
          {isAudioLoaded && showSegmentsManager && (
              <SegmentsManager
                segments={segments}
                setSegments={setSegments}
                wavesurferInstance={wavesurferInstance.current}
                audioBuffer={audioBuffer.current}
                originalFileName={originalFileName}
                isAudioLoaded={isAudioLoaded}
                batchRenameText={batchRenameText}
                setBatchRenameText={setBatchRenameText}
                showLoading={showLoading}
                hideLoading={hideLoading}
                updateSegmentsList={updateSegmentsList}
                autoSplitAudio={autoSplitAudio}
              />
            )}
        </div>
      </FeatureLayout>

      {/* --- External Scripts Loading --- */}
      <Script src="https://cdn.jsdelivr.net/npm/wavesurfer.js@6.6.4/dist/wavesurfer.min.js" onReady={() => setScriptsLoaded(true)} />
      {scriptsLoaded && (
        <>
          <Script src="https://cdn.jsdelivr.net/npm/wavesurfer.js@6.6.4/dist/plugin/wavesurfer.regions.min.js" />
          <Script src="https://cdn.jsdelivr.net/npm/wavesurfer.js@6.6.4/dist/plugin/wavesurfer.timeline.min.js" />
          <Script src="https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js" />
          <Script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js" />
          <Script src="https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js" />
        </>
      )}
    </>
  );
}