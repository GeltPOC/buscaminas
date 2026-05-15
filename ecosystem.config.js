module.exports = {
  apps: [{
    name: 'buscaminas',
    script: 'npm',
    args: 'start -- -p 3462',
    cwd: '/home/gelt/apps/buscaminas',
    env: {
      NODE_ENV: 'production',
      PORT: 3462,
    },
  }],
}
