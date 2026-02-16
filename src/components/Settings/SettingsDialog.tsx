import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useToast } from "../../contexts/toast";
import { CandidateProfileSection, CandidateProfile } from "./CandidateProfileSection";
import {
  APIProvider,
  DEFAULT_MODELS,
} from "../../../shared/aiModels";

type TranscriptionProvider = "openai" | "gemini" | "groq";

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsDialog({ open: externalOpen, onOpenChange }: SettingsDialogProps) {
  const [open, setOpen] = useState(externalOpen || false);
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState<APIProvider>("openai");
  const [extractionModel, setExtractionModel] = useState(
    DEFAULT_MODELS.openai.extractionModel
  );
  const [solutionModel, setSolutionModel] = useState(
    DEFAULT_MODELS.openai.solutionModel
  );
  const [debuggingModel, setDebuggingModel] = useState(
    DEFAULT_MODELS.openai.debuggingModel
  );
  const [answerModel, setAnswerModel] = useState(
    DEFAULT_MODELS.openai.answerModel
  );
  const [answerSystemPrompt, setAnswerSystemPrompt] = useState("");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState("");
  const [openaiCustomModel, setOpenaiCustomModel] = useState("");
  const [transcriptionProvider, setTranscriptionProvider] = useState<TranscriptionProvider>("openai");
  const [speechRecognitionModel, setSpeechRecognitionModel] = useState("whisper-1");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [groqWhisperModel, setGroqWhisperModel] = useState("whisper-large-v3-turbo");
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>({
    name: "",
    resume: "",
    jobDescription: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Sync with external open state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  // Handle open state changes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Only call onOpenChange when there's actually a change
    if (onOpenChange && newOpen !== externalOpen) {
      onOpenChange(newOpen);
    }
  };
  
  // Load current config on dialog open
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      interface Config {
        apiKey?: string;
        apiProvider?: APIProvider;
        extractionModel?: string;
        solutionModel?: string;
        debuggingModel?: string;
        answerModel?: string;
        answerSystemPrompt?: string;
        openaiBaseUrl?: string;
        openaiCustomModel?: string;
        transcriptionProvider?: TranscriptionProvider;
        speechRecognitionModel?: string;
        groqApiKey?: string;
        groqWhisperModel?: string;
        candidateProfile?: CandidateProfile;
      }

      window.electronAPI
        .getConfig()
        .then((config: Config) => {
          setApiKey(config.apiKey || "");
          const configuredProvider = config.apiProvider || "openai";
          const provider: APIProvider =
            configuredProvider === "gemini" ? "openai" : configuredProvider;
          setApiProvider(provider);
          const providerDefaults = DEFAULT_MODELS[provider];
          setExtractionModel(
            config.extractionModel || providerDefaults.extractionModel
          );
          setSolutionModel(
            config.solutionModel || providerDefaults.solutionModel
          );
          setDebuggingModel(
            config.debuggingModel || providerDefaults.debuggingModel
          );
          setAnswerModel(
            config.answerModel || providerDefaults.answerModel
          );
          setAnswerSystemPrompt(config.answerSystemPrompt || "");
          setOpenaiBaseUrl(config.openaiBaseUrl || "");
          setOpenaiCustomModel(config.openaiCustomModel || "");
          setTranscriptionProvider(
            config.transcriptionProvider ||
              (configuredProvider === "gemini" ? "gemini" : "openai")
          );
          setSpeechRecognitionModel(
            config.speechRecognitionModel ||
              providerDefaults.speechRecognitionModel ||
              (configuredProvider === "gemini" ? "gemini-3-flash-preview" : "whisper-1")
          );
          setGroqApiKey(config.groqApiKey || "");
          setGroqWhisperModel(config.groqWhisperModel || "whisper-large-v3-turbo");
          setCandidateProfile(config.candidateProfile || {
            name: "",
            resume: "",
            jobDescription: ""
          });
        })
        .catch((error: unknown) => {
          console.error("Failed to load config:", error);
          showToast("Error", "Failed to load settings", "error");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, showToast]);

  // Handle API provider change
  const handleProviderChange = (provider: APIProvider) => {
    setApiProvider(provider);
    
    // Reset models to defaults when changing provider
    const defaults = DEFAULT_MODELS[provider];
    setExtractionModel(defaults.extractionModel);
    setSolutionModel(defaults.solutionModel);
    setDebuggingModel(defaults.debuggingModel);
    setAnswerModel(defaults.answerModel);
  };

  const handleTranscriptionProviderChange = (provider: TranscriptionProvider) => {
    setTranscriptionProvider(provider);
    if (provider === "openai") {
      setSpeechRecognitionModel("whisper-1");
    } else if (provider === "gemini" && speechRecognitionModel === "whisper-1") {
      setSpeechRecognitionModel("gemini-3-flash-preview");
    } else if (provider === "groq") {
      setSpeechRecognitionModel(groqWhisperModel || "whisper-large-v3-turbo");
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (transcriptionProvider === "groq" && !groqApiKey.trim()) {
        showToast("Error", "Groq API key is required when Groq transcription is selected", "error");
        setIsLoading(false);
        return;
      }

      const normalizedOpenaiBaseUrl = openaiBaseUrl.trim();
      const normalizedOpenaiCustomModel = openaiCustomModel.trim();
      const effectiveOpenaiCustomModel =
        apiProvider === "openai" && normalizedOpenaiBaseUrl && !normalizedOpenaiCustomModel
          ? "gpt-5.3-codex"
          : normalizedOpenaiCustomModel;

      const result = await window.electronAPI.updateConfig({
        apiKey,
        apiProvider,
        extractionModel,
        solutionModel,
        debuggingModel,
        answerModel,
        answerSystemPrompt,
        openaiBaseUrl: normalizedOpenaiBaseUrl,
        openaiCustomModel: effectiveOpenaiCustomModel,
        transcriptionProvider,
        speechRecognitionModel,
        groqApiKey,
        groqWhisperModel,
        candidateProfile,
      });
      
      if (result) {
        showToast("Success", "Settings saved successfully", "success");
        handleOpenChange(false);
        
        // Force reload the app to apply the API key
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("Error", "Failed to save settings", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Mask API key for display
  const maskApiKey = (key: string) => {
    if (!key || key.length < 10) return "";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  // Open external link handler
  const openExternalLink = (url: string) => {
    window.electronAPI.openLink(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-md bg-black border border-white/10 text-white settings-dialog"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(450px, 90vw)',
          height: 'auto',
          minHeight: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 9999,
          margin: 0,
          padding: '20px',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          animation: 'fadeIn 0.25s ease forwards',
          opacity: 0.98
        }}
      >        
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="text-white/70">
            Configure your API key, AI models, and optional candidate profile. You'll need your own API key to use this application.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* API Settings Section */}
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">API Settings</h2>
            <p className="text-xs text-white/60">
              Choose your provider and models. These control how screenshots and solutions are processed.
            </p>
          </div>
          
          {/* API Provider Selection */}
          {/* API Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">API Provider</label>
            <div className="flex gap-2">
              <div
                className={`flex-1 p-2 rounded-lg cursor-pointer transition-colors ${
                  apiProvider === "openai"
                    ? "bg-white/10 border border-white/20"
                    : "bg-black/30 border border-white/5 hover:bg-white/5"
                }`}
                onClick={() => handleProviderChange("openai")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      apiProvider === "openai" ? "bg-white" : "bg-white/20"
                    }`}
                  />
                  <div className="flex flex-col">
                    <p className="font-medium text-white text-sm">OpenAI compatible</p>
                    <p className="text-xs text-white/60">Any OpenAI-style endpoint</p>
                  </div>
                </div>
              </div>
              <div
                className={`flex-1 p-2 rounded-lg cursor-pointer transition-colors ${
                  apiProvider === "anthropic"
                    ? "bg-white/10 border border-white/20"
                    : "bg-black/30 border border-white/5 hover:bg-white/5"
                }`}
                onClick={() => handleProviderChange("anthropic")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      apiProvider === "anthropic" ? "bg-white" : "bg-white/20"
                    }`}
                  />
                  <div className="flex flex-col">
                    <p className="font-medium text-white text-sm">Anthropic compatible</p>
                    <p className="text-xs text-white/60">Any Anthropic-style endpoint</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-white" htmlFor="apiKey">
            {apiProvider === "openai"
              ? "OpenAI compatible API Key"
              : "Anthropic compatible API Key"}
            </label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                apiProvider === "openai" ? "sk-..." : "sk-ant-..."
              }
              className="bg-black/50 border-white/10 text-white"
            />
            {apiKey && (
              <p className="text-xs text-white/50">
                Current: {maskApiKey(apiKey)}
              </p>
            )}
            <p className="text-xs text-white/50">
              Your API key is stored locally and only sent to your selected provider endpoint.
            </p>
            <div className="mt-2 p-2 rounded-md bg-white/5 border border-white/10">
              <p className="text-xs text-white/80 mb-1">Don't have an API key?</p>
              {apiProvider === "openai" ? (
                <>
                  <p className="text-xs text-white/60 mb-1">1. Create an account at <button 
                    onClick={() => openExternalLink('https://platform.openai.com/signup')} 
                    className="text-blue-400 hover:underline cursor-pointer">OpenAI</button>
                  </p>
                  <p className="text-xs text-white/60 mb-1">2. Go to <button 
                    onClick={() => openExternalLink('https://platform.openai.com/api-keys')} 
                    className="text-blue-400 hover:underline cursor-pointer">API Keys</button> section
                  </p>
                  <p className="text-xs text-white/60">3. Create a new secret key and paste it here</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-white/60 mb-1">1. Create an account at <button 
                    onClick={() => openExternalLink('https://console.anthropic.com/signup')} 
                    className="text-blue-400 hover:underline cursor-pointer">Anthropic</button>
                  </p>
                  <p className="text-xs text-white/60 mb-1">2. Go to the <button 
                    onClick={() => openExternalLink('https://console.anthropic.com/settings/keys')} 
                    className="text-blue-400 hover:underline cursor-pointer">API Keys</button> section
                  </p>
                  <p className="text-xs text-white/60">3. Create a new API key and paste it here</p>
                </>
              )}
            </div>
          </div>

          {apiProvider === "openai" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white" htmlFor="openaiBaseUrl">
                OpenAI Base URL (optional)
              </label>
              <Input
                id="openaiBaseUrl"
                type="text"
                value={openaiBaseUrl}
                onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="bg-black/50 border-white/10 text-white"
              />
              <p className="text-xs text-white/50">
                Leave empty to use the official OpenAI endpoint.
              </p>

              <label className="text-sm font-medium text-white" htmlFor="openaiCustomModel">
                Custom OpenAI Model (optional)
              </label>
              <Input
                id="openaiCustomModel"
                type="text"
                value={openaiCustomModel}
                onChange={(e) => setOpenaiCustomModel(e.target.value)}
                placeholder="gpt-4.1-mini"
                className="bg-black/50 border-white/10 text-white"
              />
              <p className="text-xs text-white/50">
                When set, this overrides OpenAI model selections for extraction, solution, debugging, and answer suggestions.
              </p>
            </div>
          )}
          
          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-white mb-2 block">Keyboard Shortcuts</label>
            <div className="bg-black/30 border border-white/10 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div className="text-white/70">Toggle Visibility</div>
                <div className="text-white/90 font-mono">Ctrl+B / Cmd+B</div>
                
                <div className="text-white/70">Take Screenshot</div>
                <div className="text-white/90 font-mono">Ctrl+H / Cmd+H</div>
                
                <div className="text-white/70">Start/Stop Recording</div>
                <div className="text-white/90 font-mono">Ctrl+M / Cmd+M</div>
                
                <div className="text-white/70">Toggle Speaker Mode</div>
                <div className="text-white/90 font-mono">Ctrl+Shift+M / Cmd+Shift+M</div>
                
                <div className="text-white/70">Process Screenshots</div>
                <div className="text-white/90 font-mono">Ctrl+Enter / Cmd+Enter</div>
                
                <div className="text-white/70">Delete Last Screenshot</div>
                <div className="text-white/90 font-mono">Ctrl+L / Cmd+L</div>
                
                <div className="text-white/70">Reset View</div>
                <div className="text-white/90 font-mono">Ctrl+R / Cmd+R</div>
                
                <div className="text-white/70">Quit Application</div>
                <div className="text-white/90 font-mono">Ctrl+Q / Cmd+Q</div>
                
                <div className="text-white/70">Move Window</div>
                <div className="text-white/90 font-mono">Ctrl+Arrow Keys</div>
                
                <div className="text-white/70">Decrease Opacity</div>
                <div className="text-white/90 font-mono">Ctrl+[ / Cmd+[</div>
                
                <div className="text-white/70">Increase Opacity</div>
                <div className="text-white/90 font-mono">Ctrl+] / Cmd+]</div>
                
                <div className="text-white/70">Zoom Out</div>
                <div className="text-white/90 font-mono">Ctrl+- / Cmd+-</div>
                
                <div className="text-white/70">Reset Zoom</div>
                <div className="text-white/90 font-mono">Ctrl+0 / Cmd+0</div>
                
                <div className="text-white/70">Zoom In</div>
                <div className="text-white/90 font-mono">Ctrl+= / Cmd+=</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 mt-4">
            <label className="text-sm font-medium text-white">AI Model Selection</label>
            <p className="text-xs text-white/60 -mt-3 mb-2">
              Enter model names for each stage. Any provider-compatible model ID is accepted.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="extractionModel">
                  Problem Extraction Model
                </label>
                <Input
                  id="extractionModel"
                  type="text"
                  value={extractionModel}
                  onChange={(e) => setExtractionModel(e.target.value)}
                  placeholder="gpt-4.1-mini"
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="solutionModel">
                  Solution Generation Model
                </label>
                <Input
                  id="solutionModel"
                  type="text"
                  value={solutionModel}
                  onChange={(e) => setSolutionModel(e.target.value)}
                  placeholder="gpt-4.1"
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="debuggingModel">
                  Debugging Model
                </label>
                <Input
                  id="debuggingModel"
                  type="text"
                  value={debuggingModel}
                  onChange={(e) => setDebuggingModel(e.target.value)}
                  placeholder="gpt-4.1"
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="answerModel">
                  Answer Suggestions Model
                </label>
                <Input
                  id="answerModel"
                  type="text"
                  value={answerModel}
                  onChange={(e) => setAnswerModel(e.target.value)}
                  placeholder="gpt-4.1-mini"
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-white" htmlFor="answerSystemPrompt">
              Answer Assistant System Prompt (optional)
            </label>
            <textarea
              id="answerSystemPrompt"
              value={answerSystemPrompt}
              onChange={(e) => setAnswerSystemPrompt(e.target.value)}
              placeholder="You are a helpful interview assistant..."
              rows={6}
              className="w-full rounded-md bg-black/50 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <p className="text-xs text-white/50">
              Overrides the system prompt used for AI answer suggestions in conversation mode.
            </p>
          </div>
          
          {/* Speech Recognition Model Selection */}
          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-white mb-1 block">
              Speech Recognition Model
            </label>
            <p className="text-xs text-white/60 mb-2">
              Model used for transcribing interview conversations
            </p>

            <div className="flex gap-2">
              {[
                { id: "openai", label: "OpenAI" },
                { id: "gemini", label: "Gemini" },
                { id: "groq", label: "Groq" },
              ].map((item) => (
                <div
                  key={item.id}
                  className={`flex-1 p-2 rounded-lg cursor-pointer transition-colors ${
                    transcriptionProvider === item.id
                      ? "bg-white/10 border border-white/20"
                      : "bg-black/30 border border-white/5 hover:bg-white/5"
                  }`}
                  onClick={() => handleTranscriptionProviderChange(item.id as TranscriptionProvider)}
                >
                  <p className="font-medium text-white text-xs text-center">{item.label}</p>
                </div>
              ))}
            </div>

            {transcriptionProvider === "openai" && (
              <div className="space-y-2">
                <div
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    speechRecognitionModel === "whisper-1"
                      ? "bg-white/10 border border-white/20"
                      : "bg-black/30 border border-white/5 hover:bg-white/5"
                  }`}
                  onClick={() => setSpeechRecognitionModel("whisper-1")}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        speechRecognitionModel === "whisper-1" ? "bg-white" : "bg-white/20"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-white text-xs">Whisper-1</p>
                      <p className="text-xs text-white/60">OpenAI speech-to-text</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {transcriptionProvider === "gemini" && (
              <div className="space-y-2">
                {[
                  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", desc: "Fast and efficient audio understanding" },
                  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", desc: "Higher accuracy audio understanding" },
                  { id: "gemini-3-flash-preview", label: "Gemini Flash (Preview)", desc: "Latest preview model with audio understanding" },
                  { id: "gemini-3-pro-preview", label: "Gemini Pro (Preview)", desc: "Best accuracy with audio understanding" },
                ].map((model) => (
                  <div
                    key={model.id}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      speechRecognitionModel === model.id
                        ? "bg-white/10 border border-white/20"
                        : "bg-black/30 border border-white/5 hover:bg-white/5"
                    }`}
                    onClick={() => setSpeechRecognitionModel(model.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          speechRecognitionModel === model.id ? "bg-white" : "bg-white/20"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-white text-xs">{model.label}</p>
                        <p className="text-xs text-white/60">{model.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {transcriptionProvider === "groq" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white" htmlFor="groqApiKey">
                  Groq API Key
                </label>
                <Input
                  id="groqApiKey"
                  type="password"
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  placeholder="gsk_..."
                  className="bg-black/50 border-white/10 text-white"
                />
                <label className="text-sm font-medium text-white" htmlFor="groqWhisperModel">
                  Groq Whisper Model
                </label>
                <Input
                  id="groqWhisperModel"
                  type="text"
                  value={groqWhisperModel}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGroqWhisperModel(value);
                    setSpeechRecognitionModel(value || "whisper-large-v3-turbo");
                  }}
                  placeholder="whisper-large-v3-turbo"
                  className="bg-black/50 border-white/10 text-white"
                />
                <p className="text-xs text-white/60">
                  Groq is used for transcription only. Main AI tasks still use your selected provider above.
                </p>
              </div>
            )}
          </div>
          
          {/* Candidate Profile Section */}
          <div className="space-y-4 mt-6 border-t border-white/10 pt-4">
            <div>
              <label className="text-sm font-medium text-white mb-1 block">
                Candidate Profile
              </label>
              <p className="text-xs text-white/60 mb-3">
                Add your resume and details to get more personalized AI answer suggestions during interviews.
              </p>
              <CandidateProfileSection
                profile={candidateProfile}
                onProfileChange={setCandidateProfile}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-white/10 hover:bg-white/5 text-white"
          >
            Cancel
          </Button>
          <Button
            className="px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
            onClick={handleSave}
            disabled={isLoading || !apiKey}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
