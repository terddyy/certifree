/**
 * Environment Configuration Validator
 * 
 * Validates required environment variables on app initialization
 * Provides helpful error messages for missing configurations
 */

import { componentDebug } from '@/lib/debugger';

const debug = componentDebug('envConfig');

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  formspreeEndpoint?: string; // Optional Formspree endpoint for contact form
  isProduction: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config?: EnvConfig;
}

/**
 * Validate all required environment variables
 * 
 * @returns Validation result with any errors or warnings
 */
export const validateEnvironment = (): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const formspreeEndpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT;
  
  // Check required variables
  if (!supabaseUrl) {
    errors.push('VITE_SUPABASE_URL is not set in environment variables');
  }

  if (!supabaseAnonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is not set in environment variables');
  }

  // Validate URL format
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must start with https://');
  }

  // Check optional OAuth configuration
  // Note: Google OAuth is configured in Supabase Dashboard, not here
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleClientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    warnings.push(
      'VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET are not set. ' +
      'These are optional - Google OAuth is configured in Supabase Dashboard. ' +
      'Set these only if you need client-side access to Google credentials.'
    );
  }

  // Determine environment
  const isProduction = import.meta.env.PROD;

  // Production-specific checks
  if (isProduction) {
    if (supabaseUrl && supabaseUrl.includes('localhost')) {
      warnings.push('Using localhost URL in production environment');
    }
  }

  const valid = errors.length === 0;

  if (!valid) {
    debug.error('Environment validation failed', { errors });
  } else if (warnings.length > 0) {
    debug.warn('Environment validation passed with warnings', { warnings });
  } else {
    debug.log('Environment validation passed');
  }

  const result: ValidationResult = {
    valid,
    errors,
    warnings,
  };

  if (valid) {
    result.config = {
      supabaseUrl,
      supabaseAnonKey,
      formspreeEndpoint,
      isProduction,
    };
  }

  return result;
};

/**
 * Get formatted error message for display
 */
export const getValidationErrorMessage = (result: ValidationResult): string => {
  if (result.valid) return '';

  const lines = [
    'Environment Configuration Error:',
    '',
    ...result.errors.map(err => `  ❌ ${err}`),
    '',
    'Please create a .env file in the project root with the following variables:',
    '',
    'VITE_SUPABASE_URL=https://your-project.supabase.co',
    'VITE_SUPABASE_ANON_KEY=your-anon-key',
    '',
    'See .env.example for a template.',
  ];

  return lines.join('\n');
};

/**
 * Initialize and validate environment
 * Call this early in app initialization
 */
export const initializeEnvironment = (): EnvConfig => {
  const result = validateEnvironment();

  if (!result.valid) {
    const message = getValidationErrorMessage(result);
    console.error(message);
    
    // In development, show alert
    if (import.meta.env.DEV) {
      alert(
        'Environment configuration error!\n\n' +
        'Missing required environment variables. Check the console for details.'
      );
    }

    throw new Error('Environment validation failed. See console for details.');
  }

  // Log warnings if any
  if (result.warnings.length > 0) {
    console.warn('Environment warnings:');
    result.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }

  return result.config!;
};
