use super::utils::ImageFormat;
use serde::{Deserialize, Serialize};

const DEFAULT_CLIENT_ID: &str = "databricks-cli";
const DEFAULT_REDIRECT_URL: &str = "http://localhost:8020";
const DEFAULT_SCOPES: &[&str] = &["all-apis"];
const DEFAULT_CONTEXT_LIMIT: usize = 128_000;
const DEFAULT_ESTIMATE_FACTOR: f32 = 0.8;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProviderConfig {
    OpenAi(OpenAiProviderConfig),
    Databricks(DatabricksProviderConfig),
    Ollama(OllamaProviderConfig),
    Anthropic(AnthropicProviderConfig),
}

/// Configuration for model-specific settings and limits
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    /// The name of the model to use
    pub model_name: String,
    /// Optional explicit context limit that overrides any defaults
    pub context_limit: Option<usize>,
    /// Optional temperature setting (0.0 - 1.0)
    pub temperature: Option<f32>,
    /// Optional maximum tokens to generate
    pub max_tokens: Option<i32>,
    /// Factor used to estimate safe context window size (0.0 - 1.0)
    /// Defaults to 0.8 (80%) of the context limit to leave headroom for responses
    pub estimate_factor: Option<f32>,
}

impl ModelConfig {
    /// Create a new ModelConfig with the specified model name
    pub fn new(model_name: String) -> Self {
        Self {
            model_name,
            context_limit: None,
            temperature: None,
            max_tokens: None,
            estimate_factor: None,
        }
    }

    /// Set an explicit context limit
    pub fn with_context_limit(mut self, limit: Option<usize>) -> Self {
        self.context_limit = limit;
        self
    }

    /// Set the temperature
    pub fn with_temperature(mut self, temp: Option<f32>) -> Self {
        self.temperature = temp;
        self
    }

    /// Set the max tokens
    pub fn with_max_tokens(mut self, tokens: Option<i32>) -> Self {
        self.max_tokens = tokens;
        self
    }

    /// Set the estimate factor
    pub fn with_estimate_factor(mut self, factor: Option<f32>) -> Self {
        self.estimate_factor = factor;
        self
    }

    /// Get the context limit for the current model configuration
    ///
    /// # Returns
    /// The context limit with the following precedence:
    /// 1. Explicit context_limit if provided in config
    /// 2. Model-specific default based on model name
    /// 3. Global default (128_000) with a warning
    pub fn get_context_limit(&self) -> usize {
        // Always prefer explicitly provided context limit
        if let Some(limit) = self.context_limit {
            return limit;
        }

        // Try to get model-specific default
        if let Some(limit) = self.get_model_specific_limit() {
            return limit;
        }

        // Fall back to global default with warning
        //warn!(
        //    "No specific context limit found for model '{}'. Using default limit of {}",
        //    self.model_name, DEFAULT_CONTEXT_LIMIT
        //);
        DEFAULT_CONTEXT_LIMIT
    }

    /// Get the estimate factor for the current model configuration
    ///
    /// # Returns
    /// The estimate factor with the following precedence:
    /// 1. Explicit estimate_factor if provided in config
    /// 2. Default value (0.8)
    pub fn get_estimate_factor(&self) -> f32 {
        self.estimate_factor.unwrap_or(DEFAULT_ESTIMATE_FACTOR)
    }

    /// Get the estimated limit of the context size, this is defined as
    /// context_limit * estimate_factor
    pub fn get_estimated_limit(&self) -> usize {
        (self.get_context_limit() as f32 * self.get_estimate_factor()) as usize
    }

    /// Get model-specific context limit based on model name
    fn get_model_specific_limit(&self) -> Option<usize> {
        // Implement some sensible defaults
        match self.model_name.as_str() {
            // OpenAI models, https://platform.openai.com/docs/models#models-overview
            name if name.contains("gpt-4o") => Some(128_000),
            name if name.contains("gpt-4-turbo") => Some(128_000),

            // Anthropic models, https://docs.anthropic.com/en/docs/about-claude/models
            name if name.contains("claude-3") => Some(200_000),

            // Meta Llama models, https://github.com/meta-llama/llama-models/tree/main?tab=readme-ov-file#llama-models-1
            name if name.contains("llama3.2") => Some(128_000),
            name if name.contains("llama3.3") => Some(128_000),
            _ => None,
        }
    }
}

