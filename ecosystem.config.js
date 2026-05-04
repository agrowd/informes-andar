module.exports = {
  apps: [
    {
      name: 'informes-andar',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      }
    }
  ]
};
