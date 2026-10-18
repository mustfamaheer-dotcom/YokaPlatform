module.exports = {
  apps: [
    {
      name: 'yoka-swm-api',
      script: 'server/swm/app.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      // Restart on failure with exponential backoff
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      // Logging
      out_file: '/dev/stdout',
      error_file: '/dev/stderr',
      merge_logs: true,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        PORT_SWM: 3001,
        DB_CLIENT: 'pg'
      }
    }
  ]
};
