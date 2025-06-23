import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('./certificates/key.pem'),
      cert: fs.readFileSync('./certificates/cert.pem')
    },
    proxy: {
      '/auth': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/auth/, '/auth'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            if (proxyRes.headers['set-cookie']) {
              // Fix for cross-origin cookie issue by adding credentials in response headers
              _res.setHeader('set-cookie', proxyRes.headers['set-cookie']);
            }
          });
        },
      },
      '/analytics': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Analytics proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Analytics - Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Analytics - Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      },
      '/api/project': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        // Don't rewrite the path for project-related API calls
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('API project proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('API project - Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('API project - Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      },
      '/report/page': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Report page proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Report page - Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Report page - Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      },
      '/api': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        // Don't rewrite the path for API calls, as the Flask blueprints already have the correct prefixes
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('API proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('API Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('API Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      },
      '/api/health-check': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/health-check/, '/auth/health-check'),
        // Provide a fallback response if the server is unreachable
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Health check proxy error', err);
            // Send a fallback response
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json');
              res.writeHead(503);
              res.end(JSON.stringify({ 
                status: 'error', 
                message: 'Backend server is not running' 
              }));
            }
          });
        }
      },
      '/projects': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Projects proxy error', err);
          });
        }
      },
      '/project': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Project proxy error', err);
          });
        }
      },
      '/edit_report': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Edit report proxy error', err);
          });
        }
      },
      '/delete_report': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Delete report proxy error', err);
          });
        }
      },
      '/reports': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
      },
      '/file_processing': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
      },
      '/synonyms': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
      },
      '/chatbot': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
      },
      '/api/chatbot': {
        target: 'https://127.0.0.1:5000',
        secure: false,
        changeOrigin: true,
        // Don't rewrite the path for API calls
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
      '/report_pages': {
        target: 'https://127.0.0.1:5000',
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
  // This ensures that all routes are handled by index.html which then lets React Router take over
  preview: {
    port: 5173,
    strictPort: true,
  },
})
