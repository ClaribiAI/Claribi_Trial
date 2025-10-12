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
      proxy: {
        '/analytics': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          cookieDomainRewrite: false,
          preserveHeaderKeyCase: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Analytics proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Analytics - Sending Request to the Target:', req.method, req.url);
              if (req.headers.cookie) {
                proxyReq.setHeader('cookie', req.headers.cookie);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Analytics - Received Response from the Target:', proxyRes.statusCode, req.url);
              if (proxyRes.headers['set-cookie']) {
                res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
              }
            });
          },
        },
        '/api/project': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          cookieDomainRewrite: false,
          preserveHeaderKeyCase: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('API project proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('API project - Sending Request to the Target:', req.method, req.url);
              if (req.headers.cookie) {
                proxyReq.setHeader('cookie', req.headers.cookie);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('API project - Received Response from the Target:', proxyRes.statusCode, req.url);
              if (proxyRes.headers['set-cookie']) {
                res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
              }
            });
          }
        },
        '/report/page': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          cookieDomainRewrite: false,
          preserveHeaderKeyCase: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Report page proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Report page - Sending Request to the Target:', req.method, req.url);
              if (req.headers.cookie) {
                proxyReq.setHeader('cookie', req.headers.cookie);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Report page - Received Response from the Target:', proxyRes.statusCode, req.url);
              if (proxyRes.headers['set-cookie']) {
                res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
              }
            });
          }
        },
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
              console.log('API Sending Request to the Target:', req.method, req.url);
              if (req.headers.cookie) {
                proxyReq.setHeader('cookie', req.headers.cookie);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('API Received Response from the Target:', proxyRes.statusCode, req.url);
              if (proxyRes.headers['set-cookie']) {
                res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
              }
            });
          }
        },
        '/projects': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          cookieDomainRewrite: false,
          preserveHeaderKeyCase: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Projects proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              if (req.headers.cookie) {
                proxyReq.setHeader('cookie', req.headers.cookie);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              if (proxyRes.headers['set-cookie']) {
                res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
              }
            });
          }
        },
        '/project': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          cookieDomainRewrite: false,
          preserveHeaderKeyCase: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Project proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              if (req.headers.cookie) {
                proxyReq.setHeader('cookie', req.headers.cookie);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              if (proxyRes.headers['set-cookie']) {
                res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
              }
            });
          }
        },
        '/edit_report': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Edit report proxy error', err);
            });
          }
        },
        '/delete_report': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Delete report proxy error', err);
            });
          }
        },
        '/reports': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
        },
        '/file_processing': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
        },
        '/synonyms': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
        },
        '/chatbot': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
        },
        '/api/chatbot': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Chatbot API proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Chatbot API - Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Chatbot API - Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          }
        },
        '/powerbi-chat': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
          cookieDomainRewrite: false,
          preserveHeaderKeyCase: true,
          timeout: 120000, // 2 minutes timeout for file uploads
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
            proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
              console.log('Power BI Chat API - WebSocket Request:', req.url);
            });
          }
        },
        '/report_pages': {
          target: process.env.VITE_BACKEND_URL || 'https://127.0.0.1:5000',
          secure: false,
          changeOrigin: true,
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
      port: process.env.PORT || 5173,
      strictPort: true,
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        'claribifrontend-production.up.railway.app'//,
        //'.railway.app' // Allow all Railway subdomains
      ],
    },
    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    }
  }
})