/// Base trait for provider configurations
pub trait ProviderModelConfig {
    /// Get the model configuration
    fn model_config(&self) -> &ModelConfig;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DatabricksAuth {
    Token(String),
    OAuth {
        host: String,
        client_id: String,
        redirect_url: String,
        scopes: Vec<String>,
    },
}

impl DatabricksAuth {
    /// Create a new OAuth configuration with default values
    pub fn oauth(host: String) -> Self {
        Self::OAuth {
            host,
            client_id: DEFAULT_CLIENT_ID.to_string(),
            redirect_url: DEFAULT_REDIRECT_URL.to_string(),
            scopes: DEFAULT_SCOPES.iter().map(|s| s.to_string()).collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabricksProviderConfig {
    pub host: String,
    pub auth: DatabricksAuth,
    pub model: ModelConfig,
    pub image_format: ImageFormat,
}

impl DatabricksProviderConfig {
    /// Create a new configuration with token authentication
    pub fn with_token(host: String, model_name: String, token: String) -> Self {
        Self {
            host,
            auth: DatabricksAuth::Token(token),
            model: ModelConfig::new(model_name),
            image_format: ImageFormat::Anthropic,
        }
    }

    /// Create a new configuration with OAuth authentication using default settings
    pub fn with_oauth(host: String, model_name: String) -> Self {
        Self {
            host: host.clone(),
            auth: DatabricksAuth::oauth(host),
            model: ModelConfig::new(model_name),
            image_format: ImageFormat::Anthropic,
        }
    }
}

impl ProviderModelConfig for DatabricksProviderConfig {
    fn model_config(&self) -> &ModelConfig {
        &self.model
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAiProviderConfig {
    pub host: String,
    pub api_key: String,
    pub model: ModelConfig,
}

impl OpenAiProviderConfig {
    pub fn new(host: String, api_key: String, model_name: String) -> Self {
        Self {
            host,
            api_key,
            model: ModelConfig::new(model_name),
        }
    }
}

impl ProviderModelConfig for OpenAiProviderConfig {
    fn model_config(&self) -> &ModelConfig {
        &self.model
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaProviderConfig {
    pub host: String,
    pub model: ModelConfig,
}

impl OllamaProviderConfig {
    pub fn new(host: String, model_config: ModelConfig) -> Self {
        Self {
            host,
            model: model_config,
        }
    }
}

impl ProviderModelConfig for OllamaProviderConfig {
    fn model_config(&self) -> &ModelConfig {
        &self.model
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnthropicProviderConfig {
    pub host: String,
    pub api_key: String,
    pub model: ModelConfig,
}

impl AnthropicProviderConfig {
    pub fn new(host: String, api_key: String, model_name: String) -> Self {
        Self {
            host,
            api_key,
            model: ModelConfig::new(model_name),
        }
    }
}

impl ProviderModelConfig for AnthropicProviderConfig {
    fn model_config(&self) -> &ModelConfig {
        &self.model
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_config_context_limits() {
        // Test explicit limit
        let config =
            ModelConfig::new("claude-3-opus".to_string()).with_context_limit(Some(150_000));
        assert_eq!(config.get_context_limit(), 150_000);

        // Test model-specific defaults
        let config = ModelConfig::new("claude-3-opus".to_string());
        assert_eq!(config.get_context_limit(), 200_000);

        let config = ModelConfig::new("gpt-4-turbo".to_string());
        assert_eq!(config.get_context_limit(), 128_000);

        // Test fallback to default
        let config = ModelConfig::new("unknown-model".to_string());
        assert_eq!(config.get_context_limit(), DEFAULT_CONTEXT_LIMIT);
    }

    #[test]
    fn test_estimate_factor() {
        // Test default value
        let config = ModelConfig::new("test-model".to_string());
        assert_eq!(config.get_estimate_factor(), DEFAULT_ESTIMATE_FACTOR);

        // Test explicit value
        let config = ModelConfig::new("test-model".to_string()).with_estimate_factor(Some(0.9));
        assert_eq!(config.get_estimate_factor(), 0.9);
    }

    #[test]
    fn test_anthropic_config() {
        let config = AnthropicProviderConfig::new(
            "https://api.anthropic.com".to_string(),
            "test-key".to_string(),
            "claude-3-opus".to_string(),
        );

        assert_eq!(config.model_config().get_context_limit(), 200_000);

        let config = AnthropicProviderConfig::new(
            "https://api.anthropic.com".to_string(),
            "test-key".to_string(),
            "claude-3-opus".to_string(),
        );
        let model_config = config
            .model_config()
            .clone()
            .with_context_limit(Some(150_000));
        assert_eq!(model_config.get_context_limit(), 150_000);
    }

    #[test]
    fn test_openai_config() {
        let config = OpenAiProviderConfig::new(
            "https://api.openai.com".to_string(),
            "test-key".to_string(),
            "gpt-4-turbo".to_string(),
        );

        assert_eq!(config.model_config().get_context_limit(), 128_000);

        let config = OpenAiProviderConfig::new(
            "https://api.openai.com".to_string(),
            "test-key".to_string(),
            "gpt-4-turbo".to_string(),
        );
        let model_config = config
            .model_config()
            .clone()
            .with_context_limit(Some(150_000));
        assert_eq!(model_config.get_context_limit(), 150_000);
    }

    #[test]
    fn test_model_config_settings() {
        let config = ModelConfig::new("test-model".to_string())
            .with_temperature(Some(0.7))
            .with_max_tokens(Some(1000))
            .with_context_limit(Some(50_000))
            .with_estimate_factor(Some(0.9));

        assert_eq!(config.temperature, Some(0.7));
        assert_eq!(config.max_tokens, Some(1000));
        assert_eq!(config.context_limit, Some(50_000));
        assert_eq!(config.estimate_factor, Some(0.9));
    }
}
