/**
 * TranscriptionHelper - Handles audio transcription using various AI providers
 * Follows Single Responsibility Principle - only handles transcription
 * Supports multiple providers: OpenAI (Whisper), Gemini (future), Anthropic (future)
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
// import * as axios from 'axios'; // Uncomment when implementing Gemini speech recognition
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { configHelper } from './ConfigHelper';

export interface TranscriptionResult {
  text: string;
  language?: string;
}

export interface ITranscriptionHelper {
  transcribeAudio(audioBuffer: Buffer, mimeType?: string): Promise<TranscriptionResult>;
}

export class TranscriptionHelper implements ITranscriptionHelper {
  private openai: OpenAI | null = null;
  private geminiApiKey: string | null = null;
  private anthropic: Anthropic | null = null;
  private readonly tempDir: string;
  
  // Default models for each provider
  private readonly defaultOpenAIModel: string = 'whisper-1';
  private readonly defaultGeminiModel: string = ''; // To be set when Gemini speech recognition is available
  private readonly defaultAnthropicModel: string = ''; // To be set when Anthropic speech recognition is available

  constructor() {
    this.tempDir = path.join(app.getPath('temp'), 'audio-transcriptions');
    this.ensureTempDirectory();
    this.initializeAIClients();
    
    // Listen for config changes to re-initialize
    configHelper.on('config-updated', () => {
      this.initializeAIClients();
    });
  }

  /**
   * Initializes AI clients based on API provider from config
   * Currently supports OpenAI (Whisper), with structure ready for future providers
   */
  private initializeAIClients(): void {
    const config = configHelper.loadConfig();
    
    // Reset all clients
    this.openai = null;
    this.geminiApiKey = null;
    this.anthropic = null;
    
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      return;
    }
    
    if (config.apiProvider === "openai") {
      this.openai = new OpenAI({ apiKey: config.apiKey });
      console.log("OpenAI transcription client initialized");
    } else if (config.apiProvider === "gemini") {
      // Future: Initialize Gemini client when speech recognition is available
      this.geminiApiKey = config.apiKey;
      console.log("Gemini API key set (speech recognition not yet available)");
    } else if (config.apiProvider === "anthropic") {
      // Future: Initialize Anthropic client when speech recognition is available
      this.anthropic = new Anthropic({ apiKey: config.apiKey });
      console.log("Anthropic client initialized (speech recognition not yet available)");
    }
  }

  /**
   * Checks if the current provider supports speech recognition
   */
  private isSpeechRecognitionSupported(provider: "openai" | "gemini" | "anthropic"): boolean {
    // Currently only OpenAI supports speech recognition
    // Update this as other providers add support
    return provider === "openai";
  }

  private formatProviderError(provider: "openai" | "gemini" | "anthropic", error: any, context: string): string {
    const status =
      typeof error?.status === "number"
        ? error.status
        : typeof error?.response?.status === "number"
          ? error.response.status
          : undefined;
    const message = error?.message || error?.response?.data?.error?.message || "Unknown error";
    const statusPart = status ? ` (status ${status})` : "";
    return `[${provider}] ${context} failed${statusPart}: ${message}`;
  }

  /**
   * Ensures temp directory exists for audio files
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transcribes audio buffer using the configured AI provider
   * @param audioBuffer - Audio data as Buffer
   * @param mimeType - MIME type of the audio (default: 'audio/webm')
   * @returns Promise resolving to transcription result
   * @throws Error if transcription fails or AI client not initialized
   */
  public async transcribeAudio(
    audioBuffer: Buffer, 
    mimeType: string = 'audio/webm'
  ): Promise<TranscriptionResult> {
    const config = configHelper.loadConfig();
    
    // Check if speech recognition is supported for the current provider
    if (!this.isSpeechRecognitionSupported(config.apiProvider)) {
      throw new Error(`Speech recognition is currently only supported with OpenAI provider. Please switch to OpenAI in settings.`);
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty');
    }

    // Route to the appropriate provider's transcription method
    if (config.apiProvider === "openai") {
      return this.transcribeWithOpenAI(audioBuffer, mimeType);
    } else if (config.apiProvider === "gemini") {
      return this.transcribeWithGemini(audioBuffer, mimeType);
    } else if (config.apiProvider === "anthropic") {
      return this.transcribeWithAnthropic(audioBuffer, mimeType);
    } else {
      throw new Error(`Unsupported API provider: ${config.apiProvider}`);
    }
  }

  /**
   * Transcribes audio using OpenAI Whisper API
   */
  private async transcribeWithOpenAI(
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please set OpenAI API key in settings.');
    }

    const tempPath = path.join(this.tempDir, `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`);
    
    try {
      // Write buffer to temp file
      fs.writeFileSync(tempPath, audioBuffer);
      
      // Create read stream for OpenAI API
      const file = fs.createReadStream(tempPath);
      
      // Get speech recognition model from config
      const config = configHelper.loadConfig();
      const speechModel = config.speechRecognitionModel || this.defaultOpenAIModel;
      
      // Transcribe using Whisper API
      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: speechModel,
        language: 'en', // Optional: can be auto-detected
        response_format: 'verbose_json',
      });

      // Clean up temp file
      this.cleanupTempFile(tempPath);
      
      return {
        text: transcription.text,
        language: transcription.language,
      };
    } catch (error: any) {
      // Clean up on error
      this.cleanupTempFile(tempPath);
      
      console.error('OpenAI transcription error:', error);
      
      // Provide more specific error messages
      const status = error?.status ?? error?.response?.status;
      if (status === 401) {
        throw new Error(this.formatProviderError("openai", error, "Auth"));
      } else if (status === 429) {
        throw new Error(this.formatProviderError("openai", error, "Rate limit"));
      } else if (error.message?.includes('file')) {
        throw new Error(this.formatProviderError("openai", error, "Invalid audio file"));
      }

      throw new Error(this.formatProviderError("openai", error, "Transcription"));
    }
  }

  /**
   * Transcribes audio using Gemini API (Future implementation)
   * TODO: Implement when Gemini speech recognition becomes available
   */
  private async transcribeWithGemini(
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<TranscriptionResult> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not initialized. Please set Gemini API key in settings.');
    }

    // TODO: Implement Gemini speech recognition when available
    throw new Error('Gemini speech recognition is not yet available. Please use OpenAI provider for transcription.');
  }

  /**
   * Transcribes audio using Anthropic API (Future implementation)
   * TODO: Implement when Anthropic speech recognition becomes available
   */
  private async transcribeWithAnthropic(
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<TranscriptionResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized. Please set Anthropic API key in settings.');
    }

    // TODO: Implement Anthropic speech recognition when available
    throw new Error('Anthropic speech recognition is not yet available. Please use OpenAI provider for transcription.');
  }

  /**
   * Safely removes temporary file
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up temp file:', error);
      // Don't throw - cleanup errors shouldn't break the flow
    }
  }

  /**
   * Checks if any AI client is initialized
   */
  public isInitialized(): boolean {
    return this.openai !== null || this.geminiApiKey !== null || this.anthropic !== null;
  }

  /**
   * Checks if speech recognition is available for the current provider
   */
  public isSpeechRecognitionAvailable(): boolean {
    const config = configHelper.loadConfig();
    return this.isSpeechRecognitionSupported(config.apiProvider) && this.isInitialized();
  }
}
