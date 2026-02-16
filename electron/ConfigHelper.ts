// ConfigHelper.ts
import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { EventEmitter } from "events"
import { OpenAI } from "openai"
import {
  APIProvider,
  DEFAULT_PROVIDER,
  DEFAULT_MODELS,
  sanitizeModelSelection,
} from "../shared/aiModels";

export interface CandidateProfile {
  name?: string;
  resume?: string;  // Full resume text
  jobDescription?: string; // Target role/job description
}

interface Config {
  apiKey: string;
  apiProvider: APIProvider;  // Added provider selection
  openaiBaseUrl?: string;
  openaiCustomModel?: string;
  extractionModel: string;
  solutionModel: string;
  debuggingModel: string;
  answerModel: string;  // Model for AI answer suggestions in conversations
  answerSystemPrompt?: string;
  transcriptionProvider: "openai" | "gemini" | "groq";
  speechRecognitionModel: string;  // Speech recognition model (Whisper for OpenAI)
  groqApiKey?: string;
  groqWhisperModel?: string;
  language: string;
  opacity: number;
  candidateProfile?: CandidateProfile;  // Candidate profile for personalized AI suggestions
}

interface ProviderErrorShape {
  status?: number;
  message?: string;
}

const asProviderError = (error: unknown): ProviderErrorShape => {
  if (typeof error === "object" && error !== null) {
    return error as ProviderErrorShape;
  }
  return {};
};

export class ConfigHelper extends EventEmitter {
  private configPath: string;
  private defaultConfig: Config = {
    apiKey: "",
    apiProvider: DEFAULT_PROVIDER,
    openaiBaseUrl: "",
    openaiCustomModel: "",
    extractionModel: DEFAULT_MODELS[DEFAULT_PROVIDER].extractionModel,
    solutionModel: DEFAULT_MODELS[DEFAULT_PROVIDER].solutionModel,
    debuggingModel: DEFAULT_MODELS[DEFAULT_PROVIDER].debuggingModel,
    answerModel: DEFAULT_MODELS[DEFAULT_PROVIDER].answerModel,
    answerSystemPrompt: "",
    transcriptionProvider: DEFAULT_PROVIDER === "gemini" ? "gemini" : "openai",
    speechRecognitionModel:
      DEFAULT_MODELS.openai.speechRecognitionModel || "whisper-1",
    groqApiKey: "",
    groqWhisperModel: "whisper-large-v3-turbo",
    language: "python",
    opacity: 1.0,
    candidateProfile: {
      name: "",
      resume: "",
      jobDescription: ""
    }
  };

  constructor() {
    super();
    // Use the app's user data directory to store the config
    try {
      this.configPath = path.join(app.getPath('userData'), 'config.json');
      console.log('Config path:', this.configPath);
    } catch (err) {
      console.warn('Could not access user data path, using fallback');
      this.configPath = path.join(process.cwd(), 'config.json');
    }
    
    // Ensure the initial config file exists
    this.ensureConfigExists();
  }

