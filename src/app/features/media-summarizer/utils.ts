import { Subtitle } from './types';

/**
 * 从视频文件中提取音频，并将其作为 WAV 文件返回。
 * 此版本使用 decodeAudioData API，是最高效和可靠的方法。
 */
export const extractAudioFromVideo = async (videoFile: File): Promise<File> => {
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    throw new Error('浏览器不支持 Web Audio API');
  }

  let audioContext: AudioContext | null = null;

  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const arrayBuffer = await videoFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const wavBlob = audioBufferToWav(audioBuffer);
    const audioFileName = `${videoFile.name.split('.').slice(0, -1).join('.') || 'extracted_audio'}.wav`;
    const audioFile = new File([wavBlob], audioFileName, { type: 'audio/wav' });

    return audioFile;
  } catch (error) {
    console.error('音频提取过程中发生错误:', error);
    if (error instanceof DOMException) {
      throw new Error(`无法解码音频数据，文件可能已损坏、无音轨或格式不受支持: ${error.message}`);
    }
    throw error;
  } finally {
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close();
    }
  }
};

/**
 * 将 AudioBuffer 对象编码为 WAV 格式的 Blob。
 */
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bufferLength = length * numOfChan * 2 + 44;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  let pos = 0;

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos++, str.charCodeAt(i));
    }
  };

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  writeString('RIFF');
  setUint32(bufferLength - 8);
  writeString('WAVE');

  writeString('fmt ');
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * numOfChan * 2);
  setUint16(numOfChan * 2);
  setUint16(16);

  writeString('data');
  setUint32(length * numOfChan * 2);

  const channels = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  for (let i = 0; i < length; i++) {
    for (let j = 0; j < numOfChan; j++) {
      const sample = Math.max(-1, Math.min(1, channels[j][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, intSample, true);
      pos += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

export const parseSubtitleContent = (content: string, isVtt: boolean): Subtitle[] => {
  if (isVtt) {
    return parseVttContent(content);
  } else {
    return parseSrtContent(content);
  }
};

const parseVttContent = (content: string): Subtitle[] => {
  const lines = content.split(/\r?\n/);
  const subtitles: Subtitle[] = [];
  let i = 0;

  // Skip WEBVTT header
  while (i < lines.length && lines[i].trim() !== '') {
    i++;
  }
  i++; // Skip empty line after header

  while (i < lines.length) {
    // Skip empty lines
    while (i < lines.length && lines[i].trim() === '') {
      i++;
    }

    if (i >= lines.length) break;

    // Skip cue index
    if (/^\d+$/.test(lines[i])) {
      i++;
    }

    if (i >= lines.length) break;

    // Parse time
    const timeLine = lines[i];
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (!timeMatch) {
      i++;
      continue;
    }

    const startTime = parseTime(timeMatch[1]);
    const endTime = parseTime(timeMatch[2]);

    i++;

    // Parse text
    let text = '';
    while (i < lines.length && lines[i].trim() !== '') {
      if (text) text += ' ';
      text += lines[i].trim();
      i++;
    }

    if (text) {
      subtitles.push({
        start: startTime,
        end: endTime,
        text: text
      });
    }
  }

  return subtitles;
};

const parseSrtContent = (content: string): Subtitle[] => {
  const blocks = content.split(/\r?\n\r?\n/);
  const subtitles: Subtitle[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 3) continue;

    // Skip index line
    const timeLine = lines[1];
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch) continue;

    const startTime = parseTime(timeMatch[1].replace(',', '.'));
    const endTime = parseTime(timeMatch[2].replace(',', '.'));

    // Parse text
    const textLines = lines.slice(2);
    const text = textLines.join(' ').trim();

    if (text) {
      subtitles.push({
        start: startTime,
        end: endTime,
        text: text
      });
    }
  }

  return subtitles;
};

const parseTime = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
};

// Helper function to format time
export const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return "0:00";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};