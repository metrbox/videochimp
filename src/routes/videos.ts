import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { videoQueue } from '../services/queue';
import { VideoGenerationRequest } from '../types';
import config from '../config';
import logger from '../utils/logger';

const router = express.Router();

/**
 * POST /api/videos/generate
 * Generate a video from segments
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { segments, ttsProvider }: VideoGenerationRequest = req.body;

    // Validation
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: segments array is required and must not be empty',
      });
    }

    for (const segment of segments) {
      if (!segment.imageUrl || !segment.script) {
        return res.status(400).json({
          error: 'Invalid request: each segment must have imageUrl and script',
        });
      }
    }

    const provider = ttsProvider || config.tts.defaultProvider;

    // Validate TTS provider
    if (!['openai', 'openrouter', 'kokoro'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid TTS provider. Must be openai, openrouter, or kokoro',
      });
    }

    // Add job to queue
    const jobId = await videoQueue.addJob(segments, provider);

    logger.info('Video generation job created', { jobId, segmentCount: segments.length });

    res.status(202).json({
      jobId,
      status: 'pending',
      message: 'Video generation job created',
    });
  } catch (error) {
    logger.error('Error creating video generation job', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/videos/jobs/:jobId
 * Get job status
 */
router.get('/jobs/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = videoQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
      });
    }

    res.json({
      job: {
        id: job.id,
        status: job.status,
        videoUrl: job.videoUrl,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching job status', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/videos/download/:jobId
 * Download the generated video
 */
router.get('/download/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = videoQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
      });
    }

    if (job.status !== 'complete') {
      return res.status(400).json({
        error: 'Video not ready',
        status: job.status,
      });
    }

    const videoPath = path.join(config.storage.outputDir, `${jobId}.mp4`);

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        error: 'Video file not found',
      });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${jobId}.mp4"`);

    const stream = fs.createReadStream(videoPath);
    stream.pipe(res);

    stream.on('error', (error) => {
      logger.error('Error streaming video', { jobId, error });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming video' });
      }
    });
  } catch (error) {
    logger.error('Error downloading video', { error });
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

export default router;
