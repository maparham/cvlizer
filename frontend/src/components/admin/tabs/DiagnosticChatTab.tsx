/**
 * DiagnosticChatTab - Admin dashboard OpenAI diagnostic tab
 *
 * This component allows admins to test the OpenAI Responses API
 * and monitor performance metrics.
 *
 * Key features:
 * - Test Responses API with configurable parameters
 * - Performance metrics visualization
 * - Sample prompts for quick testing
 * - Configuration display and validation
 *
 * Usage context:
 * - Used in admin dashboard as the diagnostic tab
 * - Requires admin authentication
 * - Session-only storage (no database persistence)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  IconButton,
} from '@mui/material';
import {
  ExpandMore,
  Speed,
  Token as TokenIcon,
  AttachMoney,
  TrendingUp,
  CheckCircle,
  Error as ErrorIcon,
  ContentCopy,
} from '@mui/icons-material';
import {
  adminApi,
  OpenAIConfig,
  DiagnosticRequest,
  DiagnosticResponse,
  DiagnosticMessage,
} from '../../../services/api';

const SAMPLE_PROMPTS = [
  {
    name: 'Quick Test',
    prompt: 'Hello! Please respond with "OK" to confirm you are working.',
  },
  {
    name: 'Medium Analysis',
    prompt:
      'Extract 5 key technical skills from this job description:\n\nWe are looking for a Senior Software Engineer with experience in React, TypeScript, Node.js, AWS, and Docker. Must have 5+ years of experience.',
  },
  {
    name: 'Large Payload',
    prompt:
      'Analyze this CV against the job description and provide a match score:\n\nCV: Senior Software Engineer with 7 years experience. Skills: React, Angular, TypeScript, JavaScript, Node.js, Express, MongoDB, PostgreSQL, AWS, Docker, Kubernetes, CI/CD. Experience includes leading teams, architecting microservices, and building scalable applications.\n\nJob Description: Looking for a Full Stack Engineer with 5+ years experience in React, Node.js, AWS, and containerization technologies. Must have team leadership experience and strong system design skills.',
  },
  {
    name: 'JSON Structured Output',
    prompt:
      'Return a JSON object with the following structure:\n{\n  "skills": ["skill1", "skill2", "skill3"],\n  "experience_years": 5,\n  "match_score": 85,\n  "summary": "Brief analysis"\n}',
  },
];

const DiagnosticChatTab: React.FC = () => {
  // State
  const [config, setConfig] = useState<OpenAIConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [prompt, setPrompt] = useState('');
  const [systemMessage, setSystemMessage] = useState('You are a helpful assistant.');
  const [maxTokens, setMaxTokens] = useState(500);
  const [temperature, setTemperature] = useState(0.7);
  const [modelOverride, setModelOverride] = useState('');

  // Configuration panel state
  const [configExpanded, setConfigExpanded] = useState(false);

  // Message history
  const [messages, setMessages] = useState<DiagnosticMessage[]>([]);

  // Load configuration on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const data = await adminApi.getOpenAIConfig();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError('Failed to load OpenAI configuration');
      console.error(err);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSamplePrompt = useCallback((samplePrompt: string) => {
    setPrompt(samplePrompt);
  }, []);

  const handleSend = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);

    const request: DiagnosticRequest = {
      prompt: prompt.trim(),
      system_message: systemMessage,
      max_tokens: maxTokens,
      temperature: temperature,
      model_override: modelOverride || undefined,
    };

    const newMessage: DiagnosticMessage = {
      id: Date.now().toString(),
      prompt: prompt.trim(),
      timestamp: new Date(),
      success: false,
    };

    try {
      const response = await adminApi.testOpenAI(request);
      newMessage.response = response;
      newMessage.success = response.success;
      newMessage.metrics = response.metrics;
      newMessage.error = response.error;

      setMessages([newMessage, ...messages]);
      setPrompt(''); // Clear prompt on success
    } catch (err: any) {
      newMessage.error = err.message || 'Failed to send request';
      newMessage.success = false;
      setMessages([newMessage, ...messages]);
      setError(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  }, [prompt, systemMessage, maxTokens, temperature, modelOverride, messages]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const estimatedTokens = Math.ceil(prompt.length / 4);

  if (configLoading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading OpenAI configuration...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Configuration Display */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Accordion expanded={configExpanded} onChange={() => setConfigExpanded(!configExpanded)}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">OpenAI Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {config && (
              <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography component="div" variant="body2" color="text.secondary">
                  Status:{' '}
                  {config.is_enabled ? (
                    <Chip label="Enabled" color="success" size="small" />
                  ) : (
                    <Chip label="Disabled" color="error" size="small" />
                  )}
                </Typography>
              </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    SDK Version: <strong>{config.sdk_version}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Model: <strong>{config.model}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Agent Model: <strong>{config.agent_model || 'N/A'}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Max Tokens: <strong>{config.max_tokens}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Timeout: <strong>{config.request_timeout}s</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    API Key: <strong>{config.api_key_prefix}</strong>
                  </Typography>
                </Grid>
              </Grid>
            )}
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Configuration Panel */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="System Message"
                  multiline
                  rows={2}
                  value={systemMessage}
                  onChange={(e) => setSystemMessage(e.target.value)}
                  helperText={`${systemMessage.length} characters`}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Max Tokens: {maxTokens}</Typography>
                <Slider
                  value={maxTokens}
                  onChange={(_, value) => setMaxTokens(value as number)}
                  min={100}
                  max={2000}
                  step={50}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Temperature: {temperature}</Typography>
                <Slider
                  value={temperature}
                  onChange={(_, value) => setTemperature(value as number)}
                  min={0}
                  max={1}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Model Override</InputLabel>
                  <Select
                    value={modelOverride}
                    onChange={(e) => setModelOverride(e.target.value)}
                    label="Model Override"
                  >
                    <MenuItem value="">Default ({config?.model})</MenuItem>
                    <MenuItem value="gpt-4o-mini">gpt-4o-mini</MenuItem>
                    <MenuItem value="gpt-4o">gpt-4o</MenuItem>
                    <MenuItem value="gpt-3.5-turbo">gpt-3.5-turbo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Sample Prompts */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sample Prompts
        </Typography>
        <Grid container spacing={1}>
          {SAMPLE_PROMPTS.map((sample) => (
            <Grid item key={sample.name}>
              <Button variant="outlined" size="small" onClick={() => handleSamplePrompt(sample.prompt)}>
                {sample.name}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Prompt Input */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Prompt Input
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={10}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          helperText={`${prompt.length} characters (~${estimatedTokens} tokens)`}
        />
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={loading || !prompt.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Results Display */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Test Results ({messages.length})
        </Typography>
        {messages.length === 0 && (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No test results yet. Send a prompt to begin.</Typography>
          </Paper>
        )}
        {messages.map((message) => (
          <ResultCard key={message.id} message={message} copyToClipboard={copyToClipboard} />
        ))}
      </Box>
    </Box>
  );
};

// Result Card Component
const ResultCard: React.FC<{
  message: DiagnosticMessage;
  copyToClipboard: (text: string) => void;
}> = ({ message, copyToClipboard }) => {
  const [promptExpanded, setPromptExpanded] = useState(false);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getTimeColor = (ms: number): string => {
    if (ms < 2000) return 'success.main';
    if (ms < 5000) return 'warning.main';
    if (ms < 10000) return 'orange';
    return 'error.main';
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        {/* Timestamp & Status */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {message.timestamp.toLocaleString()}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {message.success ? (
              <>
                <CheckCircle color="success" fontSize="small" />
                <Typography variant="body2" color="success.main">
                  Success
                </Typography>
              </>
            ) : (
              <>
                <ErrorIcon color="error" fontSize="small" />
                <Typography variant="body2" color="error.main">
                  Failed
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* Prompt (Collapsible) */}
        <Accordion expanded={promptExpanded} onChange={() => setPromptExpanded(!promptExpanded)}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">Prompt ({message.prompt.length} chars)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {message.prompt}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 2 }} />

        {/* Error Message */}
        {!message.success && message.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {message.error}
          </Alert>
        )}

        {/* Response Text */}
        {message.success && message.response?.response_text && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">Response:</Typography>
              <IconButton
                size="small"
                onClick={() => copyToClipboard(message.response!.response_text!)}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Box>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.response.response_text}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Metrics */}
        {message.metrics && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Metrics:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <MetricCard
                  icon={<Speed />}
                  label="Response Time"
                  value={formatTime(message.metrics.response_time_ms)}
                  color={getTimeColor(message.metrics.response_time_ms)}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <MetricCard
                  icon={<TokenIcon />}
                  label="Total Tokens"
                  value={message.metrics.total_tokens.toString()}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <MetricCard
                  icon={<AttachMoney />}
                  label="Estimated Cost"
                  value={`$${message.metrics.estimated_cost.toFixed(6)}`}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <MetricCard
                  icon={<TrendingUp />}
                  label="Tokens/Sec"
                  value={message.metrics.tokens_per_second.toFixed(1)}
                />
              </Grid>
              {message.metrics.cache_hit !== undefined && (
                <Grid item xs={12}>
                  <Alert severity={message.metrics.cache_hit ? 'success' : 'info'}>
                    Cache {message.metrics.cache_hit ? 'Hit' : 'Miss'}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}> = ({ icon, label, value, color }) => (
  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
    <Box sx={{ color: color || 'text.secondary', mb: 0.5 }}>{icon}</Box>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="h6" sx={{ color: color }}>
      {value}
    </Typography>
  </Paper>
);

export default DiagnosticChatTab;
