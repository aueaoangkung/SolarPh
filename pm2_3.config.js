module.exports = {
    apps: [{
        name: 'tool-solar-Ph3',
        script: './ph3.js',
        watch: false,
        env: {
            NODE_ENV: 'production'
        }
    }]
};