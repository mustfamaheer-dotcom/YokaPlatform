module.exports = {
  apps: [
    {
      name: 'yoka-swm-api',
      script: 'server/swm/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT_SWM: 3001,
        DB_CLIENT: 'mysql2'
      }
    }
  ]
};
