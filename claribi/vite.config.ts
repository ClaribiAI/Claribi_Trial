import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'


// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  
  return {
    plugins: [react()],
    server: {
      // Only use HTTPS in development if certificates exist
      ...(fs.existsSync('./certificates/key.pem') && fs.existsSync('./certificates/cert.pem') ? {
        https: {
          key: fs.readFileSync('./certificates/key.pem'),
          cert: fs.readFileSync('./certificates/cert.pem')
        }
      } : {}),
      // Enable history API fallback for client-side routing
      historyApiFallback: true,
      proxy: {
        // Proxy for authentication and Power BI Docs API endpoints
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          cookieDomainRewrite: false,
          preserveHeaderKeyCase: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('API proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('API - Sending Request to the Target:', req.method, req.url);
              if (req.headers.cookie) {
                proxyReq.setHeader('cookie', req.headers.cookie);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('API - Received Response from the Target:', proxyRes.statusCode, req.url);
              if (proxyRes.headers['set-cookie']) {
                res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
              }
            });
          }
        },
        // Proxy for Power BI Chat API endpoints
        '/powerbi-chat': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          cookieDomainRewrite: false,
          preserveHeaderKeyCase: true,
          timeout: 120000, // 2 minutes timeout for file uploads
          // Only proxy API calls, not the frontend route itself
          bypass: (req) => {
            const url = req.url || '';
            // If it's the exact root route with no sub-path, it's a frontend route - bypass proxy
            // React Router will handle it
            if (url === '/powerbi-chat' || url === '/powerbi-chat/') {
              // Return a path that doesn't exist to trigger SPA fallback
              // Vite will serve index.html which React Router will handle
              return '/index.html';
            }
            // For API calls (anything with a sub-path), return null to use proxy
            // Examples: /powerbi-chat/query, /powerbi-chat/list-files, /powerbi-chat/upload, etc.
            return null;
          },
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Power BI Chat API proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Power BI Chat API - Sending Request to the Target:', req.method, req.url);
              // Set longer timeout for upload requests
              if (req.url?.includes('/upload')) {
                proxyReq.setTimeout(120000);
              }
              // Handle streaming requests
              if (req.url?.includes('/query-stream')) {
                proxyReq.setTimeout(300000); // 5 minutes for streaming
                proxyReq.setHeader('Accept', 'text/plain');
                proxyReq.setHeader('Cache-Control', 'no-cache');
              }
              if (req.headers.cookie) {
                proxyReq.setHeader('cookie', req.headers.cookie);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Power BI Chat API - Received Response from the Target:', proxyRes.statusCode, req.url);
              // Handle streaming responses
              if (req.url?.includes('/query-stream')) {
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
              }
              if (proxyRes.headers['set-cookie']) {
                res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
              }
            });
            proxy.on('proxyReqWs', (_proxyReq, _req, _socket, _options, _head) => {
              console.log('Power BI Chat API - WebSocket Request:', _req.url);
            });
          }
        }
      }
    },
    // Add history API fallback for SPA routing
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    // Production build configuration
    build: {
      outDir: 'dist',
      sourcemap: !isProduction,
      minify: isProduction ? 'esbuild' : false,
      esbuild: {
        drop: isProduction ? ['console', 'debugger'] : []
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['@mui/material', '@mui/icons-material'],
            icons: ['@fortawesome/react-fontawesome', '@phosphor-icons/react']
          }
        }
      }
    },
    // Preview configuration for production testing
    preview: {
      port: parseInt(process.env.PORT || '5173'),
      strictPort: true,
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        'claribifrontend-production.up.railway.app',
        'console.claribi.ai',
        'claribi-frontend-preprod.up.railway.app'
      ],
    },
    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    },
    // Vitest configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/__tests__/',
          '**/*.d.ts',
          '**/*.config.*',
          'dist/',
          'coverage/'
        ],
        thresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
          }
        }
      }
    }
  }
})