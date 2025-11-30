import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import { VideoSegment } from '../types';
import { TTSFactory } from './tts';

export class VideoService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(config.storage.uploadDir, 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private async downloadImage(url: string, outputPath: string): Promise<void> {
    logger.debug('Downloading image', { url, outputPath });
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, response.data);
  }

  private async createVideoSegment(
    imagePath: string,
    audioPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug('Creating video segment', { imagePath, audioPath, outputPath });

      ffmpeg()
        .input(imagePath)
        .loop(1) // Loop the image
        .input(audioPath)
        .outputOptions([
          '-c:v libx264',
          '-tune stillimage',
          '-c:a aac',
          '-b:a 192k',
          '-pix_fmt yuv420p',
          '-shortest', // End when audio ends
          '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2', // Scale and pad to 1920x1080
        ])
        .output(outputPath)
        .on('start', (cmd) => logger.debug('FFmpeg command:', cmd))
        .on('end', () => {
          logger.debug('Video segment created successfully', { outputPath });
          resolve();
        })
        .on('error', (err) => {
          logger.error('Error creating video segment', { error: err.message });
          reject(err);
        })
        .run();
    });
  }

  private async mergeVideoSegments(
    segmentPaths: string[],
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug('Merging video segments', { count: segmentPaths.length, outputPath });

      // Create concat file
      const concatFilePath = path.join(this.tempDir, `concat_${uuidv4()}.txt`);
      const concatContent = segmentPaths
        .map((p) => `file '${path.resolve(p)}'`)
        .join('\n');
      fs.writeFileSync(concatFilePath, concatContent);

      ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .output(outputPath)
        .on('start', (cmd) => logger.debug('FFmpeg merge command:', cmd))
        .on('end', () => {
          logger.debug('Video segments merged successfully', { outputPath });
          fs.unlinkSync(concatFilePath);
          resolve();
        })
        .on('error', (err) => {
          logger.error('Error merging video segments', { error: err.message });
          if (fs.existsSync(concatFilePath)) {
            fs.unlinkSync(concatFilePath);
          }
          reject(err);
        })
        .run();
    });
  }

  async generateVideo(
    segments: VideoSegment[],
    ttsProvider: 'openai' | 'openrouter' | 'kokoro',
    jobId: string
  ): Promise<string> {
    const jobTempDir = path.join(this.tempDir, jobId);
    if (!fs.existsSync(jobTempDir)) {
      fs.mkdirSync(jobTempDir, { recursive: true });
    }

    const videoSegmentPaths: string[] = [];

    try {
      // Process each segment
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        logger.info(`Processing segment ${i + 1}/${segments.length}`, { jobId });

        // Download image
        const imagePath = path.join(jobTempDir, `image_${i}.jpg`);
        await this.downloadImage(segment.imageUrl, imagePath);

        // Generate audio
        const audioBuffer = await TTSFactory.generateSpeech(segment.script, ttsProvider);
        const audioPath = path.join(jobTempDir, `audio_${i}.mp3`);
        fs.writeFileSync(audioPath, audioBuffer);

        // Create video segment
        const videoSegmentPath = path.join(jobTempDir, `segment_${i}.mp4`);
        await this.createVideoSegment(imagePath, audioPath, videoSegmentPath);
        videoSegmentPaths.push(videoSegmentPath);
      }

      // Merge all segments
      const finalVideoPath = path.join(
        config.storage.outputDir,
        `${jobId}.mp4`
      );
      await this.mergeVideoSegments(videoSegmentPaths, finalVideoPath);

      // Clean up temp files
      this.cleanupTempDir(jobTempDir);

      logger.info('Video generation complete', { jobId, outputPath: finalVideoPath });
      return finalVideoPath;
    } catch (error) {
      // Clean up on error
      this.cleanupTempDir(jobTempDir);
      throw error;
    }
  }

  private cleanupTempDir(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        logger.debug('Cleaned up temp directory', { dirPath });
      }
    } catch (error) {
      logger.error('Error cleaning up temp directory', { dirPath, error });
    }
  }

  getVideoPath(jobId: string): string {
    return path.join(config.storage.outputDir, `${jobId}.mp4`);
  }

  videoExists(jobId: string): boolean {
    return fs.existsSync(this.getVideoPath(jobId));
  }
}
