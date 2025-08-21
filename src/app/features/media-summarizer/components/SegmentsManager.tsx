'use client';

import { useState } from 'react';
import { FaPlay, FaDownload, FaFileArchive, FaCheck, FaTrash, FaLink, FaMagic } from 'react-icons/fa';
import { Segment } from '../types';

// Helper function to format time
const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return "0:00";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface SegmentsManagerProps {
  segments: Segment[];
  setSegments: (segments: Segment[]) => void;
  wavesurferInstance: any;
  audioBuffer: any;
  originalFileName: string;
  isAudioLoaded: boolean;
  batchRenameText: string;
  setBatchRenameText: (text: string) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  updateSegmentsList: () => void;
  autoSplitAudio: (silenceThreshold: number, minSilenceDuration: number) => void;
}

export default function SegmentsManager({
  segments,
  setSegments,
  wavesurferInstance,
  audioBuffer,
  originalFileName,
  isAudioLoaded,
  batchRenameText,
  setBatchRenameText,
  showLoading,
  hideLoading,
  updateSegmentsList,
  autoSplitAudio
}: SegmentsManagerProps) {
  // --- State Management ---
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [selectAllSegments, setSelectAllSegments] = useState(false);
  const [silenceThreshold, setSilenceThreshold] = useState(-40);
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.5);

  // --- Segment Operations ---
  const previewSegment = (start: number, end: number) => { 
    if (wavesurferInstance) wavesurferInstance.play(start, end); 
  };

  const bufferToMp3 = (buffer: any, bitrate = 128) => {
    if (typeof window.lamejs === 'undefined') {
      console.error("lamejs library not loaded!");
      throw new Error("MP3 编码库未加载");
    }
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const mp3encoder = new window.lamejs.Mp3Encoder(channels, sampleRate, bitrate);
    const mp3Data = [];
    const sampleBlockSize = 1152;

    const processChannel = (channelData : any) => {
      const samples = channelData;
      const samplesInt16 = new Int16Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        samplesInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return samplesInt16;
    };

    if (channels === 1) {
      const samplesInt16 = processChannel(buffer.getChannelData(0));
      for (let i = 0; i < samplesInt16.length; i += sampleBlockSize) {
        const sampleChunk = samplesInt16.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }
    } else {
      const left = processChannel(buffer.getChannelData(0));
      const right = processChannel(buffer.getChannelData(1));
      for (let i = 0; i < left.length; i += sampleBlockSize) {
        const leftChunk = left.subarray(i, i + sampleBlockSize);
        const rightChunk = right.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }
    }

    const endMp3buf = mp3encoder.flush();
    if (endMp3buf.length > 0) mp3Data.push(endMp3buf);

    const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
    const mp3Array = new Uint8Array(totalLength);
    let offset = 0;
    mp3Data.forEach(buf => {
      mp3Array.set(buf, offset);
      offset += buf.length;
    });

    return new Blob([mp3Array], { type: 'audio/mp3' });
  };

  const exportSegment = async (segment: Segment) => {
    if (!audioBuffer) {
      alert('音频数据尚未准备好，请稍后再试');
      return;
    }
    showLoading(`正在导出: ${segment.name}...`);

    try {
      const start = segment.start;
      const end = segment.end;
      const name = segment.name || `片段_${segment.id}`;
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(start * sampleRate);
      const endSample = Math.floor(end * sampleRate);
      const frameCount = Math.max(1, endSample - startSample);

      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        frameCount,
        sampleRate
      );
      const newSource = offlineCtx.createBufferSource();
      newSource.buffer = audioBuffer;
      newSource.connect(offlineCtx.destination);
      newSource.start(0, start, end - start);

      const renderedBuffer = await offlineCtx.startRendering();
      const mp3Blob = bufferToMp3(renderedBuffer);
      const safeName = name.replace(/[\/\\?%*:|"<>]/g, '_');
      const fileName = `${safeName}.mp3`;

      window.saveAs(mp3Blob, fileName);
    } catch (error) {
      console.error('导出片段时出错:', error);
    } finally {
      hideLoading();
    }
  };

  const exportAllSegments = async () => {
    if (!audioBuffer || segments.length === 0) {
      alert('没有可导出的音频片段');
      return;
    }
    showLoading(`准备导出 ${segments.length} 个片段... (0%)`);

    try {
      const zip = new window.JSZip();
      const totalCount = segments.length;

      for (let i = 0; i < totalCount; i++) {
        const segment = segments[i];
        const progress = Math.round(((i + 1) / totalCount) * 100);
        showLoading(`正在处理: ${segment.name} (${i + 1}/${totalCount}) - ${progress}%`);

        const start = segment.start;
        const end = segment.end;
        const name = segment.name || `片段_${segment.id}`;
        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor(start * sampleRate);
        const endSample = Math.floor(end * sampleRate);
        const frameCount = Math.max(1, endSample - startSample);

        const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, frameCount, sampleRate);
        const newSource = offlineCtx.createBufferSource();
        newSource.buffer = audioBuffer;
        newSource.connect(offlineCtx.destination);
        newSource.start(0, start, end - start);
        const renderedBuffer = await offlineCtx.startRendering();

        const mp3Blob = bufferToMp3(renderedBuffer);
        const safeName = name.replace(/[\/\\?%*:|"<>]/g, '_');
        const fileName = `${safeName}.mp3`;
        zip.file(fileName, mp3Blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `${originalFileName || '音频片段'}_分割.zip`;
      window.saveAs(zipBlob, zipFileName);

      hideLoading();
      alert('所有片段已成功导出为ZIP文件');
    } catch (error) {
      console.error('批量导出片段时出错:', error);
      hideLoading();
    }
  };

  const applyBatchRename = () => {
    const lines = batchRenameText.trim().split('\n');
    if (lines.length === 0 || (lines.length === 1 && !lines[0])) {
      alert('请输入至少一个名称');
      return;
    }

    const newNames = lines.flatMap(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return [];
      if (trimmedLine.includes('/') && trimmedLine.split(' ').length > 1) {
        const parts = trimmedLine.split(' ');
        const speaker = parts[0];
        const rest = parts.slice(1).join(' ');
        if (rest.includes('/')) {
          const subParts = rest.split('/');
          return subParts.map((sub, i) => `${speaker} ${sub.trim()}_${i}`);
        }
      }
      return trimmedLine;
    });

    let appliedCount = 0;
    const updatedSegments = segments.map((segment, index) => {
      if (index < newNames.length && newNames[index]) {
        appliedCount++;
        return { ...segment, name: newNames[index] };
      }
      return segment;
    });
    setSegments(updatedSegments);
    alert(`已应用 ${appliedCount} 个名称`);
  };

  const toggleSelectAll = () => {
    const newSelectAll = !selectAllSegments;
    setSelectAllSegments(newSelectAll);
    if (newSelectAll) {
      setSelectedSegmentIds(segments.map(s => s.id));
    } else {
      setSelectedSegmentIds([]);
    }
  };

  const deleteSelectedSegments = () => {
    if (selectedSegmentIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedSegmentIds.length} 个片段吗？\n这将移除相应的分割点。`)) {
      return;
    }

    const regionsToRemove: Set<any> = new Set();
    const selectedSegmentsData = segments.filter(s => selectedSegmentIds.includes(s.id));

    selectedSegmentsData.forEach(segment => {
      const endRegion = Object.values(wavesurferInstance.regions.list)
        .find((r: any) => Math.abs(r.start - segment.end) < 0.01) as any;
      if (endRegion) {
        regionsToRemove.add(endRegion.id);
      }
    });

    regionsToRemove.forEach((regionId: any) => {
      wavesurferInstance.regions.list[regionId]?.remove();
    });

    setSelectedSegmentIds([]);
    setSelectAllSegments(false);
    updateSegmentsList();
  };

  const mergeSelectedSegments = () => {
    if (selectedSegmentIds.length < 2) {
      alert('请至少选择两个连续的片段进行合并');
      return;
    }

    const segmentsToMerge = segments
      .filter(s => selectedSegmentIds.includes(s.id))
      .sort((a, b) => a.start - b.start);

    let isConsecutive = true;
    for (let i = 0; i < segmentsToMerge.length - 1; i++) {
      if (Math.abs(segmentsToMerge[i].end - segmentsToMerge[i + 1].start) > 0.01) {
        isConsecutive = false;
        break;
      }
    }

    if (!isConsecutive) {
      alert('选中的片段必须是连续的才能合并');
      return;
    }
    if (!confirm(`确定要合并选中的 ${segmentsToMerge.length} 个连续片段吗？\n这将移除它们之间的分割点。`)) {
      return;
    }

    const regionsToRemove = new Set();
    for (let i = 0; i < segmentsToMerge.length - 1; i++) {
      const segmentEnd = segmentsToMerge[i].end;
      const region = Object.values(wavesurferInstance.regions.list)
        .find((r: any) => Math.abs(r.start - segmentEnd) < 0.01) as any;
      if (region) {
        regionsToRemove.add(region.id);
      }
    }

    regionsToRemove.forEach((regionId: any) => {
      wavesurferInstance.regions.list[regionId]?.remove();
    });

    setSelectedSegmentIds([]);
    setSelectAllSegments(false);
  };

  const validateSegmentName = (segmentId: string, newName: string) => {
    const updatedSegments = segments.map(s => {
      if (s.id === segmentId) {
        if (!newName.trim()) {
          const index = segments.findIndex(seg => seg.id === segmentId);
          alert("片段名称不能为空。已重置为默认名称。");
          return { ...s, name: `片段 ${index + 1}` };
        }
        return { ...s, name: newName };
      }
      return s;
    });
    setSegments(updatedSegments);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    //@ts-ignore
    setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, name: newName } : s));
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">3. 分割控制</h2>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-medium mb-3">自动分割</h3>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="silence-threshold" className="font-medium text-gray-700">静音阈值:</label>
              <span>{silenceThreshold} dB</span>
            </div>
            <input type="range" id="silence-threshold" min="-60" max="-20" value={silenceThreshold} onChange={(e) => setSilenceThreshold(Number(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer sensitivity-slider" />
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="min-silence-duration" className="font-medium text-gray-700">最小静音持续时间:</label>
              <span>{minSilenceDuration} 秒</span>
            </div>
            <input type="range" id="min-silence-duration" min="0.2" max="2" step="0.1" value={minSilenceDuration} onChange={(e) => setMinSilenceDuration(Number(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer sensitivity-slider" />
          </div>
          <button onClick={() => autoSplitAudio(silenceThreshold, minSilenceDuration)} className="w-full py-2 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center" disabled={!isAudioLoaded}>
            <FaMagic className="h-5 w-5 mr-1" />
            自动检测分割点
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          4. 分割片段列表
        </h2>

        <div className='sticky'>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <input type="checkbox" id="select-all-segments" className="mr-2" checked={selectAllSegments} onChange={toggleSelectAll} />
                <label htmlFor="select-all-segments" className="text-gray-700">全选</label>
              </div>
              <div className="flex">
                <button onClick={deleteSelectedSegments} disabled={selectedSegmentIds.length === 0} className="py-1 px-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
                  <FaTrash className="h-4 w-4 mr-1" />
                  删除片段
                </button>
                <button onClick={mergeSelectedSegments} disabled={selectedSegmentIds.length < 2} className="py-1 px-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition duration-200 flex items-center ml-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <FaLink className="h-4 w-4 mr-1" />
                  合并片段
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b border-gray-300">
                <th className="py-2 px-4 text-center w-16">选择</th>
                <th className="py-2 px-4 text-left w-16">序号</th>
                <th className="py-2 px-4 text-left">名称</th>
                <th className="py-2 px-4 text-left w-24">开始</th>
                <th className="py-2 px-4 text-left w-24">结束</th>
                <th className="py-2 px-4 text-left w-20">时长</th>
                <th className="py-2 px-4 text-center w-48">操作</th>
              </tr>
            </thead>
            <tbody>
              {segments.length === 0 ? (
                <tr>
                  <td className="py-4 text-center text-gray-500">未检测到分割片段</td>
                </tr>
              ) : (
                segments.map((segment, index) => (
                  <tr key={segment.id} className="segment-row hover:bg-gray-50 border-b border-gray-300">
                    <td className="py-3 px-4 text-center">
                      <input type="checkbox" value={segment.id} checked={selectedSegmentIds.includes(segment.id)} onChange={(e) => {
                        const id = e.target.value;
                        setSelectedSegmentIds(prev => e.target.checked ? [...prev, id] : prev.filter(sid => sid !== id));
                      }} />
                    </td>
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4">
                      <input type="text" value={segment.name} onChange={onChange} onBlur={(e) => validateSegmentName(segment.id, e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400" />
                    </td>
                    <td className="py-3 px-4">{formatTime(segment.start)}</td>
                    <td className="py-3 px-4">{formatTime(segment.end)}</td>
                    <td className="py-3 px-4">{segment.duration.toFixed(1)}s</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => previewSegment(segment.start, segment.end)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-sm flex items-center" title="预览">
                          <FaPlay className="h-4 w-4 mr-1" /> 预览
                        </button>
                        <button onClick={() => exportSegment(segment)} className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded text-sm flex items-center" title="导出">
                          <FaDownload className="h-4 w-4 mr-1" /> 导出
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Batch Rename */}
        <h2 className="text-xl font-semibold mb-4 mt-6">5. 批量重命名 <span className="text-sm text-yellow-500">（检查格式）</span></h2>
        <div className="mb-4">
          <textarea value={batchRenameText} onChange={(e) => setBatchRenameText(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-blue-500" rows={5} placeholder="请输入新的名称列表，每行一个名称，将按顺序应用到分割片段"></textarea>
          <div className="mt-2 text-sm text-gray-500">提示：输入的行数应与分割片段数量相同，否则多余的行将被忽略，不足的片段将保持原名称。</div>
          <div className="mt-3 flex justify-end">
            <button onClick={applyBatchRename} className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-200 flex items-center" disabled={segments.length === 0 || !batchRenameText.trim()}>
              <FaCheck className="h-5 w-5 mr-1" />
              批量重命名
            </button>
          </div>
        </div>

        {/* Export All */}
        <div className="mt-6 flex justify-center">
          <button onClick={exportAllSegments} className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition duration-200 flex items-center" disabled={!isAudioLoaded || segments.length === 0}>
            <FaFileArchive className="h-6 w-6 mr-2" />
            批量导出所有分割片段
          </button>
        </div>
      </div>
    </>
  );
}