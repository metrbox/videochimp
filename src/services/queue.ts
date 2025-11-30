import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import { VideoSegment, JobData } from '../types';
import { VideoService } from './video';

interface VideoJobData {
  jobId: string;
  segments: VideoSegment[];
  ttsProvider: 'openai' | 'openrouter' | 'kokoro';
}

export class VideoQueue {
  private queue: Queue<VideoJobData>;
  private worker: Worker<VideoJobData>;
  private connection: Redis;
  private videoService: VideoService;
  private jobs: Map<string, JobData> = new Map();

  constructor() {
    this.connection = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue<VideoJobData>('video-generation', {
      connection: this.connection,
    });

    this.videoService = new VideoService();

    this.worker = new Worker<VideoJobData>(
      'video-generation',
      async (job: Job<VideoJobData>) => {
        return this.processVideoJob(job);
      },
      {
        connection: this.connection.duplicate(),
        concurrency: 2, // Process 2 videos at a time
      }
    );

    this.setupWorkerListeners();
  }

  private setupWorkerListeners(): void {
    this.worker.on('completed', (job) => {
      logger.info('Job completed', { jobId: job.data.jobId });
      const jobData = this.jobs.get(job.data.jobId);
      if (jobData) {
        jobData.status = 'complete';
        jobData.updatedAt = new Date();
      }
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Job failed', { jobId: job?.data.jobId, error: err.message });
      if (job) {
        const jobData = this.jobs.get(job.data.jobId);
        if (jobData) {
          jobData.status = 'failed';
          jobData.error = err.message;
          jobData.updatedAt = new Date();
        }
      }
    });

    this.worker.on('error', (err) => {
      logger.error('Worker error', { error: err.message });
    });
  }

  private async processVideoJob(job: Job<VideoJobData>): Promise<void> {
    const { jobId, segments, ttsProvider } = job.data;
    logger.info('Processing video job', { jobId, segmentCount: segments.length });

    const jobData = this.jobs.get(jobId);
    if (jobData) {
      jobData.status = 'processing';
      jobData.updatedAt = new Date();
    }

    try {
      const videoPath = await this.videoService.generateVideo(
        segments,
        ttsProvider,
        jobId
      );

      if (jobData) {
        jobData.videoUrl = `/api/videos/download/${jobId}`;
        jobData.updatedAt = new Date();
      }

      logger.info('Video generated successfully', { jobId, videoPath });
    } catch (error) {
      logger.error('Video generation failed', { jobId, error });
      throw error;
    }
  }

  async addJob(
    segments: VideoSegment[],
    ttsProvider: 'openai' | 'openrouter' | 'kokoro'
  ): Promise<string> {
    const jobId = uuidv4();

    // Store job metadata
    const jobData: JobData = {
      id: jobId,
      segments,
      ttsProvider,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(jobId, jobData);

    // Add to queue
    await this.queue.add(
      'generate-video',
      {
        jobId,
        segments,
        ttsProvider,
      },
      {
        jobId,
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    logger.info('Job added to queue', { jobId, segmentCount: segments.length });
    return jobId;
  }

  getJob(jobId: string): JobData | undefined {
    return this.jobs.get(jobId);
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.connection.quit();
  }
}

// Export singleton instance
export const videoQueue = new VideoQueue();
