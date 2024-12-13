use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;
use std::sync::Mutex;

use crate::models::message::Message;
use crate::models::tool::Tool;
use crate::providers::base::{Provider, Usage};
use crate::providers::configs::ModelConfig;

/// A mock provider that returns pre-configured responses for testing
pub struct MockProvider {
    responses: Arc<Mutex<Vec<Message>>>,
    model_config: ModelConfig,
}

impl MockProvider {
    /// Create a new mock provider with a sequence of responses
    pub fn new(responses: Vec<Message>) -> Self {
        Self {
            responses: Arc::new(Mutex::new(responses)),
            model_config: ModelConfig::new("mock-model".to_string()),
        }
    }

    /// Create a new mock provider with specific responses and model config
    pub fn with_config(responses: Vec<Message>, model_config: ModelConfig) -> Self {
        Self {
            responses: Arc::new(Mutex::new(responses)),
            model_config,
        }
    }
}

#[async_trait]
impl Provider for MockProvider {
    fn get_model_config(&self) -> &ModelConfig {
        &self.model_config
    }

    async fn complete(
        &self,
        _system_prompt: &str,
        _messages: &[Message],
        _tools: &[Tool],
    ) -> Result<(Message, Usage)> {
        let mut responses = self.responses.lock().unwrap();
        if responses.is_empty() {
            // Return empty response if no more pre-configured responses
            Ok((Message::assistant().with_text(""), Usage::default()))
        } else {
            Ok((responses.remove(0), Usage::default()))
        }
    }
}