  /**
   * Ensure config file exists
   */
  private ensureConfigExists(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig(this.defaultConfig);
      }
    } catch (err) {
      console.error("Error ensuring config exists:", err);
    }
  }

  /**
   * Validate and sanitize model selection to ensure only allowed models are used.
   * Delegates to shared model configuration for single source of truth.
   */
  public loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // Ensure apiProvider is a valid value
        if (config.apiProvider !== "openai" && config.apiProvider !== "gemini"  && config.apiProvider !== "anthropic") {
          config.apiProvider = DEFAULT_PROVIDER; // Default to shared provider if invalid
        }
        
        // Sanitize model selections to ensure only allowed models are used
        if (config.extractionModel) {
          config.extractionModel = sanitizeModelSelection(
            config.extractionModel,
            config.apiProvider,
            "extractionModel"
          );
        }
        if (config.solutionModel) {
          config.solutionModel = sanitizeModelSelection(
            config.solutionModel,
            config.apiProvider,
            "solutionModel"
          );
        }
        if (config.debuggingModel) {
          config.debuggingModel = sanitizeModelSelection(
            config.debuggingModel,
            config.apiProvider,
            "debuggingModel"
          );
        }
        if (config.answerModel) {
          config.answerModel = sanitizeModelSelection(
            config.answerModel,
            config.apiProvider,
            "answerModel"
          );
        }
        
        // Normalize advanced OpenAI fields
        if (typeof config.openaiBaseUrl === "string") {
          config.openaiBaseUrl = config.openaiBaseUrl.trim();
        }
        if (typeof config.openaiCustomModel === "string") {
          config.openaiCustomModel = config.openaiCustomModel.trim();
        }
        if (typeof config.answerSystemPrompt === "string") {
          config.answerSystemPrompt = config.answerSystemPrompt.trim();
        }

        // Ensure transcriptionProvider is valid
        if (
          config.transcriptionProvider !== "openai" &&
          config.transcriptionProvider !== "gemini" &&
          config.transcriptionProvider !== "groq"
        ) {
          if (config.apiProvider === "openai" || config.apiProvider === "gemini") {
            config.transcriptionProvider = config.apiProvider;
          } else {
            config.transcriptionProvider = "openai";
          }
        }

        if (typeof config.groqWhisperModel !== "string" || config.groqWhisperModel.trim().length === 0) {
          config.groqWhisperModel = "whisper-large-v3-turbo";
        }

        // Ensure speechRecognitionModel is valid
        if (config.speechRecognitionModel) {
          if (config.transcriptionProvider === "openai" && config.speechRecognitionModel !== "whisper-1") {
            config.speechRecognitionModel = "whisper-1";
          } else if (config.transcriptionProvider === "gemini") {
            const allowedGeminiSpeechModels = [
              "gemini-1.5-flash",
              "gemini-1.5-pro",
              "gemini-3-flash-preview",
              "gemini-3-pro-preview",
              "gemini-2.0-flash-exp"
            ];
            if (!allowedGeminiSpeechModels.includes(config.speechRecognitionModel)) {
              config.speechRecognitionModel = DEFAULT_MODELS.gemini.speechRecognitionModel || "gemini-3-flash-preview";
            }
          } else if (config.transcriptionProvider === "groq") {
            config.speechRecognitionModel = config.groqWhisperModel;
          }
        } else if (!config.speechRecognitionModel) {
          if (config.transcriptionProvider === "gemini") {
            config.speechRecognitionModel = DEFAULT_MODELS.gemini.speechRecognitionModel || "gemini-3-flash-preview";
          } else if (config.transcriptionProvider === "groq") {
            config.speechRecognitionModel = config.groqWhisperModel;
          } else {
            config.speechRecognitionModel = this.defaultConfig.speechRecognitionModel;
          }
        }
        
        return {
          ...this.defaultConfig,
          ...config
        };
      }
      
      // If no config exists, create a default one
      this.saveConfig(this.defaultConfig);
      return this.defaultConfig;
    } catch (err) {
      console.error("Error loading config:", err);
      return this.defaultConfig;
    }
  }

  /**
   * Save configuration to disk
   */
  public saveConfig(config: Config): void {
    try {
      // Ensure the directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      // Write the config file
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (err) {
      console.error("Error saving config:", err);
    }
  }

  /**
   * Update specific configuration values
   */
  public updateConfig(updates: Partial<Config>): Config {
    try {
      const currentConfig = this.loadConfig();
      let provider: APIProvider = updates.apiProvider || currentConfig.apiProvider;
      
      // Auto-detect provider based on API key format if a new key is provided
      if (updates.apiKey && !updates.apiProvider) {
        // If API key starts with "sk-", it's likely an OpenAI key
        if (updates.apiKey.trim().startsWith('sk-')) {
          provider = "openai";
          console.log("Auto-detected OpenAI API key format");
        } else if (updates.apiKey.trim().startsWith('sk-ant-')) {
          provider = "anthropic";
          console.log("Auto-detected Anthropic API key format");
        } else {
          provider = "gemini";
          console.log("Using Gemini API key format (default)");
        }
        
        // Update the provider in the updates object
        updates.apiProvider = provider;
      }
      
      // If provider is changing, reset models to the default for that provider
      if (updates.apiProvider && updates.apiProvider !== currentConfig.apiProvider) {
        const defaults = DEFAULT_MODELS[updates.apiProvider];
        updates.extractionModel = defaults.extractionModel;
        updates.solutionModel = defaults.solutionModel;
        updates.debuggingModel = defaults.debuggingModel;
        updates.answerModel = defaults.answerModel;
        // Speech recognition supported for OpenAI and Gemini
        if (defaults.speechRecognitionModel) {
          updates.speechRecognitionModel = defaults.speechRecognitionModel;
        }
        if (updates.apiProvider === "openai" || updates.apiProvider === "gemini") {
          updates.transcriptionProvider = updates.apiProvider;
        }
      }

      // Normalize optional advanced fields
      if (typeof updates.openaiBaseUrl === "string") {
        updates.openaiBaseUrl = updates.openaiBaseUrl.trim();
      }
      if (typeof updates.openaiCustomModel === "string") {
        updates.openaiCustomModel = updates.openaiCustomModel.trim();
      }
      if (typeof updates.groqWhisperModel === "string") {
        updates.groqWhisperModel = updates.groqWhisperModel.trim();
      }
      if (typeof updates.answerSystemPrompt === "string") {
        updates.answerSystemPrompt = updates.answerSystemPrompt.trim();
      }

      // Validate transcription provider
      const transcriptionProvider =
        updates.transcriptionProvider || currentConfig.transcriptionProvider || "openai";
      if (
        transcriptionProvider !== "openai" &&
        transcriptionProvider !== "gemini" &&
        transcriptionProvider !== "groq"
      ) {
        updates.transcriptionProvider = "openai";
      }
      
      // Validate speech recognition model
      if (updates.speechRecognitionModel) {
        const effectiveTranscriptionProvider =
          updates.transcriptionProvider || currentConfig.transcriptionProvider || "openai";

        if (effectiveTranscriptionProvider === "openai" && updates.speechRecognitionModel !== "whisper-1") {
          console.warn(`Invalid speech recognition model: ${updates.speechRecognitionModel}. Only whisper-1 is supported for OpenAI.`);
          updates.speechRecognitionModel = "whisper-1";
        } else if (effectiveTranscriptionProvider === "gemini") {
          // Validate Gemini models that support audio understanding
          const allowedGeminiSpeechModels = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-3-flash-preview",
            "gemini-3-pro-preview",
            "gemini-2.0-flash-exp"
          ];
          if (!allowedGeminiSpeechModels.includes(updates.speechRecognitionModel)) {
            const defaultModel = DEFAULT_MODELS.gemini.speechRecognitionModel || "gemini-3-flash-preview";
            console.warn(`Invalid Gemini speech recognition model: ${updates.speechRecognitionModel}. Using default: ${defaultModel}`);
            updates.speechRecognitionModel = defaultModel;
          }
        } else if (effectiveTranscriptionProvider === "groq") {
          updates.groqWhisperModel = updates.speechRecognitionModel;
        }
      }

      if (updates.transcriptionProvider === "groq") {
        const groqModel = updates.groqWhisperModel || currentConfig.groqWhisperModel || "whisper-large-v3-turbo";
        updates.groqWhisperModel = groqModel;
        updates.speechRecognitionModel = groqModel;
      }
      
      // Sanitize model selections in the updates
      if (updates.extractionModel) {
        updates.extractionModel = sanitizeModelSelection(
          updates.extractionModel,
          provider,
          "extractionModel"
        );
      }
      if (updates.solutionModel) {
        updates.solutionModel = sanitizeModelSelection(
          updates.solutionModel,
          provider,
          "solutionModel"
        );
      }
      if (updates.debuggingModel) {
        updates.debuggingModel = sanitizeModelSelection(
          updates.debuggingModel,
          provider,
          "debuggingModel"
        );
      }
      if (updates.answerModel) {
        updates.answerModel = sanitizeModelSelection(
          updates.answerModel,
          provider,
          "answerModel"
        );
      }
      
      const newConfig = { ...currentConfig, ...updates };
      this.saveConfig(newConfig);
      
      // Only emit update event for changes other than opacity
      // This prevents re-initializing the AI client when only opacity changes
      if (updates.apiKey !== undefined || updates.apiProvider !== undefined || 
          updates.extractionModel !== undefined || updates.solutionModel !== undefined || 
          updates.debuggingModel !== undefined || updates.answerModel !== undefined ||
          updates.openaiBaseUrl !== undefined || updates.openaiCustomModel !== undefined ||
          updates.answerSystemPrompt !== undefined ||
          updates.transcriptionProvider !== undefined || updates.groqApiKey !== undefined ||
          updates.groqWhisperModel !== undefined ||
          updates.speechRecognitionModel !== undefined || 
          updates.language !== undefined) {
        this.emit('config-updated', newConfig);
      }
      
      return newConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Check if the API key is configured
   */
  public hasApiKey(): boolean {
    const config = this.loadConfig();
    return !!config.apiKey && config.apiKey.trim().length > 0;
  }
  
  /**
   * Validate the API key format
   */
  public isValidApiKeyFormat(
    apiKey: string,
    provider?: "openai" | "gemini" | "anthropic",
    openaiBaseUrl?: string
  ): boolean {
    // If provider is not specified, attempt to auto-detect
    if (!provider) {
      if (apiKey.trim().startsWith('sk-')) {
        if (apiKey.trim().startsWith('sk-ant-')) {
          provider = "anthropic";
        } else {
          provider = "openai";
        }
      } else {
        provider = "gemini";
      }
    }
    
    if (provider === "openai") {
      if (openaiBaseUrl && openaiBaseUrl.trim().length > 0) {
        return apiKey.trim().length >= 10;
      }
      // Basic format validation for OpenAI API keys
      return /^sk-[a-zA-Z0-9]{32,}$/.test(apiKey.trim());
    } else if (provider === "gemini") {
      // Basic format validation for Gemini API keys (usually alphanumeric with no specific prefix)
      return apiKey.trim().length >= 10; // Assuming Gemini keys are at least 10 chars
    } else if (provider === "anthropic") {
      // Basic format validation for Anthropic API keys
      return /^sk-ant-[a-zA-Z0-9]{32,}$/.test(apiKey.trim());
    }
    
    return false;
  }
  
  /**
   * Get the stored opacity value
   */
  public getOpacity(): number {
    const config = this.loadConfig();
    return config.opacity !== undefined ? config.opacity : 1.0;
  }

  /**
   * Set the window opacity value
   */
  public setOpacity(opacity: number): void {
    // Ensure opacity is between 0.1 and 1.0
    const validOpacity = Math.min(1.0, Math.max(0.1, opacity));
    this.updateConfig({ opacity: validOpacity });
  }  
  
  /**
   * Get the preferred programming language
   */
  public getLanguage(): string {
    const config = this.loadConfig();
    return config.language || "python";
  }

  /**
   * Set the preferred programming language
   */
  public setLanguage(language: string): void {
    this.updateConfig({ language });
  }
  
  /**
   * Test API key with the selected provider
   */
  public async testApiKey(apiKey: string, provider?: "openai" | "gemini" | "anthropic", baseURL?: string): Promise<{valid: boolean, error?: string}> {
    // Auto-detect provider based on key format if not specified
    if (!provider) {
      if (apiKey.trim().startsWith('sk-')) {
        if (apiKey.trim().startsWith('sk-ant-')) {
          provider = "anthropic";
          console.log("Auto-detected Anthropic API key format for testing");
        } else {
          provider = "openai";
          console.log("Auto-detected OpenAI API key format for testing");
        }
      } else {
        provider = "gemini";
        console.log("Using Gemini API key format for testing (default)");
      }
    }
    
    if (provider === "openai") {
      return this.testOpenAIKey(apiKey, baseURL);
    } else if (provider === "gemini") {
      return this.testGeminiKey(apiKey);
    } else if (provider === "anthropic") {
      return this.testAnthropicKey(apiKey);
    }
    
    return { valid: false, error: "Unknown API provider" };
  }
  
  /**
   * Test OpenAI API key
   */
  private async testOpenAIKey(apiKey: string, baseURL?: string): Promise<{valid: boolean, error?: string}> {
    try {
      const openai = new OpenAI({ 
        apiKey,
        baseURL: baseURL?.trim() || undefined,
      });
      // Make a simple API call to test the key
      await openai.models.list();
      return { valid: true };
    } catch (error: unknown) {
      console.error('OpenAI API key test failed:', error);
      const providerError = asProviderError(error);
      
      // Determine the specific error type for better error messages
      let errorMessage = 'Unknown error validating OpenAI API key';
      
      if (providerError.status === 401) {
        errorMessage = 'Invalid API key. Please check your OpenAI key and try again.';
      } else if (providerError.status === 429) {
        errorMessage = 'Rate limit exceeded. Your OpenAI API key has reached its request limit or has insufficient quota.';
      } else if (providerError.status === 500) {
        errorMessage = 'OpenAI server error. Please try again later.';
      } else if (providerError.message) {
        errorMessage = `Error: ${providerError.message}`;
      }
      
      return { valid: false, error: errorMessage };
    }
  }
  
  /**
   * Test Gemini API key
   * Note: This is a simplified implementation since we don't have the actual Gemini client
   */
  private async testGeminiKey(apiKey: string): Promise<{valid: boolean, error?: string}> {
    try {
      // For now, we'll just do a basic check to ensure the key exists and has valid format
      // In production, you would connect to the Gemini API and validate the key
      if (apiKey && apiKey.trim().length >= 20) {
        // Here you would actually validate the key with a Gemini API call
        return { valid: true };
      }
      return { valid: false, error: 'Invalid Gemini API key format.' };
    } catch (error: unknown) {
      console.error('Gemini API key test failed:', error);
      const providerError = asProviderError(error);
      let errorMessage = 'Unknown error validating Gemini API key';
      
      if (providerError.message) {
        errorMessage = `Error: ${providerError.message}`;
      }
      
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Test Anthropic API key
   * Note: This is a simplified implementation since we don't have the actual Anthropic client
   */
  private async testAnthropicKey(apiKey: string): Promise<{valid: boolean, error?: string}> {
    try {
      // For now, we'll just do a basic check to ensure the key exists and has valid format
      // In production, you would connect to the Anthropic API and validate the key
      if (apiKey && /^sk-ant-[a-zA-Z0-9]{32,}$/.test(apiKey.trim())) {
        // Here you would actually validate the key with an Anthropic API call
        return { valid: true };
      }
      return { valid: false, error: 'Invalid Anthropic API key format.' };
    } catch (error: unknown) {
      console.error('Anthropic API key test failed:', error);
      const providerError = asProviderError(error);
      let errorMessage = 'Unknown error validating Anthropic API key';
      
      if (providerError.message) {
        errorMessage = `Error: ${providerError.message}`;
      }
      
      return { valid: false, error: errorMessage };
    }
  }
}

// Export a singleton instance
export const configHelper = new ConfigHelper();
