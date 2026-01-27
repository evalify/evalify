module.exports = {
    apps: [
        {
            name: "evalify",
            script: "server.js",
            interpreter: "bun",
            instances: 1,
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: "production",
                PORT: 3000,
                HOSTNAME: "0.0.0.0",
            },
        },
    ],
};
